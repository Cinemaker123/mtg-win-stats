import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { D20 } from "./D20.jsx";

/**
 * Rolling D20 animation component
 * Animates a D20 die rolling across the screen
 * @param {Object} props
 * @param {Function} props.onLanded - Callback when animation completes
 * @param {number} props.screenWidth - Screen width for animation calculation
 */
export function RollingD20({ onLanded, screenWidth }) {
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

RollingD20.propTypes = {
  onLanded: PropTypes.func.isRequired,
  screenWidth: PropTypes.number.isRequired,
};
