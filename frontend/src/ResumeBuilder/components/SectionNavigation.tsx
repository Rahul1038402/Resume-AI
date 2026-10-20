import { User, Briefcase, GraduationCap, Award, Code, FolderOpen, NotebookPen } from 'lucide-react';
import { ActiveSection } from '../types';

interface SectionNavigationProps {
    activeSection: ActiveSection;
    setActiveSection: (section: ActiveSection) => void;
}

const sections = [
    { id: 'personal', icon: User, label: 'Personal' },
    { id: 'summary', icon: NotebookPen, label: 'Summary' },
    { id: 'skills', icon: Code, label: 'Skills' },
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
    { id: 'experience', icon: Briefcase, label: 'Experience' },
    { id: 'education', icon: GraduationCap, label: 'Education' },
    { id: 'certifications', icon: Award, label: 'Certifications' },
] as const;

/**
 * Which part of the resume you are filling in.
 *
 * Sits directly above the editor column rather than spanning the page, so it
 * reads as belonging to the form it drives rather than to the whole screen.
 *
 * Wraps rather than scrolls sideways: seven chips do not fit a 560px column,
 * and a sideways scroller hid the last two entirely with no affordance that
 * they existed.
 */
export const SectionNavigation = ({ activeSection, setActiveSection }: SectionNavigationProps) => {
    return (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
            {sections.map(({ id, icon: Icon, label }) => {
                const on = activeSection === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveSection(id as ActiveSection)}
                        aria-pressed={on}
                        className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-[0.8rem] transition-colors duration-200 ${
                            on
                                ? 'border-line-bright bg-white/10 text-white'
                                : 'border-line text-mute hover:border-line-strong hover:text-white'
                        }`}
                    >
                        <Icon size={15} strokeWidth={1.6} />
                        {label}
                    </button>
                );
            })}
        </div>
    );
};
