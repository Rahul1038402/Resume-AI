import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef, type FC } from "react";
import { FadeUp } from "../ui/kit";

/**
 * A quiet row of numbers, in the shape of the reference's four-up icon strip.
 *
 * No cards and no heading: this is a divider between two heavier sections, so
 * it stays as light as it can while still saying something concrete.
 */
type Stat = {
  value: number;
  unit: string;
  label: string;
};

const Counter: FC<{ value: number; unit: string }> = ({ value, unit }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const count = useMotionValue(0);
  const text = useTransform(count, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!inView) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      count.set(value);
      return;
    }

    const controls = animate(count, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [inView, count, value]);

  return (
    <span ref={ref} className="flex items-baseline gap-1">
      <motion.span className="text-3xl font-medium tracking-tight text-white">
        {text}
      </motion.span>
      <span className="text-base text-mute-dim">{unit}</span>
    </span>
  );
};

const stats: Stat[] = [
  { value: 10, unit: "sec", label: "Upload to scored resume" },
  { value: 5, unit: "min", label: "To build one from scratch" },
  { value: 3, unit: "tools", label: "Sharing a single document" },
  { value: 0, unit: "₹", label: "No trial, no card" },
];

const StatsSection = () => {
  return (
    <section data-bg="dark" className="relative px-6 py-16">
      <div className="mx-auto w-full max-w-6xl border-y border-line py-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.06}>
              <Counter value={stat.value} unit={stat.unit} />
              <p className="mt-2 text-[0.8rem] text-mute-dim">{stat.label}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
