import { Coffee, Github, Globe, Mail } from "lucide-react";
import Layout from "@/components/common/Layout";
import {
  Arrow,
  Button,
  Card,
  FadeUp,
  SectionHead,
  TwoTone,
  dim,
} from "@/LandingPage/ui/kit";

/**
 * About.
 *
 * Rebuilt on the landing page's kit rather than on its own set of primitives.
 * The previous version used an animated five-colour gradient headline, glowing
 * cards on two accent hues, emoji as section icons and a saturated CTA block -
 * none of which exist anywhere else in the app any more, so the one page that
 * explains the product was the one page that looked like a different product.
 *
 * Same ladder as everywhere else: ink, card, raised, hairline borders, and
 * white as the only accent.
 *
 * This page also absorbed the separate "About me" route. That page carried
 * three things worth keeping - who built this, where to find their other work,
 * and the way to support it - and a whole route for three paragraphs was more
 * navigation than the content justified.
 */

const PRINCIPLES = [
  {
    title: "Free, and actually free",
    body:
      "No account to read your score, no credit card, no trial that ends. The analyser, the builder and the tracker are all open to anyone, and the source is public.",
  },
  {
    title: "Your resume is not stored",
    body:
      "Uploads are parsed in memory and dropped when the request ends. Nothing is written to disk and nothing is used for training. Only the applications you deliberately save are kept, behind per-user row-level policies.",
  },
  {
    title: "Written for the machine first",
    body:
      "An applicant tracking system reads a flat stream of text, not a layout. Every default here - the single column, the serif body, the plain section headings - is chosen because parsers handle it predictably.",
  },
  {
    title: "No invented numbers",
    body:
      "Scores are computed in code from what the parser actually found. The model reads and extracts; it never decides the arithmetic, so a score cannot be talked upward by anything written in a resume.",
  },
];

const STEPS = [
  { n: "01", title: "Analyze", body: "Upload a resume and a job description, and see what a parser sees." },
  { n: "02", title: "Build", body: "Fix the gaps in an editor that previews the exact PDF you will send." },
  { n: "03", title: "Apply", body: "Download a single-column PDF that survives the parse." },
  { n: "04", title: "Track", body: "Keep every application on one board, synced from your inbox." },
];

const LINKS = [
  { Icon: Github, href: "https://github.com/Rahul1038402", label: "GitHub" },
  { Icon: Globe, href: "https://rahul-kumar-mall.vercel.app/", label: "Portfolio" },
  { Icon: Mail, href: "mailto:rahul1038402@gmail.com", label: "Email" },
];

const About = () => {
  return (
    <Layout>
      <div className="bg-ink pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-16 pt-20">
          {/* The same overhead wash the landing hero uses. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(255,255,255,0.08)_0%,transparent_70%)]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <FadeUp delay={0.05}>
              <TwoTone
                as="h1"
                parts={["Resumes get read by software ", dim("before a person ever sees them")]}
                className="text-3xl sm:text-[2.9rem]"
              />
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-sm leading-relaxed text-mute-dim">
                ResumeAI exists because that first reader is a parser, and almost
                nothing about writing a good resume prepares you for it. These
                tools show you what it extracts, score the gap against a real job
                description, and help you close it.
              </p>
            </FadeUp>
          </div>
        </section>

        {/* Principles */}
        <section className="relative px-6 pb-24">
          <SectionHead
            badge="How it is built"
            parts={["Four things that ", dim("do not change")]}
            className="mb-14"
          />
          <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <FadeUp key={p.title} delay={i * 0.05}>
                <Card className="h-full p-6">
                  <h3 className="text-[0.95rem] font-medium text-white">{p.title}</h3>
                  <p className="mt-2 text-pretty text-[0.82rem] leading-relaxed text-mute-dim">
                    {p.body}
                  </p>
                </Card>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="relative px-6 pb-24">
          <SectionHead
            badge="The loop"
            parts={["Read it, ", dim("fix it, send it, track it")]}
            className="mb-14"
          />
          <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.05}>
                <Card className="h-full p-6">
                  <span className="block text-[0.7rem] tabular-nums tracking-[0.18em] text-mute-faint">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-[0.95rem] font-medium text-white">{s.title}</h3>
                  <p className="mt-1.5 text-pretty text-[0.82rem] leading-relaxed text-mute-dim">
                    {s.body}
                  </p>
                </Card>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* Who built it, and the coffee */}
        <section className="relative px-6 pb-24">
          <SectionHead
            badge="Support"
            parts={["Built by one person, ", dim("kept free by choice")]}
            className="mb-14"
          />

          <FadeUp>
            <Card className="mx-auto w-full max-w-5xl overflow-hidden">
              <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.4fr_auto] lg:items-center lg:gap-12">
                <div>
                  <h3 className="text-[1.05rem] font-medium text-white">
                    Hi, I am Rahul.
                  </h3>
                  <p className="mt-3 text-pretty text-[0.85rem] leading-relaxed text-mute-dim">
                    I am a computer science student who got tired of guessing why
                    applications disappeared, so I built the thing I wanted: a way
                    to see the resume the way the software does. ResumeAI runs on
                    free tiers end to end, which is what keeps it free to use - and
                    also what caps how much it can do in a day.
                  </p>
                  <p className="mt-3 text-pretty text-[0.85rem] leading-relaxed text-mute-dim">
                    If it saved you an afternoon, a coffee covers a little of the
                    running cost and a lot of the motivation. Scan to pay over UPI.
                    There is no paid tier and nothing is gated behind this.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {LINKS.map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        {...(href.startsWith("mailto:")
                          ? {}
                          : { target: "_blank", rel: "noopener noreferrer" })}
                        className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-[0.78rem] font-medium text-mute transition-colors duration-300 hover:border-line-bright hover:text-white"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </a>
                    ))}
                  </div>
                </div>

                {/* The QR is the one place a photographic surface appears, so it
                    gets a white card to sit on - a dark QR on a dark panel is
                    harder for a phone camera to lock onto. */}
                <figure className="mx-auto w-full max-w-[14rem] shrink-0">
                  <div className="rounded-xl border border-line-strong bg-white p-3">
                    <img
                      src="/Rahul_UPI_QR.png"
                      alt="UPI QR code to send a tip to Rahul"
                      width={400}
                      height={400}
                      loading="lazy"
                      className="block h-auto w-full rounded-md"
                    />
                  </div>
                  <figcaption className="mt-4 flex items-center justify-center gap-2 text-white">
                    <Coffee className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                    <span className="text-[0.95rem] font-medium">Buy me a coffee</span>
                  </figcaption>
                </figure>
              </div>
            </Card>
          </FadeUp>
        </section>

        {/* CTA */}
        <section className="relative px-6 pb-28">
          <FadeUp>
            <Card className="mx-auto w-full max-w-5xl p-10 text-center sm:p-14">
              <TwoTone
                parts={["See what a parser ", dim("makes of your resume")]}
                className="mx-auto max-w-xl text-2xl sm:text-[2rem]"
              />
              <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-mute-dim">
                No account, no card. Upload a PDF and read the score in under a
                minute.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button to="/analyzer">
                  Analyze a resume
                  <Arrow />
                </Button>
                <Button to="/builder" variant="ghost">
                  Open the builder
                </Button>
              </div>
            </Card>
          </FadeUp>
        </section>
      </div>
    </Layout>
  );
};

export default About;
