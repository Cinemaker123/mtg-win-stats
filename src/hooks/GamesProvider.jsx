import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { supabase, getGames } from "../supabaseClient.js";
import { GamesContext } from "./useGames.js";

/**
 * Fetches the games archive once and keeps it live via realtime, sharing
 * one cache across every view (Tracker, Global Stats, Games Archive)
 * instead of each view fetching and subscribing independently.
 * Mounted once at the app root; views read it via `useGames()`.
 */
export function GamesProvider({ children }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return getGames()
      .then(data => setGames(data))
      .catch(e => {
        console.error("Failed to load games:", e);
        setError("Fehler beim Laden der Spiele.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Load games on mount
  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when games, participants, or deck names change
  // (debounced). Decks is included because a rename only touches the
  // decks table now — game_participants.deck_id stays put — so without
  // this, the cached games here would keep showing the old deck name
  // via the join in getGames() until reload, splitting stats against
  // the freshly-renamed registry entry.
  useEffect(() => {
    let timeout = null;
    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(load, 500);
    };

    const channel = supabase
      .channel("games-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_participants" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "decks" }, schedule)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const value = { games, loading, error, retry: load };
  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

GamesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
