import { LayoutSettings as LayoutSettingsType } from '../types';

interface LayoutSettingsProps {
    layoutSettings: LayoutSettingsType;
    updateLayoutSettings: (field: keyof LayoutSettingsType, value: any) => void;
    updateMargin: (side: keyof LayoutSettingsType['margins'], value: number) => void;
}

export const LayoutSettings = ({
    layoutSettings,
    updateLayoutSettings,
    updateMargin
}: LayoutSettingsProps) => {
    return (
        <div className="h-full w-full max-w-full overflow-y-auto">
            <h3 className="rb-heading mb-3">Layout</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                    <label className="rb-label">Font Size (px)</label>
                    <input
                        type="number"
                        value={layoutSettings.fontSize}
                        onChange={(e) => updateLayoutSettings('fontSize', parseInt(e.target.value) || 11)}
                        className="rb-input"
                        min="8"
                        max="16"
                    />
                </div>

                <div>
                    <label className="rb-label">Line Height <span className='text-xs font-normal text-mute-faint'>(Adjusts Spacing Between Content)</span></label>
                    <input
                        type="text"
                        value={layoutSettings.lineHeight}
                        onChange={(e) => updateLayoutSettings('lineHeight', e.target.value)}
                        className="rb-input"
                        placeholder="1.6"
                    />
                </div>

                <div>
                    <label className="rb-label">Page Size</label>
                    <select
                        value={layoutSettings.pageSize}
                        onChange={(e) => updateLayoutSettings('pageSize', e.target.value)}
                        className="rb-input"
                    >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                    </select>
                </div>

                <div>
                    <label className="rb-label">Font Family</label>
                    <select
                        value={layoutSettings.fontFamily}
                        onChange={(e) => updateLayoutSettings('fontFamily', e.target.value)}
                        className="rb-input"
                    >
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value='"CMU Serif", "Computer Modern Serif", Georgia, serif'>CMU Serif</option>
                        <option value="'Courier New', monospace">Courier New</option>
                    </select>
                </div>
            </div>

            <div className="mt-10">
                <h4 className="rb-heading mb-3">Margins (px)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div>
                        <label className="rb-label">Top</label>
                        <input
                            type="number"
                            value={layoutSettings.margins.top}
                            onChange={(e) => updateMargin('top', parseInt(e.target.value) || 20)}
                            className="rb-input"
                            min="10"
                            max="50"
                        />
                    </div>

                    <div>
                        <label className="rb-label">Bottom</label>
                        <input
                            type="number"
                            value={layoutSettings.margins.bottom}
                            onChange={(e) => updateMargin('bottom', parseInt(e.target.value) || 20)}
                            className="rb-input"
                            min="10"
                            max="50"
                        />
                    </div>

                    <div>
                        <label className="rb-label">Left</label>
                        <input
                            type="number"
                            value={layoutSettings.margins.left}
                            onChange={(e) => updateMargin('left', parseInt(e.target.value) || 20)}
                            className="rb-input"
                            min="10"
                            max="50"
                        />
                    </div>

                    <div>
                        <label className="rb-label">Right</label>
                        <input
                            type="number"
                            value={layoutSettings.margins.right}
                            onChange={(e) => updateMargin('right', parseInt(e.target.value) || 20)}
                            className="rb-input"
                            min="10"
                            max="50"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};