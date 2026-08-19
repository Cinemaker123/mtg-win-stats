import { useState, useEffect } from "react";
import { MOBILE_BREAKPOINT } from "../utils/stats.js";

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Whether the viewport is narrow enough for the mobile layout.
 *
 * Backed by `matchMedia` rather than a `resize` listener: it only fires
 * when the breakpoint is actually crossed, so dragging a desktop window
 * no longer re-renders every consuming view dozens of times a second.
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = e => setMobile(e.matches);
    // Re-sync in case the viewport crossed the breakpoint between the
    // initial render and this effect running.
    setMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
