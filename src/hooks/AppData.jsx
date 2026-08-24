import { createContext, useCallback, useContext } from "react";
import PropTypes from "prop-types";
import { getGames, getDecksByPlayer } from "../supabaseClient.js";
import { useLiveResource } from "./useLiveResource.js";

/**
 * @typedef {Object} GameParticipant
 * @property {string} player - Player identifier
 * @property {string} deck - Deck name (plain text, history-safe)
 * @property {boolean} isWinner - Whether this participant won the game
 */

/**
 * @typedef {Object} Game
 * @property {string} id - Game uuid
 * @property {string} playedAt - ISO timestamp
 * @property {GameParticipant[]} participants
 */

/**
 * @typedef {Object} Deck
 * @property {string} name - Deck name
 * @property {number} wins - Frozen legacy wins
 * @property {number} losses - Frozen legacy losses
 */

// Table lists live at module scope on purpose. An inline array is a new
// identity on every render, which resubscribes the realtime channel in a loop.

// Decks is in the games list because a rename only touches the decks table now
// — game_participants.deck_id stays put — so without it, the cached games would
// keep showing the old deck name via the join in getGames() until reload,
// splitting stats against the freshly-renamed registry entry.
const GAMES_TABLES = ["games", "game_participants", "decks"];
const GAMES_INITIAL = [];

// The players table is in the decks list because the grouping is keyed on it,
// so a player added on another device changes the result of this fetch.
const DECKS_TABLES = ["decks", "players"];
const DECKS_INITIAL = {};

const AppDataContext = createContext(null);

/**
 * Owns every shared, realtime-backed resource for the app: the games archive
 * and the deck registry of every player.
 *
 * This must be mounted exactly once, at the app root. `useLiveResource` is a
 * hook, so it holds per-instance state — calling it from each view would open
 * one fetch and one realtime channel per view instead of one for the whole
 * app. The context here is what turns that per-instance state into one
 * shared cache.
 */
export function AppDataProvider({ children }) {
  const games = useLiveResource(getGames, {
    channel: "games-all",
    tables: GAMES_TABLES,
    errorText: "Fehler beim Laden der Spiele.",
    initial: GAMES_INITIAL,
  });

  const decks = useLiveResource(getDecksByPlayer, {
    channel: "decks-all",
    tables: DECKS_TABLES,
    errorText: "Fehler beim Laden. Bitte erneut versuchen.",
    initial: DECKS_INITIAL,
  });

  // Show a just-created deck immediately rather than waiting out the debounce;
  // the realtime refetch reconciles it moments later. The deck must carry its
  // `id` — callers resolve `deck_id` out of this cache.
  const { setData: setDecks } = decks;
  const addDeckLocally = useCallback((player, deck) => {
    setDecks(current => ({
      ...current,
      [player]: [...(current[player] || []), deck],
    }));
  }, [setDecks]);

  const value = { games, decks, addDeckLocally };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

AppDataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Read every shared, realtime-backed resource. One hook, one import, so a view
 * never has to know which provider owns which slice.
 *
 * The two slices carry the same field names, so they are prefixed here. The
 * games array keeps the bare name `games` because every view that reads
 * anything reads that.
 *
 * @returns {{
 *   games: Game[],
 *   gamesLoading: boolean,
 *   gamesError: string|null,
 *   gamesRetry: Function,
 *   decksByPlayer: Object<string, Deck[]>,
 *   decksLoading: boolean,
 *   decksError: string|null,
 *   addDeckLocally: Function
 * }}
 */
export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  const { games, decks, addDeckLocally } = ctx;
  return {
    games: games.data,
    gamesLoading: games.loading,
    gamesError: games.error,
    gamesRetry: games.retry,
    decksByPlayer: decks.data,
    decksLoading: decks.loading,
    decksError: decks.error,
    addDeckLocally,
  };
}
