import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { supabase, getDecksByPlayer } from "../supabaseClient.js";
import { AllDecksContext } from "./useAllDecks.js";

/**
 * Fetches every player's deck registry once and keeps it live via realtime,
 * sharing one cache across Global Stats and the new-game modal instead of
 * each owning its own fetch (and, in Global Stats' case, a third copy of the
 * debounced subscription machinery).
 * Mounted once at the app root; consumers read it via `useAllDecks()`.
 */
export function AllDecksProvider({ children }) {
  const [decksByPlayer, setDecksByPlayer] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return getDecksByPlayer()
      .then(setDecksByPlayer)
      .catch(e => {
        console.error("Failed to load decks:", e);
        setError("Fehler beim Laden. Bitte erneut versuchen.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when any player's decks change (debounced)
  useEffect(() => {
    let timeout = null;
    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(load, 500);
    };

    const channel = supabase
      .channel("decks-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "decks" }, schedule)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Show a just-created deck immediately rather than waiting out the
  // debounce; the realtime refetch reconciles it moments later. The deck
  // must carry its `id` — callers resolve `deck_id` out of this cache.
  const addDeckLocally = useCallback((player, deck) => {
    setDecksByPlayer(current => ({
      ...current,
      [player]: [...(current[player] || []), deck],
    }));
  }, []);

  const value = { decksByPlayer, loading, error, retry: load, addDeckLocally };
  return <AllDecksContext.Provider value={value}>{children}</AllDecksContext.Provider>;
}

AllDecksProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
