import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import TrackSVG from '../TrackSVG'
import styles from './NextRaceCard.module.css'

/**
 * NextRaceCard
 * ------------
 * Hero-картка наступного Гран Прі на екрані F1.
 * Три стани: нормальний countdown (дні > 0), race week (день гонки, > 2г),
 * race day (< 2г до старту) — мигаючі F1 start lights + живий таймер.
 * Фоновий SVG треку (статичний, opacity 0.07).
 *
 * Props:
 * @prop {F1Race} race — дані наступної гонки
 */
interface NextRaceCardProps {
  race: F1Race
}

interface Cd { d: number; h: number; m: number; s: number }

function getCountdown(date: string): Cd {
  const diff = Math.max(0, new Date(date + 'T14:00:00Z').getTime() - Date.now())
  const s = Math.floor(diff / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

function formatRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }).toUpperCase()
}

type LightColor = 'red' | 'orange' | 'yellow' | 'green'

const DOT_COLOR: Record<string, LightColor> = {
  'ДНІВ':   'red',
  'ГОДИН':  'orange',
  'ХВИЛИН': 'yellow',
  'СЕК':    'green',
}

const LIGHT_CLASS: Record<LightColor, string> = {
  red:    styles.dotRed,
  orange: styles.dotOrange,
  yellow: styles.dotYellow,
  green:  styles.dotGreen,
}

function getDots(value: number, label: string) {
  const color = DOT_COLOR[label] ?? 'red'
  return Array.from({ length: 3 }, (_, j) => (
    <div key={j} className={`${styles.dot} ${LIGHT_CLASS[color]}`} />
  ))
}

const NextRaceCard: React.FC<NextRaceCardProps> = ({ race }) => {
  const [cd, setCd]             = useState<Cd>(() => getCountdown(race.date))
  const [lightsOn, setLightsOn] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race.date])

  const { d: days, h: hours, m: minutes, s: seconds } = cd
  const isRaceDay = days === 0 && hours < 2

  useEffect(() => {
    if (!isRaceDay) return
    const id = setInterval(() => setLightsOn(v => !v), 500)
    return () => clearInterval(id)
  }, [isRaceDay])

  const gpLabel      = race.name.replace(' Grand Prix', '').replace(' GP', '').toUpperCase()
  const formattedDate = formatRaceDate(race.date)

  const countdownUnits = [
    { value: days,    label: 'ДНІВ'   },
    { value: hours,   label: 'ГОДИН'  },
    { value: minutes, label: 'ХВИЛИН' },
    { value: seconds, label: 'СЕК'    },
  ]

  return (
    <div className={styles.card}>

      {/* ── Track SVG as background ── */}
      {race.trackSvg && (
        <div className={styles.trackBg}>
          <TrackSVG
            src={race.trackSvg}
            color="white"
            strokeWidth={2}
            animated={false}
            preserveAspectRatio="xMidYMid meet"
            className={styles.trackBgSvg}
          />
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.round}>РАУНД {String(race.round).padStart(2, '0')}</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.date}>{formattedDate}</span>
        </div>
        <div className={styles.titleRow}>
          <span className={styles.flag}>{race.flag}</span>
          <h2 className={styles.raceName}>{gpLabel}</h2>
        </div>
        <span className={styles.circuit}>{race.circuit}</span>
      </div>

      <div className={styles.divider} />

      {/* ── Race Day ── */}
      {isRaceDay ? (
        <div className={styles.raceDayWrap}>
          <div className={styles.startLights}>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`${styles.startLight} ${lightsOn ? styles.startLightOn : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
          <div className={styles.raceDayText}>RACE DAY</div>
          <div className={styles.raceDayTime}>
            {String(hours).padStart(2, '0')}:
            {String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </div>
        </div>
      ) : (
        /* ── Countdown ── */
        <div className={styles.countdown}>
          {countdownUnits.map(({ value, label }, i) => (
            <div key={label} className={styles.countdownUnit}>
              {i > 0 && <span className={styles.colon}>:</span>}
              <div className={styles.countdownDots}>
                {getDots(value, label)}
              </div>
              <span className={styles.countdownValue}>
                {String(value).padStart(2, '0')}
              </span>
              <span className={styles.countdownLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default NextRaceCard
