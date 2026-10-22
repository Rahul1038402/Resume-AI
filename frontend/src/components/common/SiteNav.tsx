import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "./Logo";

/**
 * The site nav: a plain full-width bar.
 *
 * This was a floating pill. A pill is an object sitting on top of the page,
 * which works when the page behind it is a single uninterrupted dark field -
 * the landing page - and reads as a stray dark lozenge everywhere else, where
 * the content below starts with its own panels and borders.
 *
 * So: flush to the top, with no closing edge at all - the ground fades out
 * downward and takes the blur with it, so the bar dissolves into whatever is
 * beneath rather than stopping on a line that has to suit every page. Frosted
 * rather than
 * solid - translucent alone was tried first and only produced a muddy grey
 * where the builder's white page showed through, because nothing was blurring
 * it. The blur is what makes it read as glass instead of a mistake.
 * The bar stops being a thing you look at and goes back to being the edge of
 * the page. The only white in it is the button you are meant to press.
 *
 * 64px tall. The builder's toolbar sticks directly beneath it at top-16, and
 * both columns size off that, so changing this height means changing
 * TopControls and the two calc(100vh - …) panels with it.
 */
const REPO_URL = "https://github.com/Rahul1038402/Resume-AI";

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

  /*
   * Google's avatar URLs go stale. Supabase copies `avatar_url` into
   * user_metadata at sign-in and never refreshes it, so when someone changes
   * their Google photo the stored link stops resolving - and an <img> whose
   * src 404s renders the browser's torn-photo icon, which looks like the app
   * is broken rather than like a missing picture.
   *
   * So: ask for a size (an lh3 link without one serves 512px to fill 32 CSS
   * px), and treat a load failure as "no avatar" rather than letting the
   * placeholder show.
   */
  const rawAvatar =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const avatar =
    rawAvatar.includes("googleusercontent.com") && !/=s\d+(-c)?$/.test(rawAvatar)
      ? `${rawAvatar}=s96-c`
      : rawAvatar;

  const [avatarBroken, setAvatarBroken] = useState(false);
  // A new sign-in deserves a fresh attempt.
  useEffect(() => setAvatarBroken(false), [avatar]);

  const initial = (
    user?.user_metadata?.full_name?.trim()?.charAt(0) ||
    user?.email?.charAt(0) ||
    "?"
  ).toUpperCase();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      {/* Frosted ground, exactly the bar. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 backdrop-blur-xl backdrop-saturate-150 bg-ink/80 supports-[backdrop-filter]:bg-ink/60" />
      {/* And a short tail below it, so the bar ends in a fade rather than an
          edge - without reaching far enough down to dim the page's own
          content. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" />

      <div className="pointer-events-auto relative mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-6">
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
                `relative px-3.5 py-2 text-sm transition-colors duration-300 ${
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
                      className="absolute inset-x-3.5 bottom-0 h-px bg-white"
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
          {/* The label collapses on small screens; the glyph alone still reads. */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Star ResumeAI on GitHub"
            className="flex items-center gap-2 rounded-md border border-line-strong px-3 py-1.5 text-sm text-mute transition-colors duration-300 hover:border-line-bright hover:text-white"
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
                {avatar && !avatarBroken ? (
                  <img
                    src={avatar}
                    alt=""
                    width={32}
                    height={32}
                    // Some Google configurations refuse a cross-site referrer.
                    referrerPolicy="no-referrer"
                    onError={() => {
                      console.warn("Avatar failed to load, using initial:", avatar);
                      setAvatarBroken(true);
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                    {initial}
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
                    className="absolute right-0 top-11 w-52 rounded-lg border border-line-strong bg-ink-raised p-1.5 shadow-2xl shadow-black/60"
                  >
                    <p className="truncate px-2.5 py-2 text-xs text-mute-faint">
                      {user.email}
                    </p>
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-mute transition-colors hover:bg-white/[0.06] hover:text-white"
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
              className="hidden rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-300 hover:bg-white/90 sm:block"
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
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-white md:hidden"
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

      {/* Mobile panel: drops out of the bar, same width, same ground. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative overflow-hidden border-t border-line bg-ink/95 backdrop-blur-xl backdrop-saturate-150 md:hidden"
          >
            <div className="px-4 py-2 sm:px-6">
              {!user && (
                <button
                  type="button"
                  onClick={signIn}
                  className="mb-1 block w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-ink sm:hidden"
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
                    `block rounded-md px-3 py-2.5 text-sm transition-colors ${
                      isActive ? "bg-white/[0.06] text-white" : "text-mute hover:text-white"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default SiteNav;
