import PropTypes from "prop-types";
import styles from './Button.module.css';

/**
 * Button primitive with variants
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} props.onClick - Click handler
 * @param {'primary'|'secondary'|'danger'|'ghost'} props.variant - Button style variant
 * @param {'sm'|'md'|'lg'} props.size - Button size
 * @param {boolean} props.fullWidth - Whether button takes full width
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.title - Tooltip text
 * @param {'button'|'submit'|'reset'} props.type - Button type
 */
export function Button({ 
  children, 
  onClick, 
  variant = 'secondary', 
  size = 'md', 
  fullWidth = false,
  disabled = false,
  title,
  type = 'button',
}) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={classNames}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};
