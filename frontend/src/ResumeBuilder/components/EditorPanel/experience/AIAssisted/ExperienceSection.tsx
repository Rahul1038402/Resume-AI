import React from 'react';
import { Experience, ResumeData } from '../../../../types';
import { AIModeToggle } from '../../../AIAssistant/AIModeToggle';
import { AIChatInterface } from '../../../AIAssistant/AIChatInterface';
import { useAIMode } from '../../../../hooks/useAIMode';
import { useAIAssistant } from '../../../../hooks/useAIAssistant';
import { useConversationHistory } from '../../../../hooks/useConversationHistory';
import { ParsedExperience } from '../../../AIAssistant/types';
import { AIExperienceSuggestionCard } from '../../../AIAssistant/AIExperienceSuggestionCard';
import { ExperienceEditor } from '../Manual/ExperienceEditor';

interface ExperienceSectionProps {
  resumeData: ResumeData;
  experience: Experience[];
  addExperience: () => void;
  updateExperience: (id: string, field: keyof Experience, value: string | string[]) => void;
  deleteExperience: (id: string) => void;
  addExperienceAchievement: (expId: string) => void;
  updateExperienceAchievement: (expId: string, index: number, value: string) => void;
  deleteExperienceAchievement: (expId: string, index: number) => void;
}

const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  resumeData,
  experience,
  addExperience,
  updateExperience,
  deleteExperience,
  addExperienceAchievement,
  updateExperienceAchievement,
  deleteExperienceAchievement
}) => {
  // AI Mode State
  const { mode, isAIMode, showWelcome, toggleMode, dismissWelcome } = useAIMode({
    section: 'experience',
    defaultMode: 'manual'
  });

  // Resume Context for AI
  const resumeContext = {
    target_job: resumeData?.personalInfo?.targetJobTitle || 'Software Engineer',
    skills: resumeData?.skills?.categories?.map(cat => cat.value).join(', ').split(', ').filter(Boolean) || [],
    existing_experience: resumeData?.experience?.map(exp => ({
      position: exp.position,
      company: exp.company
    })) || []
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
    section: 'experience',
    resumeContext,
    sessionId: sessionIdRef.current
  });

  // Conversation History Hook
  const { exportConversation } = useConversationHistory({
    section: 'experience',
    enabled: isAIMode
  });

  // Handle accepting AI suggestion
  const experiencePreview = () =>
    currentSuggestion && 'position' in currentSuggestion
      ? `${currentSuggestion.position} at ${currentSuggestion.company}`
      : '';

  const handleAcceptSuggestion = (edited: ParsedExperience) => {
    recordSuggestionOutcome({
      status: 'accepted', label: 'Experience',
      preview: `${edited.position} at ${edited.company}`,
    });

    addExperience();
    
    // Update the newly created experience
    setTimeout(() => {
      const newExpId = resumeData.experience[resumeData.experience.length - 1]?.id;
      if (newExpId) {
        updateExperience(newExpId, 'position', edited.position);
        updateExperience(newExpId, 'company', edited.company);
        updateExperience(newExpId, 'location', edited.location);
        updateExperience(newExpId, 'startDate', edited.startDate);
        updateExperience(newExpId, 'endDate', edited.endDate);
        updateExperience(newExpId, 'achievements', edited.achievements.filter(a => a.trim() !== ''));
      }
    }, 100);
  };

  // Handle rejecting suggestion
  const handleRejectSuggestion = () => {
    recordSuggestionOutcome({
      status: 'rejected', label: 'Experience', preview: experiencePreview(),
    });
  };

  // Handle refinement requests
  const handleRefine = (refinementType: string) => {
    if (!currentSuggestion || !('position' in currentSuggestion)) return;

    const refinementPrompts: Record<string, string> = {
      quantify: "Can you add more quantifiable metrics and numbers to show the impact?",
      technical: "Can you add more technical depth and implementation details?",
      simplify: "Can you simplify this to be more concise and accessible?"
    };

    recordSuggestionOutcome({
      status: 'refined', label: 'Experience', preview: experiencePreview(),
    });
    sendMessage(refinementPrompts[refinementType] || refinementPrompts.quantify);
  };

  // Safety check. Placed after the hooks: an early return above them would
  // change the hook order between renders and crash React.
  if (!resumeData) {
    console.error('ExperienceSection: resumeData is undefined');
    return (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300">Error: Resume data not loaded</p>
      </div>
    );
  }

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
            currentSuggestion={currentSuggestion && 'position' in currentSuggestion ? currentSuggestion : null}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onRefineSuggestion={handleRefine}
            suggestionCardComponent={AIExperienceSuggestionCard}
          />
        </div>
      )}

      {/* Manual Mode Interface */}
      {!isAIMode && (
          /* Manual mode scrolls inside the same fixed column, so the
             mode switch above stays put either way. */
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ExperienceEditor
              experience={experience}
              addExperience={addExperience}
              updateExperience={updateExperience}
              deleteExperience={deleteExperience}
              addExperienceAchievement={addExperienceAchievement}
              updateExperienceAchievement={updateExperienceAchievement}
              deleteExperienceAchievement={deleteExperienceAchievement}
            />
          </div>
      )}
    </div>
  );
};

export default ExperienceSection;