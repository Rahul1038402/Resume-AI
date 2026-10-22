import { useEffect, useState } from 'react';
import Header from '@/components/common/Header';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import { TopControls } from './components/TopControls';
import { LayoutSettings as LayoutSettingsComponent } from './components/LayoutSettings';
import { SuggestionsOverlay } from './components/SuggestionsOverlay';
import { useResumeData } from './hooks/useResumeData';
import { useLayoutSettings } from './hooks/useLayoutSettings';
import { useResumeValidation } from './hooks/useResumeValidation';
import { ActiveTab, ActiveSection } from './types';
import { generateResumePDF } from '@/ResumeAnalyzer/api/resumeService';
import '../index.css';
import { SectionNavigation } from './components/SectionNavigation';

const STORAGE_KEY_LAST_SAVED = 'lastSaved';

const loadLastSaved = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
        return saved || '';
    } catch (error) {
        console.error('Error loading last saved:', error);
        return '';
    }
};

const saveLastSaved = (timestamp: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_LAST_SAVED, timestamp);
    } catch (error) {
        console.error('Error saving last saved:', error);
    }
};

function ResumeBuilder() {
    // Custom hooks
    const {
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
        deleteCertification,
        resetResumeData
    } = useResumeData();

    const {
        layoutSettings,
        updateLayoutSettings,
        updateMargin,
        resetLayoutSettings
    } = useLayoutSettings();

    const { warnings, validateResumeData } = useResumeValidation(resumeData);

    // Local state
    const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
    const [activeSection, setActiveSection] = useState<ActiveSection>('personal');
    const [lastSaved, setLastSaved] = useState<string>('');
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    // Load last saved timestamp on mount
    useEffect(() => {
        const saved = loadLastSaved();
        if (saved) setLastSaved(saved);
    }, []);

    // Update last saved timestamp whenever data changes
    useEffect(() => {
        const now = new Date().toLocaleString();
        setLastSaved(now);
        saveLastSaved(now);
    }, [resumeData, layoutSettings]);

    // Validate resume data whenever it changes
    useEffect(() => {
        validateResumeData();
    }, [resumeData, validateResumeData]);

    const resetAllData = () => {
        if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            resetResumeData();
            resetLayoutSettings();
            localStorage.removeItem(STORAGE_KEY_LAST_SAVED);
            setLastSaved('');
        }
    };

    const handleDownload = async () => {
        /*
         * Send the whole page box, not just .resume-content.
         *
         * The page box is what carries the page size, the margins as padding,
         * and the font size, line height and family the user picked. Sending
         * only its child meant the backend had to reconstruct all of that from
         * layoutSettings, and every reconstruction drifted: the harvested
         * Tailwind preflight reset the line height, and block spacing came out
         * around 20% larger than the preview. Shipping the same box the user is
         * looking at makes the PDF a render of the preview rather than a
         * rebuild of it.
         */
        const pageEl = document.getElementById('resume-preview');
        if (!pageEl) return;

        try {
            setIsDownloading(true);
            setDownloadProgress(0);

            // The drop shadow and ring are panel presentation, not the page.
            const clone = pageEl.cloneNode(true) as HTMLElement;
            clone.classList.remove('shadow-2xl', 'shadow-black/60', 'ring-1', 'ring-white/10');
            clone.style.boxShadow = 'none';
            const htmlContent = clone.outerHTML;

            // Extract inline styles from the document
            const styleSheets = Array.from(document.styleSheets);
            let cssContent = '';

            styleSheets.forEach(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    rules.forEach(rule => {
                        cssContent += rule.cssText + '\n';
                    });
                } catch (e) {
                    console.warn('Could not access stylesheet:', e);
                }
            });

            console.log('HTML length:', htmlContent.length);
            console.log('CSS length:', cssContent.length);
            console.log('HTML preview:', htmlContent.substring(0, 500));

            const firstName = resumeData.personalInfo.firstName || 'Resume';
            const lastName = resumeData.personalInfo.lastName || '';
            const fileName = `${firstName}_${lastName}_Resume.pdf`.replace(/\s+/g, '_');

            await generateResumePDF(
                htmlContent,
                cssContent,
                layoutSettings,
                fileName,
                (progress) => setDownloadProgress(progress)
            );

            setTimeout(() => {
                setIsDownloading(false);
                setDownloadProgress(0);
            }, 500);

        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to generate PDF. Please try again.');
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    return (
        <>
            <Header />
            {/* pt-16 clears the fixed bar; the toolbar sticks directly under it. */}
            <div className="min-h-screen bg-ink pt-16">
                {/* Top Controls */}
                <TopControls
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    handleDownload={handleDownload}
                    resetAllData={resetAllData}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                />

                {/* Main content. One container, one set of gutters, so the
                    toolbar, the chips and both columns share an edge. */}
                <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 sm:px-6">
                    <div className="flex flex-col items-start justify-center gap-4 custom:flex-row">
                        {/* Left column: the section chips sit directly above
                            the form they drive, rather than spanning the page. */}
                        <div className="flex w-full min-w-0 flex-col custom:h-[calc(100vh-188px)] custom:max-w-[880px] custom:flex-1">
                            {activeTab === 'editor' && (
                                <SectionNavigation
                                    activeSection={activeSection}
                                    setActiveSection={setActiveSection}
                                />
                            )}

                            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-ink-soft p-4">
                        {activeTab === 'editor' && (
                            <EditorPanel
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                                resumeData={resumeData}
                                updatePersonalInfo={updatePersonalInfo}
                                updateSummary={updateSummary}
                                addSkillCategory={addSkillCategory}
                                updateSkillCategory={updateSkillCategory}
                                deleteSkillCategory={deleteSkillCategory}
                                replaceAllSkillCategories={replaceAllSkillCategories}
                                addProject={addProject}
                                updateProject={updateProject}
                                deleteProject={deleteProject}
                                addProjectDescription={addProjectDescription}
                                updateProjectDescription={updateProjectDescription}
                                deleteProjectDescription={deleteProjectDescription}
                                addExperience={addExperience}
                                updateExperience={updateExperience}
                                deleteExperience={deleteExperience}
                                addExperienceAchievement={addExperienceAchievement}
                                updateExperienceAchievement={updateExperienceAchievement}
                                deleteExperienceAchievement={deleteExperienceAchievement}
                                addEducation={addEducation}
                                updateEducation={updateEducation}
                                deleteEducation={deleteEducation}
                                addCertification={addCertification}
                                updateCertification={updateCertification}
                                deleteCertification={deleteCertification}
                            />
                        )}

                        {activeTab === 'layout' && (
                            <LayoutSettingsComponent
                                layoutSettings={layoutSettings}
                                updateLayoutSettings={updateLayoutSettings}
                                updateMargin={updateMargin}
                            />
                        )}
                            </div>
                        </div>

                        {/* Right Panel: Preview (always visible) */}
                        <PreviewPanel
                            resumeData={resumeData}
                            layoutSettings={layoutSettings}
                            warnings={warnings}
                            setIsSuggestionsOpen={setIsSuggestionsOpen}
                            lastSaved={lastSaved}
                        />
                    </div>
                </div>


                {/* Suggestions Overlay */}
                <SuggestionsOverlay
                    isOpen={isSuggestionsOpen}
                    onClose={() => setIsSuggestionsOpen(false)}
                    warnings={warnings}
                />
            </div>
        </>
    );
}
export default ResumeBuilder;
