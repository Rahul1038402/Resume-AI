import React from 'react';
import { ResumeData } from '../../../../types';
import { AIModeToggle } from '../../../AIAssistant/AIModeToggle';
import { AIChatInterface } from '../../../AIAssistant/AIChatInterface';
import { useAIMode } from '../../../../hooks/useAIMode';
import { useAIAssistant } from '../../../../hooks/useAIAssistant';
import { useConversationHistory } from '../../../../hooks/useConversationHistory';
import { ParsedSummary } from '../../../AIAssistant/types';
import { AISummarySuggestionCard } from '../../../AIAssistant/AISummarySuggestionCard';
import { SummaryEditor } from '../Manual/SummaryEditor';

interface SummarySectionProps {
  resumeData: ResumeData;
  summary: string;
  updateSummary: (value: string) => void;
}

const SummarySection: React.FC<SummarySectionProps> = ({
  resumeData,
  summary,
  updateSummary
}) => {
  // Safety check
  if (!resumeData) {
    console.error('SummarySection: resumeData is undefined');
    return (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300">Error: Resume data not loaded</p>
      </div>
    );
  }

  // AI Mode State
  const { mode, isAIMode, showWelcome, toggleMode, dismissWelcome } = useAIMode({
    section: 'summary',
    defaultMode: 'manual'
  });

  // Resume Context for AI
  const resumeContext = {
    target_job: resumeData?.personalInfo?.targetJobTitle || 'Software Engineer',
    skills: resumeData?.skills?.categories?.map(cat => cat.value).join(', ').split(', ').filter(Boolean) || [],
    experience: resumeData?.experience || [],
    current_summary: summary
  };

  // AI Assistant Hook
  const sessionIdRef = React.useRef('user-session-' + Date.now());
  
  const {
    messages,
    isLoading,
    error,
    currentSuggestion,
    rateLimits,
    sendMessage,
    setSuggestion,
    recordSuggestionOutcome,
    clearMessages,
    cancelRequest
  } = useAIAssistant({
    section: 'summary',
    resumeContext,
    sessionId: sessionIdRef.current
  });

  // Conversation History Hook
  const { exportConversation } = useConversationHistory({
    section: 'summary',
    enabled: isAIMode
  });

  // Short enough to recognise the suggestion later in the transcript.
  const summaryPreview = () =>
    currentSuggestion && 'summary' in currentSuggestion ? currentSuggestion.summary : '';

  // Handle accepting AI suggestion
  const handleAcceptSuggestion = (edited: string) => {
    recordSuggestionOutcome({
      status: 'accepted', label: 'Professional summary', preview: edited,
    });
    updateSummary(edited);
  };

  // Handle rejecting suggestion
  const handleRejectSuggestion = () => {
    recordSuggestionOutcome({
      status: 'rejected', label: 'Professional summary', preview: summaryPreview(),
    });
  };

  // Handle refinement requests
  const handleRefine = (refinementType: string) => {
    if (!currentSuggestion || !('summary' in currentSuggestion)) return;

    const refinementPrompts: Record<string, string> = {
      impactful: "Can you make this summary more impactful with stronger achievements?",
      keywords: "Can you add more relevant technical keywords to this summary?",
      simplify: "Can you simplify this summary while keeping the impact?"
    };

    recordSuggestionOutcome({
      status: 'refined', label: 'Professional summary', preview: summaryPreview(),
    });
    sendMessage(refinementPrompts[refinementType] || refinementPrompts.impactful);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* AI Mode Toggle */}
      <AIModeToggle
        mode={mode}
        onToggle={toggleMode}
        rateLimits={rateLimits}
      />

      {/* AI Mode Interface */}
      {isAIMode && (
        <div className="min-h-0 flex-1">
          <AIChatInterface
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSendMessage={sendMessage}
            onClearMessages={clearMessages}
            onCancelRequest={cancelRequest}
            onExportConversation={exportConversation}
            showWelcome={showWelcome}
            onDismissWelcome={dismissWelcome}
            rateLimits={rateLimits}
            currentSuggestion={currentSuggestion && 'summary' in currentSuggestion ? currentSuggestion : null}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onRefineSuggestion={handleRefine}
            suggestionCardComponent={AISummarySuggestionCard}
          />
        </div>
      )}

      {/* Manual Mode Interface */}
      {!isAIMode && (
          /* Manual mode scrolls inside the same fixed column, so the
             mode switch above stays put either way. */
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SummaryEditor
              summary={summary}
              updateSummary={updateSummary}
            />
          </div>
      )}
    </div>
  );
};

export default SummarySection;