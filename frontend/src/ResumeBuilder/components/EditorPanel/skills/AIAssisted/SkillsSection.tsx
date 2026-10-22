import React from 'react';
import { Skills, SkillCategory, ResumeData } from '../../../../types';
import { AIModeToggle } from '../../../AIAssistant/AIModeToggle';
import { AIChatInterface } from '../../../AIAssistant/AIChatInterface';
import { useAIMode } from '../../../../hooks/useAIMode';
import { useAIAssistant } from '../../../../hooks/useAIAssistant';
import { useConversationHistory } from '../../../../hooks/useConversationHistory';
import { ParsedSkills } from '../../../AIAssistant/types';
import { AISkillsSuggestionCard } from '../../../AIAssistant/AISkillsSuggestionCard';
import { SkillsEditor } from '../Manual/SkillsEditor';

interface SkillsSectionProps {
    resumeData: ResumeData;
    skills: Skills;
    addSkillCategory: () => void;
    updateSkillCategory: (id: string, field: keyof SkillCategory, value: string) => void;
    deleteSkillCategory: (id: string) => void;
    replaceAllSkillCategories: (categories: SkillCategory[]) => void;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({
    resumeData,
    skills,
    addSkillCategory,
    updateSkillCategory,
    deleteSkillCategory,
    replaceAllSkillCategories
}) => {
    // Safety check
    if (!resumeData) {
        console.error('SkillsSection: resumeData is undefined');
        return (
            <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-300">Error: Resume data not loaded</p>
            </div>
        );
    }

    // AI Mode State
    const { mode, isAIMode, showWelcome, toggleMode, dismissWelcome } = useAIMode({
        section: 'skills',
        defaultMode: 'manual'
    });

    // Resume Context for AI
    const resumeContext = {
        target_job: resumeData?.personalInfo?.targetJobTitle || 'Software Engineer',
        existing_skills: resumeData?.skills?.categories || [],
        existing_projects: resumeData?.projects?.map(p => ({
            title: p.title,
            technologies: p.technologies
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
        section: 'skills',
        resumeContext,
        sessionId: sessionIdRef.current
    });

    // Conversation History Hook
    const { exportConversation } = useConversationHistory({
        section: 'skills',
        enabled: isAIMode
    });

    // Handle accepting AI suggestion
    const skillsPreview = () =>
        currentSuggestion && 'skills' in currentSuggestion
            ? currentSuggestion.skills.map(c => c.name).join(', ')
            : '';

    const handleAcceptSuggestion = (editedCategories: SkillCategory[]) => {
        recordSuggestionOutcome({
            status: 'accepted', label: 'Skills',
            preview: editedCategories.map(c => c.name).join(', '),
        });
        replaceAllSkillCategories(editedCategories);
    };

    // Handle rejecting suggestion
    const handleRejectSuggestion = () => {
        recordSuggestionOutcome({
            status: 'rejected', label: 'Skills', preview: skillsPreview(),
        });
    };

    // Handle refinement requests
    const handleRefine = (refinementType: string) => {
        if (!currentSuggestion || !('skills' in currentSuggestion)) return;

        const refinementPrompts: Record<string, string> = {
            add_categories: "Can you suggest additional skill categories that might be relevant?",
            match_jd: "Can you re-prioritize these skills to better match the job description?",
            prioritize: "Can you reorganize these skills putting the most important ones first?"
        };

        recordSuggestionOutcome({
            status: 'refined', label: 'Skills', preview: skillsPreview(),
        });
        sendMessage(refinementPrompts[refinementType] || refinementPrompts.prioritize);
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
                        currentSuggestion={currentSuggestion && 'skills' in currentSuggestion ? currentSuggestion : null}
                        onAcceptSuggestion={handleAcceptSuggestion}
                        onRejectSuggestion={handleRejectSuggestion}
                        onRefineSuggestion={handleRefine}
                        suggestionCardComponent={AISkillsSuggestionCard}
                    />
                </div>
            )}

            {/* Manual Mode Interface */}
            {!isAIMode && (
                /* Manual mode scrolls inside the same fixed column, so the
                   mode switch above stays put either way. */
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <SkillsEditor
                        skills={skills}
                        addSkillCategory={addSkillCategory}
                        updateSkillCategory={updateSkillCategory}
                        deleteSkillCategory={deleteSkillCategory}
                    />
                </div>
            )}
        </div>
    );
};

export default SkillsSection;