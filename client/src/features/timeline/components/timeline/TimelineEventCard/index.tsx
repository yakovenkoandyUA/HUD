import React from 'react'
import type { TimelineEvent } from '../../../types/timeline'
import styles from './TimelineEventCard.module.css'

/**
 * TimelineEventCard
 * ------------------
 * Універсальна картка події Timeline. Вигляд залежить від `event.type`
 * (memory/place/media/recipe/mood) — іконка + заголовок + опис + бейдж власника.
 *
 * Props:
 * @prop {TimelineEvent} event   — подія стрічки
 * @prop {() => void}    [onClick] — тап (тільки для memory — перехід на деталі)
 */
interface TimelineEventCardProps {
  event: TimelineEvent
  onClick?: () => void
}

const ICONS: Record<TimelineEvent['type'], React.ReactNode> = {
  memory: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4.5h3l1-1.5h4l1 1.5h3v8.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="8" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  place: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 14.5S13 9.8 13 6.2A5 5 0 0 0 3 6.2C3 9.8 8 14.5 8 14.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="8" cy="6.2" r="1.6" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  media: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6.5 6v3.2l2.8-1.6L6.5 6Z" fill="currentColor"/>
    </svg>
  ),
  recipe: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2v5a2 2 0 1 0 4 0V2M6 7v7M11 2c-1.2 0-2 1.5-2 3.5S9.8 9 11 9s2-1.5 2-3.5S12.2 2 11 2ZM11 9v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  mood: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 9.5c.6.8 1.5 1.3 2.5 1.3s1.9-.5 2.5-1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="6" cy="6.5" r="0.7" fill="currentColor"/>
      <circle cx="10" cy="6.5" r="0.7" fill="currentColor"/>
    </svg>
  ),
}

const MONTHS_UA = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_UA[m - 1]}`
}

function titleFor(event: TimelineEvent): string {
  const p = event.payload
  switch (event.type) {
    case 'memory': return (p.title as string) || 'Спогад'
    case 'place':  return (p.title as string) || 'Місце'
    case 'media':  return (p.title as string) || 'Перегляд'
    case 'recipe': return (p.title as string) || 'Рецепт'
    case 'mood': {
      const trend = p.trend as string
      if (trend === 'up') return 'Настрій покращився'
      if (trend === 'down') return 'Настрій знизився'
      return 'Настрій стабільний'
    }
  }
}

function subtitleFor(event: TimelineEvent): string | null {
  const p = event.payload
  switch (event.type) {
    case 'memory':
      return (p.location as string) || null
    case 'place': {
      const loc = p.location as { name?: string | null; address?: string | null } | undefined
      return loc?.name || loc?.address || null
    }
    case 'media':
      return (p.watchedTogether as boolean) ? 'Дивились разом' : null
    case 'recipe':
      return 'Приготовлено'
    case 'mood':
      return null
  }
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({ event, onClick }) => {
  const subtitle = subtitleFor(event)
  return (
    <div
      className={styles.card}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className={`${styles.icon} ${styles[`icon_${event.type}`]}`}>
        {ICONS[event.type]}
      </div>
      <div className={styles.body}>
        <span className={styles.title}>{titleFor(event)}</span>
        <span className={styles.meta}>
          {formatShortDate(event.date)}{subtitle ? ` · ${subtitle}` : ''}
        </span>
      </div>
      {event.ownerName && (
        <div className={styles.ownerBadge} title={event.ownerName}>
          {event.ownerAvatarUrl
            ? <img src={event.ownerAvatarUrl} alt={event.ownerName} className={styles.ownerAvatar} />
            : <span className={styles.ownerInitial}>{event.ownerName[0]}</span>
          }
        </div>
      )}
    </div>
  )
}

export default TimelineEventCard
