import React from 'react'
import styles from './Button.module.css'

/**
 * Button
 * ------
 * Кнопка дії.
 *
 * Props:
 * @prop {React.ReactNode}   children
 * @prop {'primary'|'secondary'|'ghost'} [variant]
 * @prop {'sm'|'md'|'lg'}   [size]
 * @prop {boolean}           [fullWidth]
 * @prop {boolean}           [disabled]
 * @prop {'button'|'submit'} [type]
 * @prop {() => void}        [onClick]
 */
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
}) => (
  <button
    type={type}
    className={`${styles.btn} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ''}`}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
)

export default Button
