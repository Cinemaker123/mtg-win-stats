// React
import { useEffect, useState } from "react";

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

export function TrackerView({ player, onBack, isDark, onToggleDark }) {
  const { decks, loading, error, updateDeck, addDecks, deleteDeck } = useDecks(player);
  const [tab, setTab] = useState("dashboard");
  const [importMsg, setImportMsg] = useState(error || "");
  const [importOpen, setImportOpen] = useState(false);
  const isMobile = useIsMobile();
  const px = isMobile ? 12 : 24;
  const accentColor = PLAYER_COLORS[player];
  const TAB_H = 58;
  const IMPORT_H = importOpen ? (isMobile ? 220 : 200) : 44;

  // Sync external error with importMsg
  useEffect(() => {
    if (error) setImportMsg(error);
  }, [error]);

  const handleImport = (msg) => {
    setImportMsg(msg);
    setTimeout(() => setImportMsg(""), 3000);
  };

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
          {tab === "dashboard" && <DashboardTab decks={decks} />}
          
          {tab === "data" && (
            <DecksTab 
              decks={decks} 
              updateDeck={updateDeck} 
              deleteDeck={deleteDeck} 
            />
          )}
        </div>

        {/* Import Panel */}
        {tab === "data" && (
          <div 
            className={`${styles.importPanel} ${isDark ? styles.importPanelDark : ""}`}
            style={{ bottom: TAB_H }}
          >
            <ImportPanel 
              player={player} 
              addDecks={addDecks} 
              onImport={handleImport}
              isOpen={importOpen}
              setIsOpen={setImportOpen}
            />
          </div>
        )}

        {/* Tab Bar */}
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
