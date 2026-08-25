// React
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useGamesQuery } from "../data/queries.js";
import { useToast } from "../hooks/useToast.js";

// Components
import { PlayerAvatar } from "../components/PlayerAvatar.jsx";
import { Toast } from "../components/Toast.jsx";
import { ViewHeader } from "../components/ViewHeader.jsx";

// Utils
import { PLAYERS, combineDeckStats, capitalize } from "../utils/stats.js";

// Utils / API
import { useDecksQuery } from "../data/queries.js";
import { useAddDeck, useRenameDeck, useDeleteDeck, useRestoreDeck } from "../data/mutations.js";

// Sub-components
import { DashboardTab } from "./tracker/DashboardTab.jsx";
import { DecksTab } from "./tracker/DecksTab.jsx";
import { ImportPanel } from "./tracker/ImportPanel.jsx";

// Styles
import styles from "./TrackerView.module.css";

/**
 * Main tracker view for a specific player
 * @param {Object} props
 * @param {string} props.player - Player identifier (baum, mary, pascal, wewy)
 * @param {Function} props.onBack - Callback when back button is clicked
 * @param {boolean} props.isDark - Current dark mode state
 * @param {Function} props.onToggleDark - Callback to toggle dark mode
 */
export function TrackerView({ player, onBack, isDark, onToggleDark }) {
  const decksQuery = useDecksQuery();
  const decks = decksQuery.data?.[player] ?? [];
  const loading = decksQuery.isLoading;
  const loaded = decksQuery.isSuccess;
  const error = decksQuery.isError ? "Fehler beim Laden. Bitte erneut versuchen." : null;
  const retry = decksQuery.refetch;
  const addDeck = useAddDeck();
  const renameDeck = useRenameDeck();
  const deleteDeck = useDeleteDeck();
  const restoreDeck = useRestoreDeck();
  const { data: games = [] } = useGamesQuery();
  // Stats display combines frozen legacy counters with game-derived counts
  const combinedDecks = useMemo(
    () => combineDeckStats(decks, games, player),
    [decks, games, player]
  );
  const [tab, setTab] = useState("dashboard");
  const { toast, showToast, dismissToast } = useToast();

  // Surface hook errors (load/save failures) as toasts
  useEffect(() => {
    if (error && loaded) showToast({ type: "error", message: error });
  }, [error, loaded, showToast]);

  // Auto-switch to Decks tab when there are no decks
  useEffect(() => {
    if (!loading && loaded && decks.length === 0) {
      setTab("data");
    }
  }, [loading, loaded, decks.length]);

  // Delete with 5s undo window (undo reinserts locally, the debounced
  // full sync restores the row in Supabase if it was already deleted)
  const handleDeleteDeck = (name) => {
    const removed = decks.find(d => d.name.toLowerCase() === name.toLowerCase());
    if (!removed) return;
    deleteDeck.mutate({ player, id: removed.id });
    showToast({
      type: "undo",
      message: `„${removed.name}" gelöscht`,
      actionLabel: "Rückgängig",
      onAction: () => {
        dismissToast();
        restoreDeck.mutate({ player, deck: removed });
      },
    }, 5000);
  };

  // Rename a registry deck locally, then persist by id directly — the
  // deck's id is what game history points at (deck_id), so this single
  // update is all that's needed for the new name to show up everywhere
  const handleRenameDeck = async (oldName, newName) => {
    const name = newName.trim();
    const idx = decks.findIndex(d => d.name.toLowerCase() === oldName.toLowerCase());
    if (!name || idx < 0) {
      showToast({ type: "error", message: "❌ Ungültiger Deckname" });
      return;
    }
    if (decks.some((d, i) => i !== idx && d.name.toLowerCase() === name.toLowerCase())) {
      showToast({ type: "error", message: `❌ „${name}" existiert bereits` });
      return;
    }
    if (decks[idx].name === name) return; // no change
    try {
      await renameDeck.mutateAsync({ player, id: decks[idx].id, name });
      showToast({ type: "success", message: `✅ „${oldName}" umbenannt in „${name}"` });
    } catch {
      showToast({
        type: "error",
        message: "⚠️ Umbenennen konnte nicht gespeichert werden",
      });
    }
  };

  return (
    <div className={styles.container} data-player={player}>
      {toast && <Toast toast={toast} />}

      {/* Loading spinner */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} style={{ borderTopColor: "var(--player-accent)" }} />
        </div>
      )}

      <ViewHeader
        icon={<PlayerAvatar player={player} className={styles.playerAvatar} />}
        title={capitalize(player)}
        titleClassName={styles.playerName}
        onBack={onBack}
        isDark={isDark}
        onToggleDark={onToggleDark}
      />

      {/* Scrollable main content */}
      <div className={styles.content}>
        {!loading && !loaded ? (
          /* Load failed: saves stay disabled, offer manual retry */
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>{error || "Fehler beim Laden"}</div>
            <button
              onClick={retry}
              className={styles.importButton}
              style={{ background: "var(--player-gradient)", marginTop: 12 }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <>
            {tab === "dashboard" && <DashboardTab decks={combinedDecks} games={games} player={player} />}

            {tab === "data" && (
              <>
                <DecksTab
                  decks={combinedDecks}
                  registryDecks={decks}
                  deleteDeck={handleDeleteDeck}
                  renameDeck={handleRenameDeck}
                />
                <div className={styles.importPanel}>
                  <ImportPanel
                    player={player}
                    addDecks={(list) => list.forEach(d => addDeck.mutate({ player, name: d.name }))}
                    onImport={showToast}
                    autoFocus={decks.length === 0}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Tab Bar */}
      {loaded && (
        <div className={styles.tabBar}>
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "data", label: "Decks", icon: "🃏" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? styles.tabButtonActive : styles.tabButton}
              style={{
                background: tab === t.id
                  ? "color-mix(in srgb, var(--player-accent) 8%, transparent)"
                  : "transparent",
                borderTop: tab === t.id ? "2.5px solid var(--player-accent)" : "2.5px solid transparent",
                color: tab === t.id ? "var(--player-accent)" : "",
              }}
            >
              <span className={styles.tabIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

TrackerView.propTypes = {
  player: PropTypes.oneOf(PLAYERS).isRequired,
  onBack: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
