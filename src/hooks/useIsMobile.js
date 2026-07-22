import { useState, useEffect } from "react";
import { MOBILE_BREAKPOINT } from "../utils/stats.js";

export function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}
