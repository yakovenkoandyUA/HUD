import React from 'react'
import type { UnifiedTodo } from '@/shared/types'
import { calcWeekRate } from '../../../utils/sprint'
import styles from './RoutineRing.module.css'

const SunriseIcon: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42"/><path d="M23 22H1"/>
  </svg>
)

const SunIcon: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const MoonIcon: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 7 7 0 0 0 21 12.5z"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5l5 5L20 6.5"/>
  </svg>
)

const TIME_ICONS: Record<string, React.FC> = {
  morning:   SunriseIcon,
  afternoon: SunIcon,
  evening:   MoonIcon,
}

const STROKE = 3

/**
 * RoutineRing
 * -----------
 * Чисто візуальне кільце прогресу для звички — % виконання за останні 7 днів
 * (`calcWeekRate`), у центрі іконка часу доби або галочка якщо вже виконано.
 * Без власного onClick/button — обгортка (тап-зона) лишається на боці виклику,
 * бо контексти різні (Dashboard tile vs inline checkbox у календарі).
 * Спільний для TodayHabits (Dashboard) і WeekExpandedView (звички по днях).
 *
 * Props:
 * @prop {UnifiedTodo} task — звичка
 * @prop {boolean} done     — чи виконана сьогодні/у вибраний день
 * @prop {number} [size=44] — діаметр кільця в px
 */
interface RoutineRingProps {
  task: UnifiedTodo
  done: boolean
  size?: number
}

const RoutineRing: React.FC<RoutineRingProps> = ({ task, done, size = 44 }) => {
  const r = size / 2 - STROKE * 1.5
  const circ = 2 * Math.PI * r
  const pct = calcWeekRate(task)
  const offset = circ * (1 - pct / 100)
  const TimeIcon = task.timeOfDay ? TIME_ICONS[task.timeOfDay] : null
  const iconBox = Math.round(size * 0.32)

  return (
    <span className={`${styles.ringWrap} ${done ? styles.ringWrapDone : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.ringSvg}>
        <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} strokeWidth={STROKE} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className={styles.ringProgress}
          strokeWidth={STROKE}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.ringIcon} style={{ width: iconBox, height: iconBox }}>
        {done ? <CheckIcon /> : (TimeIcon ? <TimeIcon /> : null)}
      </span>
    </span>
  )
}

export default RoutineRing
