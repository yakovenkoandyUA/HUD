import React from 'react'
import styles from './Card.module.css'

/**
 * Card
 * ----
 * Базова поверхня для блоків контенту.
 *
 * Props:
 * @prop {React.ReactNode} children
 * @prop {string}          [className]
 * @prop {'default'|'accent'} [variant] — accent додає ліву червону межу
 * @prop {() => void}      [onClick]
 */
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent'
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', onClick }) => (
  <div
    className={`${styles.card} ${styles[variant]} ${className}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
  >
    {children}
  </div>
)

export default Card
