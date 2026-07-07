import React from 'react'
import styles from './Badge.module.css'

/**
 * Badge
 * -----
 * Маленький лейбл-теґ для категорій, статусів.
 *
 * Props:
 * @prop {React.ReactNode} children
 * @prop {'red'|'gold'|'green'|'orange'|'default'} [color]
 */
interface BadgeProps {
  children: React.ReactNode
  color?: 'red' | 'gold' | 'green' | 'orange' | 'default'
}

const Badge: React.FC<BadgeProps> = ({ children, color = 'default' }) => (
  <span className={`${styles.badge} ${styles[color]}`}>{children}</span>
)

export default Badge
