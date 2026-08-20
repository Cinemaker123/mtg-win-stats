import { useState, useEffect } from "react";

const STORAGE_KEY = "theme";
const DARK_CLASS = "dark";

function getInitialTheme() {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored === DARK_CLASS;
  }
  // Fall back to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Avoid SSR issues by checking for window
    if (typeof window === "undefined") {
      return false;
    }
    return getInitialTheme();
  });
  useEffect(() => {
    // Apply theme to document root for CSS Modules theming
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? DARK_CLASS : "light"
    );
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, isDark ? DARK_CLASS : "light");
  }, [isDark]);

  // Listen for system preference changes (only when no stored preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only apply system change if user hasn't set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // No "loaded" flag: index.html stamps data-theme before first paint and the
  // initial value above is computed synchronously, so there is nothing to wait
  // for — gating the first render on it only cost one blank commit.
  return [isDark, setIsDark];
}
