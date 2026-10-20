import { motion } from "framer-motion";
import { Badge, Button, Arrow, TwoTone, dim, Sheen } from "../ui/kit";
import { ResumeBar } from "./ResumeBar";

/**
 * Hero.
 *
 * Centred stack, lit from above: badge, two-tone headline, one line of grey
 * copy, two buttons, then the object itself. The light sits behind the
 * headline and again above the bar, so the eye travels down the page along
 * the lighting rather than along a rule.
 */
const HeroSection = () => {
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section data-bg="dark" className="relative overflow-hidden px-6 pb-20 pt-36">
      {/* The wash hugs the top edge with a hot spot in each corner, which is
          where the reference puts its light - not in the middle. */}
      <Sheen variant="hero-top" />
      {/* Floor shadow, so the section ends in darkness rather than mid-grey. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-ink"
      />

      <div className="relative mx-auto w-full max-w-4xl text-center">
        <motion.div {...rise(0.08)}>
          <TwoTone
            as="h1"
            className="mt-7 text-[2.6rem] leading-[1.08] sm:text-6xl pt-10"
            parts={["Get past the filter, ", dim("then the human")]}
          />
        </motion.div>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-mute-dim"
          {...rise(0.16)}
        >
          Software reads your resume before a person ever does. Check what it
          extracts, fix what it misses, and build the next one in a format that
          parses cleanly.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          {...rise(0.24)}
        >
          <Button to="/builder">
            Build a resume
            <Arrow />
          </Button>
          <Button to="/analyzer" variant="ghost">
            Open the analyzer
          </Button>
        </motion.div>
      </div>

      <motion.div className="relative mt-14" {...rise(0.32)}>
        <ResumeBar />
      </motion.div>
    </section>
  );
};

export default HeroSection;
