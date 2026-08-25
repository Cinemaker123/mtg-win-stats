import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import { getGames, getDecksByPlayer } from "../supabaseClient.js";

/**
 * The two shared, realtime-backed resources. Each has one query key, so every
 * component that calls the hook reads one cache and triggers one fetch. This
 * is what removes the double fetch of the hand-rolled providers.
 *
 * `useRealtimeSync` (mounted once at the app root) invalidates these keys on a
 * Supabase change, so the cache stays live without per-view subscriptions.
 */

/** @returns games archive (Data Model v2), newest first */
export function useGamesQuery() {
  return useQuery({ queryKey: ["games"], queryFn: getGames });
}

/** @returns every player's deck registry, grouped by player slug */
export function useDecksQuery() {
  return useQuery({ queryKey: ["decks"], queryFn: getDecksByPlayer });
}

// A registry deck as the app holds it. wins/losses are the frozen legacy
// baseline (see AGENTS.md); live counts come from combineDeckStats.
export const DeckPropType = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
});
