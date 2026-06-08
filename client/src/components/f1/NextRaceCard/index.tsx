import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './NextRaceCard.module.css'

/**
 * NextRaceCard
 * ------------
 * Hero-картка наступного Гран Прі на екрані F1.
 * Показує: назва GP, F1 racing lights відлік, трек як watermark.
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

function isRaceDay(date: string): boolean {
  return new Date(date + 'T14:00:00Z').getTime() <= Date.now()
}

function formatRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }).toUpperCase()
}

type LightColor = 'red' | 'orange' | 'yellow' | 'green'

const LIGHT_CLASS: Record<LightColor, string> = {
  red:    styles.lightRed,
  orange: styles.lightOrange,
  yellow: styles.lightYellow,
  green:  styles.lightGreen,
}

const SEGMENTS: Array<{ key: keyof Cd; label: string; color: LightColor }> = [
  { key: 'd', label: 'ДНІВ',   color: 'red' },
  { key: 'h', label: 'ГОДИН',  color: 'orange' },
  { key: 'm', label: 'ХВИЛИН', color: 'yellow' },
  { key: 's', label: 'СЕК',    color: 'green' },
]

const NextRaceCard: React.FC<NextRaceCardProps> = ({ race }) => {
  const [cd, setCd]           = useState<Cd>(() => getCountdown(race.date))
  const [raceDay, setRaceDay] = useState(() => isRaceDay(race.date))

  useEffect(() => {
    const id = setInterval(() => {
      setCd(getCountdown(race.date))
      setRaceDay(isRaceDay(race.date))
    }, 1000)
    return () => clearInterval(id)
  }, [race.date])

  const gpLabel = race.name.replace(' GP', '').replace(' Grand Prix', '').toUpperCase()

  return (
    <div className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.header}>
        {race.trackSvg && (
          <div className={styles.trackBg}>
            <img
              src={race.trackSvg}
              alt=""
              className={styles.trackBgImg}
              aria-hidden="true"
            />
          </div>
        )}
        <div className={styles.headerLeft}>
          <span className={styles.roundTag}>РАУНД {String(race.round).padStart(2, '0')}</span>
          <div className={styles.titleRow}>
            <span className={styles.flag}>{race.flag}</span>
            <h2 className={styles.raceName}>{gpLabel}</h2>
          </div>
          <span className={styles.circuit}>{race.circuit}</span>
        </div>
        <div className={styles.datePill}>{formatRaceDate(race.date)}</div>
      </div>

      {/* ── Countdown ── */}
      <div className={styles.countdown}>
        {raceDay ? (
          <div className={styles.raceDay}>
            <span className={styles.raceDayText}>RACE DAY!</span>
            <span className={styles.raceDayFlag}>🏁</span>
          </div>
        ) : (
          SEGMENTS.map((seg, i) => (
            <React.Fragment key={seg.key}>
              {i > 0 && <span className={styles.sep}>:</span>}
              <div className={styles.segment}>
                <div className={styles.lights}>
                  {Array.from({ length: 3 }, (_, j) => (
                    <div key={j} className={`${styles.light} ${LIGHT_CLASS[seg.color]}`} />
                  ))}
                </div>
                <span className={styles.segNum}>{String(cd[seg.key]).padStart(2, '0')}</span>
                <span className={styles.segLabel}>{seg.label}</span>
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  )
}

export default NextRaceCard
