import { Link } from "react-router-dom";
import { Github, Mail, Globe } from "lucide-react";
import { Logo } from "./Logo";

/**
 * Footer.
 *
 * A single centred stack - mark, links, icons - inside a rounded panel that
 * sits inset from the page edges, so the page ends on a defined shape rather
 * than running off the bottom of the viewport.
 *
 * This replaced a four-column directory plus an enormous clipped wordmark.
 * The directory was mostly air: five links spread across the full width of a
 * 1280px page, with two of the four columns holding two items each. Centred
 * and stacked, the same five links read in one pass and the footer costs a
 * third of the height.
 *
 * The only light in it is the hairline across the top, which separates the
 * panel from the page without drawing a hard border all the way round.
 */
const links = [
  { label: "Builder", to: "/builder" },
  { label: "Analyzer", to: "/analyzer" },
  { label: "Tracker", to: "/tracker" },
  { label: "About", to: "/about" },
];

/** X ships no lucide glyph - the bird is the old brand - so it is inlined. */
const XMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socials = [
  { Icon: Github, href: "https://github.com/Rahul1038402", label: "GitHub" },
  { Icon: XMark, href: "https://x.com/Rahul_Kr_Mall", label: "X" },
  { Icon: Globe, href: "https://rahul-kumar-mall.vercel.app/", label: "Portfolio" },
  { Icon: Mail, href: "mailto:rahul1038402@gmail.com", label: "Email" },
];

const Footer = () => {
  return (
    <footer className="bg-ink px-4 pb-4 pt-10 sm:px-6">
      <div className="relative mx-auto w-full max-w-[1600px] overflow-hidden rounded-2xl border border-line bg-ink-soft px-6 py-10">
        {/* The light along the top edge, brightest at the centre. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.28)_50%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(255,255,255,0.07)_0%,transparent_70%)]"
        />

        <div className="relative flex flex-col items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-[0.95rem] font-medium text-white">ResumeAI</span>
          </Link>

          <nav>
            <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-mute transition-colors duration-300 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="flex items-center gap-2">
            {socials.map(({ Icon, href, label }) => (
              <li key={label}>
                <a
                  href={href}
                  // mailto: has no document to open in a new tab.
                  {...(href.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  aria-label={label}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-mute transition-colors duration-300 hover:border-line-bright hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>

          <p className="pt-2 text-center text-xs font-medium text-mute-faint">
            &copy; {new Date().getFullYear()} ResumeAI &middot; Free and open source
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
