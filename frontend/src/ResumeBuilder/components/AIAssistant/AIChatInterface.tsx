import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Trash2, X, Download, ArrowUp, Square, Check, RefreshCw } from 'lucide-react';
import { AIMessage } from './types';

interface AIChatInterfaceProps {
    messages: AIMessage[];
    isLoading: boolean;
    error: string | null;
    onSendMessage: (message: string) => void;
    onClearMessages: () => void;
    onCancelRequest?: () => void;
    onExportConversation?: () => void;
    showWelcome?: boolean;
    onDismissWelcome?: () => void;
    rateLimits?: {
        remaining_section: number;
        remaining_session: number;
    };
    currentSuggestion?: any | null;
    onAcceptSuggestion?: (suggestion: any) => void;
    onRejectSuggestion?: () => void;
    onRefineSuggestion?: (type: string) => void;
    suggestionCardComponent?: React.ComponentType<any>;
}

/** One row when empty, three at most. */
const MAX_INPUT_ROWS = 3;

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
    messages,
    isLoading,
    error,
    onSendMessage,
    onClearMessages,
    onCancelRequest,
    onExportConversation,
    showWelcome = false,
    onDismissWelcome,
    rateLimits,
    currentSuggestion,
    onAcceptSuggestion,
    onRejectSuggestion,
    onRefineSuggestion,
    suggestionCardComponent: SuggestionCardComponent,
}) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentSuggestion]);

    /*
     * Grow the field with what is typed: one row empty, up to three, then
     * stop.
     *
     * It was a fixed two rows, so an empty box reserved a blank line and a
     * long answer scrolled inside a window too small to read it - the thing
     * you are composing should be visible while you compose it.
     *
     * Measured from the computed style rather than assumed, so changing the
     * font size or padding does not quietly break the maximum.
     */
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        el.style.height = 'auto';

        const cs = window.getComputedStyle(el);
        const line = parseFloat(cs.lineHeight) || 20;
        const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);

        const max = line * MAX_INPUT_ROWS + padding + border;
        const wanted = el.scrollHeight + border;

        el.style.height = `${Math.min(wanted, max)}px`;
        // Past three rows it still scrolls; .no-scrollbar just hides the track.
        el.style.overflowY = wanted > max ? 'auto' : 'hidden';
    }, [inputValue]);

    // Auto-focus input
    useEffect(() => {
        if (!isLoading) {
            inputRef.current?.focus();
        }
    }, [isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        onSendMessage(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const isRateLimitLow = rateLimits && rateLimits.remaining_section <= 3;
    const isRateLimitExhausted = rateLimits && rateLimits.remaining_section === 0;

    return (
        /*
          * Fills whatever height the editor column gives it.
          *
          * This was a fixed 520px, which together with the mode toggle came to
          * more than the panel had - so the panel itself scrolled, and the
          * Manual / AI Assisted switch scrolled off the top. The only thing
          * that should ever scroll here is the transcript.
          */
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-ink">
            {/* Header */}
            <div className="flex items-center justify-end p-2 border-b border-line dark:bg-black">
                <div className="flex items-center gap-2">
                    {onExportConversation && messages.length > 0 && (
                        <button
                            onClick={onExportConversation}
                            className="p-2 text-mute hover:text-white hover:bg-ink-raised text-mute dark:hover:text-mute hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Export conversation"
                        >
                            <Download size={18} />
                        </button>
                    )}
                    {messages.length > 0 && (
                        <button
                            onClick={onClearMessages}
                            className="p-2 text-mute hover:text-red-400 hover:bg-ink-raised text-mute dark:hover:text-red-400 hover:bg-white/[0.06] rounded-lg transition-colors"
                            title="Clear conversation"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Welcome Message */}
            {showWelcome && messages.length === 0 && (
                <div className="relative m-3 rounded-lg border border-line bg-ink-card p-4">
                    <button
                        onClick={onDismissWelcome}
                        aria-label="Dismiss"
                        className="absolute right-2.5 top-2.5 text-mute-faint transition-colors hover:text-white"
                    >
                        <X size={14} />
                    </button>

                    <span className="block text-[0.65rem] uppercase tracking-[0.18em] text-mute-faint font-medium">
                        How this works
                    </span>
                    <p className="mt-2 max-w-md text-[0.8rem] leading-relaxed text-mute">
                        Describe the role in your own words. I will turn it into resume-ready
                        bullets and ask follow-up questions where detail is missing.
                    </p>

                    {/* The example reads as something someone typed, so it is set
                        like quoted input rather than like a callout. */}
                    <p className="mt-3 border-l border-line-strong pl-3 text-[0.8rem] italic leading-relaxed text-mute-dim">
                        “I have 3 years of experience building web apps with React and Node.js”
                    </p>
                </div>
            )}

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !showWelcome && (
                    <div className="flex h-[95%] items-center justify-center">
                        <p className="max-w-xs text-center text-[0.8rem] leading-relaxed text-mute-faint">
                            Describe this part of your history and I will draft it.
                        </p>
                    </div>
                )}

                {messages.map(message => {
                    const isUser = message.role === 'user';

                    /*
                     * A suggestion that has been dealt with. Compact on
                     * purpose: the full text already lives in the resume, so
                     * this only has to be enough to recognise which one it
                     * was and what happened to it.
                     */
                    if (message.outcome) {
                        const { status, label, preview } = message.outcome;
                        const accepted = status === 'accepted';
                        const refined = status === 'refined';
                        const verb = accepted ? 'Added to resume'
                            : refined ? 'Sent back for changes'
                            : 'Dismissed';

                        return (
                            <div key={message.id} className="flex justify-start">
                                <div className={`max-w-[90%] w-full rounded-lg border px-3.5 py-2.5 ${
                                    accepted
                                        ? 'border-line-bright bg-white/[0.05]'
                                        : 'border-line bg-ink-card/60'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {accepted ? (
                                            <Check size={13} className="shrink-0 text-white" strokeWidth={2.4} />
                                        ) : refined ? (
                                            <RefreshCw size={13} className="shrink-0 text-mute" strokeWidth={2.2} />
                                        ) : (
                                            <X size={13} className="shrink-0 text-mute-faint" strokeWidth={2.4} />
                                        )}
                                        <span className={`text-[0.78rem] font-medium ${accepted ? 'text-white' : 'text-mute'}`}>
                                            {verb}
                                        </span>
                                        <span className="truncate text-[0.72rem] font-medium text-mute-faint">
                                            &middot; {label}
                                        </span>
                                        <span className="ml-auto shrink-0 text-[0.65rem] font-medium text-mute-faint">
                                            {message.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {preview && (
                                        <p className={`mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed ${
                                            accepted ? 'text-mute-dim' : 'text-mute-faint line-through decoration-white/20'
                                        }`}>
                                            {preview}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-[0.8rem] ${
                                    isUser
                                        ? 'bg-white text-ink'
                                        : 'bg-ink-card text-white border border-line'
                                }`}
                            >
                                <div className="whitespace-pre-wrap break-words leading-relaxed">
                                    {message.content}
                                </div>
                                <div className="mt-1.5 text-[0.65rem] opacity-50 font-medium">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Suggestion Card - Rendered if currentSuggestion exists and component provided */}
                {currentSuggestion && SuggestionCardComponent && onAcceptSuggestion && onRejectSuggestion && (
                    <div className="flex justify-start">
                        <div className="max-w-[90%] w-full">
                            <SuggestionCardComponent
                                suggestion={currentSuggestion}
                                onAccept={onAcceptSuggestion}
                                onReject={onRejectSuggestion}
                                onRefine={onRefineSuggestion}
                            />
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-ink-raised rounded-lg p-4 border border-line">
                            <div className="flex items-center gap-2 text-mute">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 max-w-md">
                            <div className="flex items-start gap-2 text-red-300">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold mb-1">Error</p>
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-line p-4 dark:bg-black">
                {isRateLimitLow && !isRateLimitExhausted && (
                    <div className="mb-2.5 rounded-md border border-line bg-white/[0.03] p-2 text-[0.7rem] text-mute font-medium">
                        Only {rateLimits?.remaining_section} requests remaining for this section
                    </div>
                )}

                {isRateLimitExhausted && (
                    <div className="mb-2.5 rounded-md border border-red-500/30 bg-red-500/5 p-2.5 text-[0.75rem] text-red-300 font-medium">
                        <AlertCircle size={16} className="inline mr-2" />
                        Rate limit reached. Please switch to Manual mode or refresh the page.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isRateLimitExhausted 
                                ? "Rate limit reached" 
                                : "Tell me about yourself..."
                        }
                        disabled={isLoading || isRateLimitExhausted}
                        className="no-scrollbar max-h-40 flex-1 resize-none overflow-hidden rounded-lg border border-line-strong bg-ink-soft px-3 py-2.5 text-[0.8rem] leading-relaxed text-white placeholder:text-mute-faint transition-colors duration-200 focus:border-white/40 focus:outline-none disabled:opacity-50"
                        rows={1}
                    />
                    {/* A fixed square that stays pinned to the bottom of the
                        field as it grows, rather than stretching with it. */}
                    {isLoading && onCancelRequest ? (
                        <button
                            type="button"
                            onClick={onCancelRequest}
                            aria-label="Stop generating"
                            title="Stop generating"
                            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-line-strong bg-ink-raised text-mute transition-colors duration-200 hover:border-line-bright hover:text-white"
                        >
                            <Square size={13} fill="currentColor" strokeWidth={0} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading || isRateLimitExhausted}
                            aria-label="Send message"
                            title="Send message"
                            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-white text-ink transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:border disabled:border-line-strong disabled:bg-transparent disabled:text-mute-faint"
                        >
                            <ArrowUp size={17} strokeWidth={2.4} />
                        </button>
                    )}
                </form>

                <p className="mt-2 text-[0.7rem] font-medium text-mute">
                    Enter to send · Shift + Enter for a new line
                </p>
            </div>
        </div>
    );
};