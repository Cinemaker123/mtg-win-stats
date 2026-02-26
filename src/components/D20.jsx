import d20Image from "../D20_icon.png";

export function D20({ number, showResult }) {
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
