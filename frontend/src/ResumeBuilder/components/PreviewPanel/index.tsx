import { Eye, Lightbulb } from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import { ResumeData, LayoutSettings } from '../../types';
import { useEffect, useRef, useState } from 'react';

interface PreviewPanelProps {
    resumeData: ResumeData;
    layoutSettings: LayoutSettings;
    warnings: string[];
    lastSaved: string;
    setIsSuggestionsOpen: (isOpen: boolean) => void;
}

const PreviewPanel = ({
    resumeData,
    layoutSettings,
    warnings,
    lastSaved,
    setIsSuggestionsOpen
}: PreviewPanelProps) => {

    const wrapperRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef<HTMLDivElement>(null);

    // The visual size of the scaled page. `transform: scale()` does not change
    // an element's layout box - the page still occupied its full 794px even
    // when drawn at 438px - which is why the panel had ~300px of dead space
    // beside it. Tracking the drawn size lets the panel shrink to fit.
    const [drawn, setDrawn] = useState({ width: 0, height: 0 });

    // Page size dimensions, at 96dpi
    const pageDimensions = layoutSettings.pageSize === 'Letter'
        ? { width: '8.5in', height: '11in', widthPx: 816, heightPx: 1056 }
        : { width: '210mm', height: '297mm', widthPx: 793.7, heightPx: 1122.5 };

    /**
     * Fit the page to the panel's WIDTH, and let it scroll inside the panel.
     *
     * Fitting to height as well kept the whole page on screen, but at 0.55
     * scale the body text was too small to actually read. Width-fitting gets
     * the type back to a legible size; the panel scrolls for the rest of the
     * page, which keeps that scrolling inside the preview instead of moving
     * the whole builder.
     */
    useEffect(() => {
        const scalePage = () => {
            if (!wrapperRef.current || !scaleRef.current) return;

            // clientWidth excludes the scrollbar the page itself introduces,
            // so the scale settles rather than oscillating as it appears.
            const byWidth = wrapperRef.current.clientWidth / pageDimensions.widthPx;
            const scale = Math.max(Math.min(byWidth, 1), 0.3);
            scaleRef.current.style.transform = `scale(${scale})`;
            setDrawn({
                width: Math.ceil(pageDimensions.widthPx * scale),
                height: Math.ceil(pageDimensions.heightPx * scale),
            });
        };

        scalePage();
        window.addEventListener("resize", scalePage);
        return () => window.removeEventListener("resize", scalePage);
    }, [pageDimensions.widthPx, pageDimensions.heightPx]);

    return (
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-ink-soft p-3 custom:h-[calc(100vh-212px)] custom:w-[44%] custom:min-w-[460px] custom:max-w-[820px]">

            {/* Header. Title, save state and the suggestions count share one
                baseline - the count used to float over the panel's corner
                with a pulsing badge on top of it. */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line px-1 pb-2.5">
                <div className="flex items-center gap-2">
                    <Eye size={15} strokeWidth={1.6} className="text-mute" />
                    <h2 className="text-sm font-medium text-white">Live preview</h2>
                    {lastSaved && (
                        <span className="hidden text-xs font-medium text-mute sm:inline">
                            · saved {lastSaved}
                        </span>
                    )}
                </div>

                {warnings.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsSuggestionsOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-mute transition-colors duration-200 hover:border-line-strong hover:text-white font-medium"
                    >
                        <Lightbulb size={14} strokeWidth={1.6} />
                        {warnings.length} {warnings.length === 1 ? 'suggestion' : 'suggestions'}
                    </button>
                )}
            </div>

            {/* Wrapper that scales */}
            <div
                ref={wrapperRef}
                className="flex w-full flex-1 justify-center overflow-y-auto overflow-x-hidden"
            >
                {/* Scale transform container */}
                {/* Occupies exactly the drawn size, so the panel around it can
                    be only as wide as the page actually appears. */}
                <div
                    style={{
                        width: drawn.width || undefined,
                        height: drawn.height || undefined,
                        overflow: "hidden",
                    }}
                >
                <div
                    ref={scaleRef}
                    style={{ transformOrigin: "top left" }}
                >
                    {/* Page with dynamic dimensions */}
                    <div
                        id="resume-preview"
                        style={{
                            width: pageDimensions.width,
                            height: pageDimensions.height,
                            overflow: "hidden",
                            background: "white",
                            fontSize: `${layoutSettings.fontSize}px`,
                            lineHeight: layoutSettings.lineHeight,
                            fontFamily: layoutSettings.fontFamily,
                            padding: `${layoutSettings.margins.top}px ${layoutSettings.margins.right}px ${layoutSettings.margins.bottom}px ${layoutSettings.margins.left}px`,
                        }}
                        className="resume-preview text-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
                    >
                        <ResumePreview
                            resumeData={resumeData}
                            layoutSettings={layoutSettings}
                        />
                    </div>
                </div>
                </div>
            </div>

        </div>
    );
};

export default PreviewPanel;