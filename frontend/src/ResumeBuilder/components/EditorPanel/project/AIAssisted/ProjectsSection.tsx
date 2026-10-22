import React from 'react';
import { Project, ResumeData } from '../../../../types';
import { AIModeToggle } from '../../../AIAssistant/AIModeToggle';
import { AIChatInterface } from '../../../AIAssistant/AIChatInterface';
import { AIProjectSuggestionCard } from '../../../AIAssistant/AIProjectSuggestionCard';
import { useAIMode } from '../../../../hooks/useAIMode';
import { useAIAssistant } from '../../../../hooks/useAIAssistant';
import { useConversationHistory } from '../../../../hooks/useConversationHistory';
import { ParsedProject } from '../../../AIAssistant/types';
import ManualProjectsEditor from '../Manual/ProjectsEditor';

interface ProjectsSectionProps {
  resumeData: ResumeData;
  projects: Project[];
  addProject: () => void;
  updateProject: (id: string, field: keyof Project, value: string | string[]) => void;
  deleteProject: (id: string) => void;
  addProjectDescription: (projectId: string) => void;
  updateProjectDescription: (projectId: string, index: number, description: string) => void;
  deleteProjectDescription: (projectId: string, index: number) => void;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  resumeData,
  projects,
  addProject,
  updateProject,
  deleteProject,
  addProjectDescription,
  updateProjectDescription,
  deleteProjectDescription
}) => {
  // Safety check for resumeData
  if (!resumeData) {
    console.error('ProjectsSection: resumeData is undefined');
    return (
      <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300">Error: Resume data not loaded</p>
      </div>
    );
  }

  // AI Mode State
  const { mode, isAIMode, showWelcome, toggleMode, dismissWelcome } = useAIMode({
    section: 'projects',
    defaultMode: 'manual'
  });

  // Resume Context for AI
  const resumeContext = {
    target_job: resumeData?.personalInfo?.targetJobTitle || 'Software Engineer',
    skills: resumeData?.skills?.categories?.map(cat => cat.value).join(', ').split(', ').filter(Boolean) || [],
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
    section: 'projects',
    resumeContext,
    sessionId: sessionIdRef.current
  });

  // Conversation History Hook
  const { exportConversation } = useConversationHistory({
    section: 'projects',
    enabled: isAIMode
  });

  // Handle accepting AI suggestion
  const projectPreview = () =>
    currentSuggestion && 'title' in currentSuggestion ? currentSuggestion.title : '';

  const handleAcceptSuggestion = (edited: ParsedProject) => {
    // Recording the outcome clears the card and leaves a line saying so.
    recordSuggestionOutcome({
      status: 'accepted', label: 'Project', preview: edited.title,
    });
    
    // Add new project
    addProject();
    
    // Get the newly created project (will be the last one)
    setTimeout(() => {
      const newProjectId = resumeData.projects[resumeData.projects.length - 1]?.id;
      if (newProjectId) {
        updateProject(newProjectId, 'title', edited.title);
        updateProject(newProjectId, 'technologies', edited.technologies);
        updateProject(newProjectId, 'link', edited.link || '');
        updateProject(newProjectId, 'description', edited.description.filter(d => d.trim() !== ''));
      }
    }, 100);
  };

  // Handle rejecting suggestion
  const handleRejectSuggestion = () => {
    recordSuggestionOutcome({
      status: 'rejected', label: 'Project', preview: projectPreview(),
    });
  };

  // Handle refinement requests
  const handleRefine = (refinementType: string) => {
    if (!currentSuggestion) return;

    const refinementPrompts: Record<string, string> = {
      quantify: "Can you add more quantifiable metrics and numbers to show the impact?",
      technical: "Can you add more technical depth and implementation details?",
      simplify: "Can you simplify this to be more concise and accessible?",
      expand: "Can you expand each point with more context and detail?"
    };

    recordSuggestionOutcome({
      status: 'refined', label: 'Project', preview: projectPreview(),
    });
    
    // Send refinement request
    sendMessage(refinementPrompts[refinementType] || refinementPrompts.quantify);
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
            currentSuggestion={currentSuggestion}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onRefineSuggestion={handleRefine}
            suggestionCardComponent={AIProjectSuggestionCard}
          />
        </div>
      )}

      {/* Manual Mode Interface */}
      {!isAIMode && (
          /* Manual mode scrolls inside the same fixed column, so the
             mode switch above stays put either way. */
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ManualProjectsEditor
              projects={projects}
              addProject={addProject}
              updateProject={updateProject}
              deleteProject={deleteProject}
              addProjectDescription={addProjectDescription}
              updateProjectDescription={updateProjectDescription}
              deleteProjectDescription={deleteProjectDescription}
            />
          </div>
      )}
    </div>
  );
};

export default ProjectsSection;