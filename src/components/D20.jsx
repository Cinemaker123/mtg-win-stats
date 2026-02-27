import d20Image from "../D20_icon.png";
import styles from './D20.module.css';

export function D20({ number, showResult }) {
  return (
    <div className={styles.container}>
      <img 
        src={d20Image} 
        alt="D20" 
        width={130} 
        height={130}
        className={styles.dieImage}
      />
      {/* Number overlay */}
      <div 
        className={styles.overlay}
        style={{
          background: showResult && number === 20 
            ? "#27ae60" 
            : showResult && number === 1 
              ? "#1a1a1a" 
              : "rgba(0,0,0,0.5)",
        }}
      >
        <span 
          className={styles.number}
          style={{
            fontSize: showResult ? "29px" : "41px",
            color: showResult && number === 1 ? "#e74c3c" : "#fff",
          }}
        >
          {showResult ? number : "?"}
        </span>
      </div>
    </div>
  );
}
