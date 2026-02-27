import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useDecks } from "../hooks/useDecks.js";
import { Logo } from "../components/Logo.jsx";
import { DarkModeToggle } from "../components/DarkModeToggle.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { PLAYER_COLORS, PLAYER_GRADIENTS, winRate, getDynamicStats, getWinRateTier } from "../utils/stats.js";
import styles from "./TrackerView.module.css";

function Btn({ onClick, bg, color, hoverBg, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={styles.btn}
      style={{ background: bg, color }}
      onMouseEnter={e => e.currentTarget.style.background = hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = bg}
      onTouchStart={e => { e.currentTarget.style.background = hoverBg; }}
      onTouchEnd={e => { e.currentTarget.style.background = bg; }}
    >{children}</button>
  );
}

function WinLossBar({ deck, onIncWin, onDecWin, onIncLoss, onDecLoss, onDelete }) {
  const total = deck.wins + deck.losses;
  const winPct = total === 0 ? 50 : (deck.wins / total) * 100;
  const lossPct = 100 - winPct;
  const wrColor = total === 0 ? "#aaa" : (winPct >= 50 ? "#27ae60" : "#e74c3c");

  return (
    <div className={styles.deckCard}>
      {/* Row 1: Name + WR% + delete */}
      <div className={styles.deckHeader}>
        <div className={styles.deckName}>{deck.name}</div>
        <div className={styles.deckWinRate} style={{ color: wrColor }}>
          {total === 0 ? "—" : `${Math.round(winPct)}%`}
        </div>
        <button
          onClick={onDelete}
          className={styles.deleteButton}
          title="Deck entfernen"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      {/* Row 2: Bar */}
      <div className={styles.winLossBar}>
        <div 
          className={styles.winLossSection}
          style={{
            width: `${winPct}%`,
            background: "linear-gradient(90deg,#27ae60,#2ecc71)",
            minWidth: deck.wins > 0 ? 30 : 0,
          }}
        >
          {deck.wins > 0 && <span className={styles.winLossCount}>{deck.wins}</span>}
        </div>
        <div 
          className={styles.winLossSection}
          style={{
            width: `${lossPct}%`,
            background: "linear-gradient(90deg,#e74c3c,#c0392b)",
            minWidth: deck.losses > 0 ? 30 : 0,
          }}
        >
          {deck.losses > 0 && <span className={styles.winLossCount}>{deck.losses}</span>}
        </div>
      </div>

      {/* Row 3: Controls */}
      <div className={styles.controls}>
        <span className={styles.controlLabelWin}>W</span>
        <Btn onClick={onIncWin} bg="#d5f5e3" color="#27ae60" hoverBg="#a9dfbf" title="Sieg hinzufügen">+</Btn>
        <Btn onClick={onDecWin} bg="#f0f0f0" color="#777" hoverBg="#ddd" title="Sieg entfernen">−</Btn>
        <div className={styles.controlSpacer} />
        <Btn onClick={onDecLoss} bg="#f0f0f0" color="#777" hoverBg="#ddd" title="Niederlage entfernen">−</Btn>
        <Btn onClick={onIncLoss} bg="#fce4e4" color="#e74c3c" hoverBg="#f1a9a0" title="Niederlage hinzufügen">+</Btn>
        <span className={styles.controlLabelLoss}>L</span>
      </div>
    </div>
  );
}

