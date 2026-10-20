import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Sparkles, ExternalLink } from 'lucide-react';
import { ParsedProject } from './types';

interface AIProjectSuggestionCardProps {
  suggestion: ParsedProject | null;
  onAccept: (edited: ParsedProject) => void;
  onReject: () => void;
  onRefine?: (type: string) => void;
}

export const AIProjectSuggestionCard: React.FC<AIProjectSuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  onRefine
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState<ParsedProject | null>(null);

  useEffect(() => {
    if (suggestion) {
      setEditedSuggestion({ ...suggestion });
      setIsEditing(false);
    }
  }, [suggestion]);

  if (!suggestion || !editedSuggestion) return null;

  const handleAccept = () => {
    onAccept(editedSuggestion);
  };

  const handleDescriptionChange = (index: number, value: string) => {
    setEditedSuggestion(prev => {
      if (!prev) return prev;
      const newDesc = [...prev.description];
      newDesc[index] = value;
      return { ...prev, description: newDesc };
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
        {/* Project Title */}
        <div>
          <label className="text-xs text-mute text-mute mb-1 block font-medium">Project Title</label>
          {isEditing ? (
            <input
              type="text"
              value={editedSuggestion.title}
              onChange={(e) => setEditedSuggestion(prev => prev ? { ...prev, title: e.target.value } : prev)}
              className="rb-input"
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-white font-medium">{editedSuggestion.title}</p>
              {editedSuggestion.link && (
                <a
                  href={editedSuggestion.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mute transition-colors hover:text-white"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Link */}
        {isEditing && (
          <div>
            <label className="text-xs text-mute text-mute mb-1 block font-medium">Project Link (optional)</label>
            <input
              type="url"
              value={editedSuggestion.link || ''}
              onChange={(e) => setEditedSuggestion(prev => prev ? { ...prev, link: e.target.value } : prev)}
              placeholder="https://github.com/username/project"
              className="rb-input"
            />
          </div>
        )}

        {/* Tech Stack */}
        <div>
          <label className="text-xs text-mute text-mute mb-1 block font-medium">Tech Stack</label>
          {isEditing ? (
            <input
              type="text"
              value={editedSuggestion.technologies}
              onChange={(e) => setEditedSuggestion(prev => prev ? { ...prev, technologies: e.target.value } : prev)}
              placeholder="React, Node.js, MongoDB"
              className="rb-input"
            />
          ) : (
            <p className="text-[0.8rem] text-mute">{editedSuggestion.technologies}</p>
          )}
        </div>

        {/* Descriptions */}
        <div>
          <label className="text-xs text-mute text-mute mb-2 block font-medium">Key Points</label>
          <div className="space-y-2.5">
            {editedSuggestion.description.map((desc, index) => (
              <div key={index}>
                {isEditing ? (
                  <textarea
                    value={desc}
                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                    rows={2}
                    className="rb-textarea resize-none"
                    placeholder={
                      index === 0 ? "What the project does..." :
                      index === 1 ? "How you built it..." :
                      "Impact with metrics..."
                    }
                  />
                ) : (
                  <div className="flex items-start gap-2 text-mute">
                    <span className="mt-1 text-mute">•</span>
                    <p className="flex-1 text-sm">{desc}</p>
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
          <span className="text-xs text-mute text-mute w-full mb-1 font-medium">Quick refinements (Select any one):</span>
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