import { Plus, Trash2 } from 'lucide-react';
import { Skills, SkillCategory } from '../../../../types/index';

interface SkillsEditorProps {
    skills: Skills;
    addSkillCategory: () => void;
    updateSkillCategory: (id: string, field: keyof SkillCategory, value: string) => void;
    deleteSkillCategory: (id: string) => void;
}

export const SkillsEditor = ({
    skills,
    addSkillCategory,
    updateSkillCategory,
    deleteSkillCategory
}: SkillsEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Technical Skills
            </h3>

            <button
                onClick={addSkillCategory}
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
                Add Skill Category
            </button>

            <div className="space-y-2.5">
                {skills.categories.map((category) => (
                    <div key={category.id} className="p-4 border border-line rounded-lg space-y-2.5">
                        <div className="flex justify-end">
                            <button
                                onClick={() => deleteSkillCategory(category.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="rb-label">Category Name</label>
                            <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateSkillCategory(category.id, 'name', e.target.value)}
                                className="rb-input"
                                placeholder="e.g., Languages"
                            />
                        </div>

                        <div>
                            <label className="rb-label">Skills (comma-separated)</label>
                            <input
                                type="text"
                                value={category.value}
                                onChange={(e) => updateSkillCategory(category.id, 'value', e.target.value)}
                                className="rb-input"
                                placeholder="e.g., JavaScript, Python, Java"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};