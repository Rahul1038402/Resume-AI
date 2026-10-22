import { AlertTriangle, Eye, Lightbulb } from 'lucide-react';
import { ResumePreview } from './ResumePreview';
import { ResumeData, LayoutSettings } from '../../types';
import { useEffect, useRef, useState } from 'react';
import { usePagination } from '../../hooks/usePagination';

interface PreviewPanelProps {
    resumeData: ResumeData;
    layoutSettings: LayoutSettings;
    warnings: string[];
    lastSaved: string;
    setIsSuggestionsOpen: (isOpen: boolean) => void;
}

/** Above this much of the last page, the warning turns from advice to alarm. */
const NEARLY_FULL = 0.92;

const PreviewPanel = ({
    resumeData,
    layoutSettings,
    warnings,
    lastSaved,
    setIsSuggestionsOpen
}: PreviewPanelProps) => {

    const wrapperRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<HTMLDivElement>(null);

    // The visual size of the scaled page. `transform: scale()` does not change
    // an element's layout box - the page still occupied its full 794px even
    // when drawn at 438px - which is why the panel had ~300px of dead space
    // beside it. Tracking the drawn size lets the panel shrink to fit.
    const [drawn, setDrawn] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);

    // Page size dimensions, at 96dpi
    const pageDimensions = layoutSettings.pageSize === 'Letter'
        ? { width: '8.5in', height: '11in', widthPx: 816, heightPx: 1056 }
        : { width: '210mm', height: '297mm', widthPx: 793.7, heightPx: 1122.5 };

    const { margins } = layoutSettings;
    const pageContentHeight = pageDimensions.heightPx - margins.top - margins.bottom;

    /*
     * Pagination is measured from a single hidden copy, not from what is on
     * screen.
     *
     * The visible sheets are windows onto the same content, so measuring one
     * of them would measure a clipped box. This copy is laid out at the real
     * page width with no height limit, which is also exactly what the PDF
     * route receives - so what is measured, what is drawn and what is printed
     * are all the same layout.
     */
    const { pageTops, pageCount, fillRatio, contentHeight } = usePagination(
        sourceRef,
        pageContentHeight,
        [resumeData, layoutSettings]
    );

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
            const next = Math.max(Math.min(byWidth, 1), 0.3);
            scaleRef.current.style.transform = `scale(${next})`;
            setScale(next);
            setDrawn({
                width: Math.ceil(pageDimensions.widthPx * next),
                height: Math.ceil(pageDimensions.heightPx * next),
            });
        };

        scalePage();
        window.addEventListener("resize", scalePage);
        return () => window.removeEventListener("resize", scalePage);
    }, [pageDimensions.widthPx, pageDimensions.heightPx]);

    const sheetStyle = {
        width: pageDimensions.width,
        height: pageDimensions.height,
        overflow: "hidden" as const,
        background: "white",
        fontSize: `${layoutSettings.fontSize}px`,
        lineHeight: layoutSettings.lineHeight,
        fontFamily: layoutSettings.fontFamily,
        padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
    };

    const overflowing = pageCount > 1;
    const nearlyFull = !overflowing && fillRatio >= NEARLY_FULL;

    return (
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-ink-soft p-3 custom:h-[calc(100vh-188px)] custom:w-[44%] custom:min-w-[460px] custom:max-w-[820px]">

            {/* Header. Title, save state and the suggestions count share one
                baseline - the count used to float over the panel's corner
                with a pulsing badge on top of it. */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line px-1 pb-2.5">
                <div className="flex items-center gap-2">
                    <Eye size={15} strokeWidth={1.6} className="text-mute" />
                    <h2 className="text-sm font-medium text-white">Live preview</h2>
                    <span className="text-xs font-medium text-mute-faint">
                        · {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                    </span>
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

            {/* The page budget. Silent while there is room, which is most of
                the time - it only speaks up at the point it matters. */}
            {(overflowing || nearlyFull) && (
                <div
                    role="status"
                    className={`mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
                        overflowing
                            ? 'border-red-500/30 bg-red-500/[0.06]'
                            : 'border-line-strong bg-white/[0.04]'
                    }`}
                >
                    <AlertTriangle
                        size={14}
                        strokeWidth={1.8}
                        className={`mt-0.5 shrink-0 ${overflowing ? 'text-red-300' : 'text-mute'}`}
                    />
                    <div className="min-w-0">
                        <p className={`text-[0.78rem] font-medium ${overflowing ? 'text-red-200' : 'text-white'}`}>
                            {overflowing
                                ? `Your resume runs to ${pageCount} pages`
                                : 'This page is nearly full'}
                        </p>
                        <p className="mt-0.5 text-[0.72rem] font-medium text-mute-dim">
                            {overflowing
                                ? 'The PDF will break where the pages do below. Most graduate roles expect a single page — trim a section to pull it back.'
                                : `About ${Math.round((1 - fillRatio) * pageContentHeight)}px of room left before it spills onto a second page.`}
                        </p>
                    </div>
                </div>
            )}

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
                        height: drawn.height
                            ? drawn.height * pageCount + 16 * (pageCount - 1) * scale
                            : undefined,
                        overflow: "hidden",
                    }}
                >
                <div
                    ref={scaleRef}
                    style={{ transformOrigin: "top left" }}
                >
                    {/*
                      * One sheet per page.
                      *
                      * Each is a window onto the same content, shifted up by
                      * the offset where that page begins - so a block is never
                      * cut in half, because the offsets land on block
                      * boundaries. Only the first sheet is a layout box the
                      * PDF cares about; the rest are presentation.
                      */}
                    {pageTops.map((top, i) => {
                      /*
                       * A page ends at the next break, not at the bottom of
                       * the sheet.
                       *
                       * Showing a full page's worth from every offset meant
                       * page one also drew the block that had been pushed to
                       * page two - so the same section appeared at the foot of
                       * one page and again at the top of the next, the second
                       * time cut through the middle of a line.
                       */
                      const nextTop = pageTops[i + 1] ?? contentHeight;
                      const slice = Math.min(nextTop - top, pageContentHeight);
                      return (
                        <div
                            key={i}
                            style={{ ...sheetStyle, marginTop: i === 0 ? 0 : 16 }}
                            className="relative text-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
                            aria-label={`Page ${i + 1} of ${pageCount}`}
                        >
                            {/*
                              * The clip has to be the content box, not the
                              * sheet.
                              *
                              * `overflow: hidden` on the sheet clips at its
                              * padding edge, and the padding IS the margin -
                              * so the tail of the previous page showed through
                              * in the top margin band, above the break. This
                              * inner box is exactly the printable area.
                              *
                              * flow-root so the content's first margin cannot
                              * collapse through the wrapper, which would shift
                              * it a few pixels out of step with the measured
                              * copy; translate rather than a negative margin,
                              * for the same reason.
                              */}
                            <div
                                style={{
                                    height: slice > 0 ? slice : pageContentHeight,
                                    overflow: 'hidden',
                                    display: 'flow-root',
                                }}
                                aria-hidden={i > 0}
                            >
                            <div
                                style={{ transform: `translateY(${-top}px)`, display: 'flow-root' }}
                            >
                                <ResumePreview
                                    resumeData={resumeData}
                                    layoutSettings={layoutSettings}
                                />
                            </div>
                            </div>
                        </div>
                      );
                    })}
                </div>
                </div>
            </div>

            {/*
              * The measured copy, and the one the PDF is made from.
              *
              * Laid out at the true page width with no height limit, so the
              * blocks have their real positions. `visibility: hidden` rather
              * than `display: none` - a box that is not laid out has no
              * geometry to measure.
              */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    left: -99999,
                    top: 0,
                    visibility: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <div
                    id="resume-preview"
                    ref={sourceRef}
                    style={{ ...sheetStyle, height: 'auto', overflow: 'visible' }}
                    className="text-black"
                >
                    <ResumePreview
                        resumeData={resumeData}
                        layoutSettings={layoutSettings}
                    />
                </div>
            </div>
        </div>
    );
};

export default PreviewPanel;
