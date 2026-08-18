import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared toast-notification state: show a toast (string or object,
 * caller's choice), auto-dismiss after a duration, and clean up the
 * pending timeout on unmount.
 * @param {number} [defaultDuration] - Default auto-dismiss delay in ms
 * @returns {{toast: *, showToast: Function, dismissToast: Function}}
 */
export function useToast(defaultDuration = 3000) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const showToast = useCallback((toastData, duration = defaultDuration) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(toastData);
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, [defaultDuration]);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
