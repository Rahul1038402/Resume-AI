import React from 'react';
import { Sparkles, Edit3 } from 'lucide-react';
import ShinyText from '@/components/ui/ShinyText';

interface AIModeToggleProps {
  mode: 'manual' | 'ai';
  onToggle: () => void;
  disabled?: boolean;
  rateLimits?: {
    remaining_section: number;
    remaining_session: number;
  };
}

export const AIModeToggle: React.FC<AIModeToggleProps> = ({ 
  mode, 
  onToggle, 
  disabled = false,
  rateLimits 
}) => {
  const isAIMode = mode === 'ai';

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Toggle Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors duration-200
            ${!isAIMode
              ? 'border-line-bright bg-white/10 text-white'
              : 'border-line text-mute hover:border-line-strong hover:text-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Edit3 size={15} strokeWidth={1.6} />
          <span>Manual</span>
        </button>

        <button
          onClick={onToggle}
          disabled={disabled}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors duration-200
            ${isAIMode
              ? 'border-line-bright bg-white/10 text-white'
              : 'border-line text-mute hover:border-line-strong hover:text-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Sparkles size={15} strokeWidth={1.6} />
          <span>AI Assisted</span>
        </button>
      </div>

      {/* Rate Limit Display */}
      {isAIMode && rateLimits && (
        <div className="flex items-center justify-between px-1 text-[0.7rem] font-medium text-mute">
          <span>
            {rateLimits.remaining_section} of 15 requests left in this section
          </span>
          {rateLimits.remaining_section <= 3 && (
            <span className="text-mute">Running low</span>
          )}
        </div>
      )}
    </div>
  );
};