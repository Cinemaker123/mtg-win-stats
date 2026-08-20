import PropTypes from "prop-types";
import { DarkModeToggle } from "./DarkModeToggle.jsx";
import styles from "../styles/viewChrome.module.css";

/**
 * The top bar every full-screen view shares: back button, a leading glyph,
 * the view's name, then the dark-mode toggle. Extra buttons passed as
 * children are placed between the title and the toggle.
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Emoji or element shown before the title
 * @param {React.ReactNode} props.title - The view's name
 * @param {Function} props.onBack - Back-button handler
 * @param {boolean} props.isDark - Current theme
 * @param {Function} props.onToggleDark - Theme toggle handler
 * @param {string} [props.titleClassName] - Overrides the default title styling
 */
export function ViewHeader({
  icon,
  title,
  onBack,
  isDark,
  onToggleDark,
  titleClassName = styles.title,
  children = null,
}) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton} title="Zurück">←</button>
      {typeof icon === "string"
        ? <span className={styles.headerIcon}>{icon}</span>
        : icon}
      <span className={titleClassName}>{title}</span>
      {children}
      <DarkModeToggle isDark={isDark} onToggle={onToggleDark} />
    </div>
  );
}

ViewHeader.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.node.isRequired,
  onBack: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
  titleClassName: PropTypes.string,
  children: PropTypes.node,
};
