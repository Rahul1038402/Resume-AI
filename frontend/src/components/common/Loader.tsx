/**
 * Route loader.
 *
 * This was a spinning ring in `resume-primary`, a colour the app no longer
 * has, on a transparent ground - so a route change flashed a bright arc over
 * whatever happened to be behind it.
 *
 * What replaced it is the resume itself: a page outline with lines of text
 * landing on it one after another. It says what is being waited for, it is
 * built from the same greyscale ladder as every other surface, and because it
 * fills the viewport with `bg-ink` the hand-off from one route to the next has
 * no flash in it at all.
 *
 * Pure CSS, no framer-motion, because this renders inside the Suspense
 * fallback for routes that have not loaded their JavaScript yet - the loader
 * must not drag a library in with it.
 */
const LINES = [
  { w: "62%", d: "0s" },
  { w: "88%", d: "0.12s" },
  { w: "75%", d: "0.24s" },
  { w: "92%", d: "0.36s" },
  { w: "54%", d: "0.48s" },
];

const Loader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-screen w-full items-center justify-center bg-ink px-6"
  >
    <div className="flex flex-col items-center gap-6">
      {/* The page. 1:1.414 is A4, so it reads as a sheet rather than a box. */}
      <div className="relative h-[156px] w-[110px] overflow-hidden rounded-md border border-line-strong bg-ink-card p-3.5 shadow-2xl shadow-black/50">
        {/* Light from above, as on every other panel. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.3),transparent)]"
        />

        {/* The heading block. */}
        <div className="rb-line h-2 w-[70%] rounded-sm bg-white/80" style={{ animationDelay: "0s" }} />
        <div className="rb-line mt-1.5 h-1 w-[45%] rounded-sm bg-white/25" style={{ animationDelay: "0.06s" }} />

        <div className="mt-3 space-y-[5px]">
          {LINES.map((line) => (
            <div
              key={line.d}
              className="rb-line h-1 rounded-sm bg-white/15"
              style={{ width: line.w, animationDelay: line.d }}
            />
          ))}
        </div>

        {/* The scan pass, running the height of the sheet. */}
        <div
          aria-hidden="true"
          className="rb-scan pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.09),transparent)]"
        />
      </div>

      <p className="text-[0.78rem] font-medium tracking-wide text-mute-faint">
        Loading<span className="rb-dots" />
      </p>
    </div>

    <span className="sr-only">Loading</span>

    <style>{`
      @keyframes rb-line-in {
        0%   { opacity: 0; transform: translateX(-6px) scaleX(0.9); }
        55%  { opacity: 1; transform: none; }
        100% { opacity: 1; transform: none; }
      }
      @keyframes rb-scan {
        0%   { transform: translateY(-2.5rem); opacity: 0; }
        20%  { opacity: 1; }
        80%  { opacity: 1; }
        100% { transform: translateY(156px); opacity: 0; }
      }
      @keyframes rb-dots {
        0%, 20%  { content: ""; }
        40%      { content: "."; }
        60%      { content: ".."; }
        80%, 100%{ content: "..."; }
      }
      .rb-line {
        transform-origin: left center;
        opacity: 0;
        animation: rb-line-in 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
      }
      .rb-scan { animation: rb-scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      .rb-dots::after { content: ""; animation: rb-dots 1.4s steps(1, end) infinite; }

      /* A loading state is not worth triggering anyone's vestibular system:
         keep the sheet, drop the motion. */
      @media (prefers-reduced-motion: reduce) {
        .rb-line { opacity: 1; animation: none; }
        .rb-scan { display: none; }
        .rb-dots::after { content: "..."; animation: none; }
      }
    `}</style>
  </div>
);

export default Loader;
