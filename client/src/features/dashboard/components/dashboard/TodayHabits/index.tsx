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

/**
 * TodayHabits
 * -----------
 * Заголовок "СЬОГОДНІ" + чіпи звичок на сьогодні — окремо від навігаційного
 * гріда (DaySummaryCard), бо логічно йде одразу під привітанням/погодою:
 * "детальніше" відкриває DayOverlay (настрій + погода + звички по слотах),
 * той самий контекст що й привітання, а не навігація до інших модулів.
 *
 * Мінімалістичний вигляд — крапка (не квадрат-чекбокс) + назва, виконано →
 * крапка заливається кольором, назва тьмяніє (text3, тонший шрифт) — як
 * виконаний пункт у списку справ. Головний екран і так щільний; багатший
 * вигляд (RoutineRing, % виконання за тиждень) лишився у детальному
 * календарі (WeekExpandedView), де на це є місце.
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

const TodayHabits: React.FC<TodayHabitsProps> = ({ routineItems, isDoneToday, onToggle, onOpenDay }) => (
  <div className={styles.root}>
    <div className={styles.header}>
      <span className={styles.headerLabel}>Сьогодні</span>
      <button type="button" className={styles.openBtn} onClick={onOpenDay}>
        детальніше
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>

    {routineItems.length > 0 && (
      <div className={styles.chipsRow}>
        {routineItems.map(r => {
          const done = isDoneToday(r)
          const TimeIcon = r.timeOfDay ? TIME_ICONS[r.timeOfDay] : null
          return (
            <button
              key={r.id}
              type="button"
              className={`${styles.chip} ${done ? styles.chipDone : ''}`}
              onClick={() => onToggle(r.id)}
            >
              <span className={styles.chipDot} />
              {TimeIcon && <span className={styles.chipTimeIcon}><TimeIcon /></span>}
              {r.title}
            </button>
          )
        })}
      </div>
    )}
  </div>
)

export default TodayHabits
