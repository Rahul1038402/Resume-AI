import React, { createContext, useContext, useEffect } from "react";

/**
 * The site is dark-only.
 *
 * The light palette was dropped along with the toggle: the landing page is
 * built on a dark ground with one white block for contrast, and a light mode
 * would have meant maintaining a second palette for a design that depends on
 * that contrast. `index.html` ships `class="dark"` on <html> so the first
 * paint is already dark; this provider only guarantees it stays that way if
 * something else touches the class list.
 *
 * The hook is kept (rather than deleted) because components read
 * `resolvedTheme` to pick colours, and a constant is simpler for them than
 * conditional imports.
 */
type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
}

const value: ThemeContextType = { theme: "dark", resolvedTheme: "dark" };

const ThemeContext = createContext<ThemeContextType>(value);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");

    // A stale "light" from before the toggle was removed would otherwise be
    // read by any code still checking storage.
    try {
      localStorage.setItem("theme", "dark");
    } catch {
      // Storage can be unavailable in private mode; the class above is what
      // actually matters.
    }
  }, []);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
