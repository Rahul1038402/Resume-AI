import { useState } from "react";
import { Card, FadeUp, Button, Arrow, Sheen } from "../ui/kit";

/**
 * How it works: a selectable list on the left, the matching panel on the right.
 *
 * The reference uses this shape with one row raised and outlined as the active
 * item. Here the rows actually switch the panel — a list that looks
 * interactive but is not reads as a broken control.
 */
const steps = [
  {
    title: "Read it like software does",
    body: "Text is pulled from the PDF or DOCX exactly as a parser would, so anything hidden in images, tables or headers disappears — which is the point.",
    stat: "2.4s",
    statLabel: "Average parse",
    marker: 68,
    path: "M 0 110 C 50 108, 80 96, 120 92 S 200 70, 250 58 S 300 40, 320 36",
  },
  {
    title: "Score it against the role",
    body: "Skills, projects and quantified results are weighed against what the role you named usually asks for. The gap becomes a list, not a vague verdict.",
    stat: "78",
    statLabel: "Example score",
    marker: 72,
    path: "M 0 118 C 46 112, 70 70, 110 66 S 170 104, 214 72 S 280 34, 320 44",
  },
  {
    title: "Rebuild what it missed",
    body: "The builder writes single-column, parser-safe documents with a live preview, so the version you export is the version that gets extracted.",
    stat: "1 col",
    statLabel: "Export format",
    marker: 56,
    path: "M 0 124 C 60 120, 92 112, 130 86 S 196 44, 246 40 S 300 34, 320 30",
  },
];

const HowItWorks = () => {
  const [active, setActive] = useState(1);
  const step = steps[active];

  return (
    <section data-bg="dark" className="relative px-6 py-24">
      {/* No overflow-hidden on the section: the wash deliberately spills into
          the one below, so the light crosses the boundary instead of being
          sliced by it. */}
      {/* 640px, not 320: the wash's vertical radius reaches ~600px below its
          core, so a shallower bleed box clipped the tail and simply moved the
          seam further down the page. */}
      <Sheen variant="left" bleed={640} />
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* ---- Left: the claim and the list ---- */}
          <div>
            <FadeUp>
              <h2 className="text-balance text-3xl font-medium leading-[1.14] tracking-[-0.02em] text-white sm:text-[2.4rem]">
                Three steps, <span className="text-mute-dim">no guesswork</span>
              </h2>
              <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-mute-dim">
                Upload, see the gap, close it. Every tool here runs on the same
                document, so nothing has to be re-entered along the way.
              </p>
            </FadeUp>

            <div className="mt-10 space-y-2">
              {steps.map((item, i) => {
                const on = i === active;
                return (
                  <FadeUp key={item.title} delay={i * 0.06}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={on}
                      className={`w-full rounded-xl border p-4 text-left transition-colors duration-300 ${
                        on
                          ? "border-line-strong bg-gradient-to-b from-ink-card to-ink-soft"
                          : "border-transparent hover:border-line hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[0.7rem] transition-colors duration-300 ${
                            on
                              ? "border-line-bright bg-white text-ink"
                              : "border-line text-mute-faint"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <span
                            className={`block text-[0.95rem] ${on ? "text-white" : "text-mute"}`}
                          >
                            {item.title}
                          </span>
                          {on && (
                            <p className="mt-1.5 text-pretty text-[0.8rem] leading-relaxed text-mute-dim">
                              {item.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </FadeUp>
                );
              })}
            </div>

            <FadeUp delay={0.2} className="mt-8">
              <Button to="/analyzer" variant="ghost">
                Try it on your resume
                <Arrow />
              </Button>
            </FadeUp>
          </div>

          {/* ---- Right: the panel ---- */}
          <FadeUp delay={0.1}>
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="block text-4xl font-medium tracking-tight text-white">
                    {step.stat}
                  </span>
                  <span className="mt-1 block text-[0.7rem] uppercase tracking-[0.16em] text-mute-faint">
                    {step.statLabel}
                  </span>
                </div>
                <span className="rounded-full border border-line px-3 py-1 text-[0.7rem] text-mute">
                  Step {active + 1}
                </span>
              </div>

              {/* A plotted line with a marker and a floating chip, in the
                  reference's house style. The curve changes with the step, so
                  the panel is visibly tied to the list beside it. */}
              <svg
                viewBox="0 0 320 150"
                className="mt-6 w-full"
                role="img"
                aria-label="Illustrative plot for the selected step"
              >
                <defs>
                  <linearGradient id="plot-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={30 + i * 30}
                    x2="320"
                    y2={30 + i * 30}
                    stroke="rgba(255,255,255,0.05)"
                  />
                ))}

                <path d={`${step.path} L 320 150 L 0 150 Z`} fill="url(#plot-fill)" />
                <path
                  d={step.path}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                <line
                  x1="214"
                  y1="20"
                  x2="214"
                  y2="132"
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx="214"
                  cy={step.marker}
                  r="4.5"
                  fill="#0A0A0A"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                <rect
                  x="228"
                  y={step.marker - 13}
                  width="64"
                  height="24"
                  rx="8"
                  fill="#1A1A1A"
                  stroke="rgba(255,255,255,0.12)"
                />
                <text
                  x="260"
                  y={step.marker + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(255,255,255,0.85)"
                  fontFamily="inherit"
                >
                  {step.stat}
                </text>
              </svg>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-[0.75rem] text-mute-faint">
                  Illustrative, from a sample resume
                </span>
                <span className="flex gap-1.5">
                  {steps.map((item, i) => (
                    <span
                      key={item.title}
                      className={`h-1 w-1 rounded-full transition-colors duration-300 ${
                        i === active ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  ))}
                </span>
              </div>
            </Card>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
