import { useState } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  return [isDark, setIsDark, true];
}
