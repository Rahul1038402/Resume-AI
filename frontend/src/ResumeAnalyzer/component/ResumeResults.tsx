import type { FC, ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  Check,
  TrendingUp,
  Zap,
  X,
  Minus,
} from "lucide-react";
import { ScoreGauge } from "@/LandingPage/ui/art";
import type { ResumeResultsProps } from "../types/analysis";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

/** A titled block. Everything on this page is one of these. */
const Panel: FC<{ title: string; meta?: ReactNode; children: ReactNode }> = ({
  title,
  meta,
  children,
}) => (
  <section className="rounded-xl border border-line bg-ink-card p-5">
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-mute-faint">
        {title}
      </h3>
      {meta && <span className="text-[0.75rem] font-medium text-mute-dim">{meta}</span>}
    </div>
    {children}
  </section>
);

/** A number with a caption. Weight and size carry the emphasis, not colour. */
const Stat: FC<{ value: ReactNode; label: string }> = ({ value, label }) => (
  <div className="rounded-lg border border-line bg-ink-soft px-4 py-3.5">
    <div className="text-2xl font-medium tracking-tight text-white">{value}</div>
    <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-mute-faint">
      {label}
    </div>
  </div>
);

/**
 * A skill, present or absent.
 *
 * Red is the single hue allowed on this page, and only ever for a gap - the
 * same red the builder uses for Reset and delete. A matched skill is just
 * white on the ground, because having the skill is the unremarkable case.
 */
