// React
import PropTypes from "prop-types";

// Hooks
import { useIsMobile } from "../hooks/useIsMobile.js";

// Components
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { Logo } from "../components/Logo.jsx";

// Utils
import { PLAYERS, PLAYER_COLORS, PLAYER_GRADIENTS } from "../utils/stats.js";

// Styles
import styles from "./LandingPage.module.css";

export function LandingPage({ onSelectPlayer, onShowGlobalStats, isDark, onToggleDark }) {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? styles.containerMobile : styles.container}>
      {/* Dark mode toggle */}
      <div className={styles.darkModeToggle}>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Logo */}
      <div className={isMobile ? styles.headerMobile : styles.header}>
        <div className={styles.logoWrapper}>
          <Logo size={isMobile ? 80 : 100} />
        </div>
      </div>

      {/* Player Grid */}
      <div className={isMobile ? styles.playerGridMobile : styles.playerGrid}>
        {PLAYERS.map(player => (
          <button
            key={player}
            onClick={() => onSelectPlayer(player)}
            className={isMobile ? styles.playerCardMobile : styles.playerCard}
            style={{
              "--accent": PLAYER_COLORS[player],
              "--accent-soft": `${PLAYER_COLORS[player]}40`,
            }}
          >
            <div 
              className={isMobile ? styles.playerAvatarMobile : styles.playerAvatarDesktop}
              style={{ background: PLAYER_GRADIENTS[player] }}
            >
              {player[0]}
            </div>
            <span className={isMobile ? styles.playerNameMobile : styles.playerName}>
              {player}
            </span>
          </button>
        ))}
      </div>

      {/* Global Stats Button */}
      <div className={isMobile ? styles.globalStatsWrapperMobile : styles.globalStatsWrapper}>
        <button
          onClick={onShowGlobalStats}
          className={`
            ${isMobile ? styles.globalStatsButtonMobile : styles.globalStatsButton}
            ${isDark ? styles.globalStatsButtonDark : ""}
          `}
          style={isDark ? {
            "--glow": "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          } : {
            "--glow": "0 8px 32px rgba(102, 126, 234, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.3)",
          }}
        >
          <div className={styles.globalStatsContent}>
            <span className={isMobile ? styles.globalStatsIconMobile : styles.globalStatsIcon}>📊</span>
            <span className={isMobile ? styles.globalStatsTextMobile : styles.globalStatsText}>
              Gesamtübersicht
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

LandingPage.propTypes = {
  onSelectPlayer: PropTypes.func.isRequired,
  onShowGlobalStats: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
};
