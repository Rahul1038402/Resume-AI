import { Plus, Trash2 } from 'lucide-react';
import { Education } from '../../../types/index';

interface EducationEditorProps {
    education: Education[];
    addEducation: () => void;
    updateEducation: (id: string, field: keyof Education, value: string) => void;
    deleteEducation: (id: string) => void;
}

export const EducationEditor = ({
    education,
    addEducation,
    updateEducation,
    deleteEducation
}: EducationEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Education
            </h3>

            <button
                onClick={addEducation}
                className="w-full px-4 py-2 
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
                Add Education
            </button>

            <div className="space-y-4">
                {education.map((edu) => (
                    <div key={edu.id} className="p-4 border border-line rounded-lg space-y-2.5">
                        <div className="flex justify-end">
                            <button
                                onClick={() => deleteEducation(edu.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="rb-label">Institution <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={edu.institution}
                                onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                className="rb-input"
                                placeholder="University Name"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                                <label className="rb-label">Degree <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={edu.degree}
                                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                    className="rb-input"
                                    placeholder="B.Tech"
                                />
                            </div>

                            <div>
                                <label className="rb-label">Field of Study <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={edu.field}
                                    onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                                    className="rb-input"
                                    placeholder="Computer Science"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                                <label className="rb-label">Start Date</label>
                                <input
                                    type="text"
                                    value={edu.startDate}
                                    onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                    className="rb-input"
                                    placeholder="2023"
                                />
                            </div>

                            <div>
                                <label className="rb-label">End Date <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={edu.endDate}
                                    onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                    className="rb-input"
                                    placeholder="2027"
                                />
                            </div>

                            <div>
                                <label className="rb-label">GPA <span className='text-mute text-mute text-xs'>(Optional)</span></label>
                                <input
                                    type="number"
                                    value={edu.gpa}
                                    onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                                    className="rb-input"
                                    placeholder="8.5/10.0"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};