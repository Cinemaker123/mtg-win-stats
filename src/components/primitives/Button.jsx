import styles from './Button.module.css';

/**
 * Button primitive with variants
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Whether button takes full width
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
