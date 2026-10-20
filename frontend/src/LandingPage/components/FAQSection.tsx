import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SectionHead, dim } from "../ui/kit";

/**
 * FAQ as a perspective carousel.
 *
 * Cards sit on a shared 3D stage: the centre one faces you square on, its
 * neighbours turn away and shrink, and the pair beyond those bleed off the
 * edges of the viewport. The depth comes from real rotateY on a perspective
 * container rather than from scaling alone, which is what stops it reading as
 * a flat row of shrinking boxes.
 *
 * Every card is always in the DOM and readable by a screen reader, so the
 * answers are not hidden behind an interaction — the carousel is presentation,
 * not the only way to the content.
 */
const faqs = [
  {
    question: "What happens to my resume after I upload it?",
    answer:
      "It is held in memory only long enough to extract the text, then dropped. Nothing is written to disk, nothing is kept once the response is sent, and nothing is shared or sold.",
  },
  {
    question: "Is it actually free?",
    answer:
      "Yes. The builder, the analyzer and the tracker are free, and the core of all three stays that way. No trial, no card, no credits.",
  },
  {
    question: "Do I need an account?",
    answer:
      "Not for the builder or the analyzer. The tracker needs one, because it has to store your applications somewhere and attach them to you.",
  },
  {
    question: "How accurate is the score?",
    answer:
      "It reflects what a parser can extract and how that lines up with the role you named. A strong signal about structure and keyword coverage — not a prediction about any one company, since every ATS is configured differently.",
  },
  {
    question: "Which roles does it understand best?",
    answer:
      "It is tuned for tech: software engineering, product and design. It will parse anything, but the skill matching is sharpest in those areas.",
  },
];

/** Depth table, indexed by how far a card sits from the centre. */
const DEPTH = [
  { scale: 1, rotate: 0, opacity: 1, depth: 0, layer: 30, spread: 0 },
  { scale: 0.94, rotate: 26, opacity: 0.8, depth: -60, layer: 20, spread: 1 },
  // Not 2x: at double the spacing the outer pair leaves the viewport
  // entirely, where the reference keeps them half-visible at the edges.
  { scale: 0.88, rotate: 38, opacity: 0.42, depth: -150, layer: 10, spread: 1.78 },
];

const FAQSection = () => {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(300);
  const [cardWidth, setCardWidth] = useState(340);
  const stageRef = useRef<HTMLDivElement>(null);

  // How far apart the cards sit depends on the room available: on a phone the
  // neighbours only peek in, on a wide screen they stand clear of the centre.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const width = stage.clientWidth;
      // Cards sit close enough to overlap slightly, which is what makes the
      // row read as one turning object rather than as separate tiles.
      setStep(Math.max(150, Math.min(382, width * 0.285)));
      setCardWidth(width < 640 ? 300 : 340);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const count = faqs.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  /** Signed distance from the active card, wrapped so the ring is seamless. */
  const offsetOf = (i: number) => {
    const raw = (i - index + count) % count;
    return raw > count / 2 ? raw - count : raw;
  };

  return (
    <section data-bg="dark" className="relative overflow-hidden px-6 py-24">
      <SectionHead
        badge="Questions"
        parts={["Before you ", dim("hand over a file")]}
        body="The things worth knowing before you upload a document with your name, your history and your phone number on it."
        className="mb-16"
      />

      {/* The stage. Perspective lives here so every card shares one vanishing
          point; putting it on the cards would give each its own. */}
      <div
        ref={stageRef}
        className="relative mx-auto h-[270px] w-full max-w-6xl sm:h-[250px]"
        style={{ perspective: "1100px" }}
        role="group"
        aria-roledescription="carousel"
        aria-label="Frequently asked questions"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {faqs.map((faq, i) => {
          const offset = offsetOf(i);
          const distance = Math.abs(offset);

          // Beyond the second ring a card is behind its neighbours and
          // invisible; keep it mounted but parked.
          const depth = DEPTH[Math.min(distance, 2)];
          const hidden = distance > 2;
          const isCentre = distance === 0;

          return (
            <motion.div
              key={faq.question}
              className="absolute left-1/2 top-0 w-[300px] sm:w-[340px]"
              style={{
                zIndex: depth.layer,
                transformStyle: "preserve-3d",
                marginLeft: -cardWidth / 2,
              }}
              initial={false}
              animate={{
                x: Math.sign(offset) * depth.spread * step,
                z: depth.depth,
                scale: depth.scale,
                rotateY: offset === 0 ? 0 : offset > 0 ? -depth.rotate : depth.rotate,
                opacity: hidden ? 0 : depth.opacity,
              }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => !isCentre && setIndex(i)}
                tabIndex={isCentre ? -1 : 0}
                aria-label={isCentre ? undefined : `Show: ${faq.question}`}
                className={`relative block h-[240px] w-full cursor-default overflow-hidden rounded-2xl border p-6 text-left transition-colors duration-500 sm:h-[220px] ${
                  isCentre
                    ? "border-line-strong bg-gradient-to-b from-ink-card to-ink-soft"
                    : "cursor-pointer border-line bg-ink-soft"
                }`}
              >
                {/* Top-edge highlight, only on the card facing you. */}
                {isCentre && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  />
                )}

                <span className="block text-[0.7rem] uppercase tracking-[0.18em] text-mute-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* The question carries the card: larger, white, medium. */}
                <h3 className="mt-4 text-pretty text-lg font-medium leading-snug text-white sm:text-xl">
                  {faq.question}
                </h3>

                {/* The answer sits under it, smaller and dimmer. */}
                <p className="mt-3 text-pretty text-[0.82rem] leading-relaxed text-mute-dim">
                  {faq.answer}
                </p>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Controls. The forward button is the white one, matching every other
          primary action on the page. */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous question"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-white transition-colors duration-200 hover:bg-white/5"
        >
          <Chevron direction="left" />
        </button>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next question"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink transition-colors duration-200 hover:bg-white/90"
        >
          <Chevron direction="right" />
        </button>
      </div>

      {/* Which card is showing, for anyone not tracking the 3D. */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {faqs.map((faq, i) => (
          <button
            key={faq.question}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to question ${i + 1}`}
            aria-current={i === index}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/25 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default FAQSection;
