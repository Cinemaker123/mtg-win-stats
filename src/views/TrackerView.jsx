// React
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useDecks } from "../hooks/useDecks.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

// Components
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";

// Utils
import { PLAYER_COLORS, PLAYER_GRADIENTS } from "../utils/stats.js";

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
  const { decks, loading, loaded, error, retry, updateDeck, addDecks, deleteDeck, restoreDeck } = useDecks(player);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const isMobile = useIsMobile();
  const px = isMobile ? 12 : 24;
  const accentColor = PLAYER_COLORS[player];
  const TAB_H = 58;

  // Show a toast, replacing any current one (clears the previous timeout)
  const showToast = useCallback((toastData, duration = 3000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(toastData);
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Clean up pending toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

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

  const handleImport = (msg) => {
    showToast({ type: msg.startsWith("✅") ? "success" : "error", message: msg });
  };

  // Delete with 5s undo window (undo reinserts locally, the debounced
  // full sync restores the row in Supabase if it was already deleted)
  const handleDeleteDeck = (idx) => {
    const removed = deleteDeck(idx);
    if (!removed) return;
    showToast({
      type: "undo",
      message: `„${removed.deck.name}" gelöscht`,
      actionLabel: "Rückgängig",
      onAction: () => restoreDeck(removed.deck, removed.index),
    }, 5000);
  };

  const handleToastAction = () => {
    if (toast?.onAction) toast.onAction();
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  return (
    <>
      <div className={styles.container}>
        {/* Toast notification */}
        {toast && (
          <div className={
            toast.type === "success" ? styles.toastSuccess
            : toast.type === "error" ? styles.toastError
            : styles.toastUndo
          }>
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button className={styles.toastAction} onClick={handleToastAction}>
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} style={{ borderTopColor: accentColor }} />
          </div>
        )}

        {/* Header with back button */}
        <div className={styles.header} style={{ padding: `0 ${px}px` }}>
          <button
            onClick={onBack}
            className={styles.backButton}
            title="Zurück"
          >←</button>
          <div 
            className={styles.playerAvatar}
            style={{ background: PLAYER_GRADIENTS[player] }}
          >
            {player[0]}
          </div>
          <span className={styles.playerName}>{player}</span>
          <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
        </div>

        {/* Scrollable main content */}
        <div 
          className={isMobile ? styles.contentMobile : styles.content}
          style={{ paddingBottom: TAB_H + 16 }}
        >
          {!loading && !loaded ? (
            /* Load failed: saves stay disabled, offer manual retry */
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>{error || "Fehler beim Laden"}</div>
              <button
                onClick={retry}
                className={styles.importButton}
                style={{ background: PLAYER_GRADIENTS[player], marginTop: 12 }}
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              {tab === "dashboard" && <DashboardTab decks={decks} />}
              
              {tab === "data" && (
                <>
                  <DecksTab 
                    decks={decks} 
                    updateDeck={updateDeck} 
                    deleteDeck={handleDeleteDeck} 
                  />
                  <div className={`${styles.importPanel} ${isDark ? styles.importPanelDark : ""}`}>
                    <ImportPanel 
                      player={player} 
                      addDecks={addDecks} 
                      onImport={handleImport}
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
                background: tab === t.id ? `${accentColor}15` : "transparent",
                borderTop: tab === t.id ? `2.5px solid ${accentColor}` : "2.5px solid transparent",
                color: tab === t.id ? accentColor : "",
              }}
            >
              <span className={styles.tabIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        )}
      </div>
    </>
  );
}

TrackerView.propTypes = {
  player: PropTypes.oneOf(["baum", "mary", "pascal", "wewy"]).isRequired,
  onBack: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
