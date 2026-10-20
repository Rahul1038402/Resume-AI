import { Plus, Trash2 } from 'lucide-react';
import { Experience } from '../../../../types/index';

interface ExperienceEditorProps {
    experience: Experience[];
    addExperience: () => void;
    updateExperience: (id: string, field: keyof Experience, value: string | string[]) => void;
    deleteExperience: (id: string) => void;
    addExperienceAchievement: (expId: string) => void;
    updateExperienceAchievement: (expId: string, index: number, value: string) => void;
    deleteExperienceAchievement: (expId: string, index: number) => void;
}

export const ExperienceEditor = ({
    experience,
    addExperience,
    updateExperience,
    deleteExperience,
    addExperienceAchievement,
    updateExperienceAchievement,
    deleteExperienceAchievement
}: ExperienceEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Work Experience
            </h3>

            <button
                onClick={addExperience}
                className="        w-full px-4 py-2 
        border-2 border-dotted border-line-strong 
        border-line-bright
        rounded-lg 
        flex items-center justify-center gap-2 
        text-white
        hover:border-line-bright
        transition-colors
        bg-transparent"
            >
                <Plus size={16} />
                Add Experience
            </button>

            <div className="space-y-4">
                {experience.map((exp) => (
                    <div key={exp.id} className="p-4 border border-line rounded-lg space-y-2.5">
                        <div className="flex justify-end">
                            <button
                                onClick={() => deleteExperience(exp.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                            <label className="rb-label">Position <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={exp.position}
                                onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                                className="rb-input"
                                placeholder="Software Engineer"
                            />
                            </div>
                            <div>
                            <label className="rb-label">Company <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={exp.company}
                                onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                className="rb-input"
                                placeholder="Company Name"
                            />
                            </div>
                            <div>
                            <label className="rb-label">Location <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={exp.location}
                                onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                                className="rb-input"
                                placeholder="Delhi, India / Remote"
                            />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                                <label className="rb-label">Start Date <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={exp.startDate}
                                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                    className="rb-input"
                                    placeholder="Jan 2023"
                                />
                            </div>

                            <div>
                                <label className="rb-label">End Date <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={exp.endDate}
                                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                    className="rb-input"
                                    placeholder="Present"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="rb-label mb-0">Achievements</label>
                                <button
                                    onClick={() => addExperienceAchievement(exp.id)}
                                    className="text-white hover:text-white/80 dark:text-white dark:hover:text-white/80 flex items-center text-xs font-medium"
                                >
                                    <Plus size={14} />
                                    Add Achievement
                                </button>
                            </div>

                            <div className="space-y-2">
                                {exp.achievements.map((achievement, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={achievement}
                                            onChange={(e) => updateExperienceAchievement(exp.id, index, e.target.value)}
                                            className="rb-input"
                                            placeholder="Describe your achievement..."
                                        />
                                        {exp.achievements.length > 1 && (
                                            <button
                                                onClick={() => deleteExperienceAchievement(exp.id, index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};