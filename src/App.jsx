import { useState, useEffect, useRef } from "react";
import logoImage from "./6214ff04ba3c68672b23d6cf.png";
import d20Image from "./D20_icon.png";
import { getDecks, saveDecks } from "./supabaseClient.js";

const PLAYERS = ["baum", "mary", "pascal", "wewy"];

const PLAYER_COLORS = {
  baum: "#27ae60",
  mary: "#e74c3c",
  pascal: "#6c3d82",
  wewy: "#f39c12",
};

const PLAYER_GRADIENTS = {
  baum: "linear-gradient(135deg, #27ae60, #2ecc71)",
  mary: "linear-gradient(135deg, #e74c3c, #f39c12)",
  pascal: "linear-gradient(135deg, #6c3d82, #a855f7)",
  wewy: "linear-gradient(135deg, #f39c12, #f1c40f)",
};

const SAMPLE_DECKS = [
  { name: "Azorius Control", wins: 12, losses: 5 },
  { name: "Mono Red Burn", wins: 8, losses: 9 },
  { name: "Golgari Midrange", wins: 15, losses: 7 },
  { name: "Simic Ramp", wins: 6, losses: 11 },
];

function getStorageKey(player) {
  return `mtg-decks-${player}`;
}

const DARK_MODE_KEY = "mtg-dark-mode";



// D20 Image Component - shows ? overlay while spinning
function D20({ number, showResult }) {
  const size = 130; // 108 * 1.2 = 130 (20% bigger)
  const overlaySize = 62; // 52 * 1.2 = 62
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <img 
        src={d20Image} 
        alt="D20" 
        width={size} 
        height={size}
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}
      />
      {/* Number overlay */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: overlaySize,
        height: overlaySize,
        borderRadius: "50%",
        background: showResult && number === 20 ? "#27ae60" : showResult && number === 1 ? "#1a1a1a" : "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontSize: showResult ? "29px" : "41px",
          fontWeight: "900",
          color: showResult && number === 1 ? "#e74c3c" : "#fff",
          fontFamily: "'Outfit', sans-serif",
        }}>
          {showResult ? number : "?"}
        </span>
      </div>
    </div>
  );
}

// Rolling D20 Animation Component
function RollingD20({ onLanded, screenWidth }) {
  const [position, setPosition] = useState({ x: -156, y: 150, rotation: 0 });
  const [finalNumber, setFinalNumber] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [showResult, setShowResult] = useState(false);
  const isMobile = screenWidth < 640;
  const duration = isMobile ? 1400 : 2200;
  const animRef = useRef(null);

  // Run animation once on mount
  useEffect(() => {
    const startTime = Date.now();
    const endX = screenWidth / 2 - 65;
    let revealed = false;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentX = -130 + (endX + 130) * easeOut;
      const rotation = progress * 1080;
      
      // Bouncing with decreasing height
      let bounceY = 0;
      if (progress < 0.15) {
        bounceY = -60 * Math.sin((progress / 0.15) * Math.PI);
      } else if (progress < 0.3) {
        bounceY = -35 * Math.sin(((progress - 0.15) / 0.15) * Math.PI);
      } else if (progress < 0.45) {
        bounceY = -18 * Math.sin(((progress - 0.3) / 0.15) * Math.PI);
      } else if (progress < 0.6) {
        bounceY = -8 * Math.sin(((progress - 0.45) / 0.15) * Math.PI);
      }
      
      setPosition({ x: currentX, y: 150 + bounceY, rotation });
      
      // Reveal number at 80%
      if (progress >= 0.8 && !revealed) {
        revealed = true;
        setShowResult(true);
      }
      
      // Animation complete
      if (progress >= 1) {
        onLanded();
        return;
      }
      
      animRef.current = requestAnimationFrame(animate);
    };
    
    animRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []); // Run once on mount

  return (
    <div 
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 10000,
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `rotate(${position.rotation}deg)`,
        pointerEvents: "none",
      }}
    >
      <D20 number={finalNumber} showResult={showResult} />
    </div>
  );
}

