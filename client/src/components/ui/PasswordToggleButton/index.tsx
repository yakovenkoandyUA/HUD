import React from 'react'
import styles from './PasswordToggleButton.module.css'

/**
 * PasswordToggleButton
 * ---------------------
 * Іконка "око" для перемикання видимості пароля. Розміщується абсолютно
 * всередині `position: relative` обгортки навколо `<input type="password">`.
 */
interface PasswordToggleButtonProps {
  visible: boolean
  onToggle: () => void
}

const PasswordToggleButton: React.FC<PasswordToggleButtonProps> = ({ visible, onToggle }) => (
  <button
    type="button"
    className={styles.btn}
    onClick={onToggle}
    tabIndex={-1}
    aria-label={visible ? 'Сховати пароль' : 'Показати пароль'}
  >
    {visible ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        <line x1="3" y1="21" x2="21" y2="3" />
      </svg>
    )}
  </button>
)

export default PasswordToggleButton
