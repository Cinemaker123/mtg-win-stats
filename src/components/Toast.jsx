import PropTypes from "prop-types";
import styles from "./Toast.module.css";

/**
 * The toast shapes `useToast` accepts. The type decides the styling — it is
 * never derived from the message text, so rewording a message can't restyle
 * the toast.
 */
export const TOAST_TYPES = ["success", "error", "undo"];

/**
 * A transient notification pinned to the top of the screen, optionally with
 * one action button (used for undo offers).
 * @param {Object} props
 * @param {Object} props.toast - { type, message, actionLabel?, onAction? }
 */
export function Toast({ toast }) {
  const { type, message, actionLabel, onAction } = toast;
  return (
    <div className={styles[type]}>
      <span>{message}</span>
      {actionLabel && onAction && (
        <button className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

Toast.propTypes = {
  toast: PropTypes.shape({
    type: PropTypes.oneOf(TOAST_TYPES).isRequired,
    message: PropTypes.string.isRequired,
    actionLabel: PropTypes.string,
    onAction: PropTypes.func,
  }).isRequired,
};
