// React
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useGames } from "../hooks/useGames.js";
import { useToast } from "../hooks/useToast.js";

// Components
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { NewGameModal } from "../components/NewGameModal.jsx";

// Utils / API
import { addGame, deleteGame } from "../supabaseClient.js";
import { PLAYER_COLORS, PLAYER_GRADIENTS } from "../utils/stats.js";

// Styles
import styles from "./GamesArchiveView.module.css";

const UNDO_WINDOW_MS = 5000;

/**
 * Group games (already newest-first) by calendar day, preserving order.
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
    byKey.get(key).games.push(game);
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
  const [pendingDelete, setPendingDelete] = useState(null);
  const px = isMobile ? 12 : 24;

  // The undo offer only makes sense while its toast is visible
  useEffect(() => {
    if (!toast) setPendingDelete(null);
  }, [toast]);

  const groups = useMemo(() => groupByDay(games), [games]);

  const handleDelete = async (game) => {
    setEditGame(null);
    try {
      await deleteGame(game.id);
      setPendingDelete(game);
      showToast("Spiel gelöscht", UNDO_WINDOW_MS);
    } catch (e) {
      console.error("Delete game failed:", e);
      showToast("⚠️ Löschen fehlgeschlagen");
    }
  };

  const handleUndo = async () => {
    if (!pendingDelete) return;
    dismissToast();
    const game = pendingDelete;
    setPendingDelete(null);
    try {
      // Re-insert restores the game with a new id (acceptable for undo)
      await addGame({ playedAt: game.playedAt, participants: game.participants });
    } catch (e) {
      console.error("Undo delete failed:", e);
      showToast("⚠️ Wiederherstellen fehlgeschlagen");
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast notification */}
      {toast && (
        <div className={toast.startsWith("⚠️") ? styles.toastError : styles.toastSuccess}>
          {toast}
          {pendingDelete && (
            <button className={styles.undoButton} onClick={handleUndo}>
              Rückgängig
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className={styles.header} style={{ padding: `0 ${px}px` }}>
        <button onClick={onBack} className={styles.backButton} title="Zurück">←</button>
        <span style={{ fontSize: 20 }}>📜</span>
        <span className={styles.title}>Spielarchiv</span>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

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
              {group.games.map(game => {
                const time = new Date(game.playedAt).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const sorted = [...game.participants].sort(
                  (a, b) => Number(b.isWinner) - Number(a.isWinner)
                );
                return (
                  <button
                    key={game.id}
                    className={styles.gameCard}
                    onClick={() => setEditGame(game)}
                  >
                    <div className={styles.participantList}>
                      {sorted.map(p => (
                        <div key={p.player} className={styles.participant}>
                          <div
                            className={styles.avatar}
                            style={{ background: PLAYER_GRADIENTS[p.player] || PLAYER_COLORS[p.player] }}
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
                );
              })}
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
            showToast(msg);
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
