import { useIsMobile } from "../hooks/useIsMobile.js";
import { Logo } from "../components/Logo.jsx";
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { PLAYERS, PLAYER_COLORS, PLAYER_GRADIENTS } from "../utils/stats.js";

export function LandingPage({ onSelectPlayer, onShowGlobalStats, isDark, onToggleDark }) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: isDark ? "#1a1a2e" : "#f4f6fb",
      padding: isMobile ? "40px 20px" : "60px 40px",
    }}>
      {/* Dark mode toggle */}
      <div style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
      }}>
        <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 60 }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <Logo size={isMobile ? 80 : 100} />
        </div>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: isMobile ? 28 : 36,
          color: isDark ? "#f0f0f0" : "#1a1a2e",
          margin: 0,
          marginBottom: 8,
        }}>MTG Tracker</h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: isMobile ? 14 : 16,
          color: isDark ? "#888" : "#888",
          margin: 0,
        }}>Wähle dein Profil</p>
      </div>

      {/* Player Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
        gap: isMobile ? 16 : 24,
        maxWidth: isMobile ? 400 : 1000,
        margin: "0 auto",
        width: "100%",
      }}>
        {PLAYERS.map(player => (
          <button
            key={player}
            onClick={() => onSelectPlayer(player)}
            style={{
              background: isDark ? "#252536" : "#fff",
              border: "2px solid transparent",
              borderRadius: 20,
              padding: isMobile ? "30px 20px" : "40px 30px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              transition: "all 0.2s ease",
              WebkitTapHighlightColor: "transparent",
              boxShadow: isDark 
                ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
                : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = PLAYER_COLORS[player];
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 8px 24px ${PLAYER_COLORS[player]}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isDark 
                ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
                : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
            }}
          >
            <div style={{
              width: isMobile ? 60 : 80,
              height: isMobile ? 60 : 80,
              borderRadius: "50%",
              background: PLAYER_GRADIENTS[player],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'Outfit', sans-serif",
              textTransform: "uppercase",
            }}>
              {player[0]}
            </div>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? 16 : 18,
              color: isDark ? "#f0f0f0" : "#1a1a2e",
              textTransform: "capitalize",
            }}>{player}</span>
          </button>
        ))}
      </div>

      {/* Global Stats Button */}
      <div style={{
        maxWidth: isMobile ? 400 : 1000,
        margin: "32px auto 0",
        width: "100%",
        padding: isMobile ? "0 20px" : 0,
      }}>
        <button
          onClick={onShowGlobalStats}
          style={{
            width: "100%",
            background: isDark 
              ? "linear-gradient(135deg, #3d3d5a, #2a2a40)" 
              : "linear-gradient(135deg, #667eea, #764ba2)",
            border: "none",
            borderRadius: 20,
            padding: isMobile ? "24px 20px" : "32px 40px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            boxShadow: isDark 
              ? "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
              : "0 4px 20px rgba(102,126,234,0.3), 0 0 0 1px rgba(255,255,255,0.2)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
            e.currentTarget.style.boxShadow = isDark 
              ? "0 8px 32px rgba(118,75,162,0.4), 0 0 0 1px rgba(255,255,255,0.15)"
              : "0 8px 32px rgba(102,126,234,0.5), 0 0 0 1px rgba(255,255,255,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = isDark 
              ? "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
              : "0 4px 20px rgba(102,126,234,0.3), 0 0 0 1px rgba(255,255,255,0.2)";
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: isMobile ? 28 : 36 }}>📊</span>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: isMobile ? 18 : 22,
              color: "#fff",
            }}>Gesamtübersicht</span>
          </div>
        </button>
      </div>
    </div>
  );
}
