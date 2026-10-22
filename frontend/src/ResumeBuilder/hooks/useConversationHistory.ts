import { useState, useEffect, useCallback } from 'react';
import { AIMessage } from '../components/AIAssistant/types';

const STORAGE_PREFIX = 'ai_conversation_';
const MAX_HISTORY_SIZE = 50; // Maximum messages to store

interface UseConversationHistoryProps {
  section: string;
  enabled?: boolean; // Only save when AI mode is active
}

export const useConversationHistory = ({ section, enabled = true }: UseConversationHistoryProps) => {
  const storageKey = `${STORAGE_PREFIX}${section}`;

  // Load saved conversation from localStorage
  const loadSavedConversation = (): AIMessage[] => {
    if (!enabled) return [];
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  };

  const [messages, setMessages] = useState<AIMessage[]>(loadSavedConversation);

  // Save conversation to localStorage whenever it changes.
  //
  // Skipped while empty: the assistant owns this key now, and an empty
  // initial render here would otherwise overwrite a real conversation.
  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    try {
      // Limit history size to prevent localStorage overflow
      const messagesToSave = messages.slice(-MAX_HISTORY_SIZE);
      localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving conversation history:', error);
      
      // If localStorage is full, try clearing old conversations
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          clearOldConversations();
          localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
        } catch (retryError) {
          console.error('Failed to save even after clearing:', retryError);
        }
      }
    }
  }, [messages, enabled, storageKey]);

  // Add message to history
  const addMessage = useCallback((message: AIMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update last message (useful for streaming)
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content
      };
      return updated;
    });
  }, []);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing conversation history:', error);
    }
  }, [storageKey]);

  // Clear old conversations from other sections to free up space
  const clearOldConversations = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      const conversationKeys = keys.filter(key => 
        key.startsWith(STORAGE_PREFIX) && key !== storageKey
      );
      
      // Remove oldest conversations first
      conversationKeys
        .sort()
        .slice(0, Math.floor(conversationKeys.length / 2))
        .forEach(key => localStorage.removeItem(key));
        
    } catch (error) {
      console.error('Error clearing old conversations:', error);
    }
  }, [storageKey]);

  /*
   * Export conversation as JSON.
   *
   * Reads storage rather than this hook's own `messages`. The sections only
   * destructure `exportConversation` from here and never call `addMessage`,
   * so that state is whatever was loaded at mount - which meant Export
   * downloaded the conversation as it stood before you said anything. The
   * assistant writes the live conversation to the same key.
   */
  const exportConversation = useCallback(() => {
    let current = messages;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) current = parsed;
      }
    } catch {
      /* fall back to whatever is in memory */
    }

    const dataStr = JSON.stringify(current, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation_${section}_${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [messages, section, storageKey]);

  // Get conversation summary stats
  const getStats = useCallback(() => {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      totalCharacters: totalLength,
      estimatedTokens: Math.ceil(totalLength / 4) // Rough estimate
    };
  }, [messages]);

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearHistory,
    exportConversation,
    getStats,
    hasHistory: messages.length > 0
  };
};