import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TimelineEventCard from '../TimelineEventCard'
import DoodleIllustration from '../../ui/DoodleIllustration'
import { useTimelineStore } from '../../../store/timelineStore'
import type { TimelineEvent, TimelineEventType, TimelineScope } from '../../../types/timeline'
import styles from './TimelineBody.module.css'

const SCOPE_OPTIONS: { value: TimelineScope; label: string }[] = [
  { value: 'all',    label: 'Все' },
  { value: 'mine',   label: 'Моє' },
  { value: 'family', label: "Сім'я" },
]

const TYPE_OPTIONS: { value: TimelineEventType | 'all'; label: string }[] = [
  { value: 'all',    label: 'Все' },
  { value: 'memory', label: 'Спогади' },
  { value: 'place',  label: 'Місця' },
  { value: 'media',  label: 'Медіа' },
  { value: 'recipe', label: 'Рецепти' },
  { value: 'mood',   label: 'Настрій' },
]

const MONTHS_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

function groupByMonth(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const groups: Record<string, TimelineEvent[]> = {}
  events.forEach(e => {
    const monthIdx = parseInt(e.date.slice(5, 7), 10) - 1
    const key = MONTHS_UA[monthIdx] ?? e.date.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return Object.entries(groups)
}

/**
 * TimelineBody
 * ------------
 * Контент Family Timeline (year nav + scope/type chips + згруповані по місяцях
 * картки подій) без зовнішньої обгортки-заголовка — рендериться і в `/timeline`,
 * і в таб "Хроніка" на сторінці профілю.
 */
const TimelineBody: React.FC = () => {
  const navigate = useNavigate()
  const { events, year, scope, loading, setYear, setScope, fetchTimeline } = useTimelineStore()
  const [typeFilter, setTypeFilter] = useState<TimelineEventType | 'all'>('all')

  useEffect(() => { fetchTimeline() }, [fetchTimeline])

  const filtered = useMemo(
    () => typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter),
    [events, typeFilter]
  )

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  return (
    <div className={styles.body}>
      <div className={styles.yearNav}>
        <button type="button" className={styles.yearArrow} onClick={() => setYear(year - 1)}>‹</button>
        <span className={styles.year}>{year}</span>
        <button
          type="button"
          className={styles.yearArrow}
          onClick={() => setYear(year + 1)}
          disabled={year >= new Date().getFullYear()}
        >›</button>
      </div>

      <div className={styles.chipRow}>
        {SCOPE_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            className={`${styles.chip} ${scope === o.value ? styles.chipActive : ''}`}
            onClick={() => setScope(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={styles.chipRow}>
        {TYPE_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            className={`${styles.chip} ${typeFilter === o.value ? styles.chipActive : ''}`}
            onClick={() => setTypeFilter(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {!loading && grouped.length === 0 && (
          <div className={styles.empty}>
            <DoodleIllustration variant="memories" size={56} />
            <span className={styles.emptyText}>За {year} рік тут поки нічого немає</span>
          </div>
        )}

        {grouped.map(([month, monthEvents]) => (
          <div key={month} className={styles.monthSection}>
            <div className={styles.monthHeader}>
              <span className={styles.monthDot} />
              <span className={styles.monthLabel}>{month.toUpperCase()}</span>
            </div>
            <div className={styles.monthEvents}>
              {monthEvents.map(e => (
                <TimelineEventCard
                  key={e.id}
                  event={e}
                  onClick={e.type === 'memory' ? () => navigate(`/memories/${e.id}`) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TimelineBody