// Logo component using imported image
function Logo({ size = 80 }) {
  return (
    <img 
      src={logoImage} 
      alt="MTG Logo" 
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 12,
      }}
    />
  );
}

// Dark mode toggle button with B&W SVG icons
function DarkModeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Hellmodus" : "Dunkelmodus"}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        border: "none",
        background: isDark ? "#2d2d3a" : "#f0f0f5",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {isDark ? (
        // Sun icon (B&W for dark mode - shows when in dark mode, click to go light)
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        // Moon icon (B&W for light mode - shows when in light mode, click to go dark)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  return [isDark, setIsDark, true];
}

function winRate(d) {
  const total = d.wins + d.losses;
  return total === 0 ? 0 : d.wins / total;
}

function StatCard({ label, value, sub, accent, icon, isDark }) {
  return (
    <div style={{
      background: isDark ? "#252536" : "#fff",
      borderRadius: 16,
      padding: "14px 16px",
      boxShadow: isDark 
        ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
        : "0 1px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 12,
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: accent, borderRadius: "16px 0 0 16px",
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: accent + "25",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginLeft: 8,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#888" : "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'Outfit', sans-serif", marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#f0f0f0" : "#1a1a2e", fontFamily: "'Outfit', sans-serif", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: isDark ? "#888" : "#888", fontFamily: "'DM Sans', sans-serif", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
    </div>
  );
}

function getDynamicStats(decks) {
  if (decks.length === 0) return [];
  const totalGames = decks.reduce((s, d) => s + d.wins + d.losses, 0);
  const totalWins = decks.reduce((s, d) => s + d.wins, 0);
  const overallWR = totalGames === 0 ? 0 : totalWins / totalGames;

  const playedDecks = decks.filter(d => d.wins + d.losses > 0);
  const sortedByWR = [...playedDecks].sort((a, b) => winRate(b) - winRate(a));
  const best = sortedByWR[0];
  const worst = sortedByWR[sortedByWR.length - 1];

  const sortedByPlays = [...decks].sort((a, b) => (a.wins + a.losses) - (b.wins + b.losses));
  const leastPlayed = sortedByPlays[0];
  const maxPlays = Math.max(...decks.map(d => d.wins + d.losses));
  const minPlays = leastPlayed ? leastPlayed.wins + leastPlayed.losses : 0;
  const playsAreSimilar = (maxPlays - minPlays) <= 2;

  const stats = [];

  stats.push({
    label: "Gesamt-Winrate",
    value: `${Math.round(overallWR * 100)}%`,
    sub: `${totalWins}W – ${totalGames - totalWins}L · ${decks.length} Deck${decks.length !== 1 ? "s" : ""}`,
    accent: overallWR >= 0.5 ? "#2ecc71" : "#e74c3c",
    icon: overallWR >= 0.5 ? "🏆" : "📉",
  });

  if (best && (best.wins + best.losses) >= 2) {
    stats.push({
      label: "Bestes Deck",
      value: best.name,
      sub: `${Math.round(winRate(best) * 100)}% · ${best.wins}W–${best.losses}L`,
      accent: "#2ecc71",
      icon: "⚡",
    });
  }

  if (decks.length >= 2) {
    if (playsAreSimilar && worst && worst !== best && (worst.wins + worst.losses) >= 2) {
      stats.push({
        label: "Braucht Arbeit",
        value: worst.name,
        sub: `${Math.round(winRate(worst) * 100)}% · ${worst.wins}W–${worst.losses}L`,
        accent: "#e74c3c",
        icon: "🔧",
      });
    } else if (leastPlayed) {
      const lpTotal = leastPlayed.wins + leastPlayed.losses;
      stats.push({
        label: "Am wenigsten gespielt",
        value: leastPlayed.name,
        sub: lpTotal === 0 ? "Noch keine Spiele" : `${lpTotal} Spiel${lpTotal !== 1 ? "e" : ""} · ${Math.round(winRate(leastPlayed) * 100)}% WR`,
        accent: "#f39c12",
        icon: "🌱",
      });
    }
  }

  return stats.slice(0, 3);
}

function Btn({ onClick, bg, color, hoverBg, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, borderRadius: 10, border: "none",
        background: bg, color, fontSize: 20, fontWeight: 900,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        lineHeight: 1, transition: "background 0.15s", flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={e => e.currentTarget.style.background = hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = bg}
      onTouchStart={e => { e.currentTarget.style.background = hoverBg; }}
      onTouchEnd={e => { e.currentTarget.style.background = bg; }}
    >{children}</button>
  );
}

function WinLossBar({ deck, onIncWin, onDecWin, onIncLoss, onDecLoss, onDelete, isDark }) {
  const total = deck.wins + deck.losses;
  const winPct = total === 0 ? 50 : (deck.wins / total) * 100;
  const lossPct = 100 - winPct;
  const wrColor = total === 0 ? "#aaa" : (winPct >= 50 ? "#27ae60" : "#e74c3c");

  return (
    <div style={{
      background: isDark ? "#252536" : "#fff", borderRadius: 16,
      padding: "12px 14px",
      boxShadow: isDark
        ? "0 1px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
        : "0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)",
      marginBottom: 10,
    }}>
      {/* Row 1: Name + WR% + delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          flex: 1, fontFamily: "'Outfit', sans-serif", fontWeight: 700,
          fontSize: 13, color: isDark ? "#f0f0f0" : "#1a1a2e",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{deck.name}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: wrColor, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
          {total === 0 ? "—" : `${Math.round(winPct)}%`}
        </div>
        <button
          onClick={onDelete}
          style={{
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: isDark ? "#353545" : "#f5f5f5", color: "#bbb",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, color 0.15s", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fce4e4"; e.currentTarget.style.color = "#e74c3c"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "#353545" : "#f5f5f5"; e.currentTarget.style.color = "#bbb"; }}
          title="Deck entfernen"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      {/* Row 2: Bar */}
      <div style={{ height: 30, borderRadius: 9, overflow: "hidden", display: "flex", background: isDark ? "#353545" : "#f0f0f0", marginBottom: 8 }}>
        <div style={{
          width: `${winPct}%`, background: "linear-gradient(90deg,#27ae60,#2ecc71)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)", minWidth: deck.wins > 0 ? 30 : 0,
        }}>
          {deck.wins > 0 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>{deck.wins}</span>}
        </div>
        <div style={{
          width: `${lossPct}%`, background: "linear-gradient(90deg,#e74c3c,#c0392b)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)", minWidth: deck.losses > 0 ? 30 : 0,
        }}>
          {deck.losses > 0 && <span style={{ color: "#fff", fontWeight: 800, fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>{deck.losses}</span>}
        </div>
      </div>

      {/* Row 3: Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#27ae60", letterSpacing: "0.05em", textTransform: "uppercase" }}>W</span>
        <Btn onClick={onIncWin} bg={isDark ? "#1e3a2f" : "#d5f5e3"} color="#27ae60" hoverBg="#a9dfbf" title="Sieg hinzufügen">+</Btn>
        <Btn onClick={onDecWin} bg={isDark ? "#353545" : "#f0f0f0"} color="#777" hoverBg="#ddd" title="Sieg entfernen">−</Btn>
        <div style={{ flex: 1 }} />
        <Btn onClick={onDecLoss} bg={isDark ? "#353545" : "#f0f0f0"} color="#777" hoverBg="#ddd" title="Niederlage entfernen">−</Btn>
        <Btn onClick={onIncLoss} bg={isDark ? "#3d2525" : "#fce4e4"} color="#e74c3c" hoverBg="#f1a9a0" title="Niederlage hinzufügen">+</Btn>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#e74c3c", letterSpacing: "0.05em", textTransform: "uppercase" }}>L</span>
      </div>
    </div>
  );
}

function LandingPage({ onSelectPlayer, isDark, onToggleDark }) {
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
    </div>
  );
}

function TrackerView({ player, onBack, isDark, onToggleDark }) {
  const [decks, setDecks] = useState(SAMPLE_DECKS);
  const [tab, setTab] = useState("dashboard");
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const isMobile = useIsMobile();
  const px = isMobile ? 12 : 24;
  const accentColor = PLAYER_COLORS[player];

  // Load from Supabase on mount
  useEffect(() => {
    setLoading(true);
    getDecks(player)
      .then(data => {
        if (data.length > 0) {
          setDecks(data);
        }
        setLoaded(true);
      })
      .catch(e => {
        console.error("Failed to load from Supabase:", e);
        setImportMsg("Fehler beim Laden. Bitte Seite neu laden.");
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [player]);

  // Save to Supabase whenever decks change
  useEffect(() => {
    if (!loaded) return;
    saveDecks(player, decks).catch(e => {
      console.error("Failed to save to Supabase:", e);
      setImportMsg("Speichern fehlgeschlagen. Änderungen gehen möglicherweise verloren.");
    });
  }, [decks, loaded, player]);

  const updateDeck = (idx, fn) => setDecks(ds => ds.map((d, i) => i === idx ? fn(d) : d));

  const parseImport = () => {
    const text = importText.trim();
    if (!text) return;
    const blocks = text.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
    const newDecks = [];
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim());
      if (!lines.length) continue;
      const name = lines[0];
      let wins = 0, losses = 0;
      for (const line of lines.slice(1)) {
        // Match tally marks (III) or numbers
        const wm = line.match(/^Gewonnen\s+(I+)$/i);
        const lm = line.match(/^Verloren\s+(I+)$/i);
        const wmNum = line.match(/^Gewonnen\s+(\d+)$/i);
        const lmNum = line.match(/^Verloren\s+(\d+)$/i);
        if (wm) wins = wm[1].length;
        if (lm) losses = lm[1].length;
        if (wmNum) wins = parseInt(wmNum[1], 10);
        if (lmNum) losses = parseInt(lmNum[1], 10);
      }
      newDecks.push({ name, wins, losses });
    }
    if (!newDecks.length) { setImportMsg("❌ Keine Decks gefunden. Prüfe das Format."); return; }
    setDecks(ds => {
      const updated = [...ds];
      for (const nd of newDecks) {
        const idx = updated.findIndex(d => d.name.toLowerCase() === nd.name.toLowerCase());
        if (idx >= 0) updated[idx] = { ...updated[idx], wins: nd.wins, losses: nd.losses };
        else updated.push(nd);
      }
      return updated;
    });
    setImportText(""); setImportOpen(false);
    setImportMsg(`✅ ${newDecks.length} Deck${newDecks.length > 1 ? "s" : ""} importiert`);
    setTimeout(() => setImportMsg(""), 3000);
  };

  const stats = getDynamicStats(decks);
  const TAB_H = 58;
  const IMPORT_H = importOpen ? (isMobile ? 220 : 200) : 44;

  return (
    <>
      <style>{`
        textarea { resize: none; font-family: 'DM Sans', monospace; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: isDark ? "#1a1a2e" : "#f4f6fb" }}>

        {/* Import message toast */}
        {importMsg && (
          <div style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
            background: importMsg.startsWith("✅") ? "#27ae60" : "#e74c3c",
            color: "#fff", padding: "8px 16px", borderRadius: 20,
            fontSize: 12, fontWeight: 700, zIndex: 200,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>{importMsg}</div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${isDark ? "#353545" : "#e0e0e0"}`,
              borderTopColor: accentColor,
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Header with back button */}
        <div style={{
          background: isDark ? "#252536" : "#fff", boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.05)" : "0 1px 0 rgba(0,0,0,0.08)",
          padding: `0 ${px}px`, display: "flex", alignItems: "center", gap: 12,
          height: 52, flexShrink: 0,
        }}>
          <button
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: isDark ? "#353545" : "#f0f0f0", color: isDark ? "#ccc" : "#666",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? "#454555" : "#e0e0e0"}
            onMouseLeave={e => e.currentTarget.style.background = isDark ? "#353545" : "#f0f0f0"}
            title="Zurück"
          >←</button>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: PLAYER_GRADIENTS[player],
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
            fontFamily: "'Outfit', sans-serif",
            textTransform: "uppercase",
          }}>{player[0]}</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, color: isDark ? "#f0f0f0" : "#1a1a2e",
            textTransform: "capitalize", flex: 1,
          }}>{player}</span>
          
          {/* Dark mode toggle */}
          <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
        </div>

        {/* Scrollable main content */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: `16px ${px}px`,
          paddingBottom: tab === "data" ? IMPORT_H + TAB_H + 16 : TAB_H + 16,
        }}>

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 20, color: isDark ? "#f0f0f0" : "#1a1a2e" }}>Dashboard</div>
                <div style={{ color: isDark ? "#888" : "#aaa", fontSize: 12, marginTop: 2 }}>Deine MTG-Performance auf einen Blick</div>
              </div>

              {stats.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <Logo size={80} />
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, color: isDark ? "#666" : "#ccc" }}>Noch keine Daten</div>
                  <div style={{ fontSize: 12, color: isDark ? "#666" : "#ccc", marginTop: 6 }}>Gehe zu Decks, um loszulegen</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {stats.map((s, i) => <StatCard key={i} {...s} isDark={isDark} />)}
                </div>
              )}

              {decks.length > 0 && (
                <>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: isDark ? "#f0f0f0" : "#1a1a2e", marginBottom: 10 }}>Alle Decks</div>
                  <div style={{ 
                    background: isDark ? "#252536" : "#fff", 
                    borderRadius: 16, 
                    padding: 16, 
                    boxShadow: isDark
                      ? "0 1px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)"
                      : "0 1px 12px rgba(0,0,0,0.06)" 
                  }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                      {[["#27ae60","Siege"],["#e74c3c","Niederlagen"]].map(([c,l]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                          <span style={{ fontSize: 11, color: isDark ? "#888" : "#888", fontWeight: 600 }}>{l}</span>
                        </div>
                      ))}
                    </div>
                    {[...decks].sort((a,b) => winRate(b)-winRate(a)).map((d,i) => {
                      const wr = winRate(d);
                      return (
                        <div key={i} style={{ marginBottom: i < decks.length-1 ? 12 : 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 12, color: isDark ? "#e0e0e0" : "#333" }}>{d.name}</span>
                            <span style={{ fontSize: 11, color: isDark ? "#888" : "#999" }}>{d.wins}W – {d.losses}L</span>
                          </div>
                          <div style={{ height: 8, background: isDark ? "#353545" : "#f0f0f0", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${wr*100}%`,
                              background: wr>=0.5 ? "linear-gradient(90deg,#27ae60,#2ecc71)" : "linear-gradient(90deg,#e74c3c,#e67e22)",
                              borderRadius: 99, transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
                            }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── DECKS ── */}
          {tab === "data" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 20, color: isDark ? "#f0f0f0" : "#1a1a2e" }}>Decks</div>
                <div style={{ color: isDark ? "#888" : "#aaa", fontSize: 12, marginTop: 2 }}>Tippe auf +, um einen Sieg oder eine Niederlage zu erfassen</div>
              </div>
              {decks.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: isDark ? "#666" : "#ccc", fontFamily: "'Outfit', sans-serif", fontSize: 14 }}>
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <Logo size={60} />
                  </div>
                  Noch keine Decks — benutze den Import unten!
                </div>
              )}
              {decks.map((deck, i) => (
                <WinLossBar
                  key={i} deck={deck} isDark={isDark}
                  onIncWin={() => updateDeck(i, d => ({ ...d, wins: d.wins+1 }))}
                  onDecWin={() => updateDeck(i, d => ({ ...d, wins: Math.max(0,d.wins-1) }))}
                  onIncLoss={() => updateDeck(i, d => ({ ...d, losses: d.losses+1 }))}
                  onDecLoss={() => updateDeck(i, d => ({ ...d, losses: Math.max(0,d.losses-1) }))}
                  onDelete={() => setDecks(ds => ds.filter((_,idx) => idx!==i))}
                />
              ))}
            </>
          )}
        </div>

        {/* ── IMPORT PANEL ── */}
        {tab === "data" && (
          <div style={{
            position: "fixed", bottom: TAB_H, left: 0, right: 0,
            background: isDark ? "#252536" : "#fff", 
            borderTop: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
            boxShadow: isDark ? "0 -4px 20px rgba(0,0,0,0.4)" : "0 -4px 20px rgba(0,0,0,0.08)", 
            zIndex: 90,
          }}>
            <button
              onClick={() => setImportOpen(o => !o)}
              style={{
                width: "100%", border: "none", background: "transparent",
                padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, color: accentColor,
              }}
            >
              <span>📥 Import</span>
              <span style={{ fontSize: 18, display: "inline-block", transition: "transform 0.2s", transform: importOpen ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
            </button>
            {importOpen && (
              <div style={{ padding: "0 12px 12px" }}>
                <div style={{ fontSize: 10, color: isDark ? "#888" : "#bbb", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                  Name · Gewonnen 5/IIIII · Verloren 3/III — Leerzeile zwischen Decks
                </div>
                <textarea
                  rows={4}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={"Azorius Control\nGewonnen 6\nVerloren 3\n\nMono Red Burn\nGewonnen IIII\nVerloren 5"}
                  style={{
                    width: "100%", fontSize: 12, padding: "10px 12px",
                    borderRadius: 10, border: `1.5px solid ${isDark ? "#404050" : "#e0e0e0"}`,
                    outline: "none", color: isDark ? "#f0f0f0" : "#333", background: isDark ? "#1a1a2e" : "#fafafa", lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = accentColor}
                  onBlur={e => e.target.style.borderColor = isDark ? "#404050" : "#e0e0e0"}
                />
                <button
                  onClick={parseImport}
                  style={{
                    marginTop: 8, width: "100%", padding: 12,
                    borderRadius: 10, border: "none",
                    background: PLAYER_GRADIENTS[player],
                    color: "#fff", fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", boxShadow: `0 4px 14px ${accentColor}50`,
                  }}
                >Decks importieren</button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB BAR ── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: TAB_H,
          background: isDark ? "#252536" : "#fff", 
          borderTop: isDark ? "1.5px solid #353545" : "1.5px solid #e8e8e8",
          display: "flex", zIndex: 100,
        }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "data", label: "Decks", icon: "🃏" },
          ].map(t => (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, border: "none",
                background: tab === t.id ? `${accentColor}15` : "transparent",
                borderTop: tab === t.id ? `2.5px solid ${accentColor}` : "2.5px solid transparent",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: 12, color: tab === t.id ? accentColor : isDark ? "#888" : "#aaa",
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isDark, setIsDark, darkLoaded] = useDarkMode();
  const [showDie, setShowDie] = useState(false);
  const [dieLanded, setDieLanded] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleClick = (e) => {
    // Triple-click to roll (only when no die is showing)
    if (e.detail === 3 && !showDie) {
      setShowDie(true);
      setDieLanded(false);
      return;
    }
    
    // Single click to dismiss landed die
    if (e.detail === 1 && showDie && dieLanded) {
      setShowDie(false);
      setDieLanded(false);
    }
  };
  
  const handleDieLanded = () => {
    setDieLanded(true);
  };
  
  if (!darkLoaded) {
    return null;
  }

  return (
    <div onClick={handleClick} style={{ height: "100dvh" }}>
      {currentPlayer === null ? (
        <LandingPage 
          onSelectPlayer={setCurrentPlayer} 
          isDark={isDark} 
          onToggleDark={() => setIsDark(!isDark)} 
        />
      ) : (
        <TrackerView 
          player={currentPlayer} 
          onBack={() => setCurrentPlayer(null)} 
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
        />
      )}
      
      {showDie && (
        <RollingD20 
          onLanded={handleDieLanded}
          screenWidth={screenWidth}
        />
      )}
    </div>
  );
}
