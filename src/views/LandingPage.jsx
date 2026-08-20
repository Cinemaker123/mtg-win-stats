// React
import { useState } from "react";
import PropTypes from "prop-types";

// Hooks
import { useToast } from "../hooks/useToast.js";

// Components
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { Logo } from "../components/Logo.jsx";
import { PlayerAvatar } from "../components/PlayerAvatar.jsx";
import { NewGameModal } from "../components/NewGameModal.jsx";
import { Toast } from "../components/Toast.jsx";

// Utils
import { PLAYERS, PLAYER_COLORS } from "../utils/stats.js";

// Styles
import styles from "./LandingPage.module.css";

export function LandingPage({ onSelectPlayer, onShowGlobalStats, isDark, onToggleDark }) {
  const [showNewGame, setShowNewGame] = useState(false);
  const { toast, showToast } = useToast();

  // NewGameModal only reports back once the save succeeded — it surfaces
  // failures inline, in the modal that is still open.
  const handleGameSaved = (msg) => {
    setShowNewGame(false);
    showToast({ type: "success", message: msg });
  };

  return (
    <div className={styles.container}>
      {toast && <Toast toast={toast} />}

      {/* Dark mode toggle */}
      <div className={styles.darkModeToggle}>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Logo */}
      <div className={styles.header}>
        <div className={styles.logoWrapper}>
          <Logo />
        </div>
      </div>

      {/* Player Grid */}
      <div className={styles.playerGrid}>
        {PLAYERS.map(player => (
          <button
            key={player}
            onClick={() => onSelectPlayer(player)}
            className={styles.playerCard}
            style={{
              "--accent": PLAYER_COLORS[player],
              "--accent-soft": `${PLAYER_COLORS[player]}40`,
            }}
          >
            <PlayerAvatar player={player} className={styles.playerAvatar} />
            <span className={styles.playerName}>
              {player}
            </span>
          </button>
        ))}
      </div>

      {/* Action buttons: new game + global stats */}
      <div className={styles.globalStatsWrapper}>
        <div className={styles.buttonRow}>
          <button
            onClick={() => setShowNewGame(true)}
            className={styles.newGameButton}
          >
            <div className={styles.globalStatsContent}>
              <span className={styles.globalStatsIcon}>⚔️</span>
              <span className={styles.globalStatsText}>
                Neues Spiel
              </span>
            </div>
          </button>
          <button
            onClick={onShowGlobalStats}
            className={styles.globalStatsButton}
          >
            <div className={styles.globalStatsContent}>
              <span className={styles.globalStatsIcon}>📊</span>
              <span className={styles.globalStatsText}>
                Gesamtübersicht
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* New game modal */}
      {showNewGame && (
        <NewGameModal
          onClose={() => setShowNewGame(false)}
          onSaved={handleGameSaved}
        />
      )}

      {/* Archive link */}
      <button
        className={styles.archiveLink}
        onClick={() => { window.location.hash = "/games"; }}
      >
        📜 Spielarchiv
      </button>
    </div>
  );
}

LandingPage.propTypes = {
  onSelectPlayer: PropTypes.func.isRequired,
  onShowGlobalStats: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
