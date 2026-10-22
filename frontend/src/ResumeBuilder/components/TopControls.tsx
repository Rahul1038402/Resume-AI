import { Download, Edit3, Settings, Loader2, RotateCcw } from 'lucide-react';
import { ActiveTab } from '../types';

interface TopControlsProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    handleDownload: () => void;
    resetAllData: () => void;
    isDownloading: boolean;
    downloadProgress: number;
}

/**
 * The builder's one toolbar: what you are editing on the left, what you can do
 * with it on the right.
 *
 * Sticky beneath the floating nav rather than scrolling under it - the old
 * version used `top-16` without `sticky`, so the Layout tab and the download
 * button slid behind the nav pill as soon as the page moved.
 *
 * Frosted and fading out downward, matching the nav directly above it. An earlier attempt used 90%
 * ink with no backdrop-filter, and the white page behind simply showed
 * through as grey - translucency without a blur is not glass. With the blur
 * the white paper becomes a soft wash instead of a muddy panel.
 *
 * Download is the white button because it is the point of the page. Reset is
 * the only red thing here, and only on hover: it throws away everything typed.
 */
export const TopControls = ({
    activeTab,
    setActiveTab,
    handleDownload,
    resetAllData,
    isDownloading,
    downloadProgress,
}: TopControlsProps) => {
    const tab = (id: ActiveTab, label: string, Icon: typeof Edit3) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.8rem] transition-colors duration-200 ${
                activeTab === id
                    ? 'bg-white/10 text-white'
                    : 'text-mute hover:text-white'
            }`}
        >
            <Icon size={15} strokeWidth={1.6} />
            {label}
        </button>
    );

    return (
        <div className="sticky top-16 z-[110]">
            {/* On the builder the nav's tail is hidden behind this bar, so the
                treatment continues from here. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 backdrop-blur-xl backdrop-saturate-150 bg-ink/80 supports-[backdrop-filter]:bg-ink/60" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" />

            <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
                {/* What you are editing */}
                <div className="flex items-center gap-1 rounded-lg border border-line p-0.5">
                    {tab('editor', 'Editor', Edit3)}
                    {tab('layout', 'Layout', Settings)}
                </div>

                {/* What you can do with it */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={resetAllData}
                        disabled={isDownloading}
                        className="flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[0.8rem] text-mute transition-colors duration-200 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                    >
                        <RotateCcw size={15} strokeWidth={1.6} />
                        Reset
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="relative flex items-center gap-2 overflow-hidden rounded-md bg-white px-3.5 py-1.5 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90 disabled:opacity-80"
                    >
                        {/* Progress fills the button from the left as the PDF renders. */}
                        {isDownloading && (
                            <span
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 bg-ink/15 transition-all duration-300 ease-out"
                                style={{ width: `${downloadProgress}%` }}
                            />
                        )}

                        <span className="relative z-10 flex items-center gap-2">
                            {isDownloading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Downloading {downloadProgress}%
                                </>
                            ) : (
                                <>
                                    <Download size={15} strokeWidth={1.8} />
                                    Download PDF
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
