import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useDarkMode } from "./hooks/useDarkMode.js";
import { RollingD20 } from "./components/RollingD20.jsx";
import { LandingPage } from "./views/LandingPage.jsx";
import { TrackerView } from "./views/TrackerView.jsx";
import { GlobalStatsView } from "./views/GlobalStatsView.jsx";

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'tracker', 'global'
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isDark, setIsDark, darkLoaded] = useDarkMode();
  const [showDie, setShowDie] = useState(false);
  const [dieLanded, setDieLanded] = useState(false);
  const isMobile = useIsMobile();
  const screenWidth = isMobile ? window.innerWidth : 1024;

  // D20 triple-click easter egg
  useEffect(() => {
    const handleClick = (e) => {
      if (e.detail === 3) {
        setShowDie(true);
        setDieLanded(false);
      }
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
    setCurrentPlayer(player);
    setView('tracker');
  };

  const handleShowGlobalStats = () => {
    setView('global');
  };

  const handleBack = () => {
    setView('landing');
    setCurrentPlayer(null);
  };

  if (!darkLoaded) {
    return null;
  }

  return (
    <div onClick={handleClick} style={{ height: "100dvh" }}>
      {view === 'landing' && (
        <LandingPage 
          onSelectPlayer={handleSelectPlayer}
          onShowGlobalStats={handleShowGlobalStats}
          isDark={isDark} 
          onToggleDark={() => setIsDark(!isDark)} 
        />
      )}
      {view === 'tracker' && currentPlayer && (
        <TrackerView 
          player={currentPlayer} 
          onBack={handleBack}
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
        />
      )}
      {view === 'global' && (
        <GlobalStatsView 
          onBack={handleBack}
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