export function TrackerView({ player, onBack, isDark, onToggleDark }) {
  const { decks, loading, error, updateDeck, addDecks, deleteDeck } = useDecks(player);
  const [tab, setTab] = useState("dashboard");
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(error || "");
  const [importOpen, setImportOpen] = useState(false);
  const isMobile = useIsMobile();
  const px = isMobile ? 12 : 24;
  const accentColor = PLAYER_COLORS[player];

  // Sync external error with importMsg
  useEffect(() => {
    if (error) setImportMsg(error);
  }, [error]);

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
    addDecks(newDecks);
    setImportText(""); setImportOpen(false);
    setImportMsg(`✅ ${newDecks.length} Deck${newDecks.length > 1 ? "s" : ""} importiert`);
    setTimeout(() => setImportMsg(""), 3000);
  };

  const stats = getDynamicStats(decks);
  const TAB_H = 58;
  const IMPORT_H = importOpen ? (isMobile ? 220 : 200) : 44;

  return (
    <>
      <div className={styles.container}>
        {/* Import message toast */}
        {importMsg && (
          <div className={importMsg.startsWith("✅") ? styles.toastSuccess : styles.toastError}>
            {importMsg}
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
          style={{ paddingBottom: tab === "data" ? IMPORT_H + TAB_H + 16 : TAB_H + 16 }}
        >
          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionTitleRow}>Dashboard</div>
                <div className={styles.sectionSubtitle}>Deine MTG-Performance auf einen Blick</div>
              </div>

              {stats.length === 0 ? (
                <div className={styles.emptyState}>
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <Logo size={80} />
                  </div>
                  <div className={styles.emptyTitle}>Noch keine Daten</div>
                  <div className={styles.emptySubtitle}>Gehe zu Decks, um loszulegen</div>
                </div>
              ) : (
                <div className={styles.statsList}>
                  {stats.map((s, i) => <StatCard key={i} {...s} />)}
                </div>
              )}

              {decks.length > 0 && (
                <>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--color-text)", marginBottom: 10 }}>
                    Alle Decks
                  </div>
                  <div className={styles.card}>
                    <div className={styles.legend}>
                      {[["#27ae60","Siege"],["#e74c3c","Niederlagen"]].map(([c,l]) => (
                        <div key={l} className={styles.legendItem}>
                          <div className={styles.legendColor} style={{ background: c }} />
                          <span className={styles.legendLabel}>{l}</span>
                        </div>
                      ))}
                    </div>
                    {[...decks].sort((a,b) => winRate(b)-winRate(a)).map((d,i) => {
                      const wr = winRate(d);
                      return (
                        <div key={i} className={styles.deckBar} style={{ marginBottom: i < decks.length-1 ? 12 : 0 }}>
                          <div className={styles.deckBarHeader}>
                            <span className={styles.deckBarName}>{d.name}</span>
                            <span className={styles.deckBarRecord}>{d.wins}W – {d.losses}L</span>
                          </div>
                          <div className={styles.deckBarTrack}>
                            <div 
                              className={styles.deckBarFill}
                              style={{
                                width: `${wr*100}%`,
                                background: getWinRateTier(wr).gradient,
                              }}
                            />
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
              <div className={styles.sectionTitle}>
                <div className={styles.sectionTitleRow}>Decks</div>
                <div className={styles.sectionSubtitle}>Tippe auf +, um einen Sieg oder eine Niederlage zu erfassen</div>
              </div>
              {decks.length === 0 && (
                <div className={styles.emptyState} style={{ padding: "40px 20px" }}>
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <Logo size={60} />
                  </div>
                  <div className={styles.emptyTitle}>Noch keine Decks — benutze den Import unten!</div>
                </div>
              )}
              {decks.map((deck, i) => (
                <WinLossBar
                  key={i} deck={deck}
                  onIncWin={() => updateDeck(i, d => ({ ...d, wins: d.wins+1 }))}
                  onDecWin={() => updateDeck(i, d => ({ ...d, wins: Math.max(0,d.wins-1) }))}
                  onIncLoss={() => updateDeck(i, d => ({ ...d, losses: d.losses+1 }))}
                  onDecLoss={() => updateDeck(i, d => ({ ...d, losses: Math.max(0,d.losses-1) }))}
                  onDelete={() => deleteDeck(i)}
                />
              ))}
            </>
          )}
        </div>

        {/* ── IMPORT PANEL ── */}
        {tab === "data" && (
          <div 
            className={`${styles.importPanel} ${isDark ? styles.importPanelDark : ""}`}
            style={{ bottom: TAB_H }}
          >
            <button
              onClick={() => setImportOpen(o => !o)}
              className={styles.importToggle}
              style={{ color: accentColor }}
            >
              <span>📥 Import</span>
              <span 
                className={styles.importToggleIcon}
                style={{ transform: importOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ⌄
              </span>
            </button>
            {importOpen && (
              <div className={styles.importContent}>
                <div className={styles.importHint}>
                  Name · Gewonnen 5/IIIII · Verloren 3/III — Leerzeile zwischen Decks
                </div>
                <textarea
                  rows={4}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={"Azorius Control\nGewonnen 6\nVerloren 3\n\nMono Red Burn\nGewonnen IIII\nVerloren 5"}
                  className={styles.importTextarea}
                  onFocus={e => e.target.style.borderColor = accentColor}
                  onBlur={e => e.target.style.borderColor = ""}
                />
                <button
                  onClick={parseImport}
                  className={styles.importButton}
                  style={{ 
                    background: PLAYER_GRADIENTS[player],
                    boxShadow: `0 4px 14px ${accentColor}50`,
                  }}
                >
                  Decks importieren
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB BAR ── */}
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
      </div>
    </>
  );
}
