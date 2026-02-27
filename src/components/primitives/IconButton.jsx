import PropTypes from "prop-types";
import styles from './IconButton.module.css';

/**
 * Circular icon button
 * @param {string} variant - 'default' | 'danger' | 'primary'
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
export function IconButton({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'md',
  disabled = false,
  title,
  ariaLabel,
}) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
      className={classNames}
    >
      {children}
    </button>
  );
}

IconButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'danger', 'primary']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  title: PropTypes.string,
  ariaLabel: PropTypes.string,
};
