import { Card, SectionHead, FadeUp, dim } from "../ui/kit";
import { ParseXray, ScoreGauge, KeywordMatch, Pipeline } from "../ui/art";
import type { FC, ReactNode } from "react";

/**
 * The bento.
 *
 * Two wide tiles over three narrow ones, the same rhythm the reference uses.
 * Each tile is an instrument drawn in SVG rather than a screenshot: the
 * artwork explains the mechanism, and the caption underneath only names it.
 *
 * The artwork sits in a fixed-height well with its own inner border, so every
 * tile shares a horizon line no matter how different the drawings are.
 */
const Tile: FC<{
  art: ReactNode;
  title: string;
  body: string;
  className?: string;
}> = ({ art, title, body, className = "" }) => (
  <Card className={`flex flex-col ${className}`}>
    <div className="relative m-3 mb-0 h-44 overflow-hidden rounded-xl border border-line bg-ink/60 sm:h-48">
      {art}
    </div>
    <div className="p-5 pt-4">
      <h3 className="text-[0.95rem] font-medium text-white">{title}</h3>
      <p className="mt-1.5 text-pretty text-[0.8rem] leading-relaxed text-mute-dim">
        {body}
      </p>
    </div>
  </Card>
);

const BentoSection = () => {
  return (
    <section data-bg="dark" className="relative overflow-hidden px-6 pb-24 pt-10">
      <SectionHead
        badge="What it does"
        parts={["Every stage of the resume, ", dim("instrumented")]}
        body="Four tools that share one document: read it the way software does, score it, close the gaps, and keep track of where it went."
        className="mb-16"
      />

      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2">
        <FadeUp>
          <Tile
            art={<ParseXray />}
            title="See what the parser sees"
            body="Your file is read exactly as an applicant tracking system reads it — detected sections, extracted skills, and the lines it quietly drops."
            className="h-full"
          />
        </FadeUp>

        <FadeUp delay={0.08}>
          <Tile
            art={<ScoreGauge />}
            title="One score, measured not guessed"
            body="Structure, keyword coverage and quantified impact, combined into a single number you can move."
            className="h-full"
          />
        </FadeUp>
      </div>

      <div className="mx-auto mt-4 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        <FadeUp delay={0.04}>
          <Tile
            art={<KeywordMatch />}
            title="Match against a real job post"
            body="Paste the description and see which terms line up and which are missing."
            className="h-full"
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <Tile
            art={<Pipeline />}
            title="Track every application"
            body="Company, role, status and the version you sent, in one board."
            className="h-full"
          />
        </FadeUp>

        <FadeUp delay={0.2}>
          <Card className="flex h-full flex-col justify-between p-6">
            <div>
              <h3 className="text-[0.95rem] font-medium text-white">
                Nothing is stored
              </h3>
              <p className="mt-1.5 text-pretty text-[0.8rem] leading-relaxed text-mute-dim">
                Your file is held in memory long enough to read the text, then
                dropped. No disk, no training, no third parties.
              </p>
            </div>

            {/* A small diagram rather than an icon: the file arriving, being
                read, and leaving nothing behind. */}
            <svg viewBox="0 0 220 86" className="mt-6 w-full" role="img" aria-label="A file is read in memory and then discarded">
              <defs>
                <linearGradient id="vanish" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              <rect x="4" y="26" width="34" height="34" rx="5" fill="#141414" stroke="rgba(255,255,255,0.14)" />
              <rect x="12" y="36" width="18" height="2.5" rx="1.25" fill="rgba(255,255,255,0.5)" />
              <rect x="12" y="43" width="14" height="2.5" rx="1.25" fill="rgba(255,255,255,0.22)" />
              <rect x="12" y="50" width="16" height="2.5" rx="1.25" fill="rgba(255,255,255,0.22)" />

              <path d="M 44 43 H 84" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />

              <circle cx="110" cy="43" r="22" fill="none" stroke="rgba(255,255,255,0.16)" />
              <circle cx="110" cy="43" r="14" fill="none" stroke="rgba(255,255,255,0.3)" />
              <circle cx="110" cy="43" r="3" fill="#ffffff" />
              <text x="110" y="80" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="inherit" letterSpacing="1.4">
                IN MEMORY
              </text>

              <path d="M 136 43 H 206" stroke="url(#vanish)" strokeWidth="1" strokeDasharray="3 4" />
              <rect x="186" y="30" width="26" height="26" rx="5" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            </svg>
          </Card>
        </FadeUp>
      </div>
    </section>
  );
};

export default BentoSection;
