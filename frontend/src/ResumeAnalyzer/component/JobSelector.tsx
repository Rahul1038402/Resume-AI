import { useState } from "react";
import { Info } from "lucide-react";

interface JobSelectorProps {
  onJobSelected: (job: string | null, description?: string, jdRequired?: boolean) => void;
}

const jobs = [
  { id: "data-scientist", title: "Data Scientist", description: "Machine learning, statistics, and data analysis" },
  { id: "frontend-developer", title: "Frontend Developer", description: "UI development with JavaScript, React, HTML, CSS" },
  { id: "backend-developer", title: "Backend Developer", description: "Server-side applications with databases and APIs" },
  { id: "full-stack-developer", title: "Full Stack Developer", description: "End-to-end web development, frontend and backend" },
  { id: "software-engineer", title: "Software Engineer", description: "General software development and engineering" },
  { id: "devops-engineer", title: "DevOps Engineer", description: "Infrastructure, deployment, and automation" },
];

/**
 * Which role the resume is scored against, and against which posting.
 *
 * The job description is on by default, because it is the document the score
 * is actually about. An applicant tracking system ranks a resume against the
 * posting in front of it, not against a general idea of the job: Jobscan
 * weights hard skills from the description most heavily, and reports that an
 * exact job-title match goes with a 3.5x higher interview rate. Without a
 * description this tool falls back to a stored list of skills for the role,
 * which is a reasonable guess and nothing more.
 *
 * It can still be turned off - someone exploring before they have a posting
 * should not be blocked - but turning it off is a deliberate act, and the
 * weaker result is stated rather than implied.
 */
const JobSelector = ({ onJobSelected }: JobSelectorProps) => {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [jdRequired, setJdRequired] = useState(true);

  const titleFor = (id: string | null) =>
    jobs.find((job) => job.id === id)?.title || null;

  const publish = (id: string | null, text: string, required: boolean) => {
    onJobSelected(titleFor(id), text, required);
  };

  return (
    <div className="rounded-xl border border-line bg-ink-card p-5">
      <fieldset>
        <legend className="mb-2.5 block text-[0.7rem] font-medium uppercase tracking-[0.16em] text-mute-faint">
          Target role
        </legend>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {jobs.map((job) => {
            const on = selectedJob === job.id;
            return (
              <label
                key={job.id}
                title={job.description}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-center text-[0.8rem] transition-colors duration-200 ${
                  on
                    ? "border-line-bright bg-white/10 text-white"
                    : "border-line text-mute hover:border-line-strong hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="target-role"
                  value={job.id}
                  checked={on}
                  onChange={() => {
                    setSelectedJob(job.id);
                    publish(job.id, jobDescription, jdRequired);
                  }}
                  className="sr-only"
                />
                {job.title}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div
        className={`mt-5 border-t border-line pt-5 transition-opacity duration-300 ${
          selectedJob ? "opacity-100" : "pointer-events-none opacity-40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="job-description"
            className="block text-[0.7rem] font-medium uppercase tracking-[0.16em] text-mute-faint"
          >
            Job description
          </label>

          <button
            type="button"
            role="switch"
            aria-checked={jdRequired}
            onClick={() => {
              const next = !jdRequired;
              setJdRequired(next);
              publish(selectedJob, jobDescription, next);
            }}
            className="flex items-center gap-2 text-[0.75rem] font-medium text-mute transition-colors duration-200 hover:text-white"
          >
            <span
              className={`relative h-4 w-7 rounded-full border transition-colors duration-200 ${
                jdRequired ? "border-line-bright bg-white/80" : "border-line-strong bg-ink-soft"
              }`}
            >
              <span
                className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                  jdRequired ? "left-[0.875rem] bg-ink" : "left-0.5 bg-mute"
                }`}
              />
            </span>
            {jdRequired ? "Using a description" : "No description"}
          </button>
        </div>

        {/* Why this field is not optional by default. */}
        <p className="mt-2 flex items-start gap-2 text-[0.75rem] font-medium leading-relaxed text-mute-dim">
          <Info size={13} className="mt-0.5 shrink-0 text-mute-faint" strokeWidth={1.8} />
          <span>
            {jdRequired ? (
              <>
                Paste the posting. ATS ranks a resume against the specific
                description it was filed under, weighting the hard skills named
                there above everything else — so this is what makes the score
                mean something.
              </>
            ) : (
              <>
                Without a description the resume is scored against a stored list
                of skills for the role. That is a general guess, not this
                employer's requirements, and the gaps it reports may not be the
                ones that matter.
              </>
            )}
          </span>
        </p>

        <textarea
          id="job-description"
          placeholder="Paste the full posting — responsibilities and requirements."
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value);
            publish(selectedJob, e.target.value, jdRequired);
          }}
          className="rb-textarea mt-3 resize-y"
          rows={6}
          disabled={!selectedJob || !jdRequired}
        />
      </div>
    </div>
  );
};

export default JobSelector;
