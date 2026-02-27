// React

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

      {/* Title */}
      <div className={isMobile ? styles.headerMobile : styles.header}>
        <div className={styles.logoWrapper}>
          <Logo size={isMobile ? 80 : 100} />
        </div>
        <h1 className={isMobile ? styles.titleMobile : styles.title}>MTG Tracker</h1>
        <p className={isMobile ? styles.subtitleMobile : styles.subtitle}>Wähle dein Profil</p>
      </div>

      {/* Player Grid */}
      <div className={isMobile ? styles.playerGridMobile : styles.playerGrid}>
        {PLAYERS.map(player => (
          <button
            key={player}
            onClick={() => onSelectPlayer(player)}
            className={isMobile ? styles.playerCardMobile : styles.playerCard}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = PLAYER_COLORS[player];
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${PLAYER_COLORS[player]}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
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
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
            e.currentTarget.style.boxShadow = isDark 
              ? "0 8px 32px rgba(118,75,162,0.4), 0 0 0 1px rgba(255,255,255,0.15)"
              : "0 8px 32px rgba(102,126,234,0.5), 0 0 0 1px rgba(255,255,255,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "";
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
