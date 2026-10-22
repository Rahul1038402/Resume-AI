import { useState, useCallback, useRef, useEffect } from 'react';
import { AIMessage, AIAssistantState, SuggestionOutcome } from '../components/AIAssistant/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/*
 * Conversations survive a section switch.
 *
 * This hook mounts inside the section being edited, so moving from Summary to
 * Projects unmounts it and took the whole conversation with it. The key is
 * the one useConversationHistory already writes, so Export still finds it.
 */
const STORAGE_PREFIX = 'ai_conversation_';
const MAX_STORED_MESSAGES = 50;

const loadMessages = (section: string): AIMessage[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${section}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Timestamps come back from JSON as strings and have to become Dates.
    const stored = parsed as Array<Omit<AIMessage, 'timestamp'> & { timestamp: string }>;
    return stored.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    // Private browsing, cleared storage, or a half-written value. An empty
    // conversation is a worse outcome than a crash only if it crashes.
    return [];
  }
};

const saveMessages = (section: string, messages: AIMessage[]) => {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${section}`,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
    );
  } catch {
    /* quota or disabled storage - the conversation still works in memory */
  }
};

/*
 * Last known allowance per section, for this page load.
 *
 * Without it the panel paints a fresh "15 of 15" every time the assistant
 * mounts and then corrects itself when the server answers. The server is
 * still the authority; this only stops the wrong number being shown first.
 */
const limitsCache: Record<string, { remaining_section: number; remaining_session: number }> = {};

interface UseAIAssistantProps {
  section: 'projects' | 'experience' | 'education' | 'summary' | 'skills';
  resumeContext: {
    target_job?: string;
    skills?: string[];
    existing_projects?: any[];
    existing_experience?: any[];
    existing_education?: any[];
    existing_skills?: any[];
    current_summary?: string;
  };
  sessionId?: string;
}

export const useAIAssistant = ({ section, resumeContext, sessionId = 'default' }: UseAIAssistantProps) => {
  const [state, setState] = useState<AIAssistantState>(() => ({
    messages: loadMessages(section),
    isLoading: false,
    error: null,
    currentSuggestion: null,
    rateLimits: limitsCache[section] ?? {
      remaining_section: 15,
      remaining_session: 50
    }
  }));

  // Reload when the section changes, in case the hook was reused rather than
  // remounted. Switching sections must never show another section's chat.
  useEffect(() => {
    setState(prev => ({
      ...prev,
      messages: loadMessages(section),
      currentSuggestion: null,
      error: null,
      rateLimits: limitsCache[section] ?? prev.rateLimits,
    }));
  }, [section]);

  // Persist on every change, so a switch away loses nothing.
  useEffect(() => {
    saveMessages(section, state.messages);
  }, [section, state.messages]);

  /*
   * Ask the server what is actually left.
   *
   * The counters live on the server and keep counting whether or not this
   * component is mounted, so a locally assumed 15 was simply wrong after the
   * first switch away and back. This spends nothing.
   */
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/ai-assist/limits/${section}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        const limits = {
          remaining_section: data.remaining_section,
          remaining_session: data.remaining_session,
        };
        limitsCache[section] = limits;
        setState(prev => ({ ...prev, rateLimits: limits }));
      })
      .catch(() => {
        /* offline or backend down - the optimistic value stands until a send */
      });

    return () => { cancelled = true; };
  }, [section]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuggestionIdRef = useRef<string | null>(null);

  // Send message to AI (streaming)
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Add user message immediately
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null,
      currentSuggestion: null
    }));

    try {
      const currentMessages = [...state.messages, userMsg];
      
      const conversationHistory = currentMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch(`${API_URL}/api/ai-assist/${section}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          conversation_history: conversationHistory,
          resume_context: resumeContext,
          session_id: sessionId,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage = '';
      const assistantMsgId = (Date.now() + 1).toString();
      let isSuggestionResponse = false;
      // SSE events can split across network chunks; parse only whole lines so
      // a half-received event no longer throws and kills the stream
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the trailing partial line for the next chunk
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (!payload) continue;

            let data;
            try {
              data = JSON.parse(payload);
            } catch {
              console.warn('Skipping malformed SSE payload:', payload.slice(0, 120));
              continue;
            }

            if (data.type === 'content') {
              assistantMessage += data.data;
              
              if (!isSuggestionResponse) {
                setState(prev => {
                  const existingMsg = prev.messages.find(m => m.id === assistantMsgId);
                  
                  if (existingMsg) {
                    return {
                      ...prev,
                      messages: prev.messages.map(m =>
                        m.id === assistantMsgId
                          ? { ...m, content: assistantMessage }
                          : m
                      )
                    };
                  } else {
                    return {
                      ...prev,
                      messages: [...prev.messages, {
                        id: assistantMsgId,
                        role: 'assistant',
                        content: assistantMessage,
                        timestamp: new Date()
                      }]
                    };
                  }
                });
              }
            } else if (data.type === 'suggestion') {
              isSuggestionResponse = true;
              const suggestionData = data.data;
              const suggestionId = Date.now().toString();
              
              if (suggestionId !== lastSuggestionIdRef.current) {
                lastSuggestionIdRef.current = suggestionId;
                
                // Add optional message if provided
                if (suggestionData.message) {
                  setState(prev => ({
                    ...prev,
                    messages: [...prev.messages, {
                      id: assistantMsgId,
                      role: 'assistant',
                      content: suggestionData.message,
                      timestamp: new Date()
                    }]
                  }));
                }
                
                // Set suggestion based on section type
                let suggestion = null;
                
                if (section === 'projects' && suggestionData.projects) {
                  suggestion = suggestionData.projects[0];
                } else if (section === 'summary' && suggestionData.summary) {
                  suggestion = { summary: suggestionData.summary };
                } else if (section === 'skills' && suggestionData.skills) {
                  suggestion = { skills: suggestionData.skills };
                } else if (section === 'experience' && suggestionData.experiences) {
                  suggestion = suggestionData.experiences[0];
                }
                
                if (suggestion) {
                  setState(prev => ({
                    ...prev,
                    currentSuggestion: suggestion
                  }));
                }
              }
            } else if (data.type === 'rate_limit') {
              const limits = {
                remaining_section: data.data.remaining_section,
                remaining_session: data.data.remaining_session
              };
              limitsCache[section] = limits;
              setState(prev => ({ ...prev, rateLimits: limits }));
            } else if (data.type === 'done') {
              setState(prev => ({ ...prev, isLoading: false }));
            } else if (data.type === 'error') {
              throw new Error(data.data);
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }

      const errorMessage = error.message || 'Failed to send message';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [section, resumeContext, sessionId, state.messages]);

  // Set current suggestion
  const setSuggestion = useCallback((suggestion: any) => {
    setState(prev => ({ ...prev, currentSuggestion: suggestion }));
    if (suggestion === null) {
      lastSuggestionIdRef.current = null;
    }
  }, []);

  // Clear all messages
  /*
   * Leave a receipt in the transcript.
   *
   * Clearing `currentSuggestion` is what makes the card disappear, and on its
   * own that erased every trace that a suggestion was ever made - the chat
   * ended on "Here is your summary" with nothing to show for it. Recording
   * the outcome as a message means it persists with the rest of the
   * conversation, including across a section switch.
   */
  const recordSuggestionOutcome = useCallback((outcome: SuggestionOutcome) => {
    setState(prev => ({
      ...prev,
      currentSuggestion: null,
      messages: [
        ...prev.messages,
        {
          id: `${Date.now()}-outcome`,
          role: 'system',
          content: outcome.preview,
          timestamp: new Date(),
          outcome,
        },
      ],
    }));
  }, []);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    lastSuggestionIdRef.current = null;
    saveMessages(section, []);
    // The allowance is carried over deliberately. Deleting a conversation
    // does not give the requests back, and showing a full 15 here was the
    // same lie the panel used to tell after a section switch.
    setState(prev => ({
      messages: [],
      isLoading: false,
      error: null,
      currentSuggestion: null,
      rateLimits: prev.rateLimits
    }));
  }, [section]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Reset rate limits
  const resetRateLimits = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/ai-assist/reset-limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          section
        })
      });

      const limits = { remaining_section: 15, remaining_session: 50 };
      limitsCache[section] = limits;
      setState(prev => ({ ...prev, rateLimits: limits }));
    } catch (error) {
      console.error('Failed to reset limits:', error);
    }
  }, [section, sessionId]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    currentSuggestion: state.currentSuggestion,
    rateLimits: state.rateLimits,
    sendMessage,
    setSuggestion,
    recordSuggestionOutcome,
    clearMessages,
    cancelRequest,
    resetRateLimits
  };
};