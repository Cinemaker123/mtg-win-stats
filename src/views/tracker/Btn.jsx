import styles from "../TrackerView.module.css";

export function Btn({ onClick, bg, color, hoverBg, children, title }) {
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
