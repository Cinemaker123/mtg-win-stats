// React
import { useState, useEffect } from "react";

// Hooks
import { useDarkMode } from "./hooks/useDarkMode.js";
import { useRealtimeSync } from "./data/useRealtimeSync.js";

// Components
import { RollingD20 } from "./components/RollingD20.jsx";

// Views
import { LandingPage } from "./views/LandingPage.jsx";
import { TrackerView } from "./views/TrackerView.jsx";
import { GlobalStatsView } from "./views/GlobalStatsView.jsx";
import { GamesArchiveView } from "./views/GamesArchiveView.jsx";

// Utils
import { PLAYERS } from "./utils/stats.js";

// Styles
import styles from "./App.module.css";

/**
 * Parse the current location hash into a route.
 * Routes: `#/` (landing), `#/tracker/<player>`, `#/global`, `#/games`
 * @returns {{view: 'landing'|'tracker'|'global'|'games', player: string|null}}
 */
function parseHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const trackerMatch = hash.match(/^\/tracker\/(\w+)$/);
  if (trackerMatch && PLAYERS.includes(trackerMatch[1])) {
    return { view: "tracker", player: trackerMatch[1] };
  }
  if (hash === "/global") {
    return { view: "global", player: null };
  }
  if (hash === "/games") {
    return { view: "games", player: null };
  }
  return { view: "landing", player: null };
}

export default function App() {
  useRealtimeSync();
  const [route, setRoute] = useState(parseHash);
  const [isDark, setIsDark] = useDarkMode();
  const [showDie, setShowDie] = useState(false);
  const [dieLanded, setDieLanded] = useState(false);

  // Sync route with location hash (refresh persistence, back/forward)
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Normalize invalid hashes to the landing route
  useEffect(() => {
    const hash = window.location.hash;
    if (route.view === "landing" && hash !== "" && hash !== "#" && hash !== "#/") {
      window.history.replaceState(null, "", "#/");
    }
  }, [route]);

  // Both halves of the die gesture, in one handler on the root element:
  // a triple-click summons it, a single click dismisses it once it lands.
  // Rapid clicking of buttons and inputs is ignored so the +1/-1 controls
  // don't trigger it.
  const handleClick = (e) => {
    if (e.detail === 3) {
      if (e.target.closest('button, a, input, textarea, select, [role="button"]')) return;
      setShowDie(true);
      setDieLanded(false);
    } else if (e.detail === 1 && showDie && dieLanded) {
      setShowDie(false);
      setDieLanded(false);
    }
  };

  const handleDieLanded = () => {
    setDieLanded(true);
  };

  const handleSelectPlayer = (player) => {
    window.location.hash = `/tracker/${player}`;
  };

  const handleShowGlobalStats = () => {
    window.location.hash = "/global";
  };

  const handleBack = () => {
    window.location.hash = "/";
  };

  // One stable toggle instead of a fresh `() => setIsDark(!isDark)` closure
  // per route branch (the updater form also can't read a stale `isDark`).
  const toggleDark = () => setIsDark(d => !d);
  const themeProps = { isDark, onToggleDark: toggleDark };

  return (
    <div onClick={handleClick} className={styles.root}>
        {route.view === 'landing' && (
          <LandingPage
            onSelectPlayer={handleSelectPlayer}
            onShowGlobalStats={handleShowGlobalStats}
            {...themeProps}
          />
        )}
        {route.view === 'tracker' && route.player && (
          <TrackerView player={route.player} onBack={handleBack} {...themeProps} />
        )}
        {route.view === 'global' && (
          <GlobalStatsView onBack={handleBack} {...themeProps} />
        )}
        {route.view === 'games' && (
          <GamesArchiveView onBack={handleBack} {...themeProps} />
        )}

      {showDie && <RollingD20 onLanded={handleDieLanded} />}
    </div>
  );
}
