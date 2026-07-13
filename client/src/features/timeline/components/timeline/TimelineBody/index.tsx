import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TimelineEventCard from '../TimelineEventCard'
import DoodleIllustration from '@/shared/components/ui/DoodleIllustration'
import UpgradePrompt from '@/shared/components/ui/UpgradePrompt'
import { useTimelineStore } from '@/features/timeline/store/timelineStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { usePlan } from '@/shared/hooks/usePlan'
import type { TimelineEvent, TimelineEventType, TimelineScope } from '../../../types/timeline'
import styles from './TimelineBody.module.css'

const SCOPE_OPTIONS: { value: TimelineScope; label: string }[] = [
  { value: 'all',    label: 'Все' },
  { value: 'mine',   label: 'Моє' },
  { value: 'family', label: 'Спільне' },
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
 * Контент Timeline (year nav + scope/type chips + згруповані по місяцях
 * картки подій) без зовнішньої обгортки-заголовка — рендериться і в `/timeline`,
 * і в таб "Хроніка" на сторінці профілю.
 */
const TimelineBody: React.FC = () => {
  const navigate = useNavigate()
  const { events, year, scope, spaceId, loading, setYear, setScope, setSpaceId, fetchTimeline } = useTimelineStore()
  const { spaces, fetchSpaces } = useSpacesStore()
  const [typeFilter, setTypeFilter] = useState<TimelineEventType | 'all'>('all')
  const { limits } = usePlan()
  const currentYear = new Date().getFullYear()
  const yearLocked = limits.timelineHistoryYears !== -1 && year < currentYear - limits.timelineHistoryYears

  useEffect(() => { fetchSpaces() }, [fetchSpaces])

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

      <button type="button" className={styles.yearbookLink} onClick={() => navigate(`/yearbook/${year}`)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 9.5l2-2.5 1.5 1.5L11 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Підсумки {year}
      </button>

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

      {spaces.length > 0 && (
        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${!spaceId ? styles.chipActive : ''}`}
            onClick={() => setSpaceId(null)}
          >
            Всі простори
          </button>
          {spaces.map(s => (
            <button
              key={s.id}
              type="button"
              className={styles.chip}
              style={spaceId === s.id ? { borderColor: s.color, color: s.color } : undefined}
              onClick={() => setSpaceId(spaceId === s.id ? null : s.id)}
            >
              <span className={styles.spaceDot} style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

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

      {loading ? (
        <div className={styles.skeleton}>
          {Array.from({ length: 4 }, (_, i) => <div key={i} className={styles.skeletonRow} />)}
        </div>
      ) : null}

      <div className={styles.list} style={loading ? { display: 'none' } : undefined}>
        {yearLocked && (
          <div className={styles.empty}>
            <UpgradePrompt limitKey="timelineHistoryYears" currentCount={currentYear - year} />
          </div>
        )}

        {!yearLocked && !loading && grouped.length === 0 && (
          <div className={styles.empty}>
            <DoodleIllustration variant="memories" size={56} />
            <span className={styles.emptyText}>За {year} рік тут поки нічого немає</span>
          </div>
        )}

        {!yearLocked && grouped.map(([month, monthEvents]) => (
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
