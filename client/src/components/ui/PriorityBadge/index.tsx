import React from 'react'
import type { TodoPriority } from '../../../types'
import styles from './PriorityBadge.module.css'

/**
 * PriorityBadge
 * -------------
 * Кольоровий бейдж пріоритету справи.
 *
 * Props:
 * @prop {TodoPriority} priority — рівень пріоритету
 * @prop {boolean}      [compact] — компактний режим: тільки символ, без тексту
 */
interface PriorityBadgeProps {
  priority: TodoPriority
  compact?: boolean
}

const CONFIG: Record<TodoPriority, { symbol: string; label: string; mod: string }> = {
  urgent: { symbol: '▲', label: 'ТЕРМІНОВО', mod: 'urgent' },
  normal: { symbol: '◆', label: 'НОРМ',      mod: 'normal' },
  low:    { symbol: '▽', label: 'АБИ БУЛО',  mod: 'low'    },
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, compact }) => {
  const { symbol, label, mod } = CONFIG[priority]
  return (
    <span className={`${styles.badge} ${styles[mod]} ${compact ? styles.compact : ''}`}>
      <span className={styles.symbol}>{symbol}</span>
      {!compact && <span className={styles.label}>{label}</span>}
    </span>
  )
}

export default PriorityBadge
