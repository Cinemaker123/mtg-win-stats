import PropTypes from "prop-types";
import styles from "../TrackerView.module.css";

/**
 * Simple button component with custom background colors
 * Used for win/loss controls in deck cards
 * @param {Object} props
 * @param {Function} props.onClick - Click handler
 * @param {string} props.bg - Background color
 * @param {string} props.color - Text color
 * @param {string} props.hoverBg - Hover background color
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.title - Tooltip text
 */
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

Btn.propTypes = {
  onClick: PropTypes.func.isRequired,
  bg: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  hoverBg: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};
