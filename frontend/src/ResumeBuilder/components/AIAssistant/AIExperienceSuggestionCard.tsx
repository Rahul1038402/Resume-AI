import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Sparkles } from 'lucide-react';

interface ParsedExperience {
  position: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  achievements: string[];
}

interface AIExperienceSuggestionCardProps {
  suggestion: ParsedExperience | null;
  onAccept: (edited: ParsedExperience) => void;
  onReject: () => void;
  onRefine?: (type: string) => void;
}

export const AIExperienceSuggestionCard: React.FC<AIExperienceSuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  onRefine
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedExperience, setEditedExperience] = useState<ParsedExperience | null>(null);

  useEffect(() => {
    if (suggestion) {
      setEditedExperience({ ...suggestion });
      setIsEditing(false);
    }
  }, [suggestion]);

  if (!suggestion || !editedExperience) return null;

  const handleAccept = () => {
    onAccept(editedExperience);
  };

  const handleAchievementChange = (index: number, value: string) => {
    setEditedExperience(prev => {
      if (!prev) return prev;
      const newAchievements = [...prev.achievements];
      newAchievements[index] = value;
      return { ...prev, achievements: newAchievements };
    });
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
        {/* Position */}
        <div>
          <label className="text-xs text-mute text-mute mb-1 block font-medium">Position</label>
          {isEditing ? (
            <input
              type="text"
              value={editedExperience.position}
              onChange={(e) => setEditedExperience(prev => prev ? { ...prev, position: e.target.value } : prev)}
              className="rb-input"
            />
          ) : (
            <p className="text-white font-medium">{editedExperience.position}</p>
          )}
        </div>

        {/* Company & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-mute text-mute mb-1 block font-medium">Company</label>
            {isEditing ? (
              <input
                type="text"
                value={editedExperience.company}
                onChange={(e) => setEditedExperience(prev => prev ? { ...prev, company: e.target.value } : prev)}
                className="rb-input"
              />
            ) : (
              <p className="text-[0.8rem] text-mute">{editedExperience.company}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs text-mute text-mute mb-1 block font-medium">Location</label>
            {isEditing ? (
              <input
                type="text"
                value={editedExperience.location}
                onChange={(e) => setEditedExperience(prev => prev ? { ...prev, location: e.target.value } : prev)}
                className="rb-input"
              />
            ) : (
              <p className="text-mute text-sm">{editedExperience.location}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-mute text-mute mb-1 block font-medium">Start Date</label>
            {isEditing ? (
              <input
                type="text"
                value={editedExperience.startDate}
                onChange={(e) => setEditedExperience(prev => prev ? { ...prev, startDate: e.target.value } : prev)}
                className="rb-input"
                placeholder="Jan 2023"
              />
            ) : (
              <p className="text-mute text-sm">{editedExperience.startDate}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs text-mute text-mute mb-1 block font-medium">End Date</label>
            {isEditing ? (
              <input
                type="text"
                value={editedExperience.endDate}
                onChange={(e) => setEditedExperience(prev => prev ? { ...prev, endDate: e.target.value } : prev)}
                className="rb-input"
                placeholder="Present"
              />
            ) : (
              <p className="text-mute text-sm">{editedExperience.endDate}</p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <label className="text-xs text-mute text-mute mb-2 block font-medium">Key Achievements</label>
          <div className="space-y-2.5">
            {editedExperience.achievements.map((achievement, index) => (
              <div key={index}>
                {isEditing ? (
                  <textarea
                    value={achievement}
                    onChange={(e) => handleAchievementChange(index, e.target.value)}
                    rows={2}
                    className="rb-textarea resize-none"
                  />
                ) : (
                  <div className="flex items-start gap-2 text-mute">
                    <span className="mt-1 text-mute">•</span>
                    <p className="flex-1 text-sm">{achievement}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Refinement Buttons */}
      {onRefine && !isEditing && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-line">
          <span className="text-xs text-mute text-mute w-full mb-1 font-medium">Quick refinements:</span>
          <button
            onClick={() => onRefine('quantify')}
            className="rb-chip"
          >
            Add Metrics
          </button>
          <button
            onClick={() => onRefine('technical')}
            className="rb-chip"
          >
            More Technical
          </button>
          <button
            onClick={() => onRefine('simplify')}
            className="rb-chip"
          >
            Simplify
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
        You can edit any field before adding to your resume
      </p>
    </div>
  );
};