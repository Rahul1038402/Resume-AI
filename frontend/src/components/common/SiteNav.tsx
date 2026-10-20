import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "./Logo";

/**
 * The site nav: one floating pill, centred links, a white call to action.
 *
 * Replaces the old CardNav, which expanded into coloured cards and carried
 * its own duplicate theme hook. This is deliberately plain — on a page lit
 * from above, a quiet dark pill reads as part of the furniture, and the only
 * white thing in it is the button you are meant to press.
 */
const REPO_URL = "https://github.com/Rahul1038402/Resume-AI-Rework";

const links = [
  { label: "Home", to: "/" },
  { label: "Builder", to: "/builder" },
  { label: "Analyzer", to: "/analyzer" },
  { label: "Tracker", to: "/tracker" },
  { label: "About", to: "/about" },
];

type SupabaseUser = {
  user_metadata?: { avatar_url?: string; picture?: string; full_name?: string };
  email?: string;
};

const SiteNav = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Session, kept in step with auth changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close the menus on navigation and on an outside click.
  useEffect(() => {
    setMenuOpen(false);
    setUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = () => supabase.auth.signOut();

  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

  const avatar =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[100] px-4 pt-4">
      {/* Full-width band behind the pill, fully opaque.
          The pill alone only covers its own shape, so anything scrolling past
          it showed in the gaps either side. 88px is the pill (56px) plus its
          16px top offset and the same again below, so the builder's toolbar
          can butt straight up against it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[88px] bg-ink"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-stretch gap-2">
        <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-full border border-line bg-ink-card py-2 pl-4 pr-2">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-[0.95rem] font-medium text-white">ResumeAI</span>
          </Link>

          {/* Links */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `relative rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 ${
                    isActive ? "text-white" : "text-mute hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        aria-hidden="true"
                        className="absolute inset-x-3.5 -bottom-0.5 h-px bg-white"
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Star on GitHub. The label collapses on small screens so the
                pill keeps its shape; the glyph alone still reads. */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star ResumeAI on GitHub"
              className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-2 text-sm text-mute transition-colors duration-300 hover:border-line-bright hover:text-white sm:px-4"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
              </svg>
              <span className="hidden lg:inline">Star on GitHub</span>
            </a>

            {user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenu((v) => !v)}
                  aria-label="Account menu"
                  className="block h-8 w-8 overflow-hidden rounded-full border border-line-strong"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-white">
                      {(user.email ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-11 w-52 rounded-2xl border border-line bg-ink-card p-2 shadow-2xl shadow-black/60"
                    >
                      <p className="truncate px-3 py-2 text-xs text-mute-faint">
                        {user.email}
                      </p>
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-mute transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={signIn}
                className="hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-300 hover:bg-white/90 sm:block"
              >
                Login
              </button>
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-white md:hidden"
            >
              <span className="relative block h-3.5 w-4">
                <span
                  className={`absolute left-0 block h-px w-4 bg-current transition-transform duration-300 ${
                    menuOpen ? "top-[7px] rotate-45" : "top-0.5"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-4 bg-current transition-transform duration-300 ${
                    menuOpen ? "top-[7px] -rotate-45" : "top-[12px]"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto rounded-3xl border border-line bg-ink-card p-2 md:hidden"
            >
              {!user && (
                <button
                  type="button"
                  onClick={signIn}
                  className="mb-1 block w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink sm:hidden"
                >
                  Login
                </button>
              )}

              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm transition-colors ${
                      isActive ? "bg-white/5 text-white" : "text-mute hover:text-white"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default SiteNav;
