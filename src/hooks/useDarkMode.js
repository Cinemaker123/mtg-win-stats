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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Apply theme to document root for CSS Modules theming
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? DARK_CLASS : "light"
    );
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, isDark ? DARK_CLASS : "light");
    setLoaded(true);
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

  return [isDark, setIsDark, loaded];
}
