import { Button, Arrow, FadeUp, TwoTone, dim, Sheen } from "../ui/kit";

/**
 * Closing call to action.
 *
 * The reference ends on a lit statement with a single white button, and so
 * does this. One action: the builder, because anyone still reading has
 * already had the chance to score a resume at the top of the page.
 */
const CTASection = () => {
  return (
    <section data-bg="dark" className="relative overflow-hidden px-6 pb-28 pt-24">
      {/* Light rising from the floor, closing the page the way the hero
          opened it. */}
      <Sheen variant="bottom-center" />

      <div className="relative mx-auto w-full max-w-2xl text-center">
        <FadeUp>
          <TwoTone
            parts={["Write the resume ", dim("the filter can read")]}
            className="text-3xl sm:text-[2.6rem]"
          />
        </FadeUp>

        <FadeUp delay={0.08}>
          <p className="mx-auto mt-5 max-w-md text-pretty text-sm leading-relaxed text-mute-dim">
            Free to use, nothing stored, and no account until you want one.
          </p>
        </FadeUp>

        <FadeUp delay={0.14}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/builder">
              Start building
              <Arrow />
            </Button>
            <Button to="/tracker" variant="ghost">
              Track applications
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default CTASection;
