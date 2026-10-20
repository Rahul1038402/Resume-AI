import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Sparkles, Plus, Trash2 } from 'lucide-react';

interface SkillCategory {
  name: string;
  value: string;
}

interface ParsedSkills {
  skills: SkillCategory[];
}

interface AISkillsSuggestionCardProps {
  suggestion: ParsedSkills | null;
  onAccept: (edited: SkillCategory[]) => void;
  onReject: () => void;
  onRefine?: (type: string) => void;
}

export const AISkillsSuggestionCard: React.FC<AISkillsSuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  onRefine
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSkills, setEditedSkills] = useState<SkillCategory[]>([]);

  useEffect(() => {
    if (suggestion) {
      setEditedSkills([...suggestion.skills]);
      setIsEditing(false);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const handleAccept = () => {
    onAccept(editedSkills);
  };

  const updateCategory = (index: number, field: 'name' | 'value', value: string) => {
    setEditedSkills(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCategory = () => {
    setEditedSkills(prev => [...prev, { name: '', value: '' }]);
  };

  const removeCategory = (index: number) => {
    setEditedSkills(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-line bg-ink-card p-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-white" size={20} />
          <h3 className="text-sm font-medium text-white">AI Suggestion</h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex justify-center items-center gap-2 p-2 text-neutral-200 text-mute hover:text-white dark:hover:text-mute rounded-lg transition-colors"
          title={isEditing ? "Preview" : "Edit"}
        >
          <Edit2 size={16} />
          <span className="text-sm">Edit</span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4 mb-4">
        <label className="text-xs text-mute text-mute mb-2 block font-medium">Skill Categories</label>
        
        <div className="space-y-2.5">
          {editedSkills.map((category, index) => (
            <div key={index} className="space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateCategory(index, 'name', e.target.value)}
                        className="rb-input"
                        placeholder="Category name (e.g., Languages)"
                      />
                      <input
                        type="text"
                        value={category.value}
                        onChange={(e) => updateCategory(index, 'value', e.target.value)}
                        className="rb-input"
                        placeholder="Skills (comma-separated)"
                      />
                    </div>
                    {editedSkills.length > 1 && (
                      <button
                        onClick={() => removeCategory(index)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[0.8rem] font-medium text-white">{category.name}:</span>
                    <span className="text-mute text-sm">{category.value}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Category Button (Edit Mode) */}
        {isEditing && (
          <button
            onClick={addCategory}
            className="w-full mt-3 px-3 py-2 border-2 border-dotted border-line-strong hover:border-line-bright rounded-lg flex items-center justify-center gap-2 text-mute hover:text-white transition-colors text-sm"
          >
            <Plus size={16} />
            Add Category
          </button>
        )}
      </div>

      {/* Quick Refinement Buttons */}
      {onRefine && !isEditing && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-line">
          <span className="text-xs text-mute text-mute w-full mb-1 font-medium">Quick refinements:</span>
          <button
            onClick={() => onRefine('add_categories')}
            className="rb-chip"
          >
            ➕ Add Categories
          </button>
          <button
            onClick={() => onRefine('match_jd')}
            className="rb-chip"
          >
            Match to JD
          </button>
          <button
            onClick={() => onRefine('prioritize')}
            className="rb-chip"
          >
            ⭐ Prioritize
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90"
        >
          <Check size={18} />
          Add to Resume
        </button>
        <button
          onClick={onReject}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-ink-raised hover:bg-white/[0.10] text-white rounded-lg transition-colors"
        >
          <X size={18} />
          Reject
        </button>
      </div>

      {/* Tip */}
      <p className="text-xs text-mute text-mute mt-4 text-center font-medium">
        Review and edit categories before adding to your resume
      </p>
    </div>
  );
};