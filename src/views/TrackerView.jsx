import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Logo } from "../components/Logo.jsx";
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { getDecks, saveDecks } from "../supabaseClient.js";
import { PLAYER_COLORS, PLAYER_GRADIENTS, winRate, getDynamicStats, getWinRateTier } from "../utils/stats.js";

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

export function TrackerView({ player, onBack, isDark, onToggleDark }) {
  const [decks, setDecks] = useState([]);
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

  // Save to Supabase whenever decks change (debounced)
  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      saveDecks(player, decks).catch(e => {
        console.error("Failed to save to Supabase:", e);
        setImportMsg("Speichern fehlgeschlagen. Änderungen gehen möglicherweise verloren.");
      });
    }, 300); // 300ms debounce
    return () => clearTimeout(timeout);
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
                              background: getWinRateTier(wr).gradient,
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
