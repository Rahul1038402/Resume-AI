import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { CSSProperties, FC, ReactNode } from "react";

/**
 * The landing page kit.
 *
 * One ground, one accent, and that accent is white. Every surface here is a
 * step on the same greyscale ladder — ink → card → raised — separated by
 * hairline borders and a top-down gradient rather than by colour. The whole
 * look depends on that restraint: a single saturated hue anywhere makes the
 * lighting read as decoration instead of as light.
 */

/** Small pill above a headline. */
export const Badge: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 py-1.5 text-xs text-mute ${className}`}
  >
    <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" aria-hidden="true">
      <path
        d="M8 1.5l1.4 3.9L13.5 7l-4.1 1.6L8 12.5 6.6 8.6 2.5 7l4.1-1.6z"
        fill="currentColor"
      />
    </svg>
    {children}
  </span>
);

/**
 * Two-tone heading.
 *
 * The emphasised words stay white and the connective ones drop to grey,
 * inside one sentence. Pass the sentence as fragments: strings render white,
 * `dim("…")` renders grey.
 */
export const dim = (text: string) => ({ __dim: text });

type Fragment = string | { __dim: string };

export const TwoTone: FC<{
  parts: Fragment[];
  as?: "h1" | "h2";
  className?: string;
}> = ({ parts, as: Tag = "h2", className = "" }) => (
  <Tag
    className={`text-balance font-medium leading-[1.12] tracking-[-0.02em] text-white ${className}`}
  >
    {parts.map((part, i) =>
      typeof part === "string" ? (
        <span key={i}>{part}</span>
      ) : (
        <span key={i} className="text-mute-dim">
          {part.__dim}
        </span>
      )
    )}
  </Tag>
);

/** Centred section header: badge, two-tone title, one line of grey copy. */
export const SectionHead: FC<{
  badge?: string;
  parts: Fragment[];
  body?: string;
  className?: string;
}> = ({ badge, parts, body, className = "" }) => (
  <div className={`mx-auto max-w-2xl text-center ${className}`}>
    {badge && (
      <FadeUp>
        <Badge className="mb-6">{badge}</Badge>
      </FadeUp>
    )}
    <FadeUp delay={0.05}>
      <TwoTone parts={parts} className="text-3xl sm:text-[2.6rem]" />
    </FadeUp>
    {body && (
      <FadeUp delay={0.1}>
        <p className="mx-auto mt-5 max-w-lg text-pretty text-sm leading-relaxed text-mute-dim">
          {body}
        </p>
      </FadeUp>
    )}
  </div>
);

/**
 * Buttons.
 *
 * `solid` is white on black — the only pure-white block on the page, which is
 * what makes it the obvious thing to press. `ghost` is a raised dark pill.
 */
type ButtonProps = {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  className?: string;
};

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const VARIANT = {
  solid: "bg-white text-ink hover:bg-white/90",
  ghost: "border border-line-strong bg-ink-raised text-white hover:bg-ink-raised/70",
};

export const Button: FC<ButtonProps> = ({
  children,
  to,
  onClick,
  variant = "solid",
  className = "",
}) => {
  const classes = `${BTN} ${VARIANT[variant]} ${className}`;

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
};

/** The arrow that sits inside a call to action. */
export const Arrow: FC = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
    <path
      d="M4.5 11.5L11.5 4.5M6 4.5h5.5V10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Bento card.
 *
 * The gradient runs light-to-dark downward and the border is brightest along
 * the top edge, which reads as light falling from above — the same trick the
 * whole page uses to get depth without colour.
 */
export const Card: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-ink-card to-ink-soft ${className}`}
  >
    {/* The hairline of light along the top edge. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
    />
    {children}
  </div>
);

/** Rise-and-fade as a block scrolls in. */
export const FadeUp: FC<{
  children: ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

/**
 * Sheen: the soft greyscale washes that lift the black ground.
 *
 * These are not decoration bolted on afterwards — they are the whole reason
 * the reference reads as lit rather than as flat black. The values below were
 * sampled off it rather than guessed: the hero wash peaks at 19% white in the
 * top-left corner and decays to nothing by a quarter of the way down, and the
 * big side washes peak around 15% white anchored to an edge, dying out at
 * about 40% across.
 *
 * All of them are white at a low alpha over a black ground, so they stay
 * strictly monochrome and cost nothing but a paint.
 */
const SHEENS: Record<string, string> = {
  /**
   * Hero: a broad diagonal rake entering from the upper right and sweeping
   * down-left across the whole frame, plus a smaller wash in the top-left
   * corner. Measured off the reference at 25th-percentile background
   * luminance: 0.22 at the upper-right peak, still ~0.11 through the middle
   * of the frame, and ~0.01 across the bottom - so the falloff has to be slow
   * and the radii close to the size of the section itself.
   *
   * The black layer at the end is what forces the lower third back down; the
   * washes alone leave it far too bright.
   */
  "hero-top": [
    // Base lift. The reference floor never reaches pure black - it sits
    // around 0.012 even in its darkest cells - and without this the lower
    // third of the section dies completely.
    "linear-gradient(rgba(255,255,255,0.013), rgba(255,255,255,0.013))",
    // The rake. Centre sits a fifth of the way down the right edge, not in
    // the corner, and the ellipse is larger than the section so the falloff
    // is still only halfway through by the time it crosses the middle.
    "radial-gradient(ellipse 105% 125% at 95% 22%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.145) 22%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.055) 58%, rgba(255,255,255,0.022) 76%, transparent 94%)",
    // Top-left wash, with a long tail down the left flank.
    "radial-gradient(ellipse 55% 85% at 0% 6%, rgba(255,255,255,0.105) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.018) 55%, transparent 85%)",
    // Gentle floor shadow. A hard one here zeroed the bottom rows.
    "linear-gradient(to bottom, transparent 62%, rgba(0,0,0,0.4) 100%)",
  ].join(", "),

  /**
   * The one strongly lit feature band.
   *
   * Two washes, not one. The reference's bright ridge MOVES as it descends -
   * it peaks about a fifth of the way across at the top edge and slides to
   * hard against the left edge at the bottom. A single edge-anchored ellipse
   * cannot do that, because its contours are concentric and the brightest
   * cell in every row would sit at the same x. So: a core anchored at the
   * bottom-left corner, plus a weaker lift centred up and to the right, and
   * the ridge falls out of the overlap.
   *
   * Peak measures 0.19 at the core, ~0.11 a seventh of the way across, and
   * black by roughly 40% of the width.
   */
  left: [
    // Vertical geometry in px, not %, because this wash is painted on a box
    // that extends past the section (see `bleed`): a percentage centre would
    // drift as soon as the box grew. The offset subtracts the bleed as well,
    // so the core stays 80px above the SECTION's bottom edge no matter how
    // deep the bleed is - subtracting a bare 400px moved the core down with
    // the box and left a visible cut where the box ended.
    "radial-gradient(ellipse 55% 740px at 0% calc(100% - var(--sheen-bleed, 0px) - 80px), rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.155) 20%, rgba(255,255,255,0.11) 38%, rgba(255,255,255,0.062) 55%, rgba(255,255,255,0.026) 72%, transparent 92%)",
    "radial-gradient(ellipse 40% 38% at 26% 20%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.035) 35%, rgba(255,255,255,0.014) 60%, transparent 86%)",
  ].join(", "),

  /** Mirrored, for a band lit from the other side. */
  right: [
    "radial-gradient(ellipse 55% 112% at 100% 8%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.155) 20%, rgba(255,255,255,0.11) 38%, rgba(255,255,255,0.062) 55%, rgba(255,255,255,0.026) 72%, transparent 92%)",
    "radial-gradient(ellipse 40% 56% at 74% 70%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.035) 35%, rgba(255,255,255,0.014) 60%, transparent 86%)",
  ].join(", "),

  /**
   * Closing section. Much fainter than it looks like it should be: the
   * reference only reaches 0.039 at the bottom centre, so anything stronger
   * reads as a spotlight rather than as spill.
   */
  "bottom-center":
    "radial-gradient(ellipse 60% 70% at 50% 108%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 45%, transparent 75%)",
};

export const Sheen: FC<{
  variant: keyof typeof SHEENS;
  /**
   * Paint past the bottom of the section by this many pixels.
   *
   * A wash whose core sits near a section's bottom edge gets sliced off by it,
   * and the cut reads as a seam between sections. The reference has no such
   * seam: its light peaks just above the boundary and keeps falling for
   * another ~280px into whatever follows. Bleeding the box reproduces that.
   *
   * The host section must not clip (no `overflow-hidden`), and the following
   * section must not paint its own background, or the spill is hidden.
   */
  bleed?: number;
  className?: string;
}> = ({ variant, bleed = 0, className = "" }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute inset-x-0 top-0 ${className}`}
    style={
      {
        height: bleed ? `calc(100% + ${bleed}px)` : "100%",
        backgroundImage: SHEENS[variant],
        // Read back inside the gradient so its centre can stay anchored to
        // the section rather than to the bled box.
        "--sheen-bleed": `${bleed}px`,
      } as CSSProperties
    }
  />
);
