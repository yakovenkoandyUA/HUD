import React from 'react'
import type { TodoPriority } from '@/shared/types'
import styles from './PriorityBadge.module.css'

/**
 * PriorityBadge
 * -------------
 * Кольоровий бейдж пріоритету справи.
 *
 * Props:
 * @prop {TodoPriority} priority — рівень пріоритету
 * @prop {boolean}      [compact] — компактний режим: тільки іконка, без тексту
 */
interface PriorityBadgeProps {
  priority: TodoPriority
  compact?: boolean
}

const IconUrgent = () => (
  <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
    <path d="M6.5 1L1.5 6.5h3.5L2.5 11l7-6H6L6.5 1z"/>
  </svg>
)
const IconNormal = () => (
  <svg width="8" height="7" viewBox="0 0 10 8" fill="none" aria-hidden="true">
    <line x1="1" y1="2" x2="9" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="1" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const IconLow = () => (
  <svg width="10" height="7" viewBox="0 0 12 8" fill="none" aria-hidden="true">
    <path d="M1 4c.8-2 1.7-2 2.5 0s1.7 2 2.5 0 1.7-2 2.5 0 1.7 2 2.5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const CONFIG: Record<TodoPriority, { icon: React.ReactNode; label: string; mod: string }> = {
  urgent: { icon: <IconUrgent />, label: 'ТЕРМІНОВО', mod: 'urgent' },
  normal: { icon: <IconNormal />, label: 'НОРМ',      mod: 'normal' },
  low:    { icon: <IconLow />,    label: 'АБИ БУЛО',  mod: 'low'    },
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, compact }) => {
  const { icon, label, mod } = CONFIG[priority]
  return (
    <span className={`${styles.badge} ${styles[mod]} ${compact ? styles.compact : ''}`}>
      <span className={styles.symbol}>{icon}</span>
      {!compact && <span className={styles.label}>{label}</span>}
    </span>
  )
}

export default PriorityBadge