const SkillChip: FC<{ label: string; missing?: boolean }> = ({ label, missing = false }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.75rem] font-medium ${
      missing
        ? "border-red-500/30 bg-red-500/[0.06] text-red-200"
        : "border-line-strong bg-white/[0.06] text-white"
    }`}
  >
    {missing ? <X size={11} strokeWidth={2.4} /> : <Check size={11} strokeWidth={2.4} />}
    {label}
  </span>
);

const ResumeResults = ({ result, loading, error }: ResumeResultsProps) => {
  /** -------------------- LOADING STATE -------------------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-ink-card p-5">
          <div className="flex items-center gap-5">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-white/[0.03]" />
            </div>
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-ink-card p-5">
            <div className="mb-4 h-2.5 w-28 animate-pulse rounded bg-white/[0.06]" />
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-6 w-20 animate-pulse rounded-md bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /** -------------------- ERROR STATE -------------------- */
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <div>
            <p className="text-[0.9rem] text-red-200">Analysis failed</p>
            <p className="mt-1 text-[0.8rem] font-medium leading-relaxed text-red-300/80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /** -------------------- EMPTY STATE -------------------- */
  if (!result) {
    return (
      <div className="rounded-xl border border-line bg-ink-card p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-mute-faint" strokeWidth={1.6} />
          <div>
            <p className="text-[0.9rem] text-white">Nothing scored yet</p>
            <p className="mt-1 max-w-md text-[0.8rem] font-medium leading-relaxed text-mute-dim">
              Add a resume and pick a target role. The score, the skills it found
              and the ones it did not will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /** -------------------- DESTRUCTURE DATA -------------------- */
  const {
    score = 0,
    recommendations = [],
    target_job = "General",
    analysis = {
      total_skills_found: 0,
      total_projects: 0,
      relevant_projects: 0,
      skills_with_metrics: 0,
      achieved_score: 0,
      project_bonus: 0,
      diversity_bonus: 0,
    },
  } = result;

  const job_match = (result as any).job_match || {};
  const project_relevance = job_match.project_relevance || {};

  /** -------------------- HELPERS -------------------- */
  const verdict = (value: number) => {
    if (value >= 80) return "Excellent match";
    if (value >= 70) return "Strong match";
    if (value >= 60) return "Good match";
    if (value >= 40) return "Needs work";
    return "Major gaps";
  };

  const relevanceMark = (label: string) => {
    switch (label) {
      case "Highly Relevant":
        return <Check size={12} strokeWidth={2.4} className="text-white" />;
      case "Somewhat Relevant":
        return <Minus size={12} strokeWidth={2.4} className="text-mute" />;
      case "Not Relevant":
        return <X size={12} strokeWidth={2.4} className="text-red-300" />;
      default:
        return <Minus size={12} strokeWidth={2.4} className="text-mute-faint" />;
    }
  };

  const relevanceChip = (label: string) =>
    label === "Not Relevant"
      ? "border-red-500/30 bg-red-500/[0.06] text-red-200"
      : label === "Highly Relevant"
        ? "border-line-bright bg-white/10 text-white"
        : "border-line-strong text-mute";

  const safeNumber = (value: any, decimals = 1): string =>
    (typeof value === "number" ? value : 0).toFixed(decimals);

  const titleCase = (s: string) =>
    s.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const matched: string[] = job_match.matched_skills || [];
  const missing: string[] = job_match.missing_skills || [];
  const projectEntries = Object.entries(project_relevance) as [string, any][];
  const metricsData = (result as any).quantifiable_impacts || {};
  const withMetrics = Object.keys(metricsData).filter(
    (p) => (metricsData[p] || []).length > 0
  ).length;

  /** -------------------- MAIN RENDER -------------------- */
  return (
    <div className="space-y-4">
      {/* ---- Headline score ---- */}
      <section className="rounded-xl border border-line bg-gradient-to-b from-ink-card to-ink-soft p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          {/* The same gauge the landing page uses, now reading real data. */}
          <div className="h-[150px] w-[260px] shrink-0">
            <ScoreGauge score={score} label="ATS SCORE" glow={false} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-[1.6rem] font-medium leading-tight tracking-[-0.01em] text-white">
              {verdict(score)}
            </h2>
            <p className="mt-1.5 text-[0.8rem] font-medium text-mute-dim">
              Scored against{" "}
              <span className="text-mute">{titleCase(target_job)}</span>
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1.5 sm:justify-start">
              <span className="text-[0.75rem] font-medium text-mute-dim">
                <span className="text-white">{analysis.total_skills_found}</span> skills found
              </span>
              <span className="text-[0.75rem] font-medium text-mute-dim">
                <span className="text-white">{analysis.total_projects}</span> projects
              </span>
              <span className="text-[0.75rem] font-medium text-mute-dim">
                <span className="text-white">{missing.length}</span> gaps
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Breakdown ---- */}
      <Panel title="Breakdown">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            value={safeNumber(job_match.skill_match_score || analysis.achieved_score)}
            label="Skills match"
          />
          <Stat
            value={safeNumber(job_match.avg_project_relevance || 0)}
            label="Avg project relevance"
          />
          <Stat
            value={safeNumber(job_match.overall_relevance_score || score)}
            label="Overall"
          />
        </div>
      </Panel>

      {/* ---- Skills ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Skills matched" meta={matched.length || null}>
          {matched.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matched.map((skill, i) => (
                <SkillChip key={`${skill}-${i}`} label={skill} />
              ))}
            </div>
          ) : (
            <p className="text-[0.8rem] font-medium text-mute-dim">
              Nothing in the resume matched this role.
            </p>
          )}
        </Panel>

        <Panel title="Skills missing" meta={missing.length || null}>
          {missing.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((skill, i) => (
                <SkillChip key={`${skill}-${i}`} label={skill} missing />
              ))}
            </div>
          ) : (
            <p className="text-[0.8rem] font-medium text-mute-dim">
              No critical gaps for this role.
            </p>
          )}
        </Panel>
      </div>

      {/* ---- Projects ---- */}
      {projectEntries.length > 0 && (
        <Panel title="Projects" meta={`weighed against ${titleCase(target_job)}`}>
          <div className="space-y-2.5">
            {projectEntries.map(([projectName, projectData], index) => {
              const used: string[] =
                ((result as any).projects_with_skills || {})[projectName] || [];
              const projectMetrics: string[] = metricsData[projectName] || [];
              const hits: string[] = projectData.matched_skills || [];

              return (
                <div key={index} className="rounded-lg border border-line bg-ink-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h4 className="text-[0.95rem] text-white">{projectName}</h4>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.7rem] font-medium ${relevanceChip(
                        projectData.relevance_label
                      )}`}
                    >
                      {relevanceMark(projectData.relevance_label)}
                      {projectData.relevance_label}
                    </span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-mute-faint">
                        Skills used
                      </p>
                      {used.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {used.map((skill, skillIndex) => {
                            const isMatched = hits.includes(skill);
                            return (
                              <span
                                key={`${skill}-${skillIndex}`}
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.7rem] font-medium ${
                                  isMatched
                                    ? "bg-white/10 text-white"
                                    : "border border-line text-mute-dim"
                                }`}
                              >
                                {isMatched && <Check size={10} strokeWidth={2.6} />}
                                {skill}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[0.75rem] font-medium text-mute-dim">
                          None detected.
                        </p>
                      )}
                      {hits.length > 0 && (
                        <p className="mt-2.5 text-[0.7rem] font-medium leading-relaxed text-mute-dim">
                          <span className="text-white">{hits.length}</span> relevant to the
                          role: {hits.join(", ")}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-mute-faint">
                        Quantified results
                      </p>
                      {projectMetrics.length > 0 ? (
                        <div className="space-y-1.5">
                          {projectMetrics.slice(0, 3).map((metric, metricIndex) => (
                            <div
                              key={metricIndex}
                              className="flex items-start gap-2 border-l border-line-bright pl-2.5 text-[0.75rem] font-medium leading-relaxed text-mute"
                            >
                              <TrendingUp
                                size={11}
                                className="mt-1 shrink-0 text-white"
                                strokeWidth={2}
                              />
                              {metric}
                            </div>
                          ))}
                          {projectMetrics.length > 3 && (
                            <p className="text-[0.7rem] font-medium text-mute-faint">
                              +{projectMetrics.length - 3} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="border-l border-red-500/40 pl-2.5 text-[0.75rem] font-medium leading-relaxed text-red-300/80">
                          No numbers here. Recruiters read impact in figures.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ---- Recommendations ---- */}
      {recommendations.length > 0 && (
        <Panel title="What to fix next" meta={recommendations.length}>
          <ol className="space-y-2.5">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-line bg-ink-soft p-3"
              >
                <Zap size={13} className="mt-0.5 shrink-0 text-white" strokeWidth={1.8} />
                <span className="text-[0.8rem] font-medium leading-relaxed text-mute">
                  {rec}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* ---- Summary ---- */}
      <Panel title="Summary">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat value={analysis.total_skills_found} label="Skills found" />
          <Stat value={projectEntries.length} label="Projects read" />
          <Stat
            value={
              projectEntries.filter(([, p]) => p.relevance_label === "Highly Relevant").length
            }
            label="Highly relevant"
          />
          <Stat
            value={`${
              projectEntries.length > 0
                ? Math.round((withMetrics / projectEntries.length) * 100)
                : 0
            }%`}
            label="Have metrics"
          />
        </div>
      </Panel>
    </div>
  );
};

export default ResumeResults;
