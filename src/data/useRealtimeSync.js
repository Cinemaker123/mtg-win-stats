import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient.js";

// Which query keys a table change invalidates. A deck row touches both caches:
// the registry itself, and the games list, whose join shows the live deck name
// (a rename must refresh both). This replaces the two per-resource
// subscriptions the providers ran.
const TABLE_KEYS = {
  games: [["games"]],
  game_participants: [["games"]],
  decks: [["games"], ["decks"]],
  players: [["decks"]],
};

/**
 * One subscription for the whole app. On any change, invalidate the affected
 * query keys so TanStack Query refetches. Mount once, at the app root.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("app-sync");
    for (const [table, keys] of Object.entries(TABLE_KEYS)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => keys.forEach(queryKey => queryClient.invalidateQueries({ queryKey })),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
