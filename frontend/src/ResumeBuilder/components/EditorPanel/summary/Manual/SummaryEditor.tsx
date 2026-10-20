interface SummaryEditorProps {
    summary: string;
    updateSummary: (value: string) => void;
}

export const SummaryEditor = ({ summary, updateSummary }: SummaryEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Professional Summary
            </h3>

            <div>
                <label className="rb-label">Summary <span className='text-red-400'>*</span></label>
                <textarea
                    value={summary}
                    onChange={(e) => updateSummary(e.target.value)}
                    rows={10}
                    /* rb-textarea, not rb-input: the input class carries a
                       fixed h-8, which silently overrode `rows` and collapsed
                       this to a single line. */
                    className="rb-textarea"
                    placeholder="Write a compelling professional summary highlighting your key skills, experience, and career objectives..."
                />
                <p className="mt-1.5 text-[0.7rem] font-medium text-mute">
                    {summary.length} characters
                </p>
            </div>
        </div>
    );
};