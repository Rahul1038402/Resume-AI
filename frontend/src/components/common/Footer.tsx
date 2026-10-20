import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github } from "lucide-react";

/**
 * Footer.
 *
 * Ends the page the way the reference does: the links and the legal line
 * first, then the wordmark set enormous along the bottom edge, clipped by the
 * viewport so it reads as a signature rather than as a heading.
 *
 * The wordmark is drawn in a near-black that sits only a few steps above the
 * ground, so it registers as texture until you look straight at it.
 */
const columns = [
  {
    title: "Product",
    links: [
      { label: "Resume builder", to: "/builder" },
      { label: "ATS analyzer", to: "/analyzer" },
      { label: "Application tracker", to: "/tracker" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About ResumeAI", to: "/about" },
      { label: "About me", to: "/aboutme" },
    ],
  },
];

const socials = [
  { Icon: Twitter, href: "https://x.com/Rahul_Kr_Mall", label: "Twitter" },
  { Icon: Linkedin, href: "https://www.linkedin.com/in/rahul-kr-mall", label: "LinkedIn" },
  { Icon: Github, href: "https://github.com/Rahul1038402", label: "GitHub" },
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink px-6 pt-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="max-w-xs text-pretty text-sm leading-relaxed text-mute-dim">
              Free tools for getting a resume past applicant tracking systems —
              built, scored and tracked in one place.
            </p>

            <ul className="mt-6 flex gap-2">
              {socials.map(({ Icon, href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mute transition-colors duration-200 hover:border-line-strong hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[0.7rem] uppercase tracking-[0.18em] text-mute-faint">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-mute transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-line py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-mute-faint">
            © {new Date().getFullYear()} ResumeAI. All rights reserved.
          </p>
          <a
            href="mailto:rahul1038402@gmail.com"
            className="text-xs text-mute-faint transition-colors hover:text-white"
          >
            rahul1038402@gmail.com
          </a>
        </div>
      </div>

      {/* The signature. Clipped at the bottom edge on purpose. */}
      <div aria-hidden="true" className="relative mx-auto max-w-7xl select-none">
        <span className="block translate-y-[0.16em] text-center text-[20vw] font-bold leading-[0.8] tracking-[-0.04em] text-white/[0.05]">
          ResumeAI
        </span>
      </div>
    </footer>
  );
};

export default Footer;
