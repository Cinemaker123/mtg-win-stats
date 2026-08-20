// React
import { useMemo, useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useGames } from "../hooks/useGames.js";
import { useToast } from "../hooks/useToast.js";

// Components
import { NewGameModal } from "../components/NewGameModal.jsx";
import { Toast } from "../components/Toast.jsx";
import { ViewHeader } from "../components/ViewHeader.jsx";

// Utils / API
import { addGame, deleteGame } from "../supabaseClient.js";
import { PLAYER_GRADIENTS } from "../utils/stats.js";

// Styles
import styles from "./GamesArchiveView.module.css";

const UNDO_WINDOW_MS = 5000;

// Built once instead of per game per render — constructing an Intl
// formatter is by far the most expensive thing this view does.
const TIME_FORMAT = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

/**
 * Group games (already newest-first) by calendar day, preserving order.
 * Each game is decorated with the presentation-ready values the card
 * needs, so rendering stays free of per-row formatting and sorting.
 * @param {Array} games
 * @returns {Array<{key: string, label: string, games: Array}>}
 */
function groupByDay(games) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups = [];
  const byKey = new Map();

  games.forEach(game => {
    const d = new Date(game.playedAt);
    const key = d.toDateString();
    if (!byKey.has(key)) {
      const label =
        key === today ? "Heute"
        : key === yesterday ? "Gestern"
        : d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
      const group = { key, label, games: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).games.push({
      game,
      time: TIME_FORMAT.format(d),
      // Winner first
      participants: [...game.participants].sort(
        (a, b) => Number(b.isWinner) - Number(a.isWinner)
      ),
    });
  });

  return groups;
}

/**
 * Archive of all recorded games (Data Model v2), grouped by day.
 * Tap a game to edit it; delete offers a 5s undo window (re-insert).
 */
export function GamesArchiveView({ onBack, isDark, onToggleDark }) {
  const isMobile = useIsMobile();
  const { games, loading, error, retry } = useGames();
  const [editGame, setEditGame] = useState(null);
  const { toast, showToast, dismissToast } = useToast();
  const px = isMobile ? 12 : 24;

  const groups = useMemo(() => groupByDay(games), [games]);

  // The deleted game rides along on the toast's own action handler, so the
  // undo offer can't outlive the toast that carries it.
  const handleUndo = async (game) => {
    dismissToast();
    try {
      // Re-insert restores the game with a new id (acceptable for undo)
      await addGame({ playedAt: game.playedAt, participants: game.participants });
    } catch (e) {
      console.error("Undo delete failed:", e);
      showToast({ type: "error", message: "⚠️ Wiederherstellen fehlgeschlagen" });
    }
  };

  const handleDelete = async (game) => {
    setEditGame(null);
    try {
      await deleteGame(game.id);
      showToast({
        type: "undo",
        message: "Spiel gelöscht",
        actionLabel: "Rückgängig",
        onAction: () => handleUndo(game),
      }, UNDO_WINDOW_MS);
    } catch (e) {
      console.error("Delete game failed:", e);
      showToast({ type: "error", message: "⚠️ Löschen fehlgeschlagen" });
    }
  };

  return (
    <div className={styles.container}>
      {toast && <Toast toast={toast} />}

      <ViewHeader
        icon="📜"
        title="Spielarchiv"
        onBack={onBack}
        isDark={isDark}
        onToggleDark={onToggleDark}
        padding={px}
      />

      {/* Content */}
      <div className={isMobile ? styles.contentMobile : styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>Lade Spiele...</div>
          </div>
        ) : error ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>{error}</div>
            <button className={styles.retryButton} onClick={retry}>Erneut versuchen</button>
          </div>
        ) : groups.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>Noch keine Spiele eingetragen.</div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key} className={styles.section}>
              <div className={styles.sectionTitle}>{group.label}</div>
              {group.games.map(({ game, time, participants }) => (
                  <button
                    key={game.id}
                    className={styles.gameCard}
                    onClick={() => setEditGame(game)}
                  >
                    <div className={styles.participantList}>
                      {participants.map(p => (
                        <div key={p.player} className={styles.participant}>
                          <div
                            className={styles.avatar}
                            style={{ background: PLAYER_GRADIENTS[p.player] }}
                          >
                            {p.player[0].toUpperCase()}
                          </div>
                          <div className={styles.participantInfo}>
                            <div className={styles.participantName}>
                              {p.isWinner && <span className={styles.crown}>👑</span>}
                              {p.player}
                            </div>
                            <div className={styles.participantDeck}>{p.deck}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className={styles.time}>{time}</span>
                  </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editGame && (
        <NewGameModal
          editGame={editGame}
          onClose={() => setEditGame(null)}
          onSaved={(msg) => {
            setEditGame(null);
            showToast({ type: "success", message: msg });
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

GamesArchiveView.propTypes = {
  onBack: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
