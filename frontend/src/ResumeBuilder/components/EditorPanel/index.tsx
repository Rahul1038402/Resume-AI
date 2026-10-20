import { ActiveSection, SkillCategory } from '../../types';
import { PersonalInfoEditor } from './personalinfo/PersonalInfoEditor';
import ProjectsSection from './project/AIAssisted/ProjectsSection';
import { EducationEditor } from './education/EducationEditor';
import { CertificationsEditor } from './certifications/CertificationsEditor';
import SummarySection from './summary/AIAssisted/SummarySection';
import SkillsSection from './skills/AIAssisted/SkillsSection';
import ExperienceSection from './experience/AIAssisted/ExperienceSection';

interface EditorPanelProps {
    activeSection: ActiveSection;
    setActiveSection: (section: ActiveSection) => void;
    resumeData: any;
    updatePersonalInfo: (field: string, value: string) => void;
    updateSummary: (value: string) => void;
    // Skills
    addSkillCategory: () => void;
    updateSkillCategory: (id: string, field: string, value: string) => void;
    deleteSkillCategory: (id: string) => void;
    replaceAllSkillCategories: (categories: SkillCategory[]) => void;
    // Projects
    addProject: () => void;
    updateProject: (id: string, field: string, value: string | string[]) => void;
    deleteProject: (id: string) => void;
    addProjectDescription: (projectId: string) => void;
    updateProjectDescription: (projectId: string, index: number, value: string) => void;
    deleteProjectDescription: (projectId: string, index: number) => void;
    // Experience
    addExperience: () => void;
    updateExperience: (id: string, field: string, value: string | string[]) => void;
    deleteExperience: (id: string) => void;
    addExperienceAchievement: (expId: string) => void;
    updateExperienceAchievement: (expId: string, index: number, value: string) => void;
    deleteExperienceAchievement: (expId: string, index: number) => void;
    // Education
    addEducation: () => void;
    updateEducation: (id: string, field: string, value: string) => void;
    deleteEducation: (id: string) => void;
    // Certifications
    addCertification: () => void;
    updateCertification: (id: string, field: string, value: string) => void;
    deleteCertification: (id: string) => void;
}

const EditorPanel = ({
    activeSection,
    setActiveSection,
    resumeData,
    updatePersonalInfo,
    updateSummary,
    addSkillCategory,
    updateSkillCategory,
    deleteSkillCategory,
    replaceAllSkillCategories,
    addProject,
    updateProject,
    deleteProject,
    addProjectDescription,
    updateProjectDescription,
    deleteProjectDescription,
    addExperience,
    updateExperience,
    deleteExperience,
    addExperienceAchievement,
    updateExperienceAchievement,
    deleteExperienceAchievement,
    addEducation,
    updateEducation,
    deleteEducation,
    addCertification,
    updateCertification,
    deleteCertification
}: EditorPanelProps) => {
    return (
        <div className="h-full w-full max-w-full overflow-y-auto">

            {/* Section Content */}
            {activeSection === 'personal' && (
                <PersonalInfoEditor
                    personalInfo={resumeData.personalInfo}
                    updatePersonalInfo={updatePersonalInfo}
                />
            )}
            {activeSection === 'summary' && (
                <SummarySection
                    resumeData={resumeData}
                    summary={resumeData.summary}
                    updateSummary={updateSummary}
                />
            )}
            {activeSection === 'skills' && (
                <SkillsSection
                    resumeData={resumeData}
                    skills={resumeData.skills}
                    addSkillCategory={addSkillCategory}
                    updateSkillCategory={updateSkillCategory}
                    deleteSkillCategory={deleteSkillCategory}
                    replaceAllSkillCategories={replaceAllSkillCategories}
                />
            )}
            {activeSection === 'projects' && (
                <ProjectsSection
                    resumeData={resumeData}
                    projects={resumeData.projects || []}
                    addProject={addProject}
                    updateProject={updateProject}
                    deleteProject={deleteProject}
                    addProjectDescription={addProjectDescription}
                    updateProjectDescription={updateProjectDescription}
                    deleteProjectDescription={deleteProjectDescription}
                />
            )}
            {activeSection === 'experience' && (
                <ExperienceSection
                    resumeData={resumeData}
                    experience={resumeData.experience}
                    addExperience={addExperience}
                    updateExperience={updateExperience}
                    deleteExperience={deleteExperience}
                    addExperienceAchievement={addExperienceAchievement}
                    updateExperienceAchievement={updateExperienceAchievement}
                    deleteExperienceAchievement={deleteExperienceAchievement}
                />
            )}
            {activeSection === 'education' && (
                <EducationEditor
                    education={resumeData.education}
                    addEducation={addEducation}
                    updateEducation={updateEducation}
                    deleteEducation={deleteEducation}
                />
            )}
            {activeSection === 'certifications' && (
                <CertificationsEditor
                    certifications={resumeData.certifications}
                    addCertification={addCertification}
                    updateCertification={updateCertification}
                    deleteCertification={deleteCertification}
                />
            )}
        </div>
    );
};
export default EditorPanel;