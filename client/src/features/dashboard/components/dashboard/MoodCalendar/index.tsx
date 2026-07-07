import React, { useMemo } from 'react'
import MoodIcon from '../DayOverlay/MoodIcon'
import type { MoodLog } from '@/features/profile/store/moodStore'
import styles from './MoodCalendar.module.css'

const MOOD_LABELS: Record<number, string> = {
  1: 'Важко',
  2: 'Так собі',
  3: 'Норм',
  4: 'Добре',
  5: 'Чудово',
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMondayOfWeek(d: Date): Date {
  const result = new Date(d)
  const day = (d.getDay() + 6) % 7
  result.setDate(d.getDate() - day)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * MoodCalendar
 * ------------
 * Місячний heatmap настроїв: кола з SVG смайлом + glow, тижневий підсумок,
 * легенда з іконками для розшифровки кольорів.
 *
 * Props:
 * @prop {MoodLog[]} logs — масив записів настрою
 */
interface MoodCalendarProps {
  logs: MoodLog[]
}

const MoodCalendar: React.FC<MoodCalendarProps> = ({ logs }) => {
  const logMap = useMemo(() => {
    const m: Record<string, 1 | 2 | 3 | 4 | 5> = {}
    logs.forEach(l => { m[l.date] = l.score })
    return m
  }, [logs])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayIso = toIso(today)

  const gridStart = useMemo(() => {
    const monday = getMondayOfWeek(today)
    const start = new Date(monday)
    start.setDate(monday.getDate() - 28)
    return start
  }, [today])

  const cells = useMemo(() => {
    const result: Array<{
      date:     string
      score:    (1 | 2 | 3 | 4 | 5) | null
      isFuture: boolean
      isToday:  boolean
    }> = []
    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      d.setHours(0, 0, 0, 0)
      const iso = toIso(d)
      result.push({
        date:     iso,
        score:    logMap[iso] ?? null,
        isFuture: d > today,
        isToday:  iso === todayIso,
      })
    }
    return result
  }, [logMap, gridStart, today, todayIso])

 

  return (
    <div className={styles.root}>
      <p className={styles.label}>НАСТРІЙ / МІСЯЦЬ</p>

      

      <div className={styles.dayNames}>
        {DAY_NAMES.map(d => <span key={d} className={styles.dayName}>{d}</span>)}
      </div>

      <div className={styles.grid}>
        {cells.map(cell => {
          const scoreClass = cell.score ? styles[`score${cell.score}` as keyof typeof styles] : undefined
          return (
            <div
              key={cell.date}
              className={[
                styles.cell,
                cell.isFuture ? styles.cellFuture : (!cell.score ? styles.cellEmpty : styles.cellFilled),
                cell.isToday  ? styles.cellToday  : '',
                scoreClass ?? '',
              ].filter(Boolean).join(' ')}
              title={cell.score ? `${cell.date}: ${MOOD_LABELS[cell.score]}` : cell.date}
            >
              {cell.score ? (
                <MoodIcon score={cell.score} size={22} color="rgba(255,255,255,0.88)" />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className={styles.legend}>
        {([1, 2, 3, 4, 5] as const).map(score => (
          <div key={score} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles[`score${score}` as keyof typeof styles]}`}>
              <MoodIcon score={score} size={12} color="rgba(255,255,255,0.8)" />
            </span>
            <span className={styles.legendLabel}>{MOOD_LABELS[score]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MoodCalendar
