import React from 'react'
import type { UnifiedTodo } from '@/shared/types'
import styles from './TodayHabits.module.css'

const SunriseIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42"/><path d="M23 22H1"/>
  </svg>
)

const SunIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const MoonIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 7 7 0 0 0 21 12.5z"/>
  </svg>
)

const TIME_ICONS: Record<string, React.FC> = {
  morning:   SunriseIcon,
  afternoon: SunIcon,
  evening:   MoonIcon,
}

const VISIBLE_LIMIT = 3

/**
 * TodayHabits
 * -----------
 * Компактний вертикальний список звичок на сьогодні.
 * Показує максимум 3 елементи + "ще N" якщо більше.
 * Заголовок "СЬОГОДНІ" вже винесений у DailyBanner.
 *
 * Props:
 * @prop {UnifiedTodo[]} routineItems — звички що заплановані на сьогодні
 * @prop {(t: UnifiedTodo) => boolean} isDoneToday — чи виконана звичка сьогодні
 * @prop {(id: string) => void} onToggle — тогл звички
 * @prop {() => void} onOpenDay — відкрити DayOverlay
 */
interface TodayHabitsProps {
  routineItems: UnifiedTodo[]
  isDoneToday: (t: UnifiedTodo) => boolean
  onToggle: (id: string) => void
  onOpenDay: () => void
}

const TodayHabits: React.FC<TodayHabitsProps> = ({ routineItems, isDoneToday, onToggle, onOpenDay }) => {
  const visible = routineItems.slice(0, VISIBLE_LIMIT)
  const remaining = routineItems.length - VISIBLE_LIMIT

  return (
    <div className={styles.root}>
      {visible.map((r, idx) => {
        const done = isDoneToday(r)
        const TimeIcon = r.timeOfDay ? TIME_ICONS[r.timeOfDay] : null
        const isLast = idx === visible.length - 1 && remaining <= 0

        return (
          <button
            key={r.id}
            type="button"
            className={`${styles.item} ${done ? styles.itemDone : ''} ${isLast ? styles.itemLast : ''}`}
            onClick={() => onToggle(r.id)}
          >
            <span className={`${styles.dot} ${done ? styles.dotDone : ''}`} aria-hidden="true" />
            <span className={styles.itemTitle}>{r.title}</span>
            {TimeIcon && (
              <span className={styles.timeIcon}>
                <TimeIcon />
              </span>
            )}
          </button>
        )
      })}

      {remaining > 0 && (
        <button type="button" className={`${styles.item} ${styles.moreBtn}`} onClick={onOpenDay}>
          <span className={styles.moreDot} aria-hidden="true" />
          <span className={styles.moreText}>ще {remaining} {remaining === 1 ? 'звичка' : remaining < 5 ? 'звички' : 'звичок'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.moreArrow} aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export default TodayHabits
