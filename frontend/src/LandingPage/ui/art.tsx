import type { FC } from "react";

/**
 * Bento artwork.
 *
 * Four instruments, drawn rather than screenshotted. Rules shared by all of
 * them, so the set reads as one hand:
 *
 *  - monochrome, 1px hairlines, white reserved for the one thing that matters
 *  - every panel sits on its own faint gradient so it has a light source
 *  - measurement furniture (ticks, baselines, axis stubs) is what sells them
 *    as instruments rather than as icons
 *  - nothing animates; these are diagrams, not toys
 */

const STROKE = "rgba(255,255,255,0.22)";
const STROKE_SOFT = "rgba(255,255,255,0.12)";
const STROKE_FAINT = "rgba(255,255,255,0.07)";

/** Shared defs: one soft vertical wash and one radial glow. */
const Defs: FC<{ id: string }> = ({ id }) => (
  <defs>
    <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.055" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
    <radialGradient id={`${id}-glow`} cx="50%" cy="0%" r="75%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
  </defs>
);

/* ------------------------------------------------------------------ */
/* 01 · ATS parse x-ray                                                */
/* ------------------------------------------------------------------ */

/**
 * A resume page with the machine-readable layer drawn over it: the text
 * reduced to its parsed rules, section headings bracketed as detected
 * regions, and a scan line crossing the page with a readout chip.
 */
export const ParseXray: FC = () => (
  <svg viewBox="62 6 236 168" className="h-full w-full" role="img" aria-label="A resume being parsed, with detected sections outlined">
    <Defs id="xray" />
    <rect x="0" y="0" width="320" height="180" fill="url(#xray-glow)" opacity="0.5" />

    {/* The page */}
    <rect x="94" y="16" width="132" height="152" rx="5" fill="#101010" stroke={STROKE_SOFT} />
    <rect x="94" y="16" width="132" height="152" rx="5" fill="url(#xray-wash)" />

    {/* Name block */}
    <rect x="108" y="30" width="52" height="5" rx="2.5" fill="rgba(255,255,255,0.65)" />
    <rect x="108" y="40" width="80" height="3" rx="1.5" fill={STROKE} />

    {/* Detected section 1 */}
    <g>
      <rect x="103" y="54" width="114" height="34" rx="3" fill="none" stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
      <rect x="108" y="60" width="28" height="3.5" rx="1.75" fill="#ffffff" />
      <rect x="108" y="69" width="100" height="2.5" rx="1.25" fill={STROKE} />
      <rect x="108" y="76" width="86" height="2.5" rx="1.25" fill={STROKE} />
      {/* Region tag */}
      <rect x="192" y="50" width="34" height="12" rx="6" fill="#1A1A1A" stroke={STROKE_SOFT} />
      <text x="209" y="58.5" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.75)" fontFamily="inherit">
        SKILLS
      </text>
    </g>

    {/* Detected section 2 */}
    <g>
      <rect x="103" y="96" width="114" height="30" rx="3" fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
      <rect x="108" y="102" width="34" height="3.5" rx="1.75" fill="rgba(255,255,255,0.8)" />
      <rect x="108" y="111" width="96" height="2.5" rx="1.25" fill={STROKE_SOFT} />
      <rect x="108" y="118" width="72" height="2.5" rx="1.25" fill={STROKE_SOFT} />
    </g>

    {/* Unparsed tail — deliberately dimmer, the part a parser loses */}
    <rect x="108" y="136" width="92" height="2.5" rx="1.25" fill={STROKE_FAINT} />
    <rect x="108" y="143" width="104" height="2.5" rx="1.25" fill={STROKE_FAINT} />
    <rect x="108" y="150" width="64" height="2.5" rx="1.25" fill={STROKE_FAINT} />

    {/* Scan line */}
    <line x1="80" y1="92" x2="240" y2="92" stroke="url(#xray-fade)" strokeWidth="1" />
    <circle cx="226" cy="92" r="2.5" fill="#ffffff" />

    {/* Left-hand tick ruler, the measuring furniture */}
    {[...Array(9)].map((_, i) => (
      <line
        key={i}
        x1="78"
        y1={28 + i * 16}
        x2={i % 2 === 0 ? 86 : 83}
        y2={28 + i * 16}
        stroke={STROKE_SOFT}
        strokeWidth="1"
      />
    ))}

    {/* Readout chip */}
    <g>
      <rect x="236" y="80" width="58" height="22" rx="7" fill="#1A1A1A" stroke={STROKE_SOFT} />
      <circle cx="247" cy="91" r="2.5" fill="#ffffff" />
      <text x="254" y="94" fontSize="8" fill="rgba(255,255,255,0.85)" fontFamily="inherit">
        parsed
      </text>
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* 02 · Score gauge                                                    */
/* ------------------------------------------------------------------ */

