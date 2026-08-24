import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

/**
 * One fetch plus one debounced realtime subscription for a shared resource.
 *
 * Both app-root providers run the same machine and differ only in what they
 * fetch and which tables wake them up. Keeping that machine here means a
 * third shared resource costs a fetcher and a table list, not another
 * hand-written channel, debounce and cleanup that can drift from these two.
 *
 * `tables` and `fetcher` must be stable references (module-level constants
 * or imports). An inline array is a new identity on every render, which
 * tears down and resubscribes the channel in a loop.
 *
 * @param {Function} fetcher - Returns a promise of the resource
 * @param {Object} options
 * @param {string} options.channel - Unique realtime channel name
 * @param {string[]} options.tables - Tables whose changes trigger a refetch
 * @param {string} options.errorText - User-facing message when the fetch fails
 * @param {*} options.initial - State before the first fetch resolves
 * @returns {{data: *, setData: Function, loading: boolean, error: string|null, retry: Function}}
 */
export function useLiveResource(fetcher, { channel, tables, errorText, initial }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return fetcher()
      .then(setData)
      .catch(e => {
        console.error(`Failed to load ${channel}:`, e);
        setError(errorText);
      })
      .finally(() => setLoading(false));
  }, [fetcher, channel, errorText]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let timeout = null;
    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(load, 500);
    };

    const ch = tables
      .reduce(
        (c, table) => c.on("postgres_changes", { event: "*", schema: "public", table }, schedule),
        supabase.channel(channel),
      )
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(ch);
    };
  }, [load, channel, tables]);

  return { data, setData, loading, error, retry: load };
}
