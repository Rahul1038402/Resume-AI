import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Sparkles } from 'lucide-react';

export interface ParsedSummary {
  summary: string;
}

interface AISummarySuggestionCardProps {
  suggestion: ParsedSummary | null;
  onAccept: (edited: string) => void;
  onReject: () => void;
  onRefine?: (type: string) => void;
}

export const AISummarySuggestionCard: React.FC<AISummarySuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  onRefine
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  useEffect(() => {
    if (suggestion) {
      setEditedSummary(suggestion.summary);
      setIsEditing(false);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const handleAccept = () => {
    onAccept(editedSummary);
  };

  const wordCount = editedSummary.trim().split(/\s+/).length;
  const isIdealLength = wordCount >= 40 && wordCount <= 45;
  const isTooShort = wordCount < 40;
  const isTooLong = wordCount > 45;

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
        <div>
          <label className="text-xs text-mute text-mute mb-1 block font-medium">Professional Summary</label>
          {isEditing ? (
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              rows={4}
              className="rb-textarea resize-none"
              placeholder="Write your professional summary..."
            />
          ) : (
            <p className="text-mute text-sm leading-relaxed">{editedSummary}</p>
          )}
          
          {/* Word Count Indicator */}
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs ${
              isIdealLength ? 'text-green-400' :
              isTooShort ? 'text-mute' :
              'text-orange-400'
            }`}>
              {wordCount} words
              {isIdealLength && ' ✓ Ideal length'}
              {isTooShort && ' - Add more detail'}
              {isTooLong && ' - Try to shorten'}
            </span>
            <span className="text-xs text-mute font-medium">Target: 40-45 words</span>
          </div>
        </div>
      </div>

      {/* Quick Refinement Buttons */}
      {onRefine && !isEditing && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-line">
          <span className="text-xs text-mute text-mute w-full mb-1 font-medium">Quick refinements:</span>
          <button
            onClick={() => onRefine('impactful')}
            className="rb-chip"
          >
            More Impactful
          </button>
          <button
            onClick={() => onRefine('keywords')}
            className="rb-chip"
          >
            Add Keywords
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
        You can edit the summary before adding to your resume
      </p>
    </div>
  );
};