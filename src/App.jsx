// React
import { useState, useEffect } from "react";

// Hooks
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useDarkMode } from "./hooks/useDarkMode.js";
import { GamesProvider } from "./hooks/GamesProvider.jsx";

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
  const [route, setRoute] = useState(parseHash);
  const [isDark, setIsDark, darkLoaded] = useDarkMode();
  const [showDie, setShowDie] = useState(false);
  const [dieLanded, setDieLanded] = useState(false);
  const isMobile = useIsMobile();
  const screenWidth = isMobile ? window.innerWidth : 1024;

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

  // D20 triple-click easter egg (ignored on interactive elements,
  // so rapid clicking of +1/-1 buttons doesn't trigger it)
  useEffect(() => {
    const handleClick = (e) => {
      if (e.detail !== 3) return;
      if (e.target.closest('button, a, input, textarea, select, [role="button"]')) return;
      setShowDie(true);
      setDieLanded(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleClick = (e) => {
    // Single click dismisses the die after it lands
    if (e.detail === 1 && showDie && dieLanded) {
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

  if (!darkLoaded) {
    return null;
  }

  return (
    <div onClick={handleClick} className={styles.root}>
      <GamesProvider>
        {route.view === 'landing' && (
          <LandingPage
            onSelectPlayer={handleSelectPlayer}
            onShowGlobalStats={handleShowGlobalStats}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
          />
        )}
        {route.view === 'tracker' && route.player && (
          <TrackerView
            player={route.player}
            onBack={handleBack}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
          />
        )}
        {route.view === 'global' && (
          <GlobalStatsView
            onBack={handleBack}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
          />
        )}
        {route.view === 'games' && (
          <GamesArchiveView
            onBack={handleBack}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
          />
        )}
      </GamesProvider>

      {showDie && (
        <RollingD20 
          onLanded={handleDieLanded}
          screenWidth={screenWidth}
        />
      )}
    </div>
  );
}