/** A 240° arc with a tick ring, a swept value and a centre readout. */
export const ScoreGauge: FC<{ score?: number; label?: string; glow?: boolean }> = ({
  score = 78,
  label = "ATS SCORE",
  // The backdrop wash is sized to the bento cell it was drawn for. On a
  // narrower panel its edges land inside the visible box and read as a
  // rectangle, so callers outside the grid turn it off.
  glow = true,
}) => {
  const cx = 160;
  const cy = 118;
  const r = 74;

  // 240° of sweep, starting at 150° and ending at 390°.
  const start = 150;
  const total = 240;
  const value = Math.max(0, Math.min(100, score)) / 100;

  const pt = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  const arcPath = (fraction: number, radius: number) => {
    const [x0, y0] = pt(start, radius);
    const [x1, y1] = pt(start + total * fraction, radius);
    const large = total * fraction > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
  };

  const ticks = [...Array(41)].map((_, i) => {
    const angle = start + (total * i) / 40;
    const major = i % 5 === 0;
    const [x0, y0] = pt(angle, r + 9);
    const [x1, y1] = pt(angle, r + (major ? 18 : 14));
    const lit = i / 40 <= value;
    return (
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={lit ? "rgba(255,255,255,0.55)" : STROKE_FAINT}
        strokeWidth={major ? 1.4 : 1}
        strokeLinecap="round"
      />
    );
  });

  const [hx, hy] = pt(start + total * value, r);

  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-label={`A gauge reading a score of ${Math.round(score)} out of 100`}>
      <Defs id="gauge" />
      {glow && <rect x="0" y="0" width="320" height="180" fill="url(#gauge-glow)" opacity="0.45" />}

      {ticks}

      {/* Track and swept value */}
      <path d={arcPath(1, r)} fill="none" stroke={STROKE_FAINT} strokeWidth="6" strokeLinecap="round" />
      <path d={arcPath(value, r)} fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.92" />

      {/* Head of the sweep */}
      <circle cx={hx} cy={hy} r="7" fill="#0A0A0A" stroke="#ffffff" strokeWidth="2" />

      {/* Readout */}
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="38" fontWeight="500" fill="#ffffff" fontFamily="inherit">
        {Math.round(score)}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" fontFamily="inherit" letterSpacing="2">
        {label}
      </text>

      {/* Range labels */}
      <text x={cx - r - 14} y={cy + 34} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="inherit">0</text>
      <text x={cx + r + 14} y={cy + 34} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="inherit">100</text>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* 03 · Keyword match                                                  */
/* ------------------------------------------------------------------ */

/**
 * Job description on the left, resume on the right, with the terms that
 * matched joined by curves. One term is unmatched and stays open-ended — the
 * gap is the point of the picture.
 */
export const KeywordMatch: FC = () => {
  const rows = [
    { label: "React", matched: true },
    { label: "Node.js", matched: false },
    { label: "Postgres", matched: true },
    { label: "Docker", matched: true },
  ];

  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-label="Keywords from a job description matched against a resume">
      <Defs id="kw" />
      <rect x="0" y="0" width="320" height="180" fill="url(#kw-glow)" opacity="0.4" />

      {/* Column headers */}
      <text x="18" y="26" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="inherit" letterSpacing="1.5">
        JOB POST
      </text>
      <text x="302" y="26" textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="inherit" letterSpacing="1.5">
        YOUR RESUME
      </text>
      <line x1="18" y1="34" x2="128" y2="34" stroke={STROKE_FAINT} />
      <line x1="192" y1="34" x2="302" y2="34" stroke={STROKE_FAINT} />

      {rows.map((row, i) => {
        const y = 56 + i * 30;
        return (
          <g key={row.label}>
            {/* Left chip */}
            <rect x="18" y={y - 11} width="84" height="22" rx="7" fill="#141414" stroke={STROKE_SOFT} />
            <text x="30" y={y + 3.5} fontSize="9" fill="rgba(255,255,255,0.82)" fontFamily="inherit">
              {row.label}
            </text>

            {row.matched ? (
              <>
                {/* The join */}
                <path
                  d={`M 104 ${y} C 134 ${y}, 160 ${y}, 190 ${y}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                />
                <circle cx="147" cy={y} r="2.5" fill="#ffffff" />
                {/* Right chip */}
                <rect x="192" y={y - 11} width="84" height="22" rx="7" fill="#141414" stroke={STROKE_SOFT} />
                <text x="204" y={y + 3.5} fontSize="9" fill="rgba(255,255,255,0.82)" fontFamily="inherit">
                  {row.label}
                </text>
                <path d={`M 262 ${y - 1} l 3 3 l 5 -6`} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                {/* The gap: a dashed run that stops short */}
                <path
                  d={`M 104 ${y} C 128 ${y}, 142 ${y}, 160 ${y}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <rect x="192" y={y - 11} width="84" height="22" rx="7" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="4 4" />
                <text x="204" y={y + 3.5} fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="inherit">
                  missing
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* 04 · Application pipeline                                           */
/* ------------------------------------------------------------------ */

/** Three columns of a tracker board, with one card mid-move and a chip on it. */
export const Pipeline: FC = () => {
  const columns = [
    { label: "APPLIED", cards: 3 },
    { label: "INTERVIEW", cards: 2 },
    { label: "OFFER", cards: 1 },
  ];

  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-label="A board of job applications moving from applied to offer">
      <Defs id="pipe" />
      <rect x="0" y="0" width="320" height="180" fill="url(#pipe-glow)" opacity="0.4" />

      {columns.map((col, c) => {
        const x = 18 + c * 98;
        return (
          <g key={col.label}>
            <text x={x} y="28" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="inherit" letterSpacing="1.4">
              {col.label}
            </text>
            <text x={x + 86} y="28" textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="inherit">
              {col.cards}
            </text>
            <line x1={x} y1="36" x2={x + 86} y2="36" stroke={STROKE_FAINT} />

            {[...Array(col.cards)].map((_, i) => (
              <g key={i}>
                <rect
                  x={x}
                  y={48 + i * 34}
                  width="86"
                  height="26"
                  rx="6"
                  fill="#141414"
                  stroke={c === 2 && i === 0 ? "rgba(255,255,255,0.3)" : STROKE_SOFT}
                />
                <rect x={x + 9} y={56 + i * 34} width={34 - i * 6} height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
                <rect x={x + 9} y={64 + i * 34} width={52 - i * 4} height="2.5" rx="1.25" fill={STROKE_SOFT} />
                <circle cx={x + 76} cy={61 + i * 34} r="3" fill={c === 2 ? "#ffffff" : "rgba(255,255,255,0.25)"} />
              </g>
            ))}
          </g>
        );
      })}

      {/* The card in transit, lifted off the board */}
      <g>
        <path d="M 112 150 C 128 150, 132 138, 148 138" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
        <rect x="104" y="140" width="86" height="26" rx="6" fill="#1A1A1A" stroke="rgba(255,255,255,0.28)" />
        <rect x="113" y="148" width="30" height="3" rx="1.5" fill="#ffffff" />
        <rect x="113" y="156" width="48" height="2.5" rx="1.25" fill={STROKE} />
        {/* Status chip riding along with it */}
        <rect x="196" y="143" width="52" height="20" rx="6" fill="#1A1A1A" stroke={STROKE_SOFT} />
        <circle cx="206" cy="153" r="2.5" fill="#ffffff" />
        <text x="213" y="156.5" fontSize="7.5" fill="rgba(255,255,255,0.8)" fontFamily="inherit">
          moved
        </text>
      </g>
    </svg>
  );
};
