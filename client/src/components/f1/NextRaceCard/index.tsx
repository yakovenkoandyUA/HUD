import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import styles from './NextRaceCard.module.css'

/**
 * NextRaceCard
 * ------------
 * Hero-картка наступного Гран Прі на екрані F1.
 * Три стани: нормальний countdown (дні > 0), race week (день гонки, > 2г),
 * race day (< 2г до старту) — мигаючі F1 start lights + живий таймер.
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

const LIGHT_CLASS: Record<LightColor, string> = {
  red:    styles.lightRed,
  orange: styles.lightOrange,
  yellow: styles.lightYellow,
  green:  styles.lightGreen,
}

const NextRaceCard: React.FC<NextRaceCardProps> = ({ race }) => {
  const [cd, setCd]           = useState<Cd>(() => getCountdown(race.date))
  const [lightsOn, setLightsOn] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown(race.date)), 1000)
    return () => clearInterval(id)
  }, [race.date])

  const { d: days, h: hours, m: minutes, s: seconds } = cd

  const isRaceDay  = days === 0 && hours < 2
  const isRaceWeek = days === 0 && hours >= 2
  const isNormal   = days > 0

  useEffect(() => {
    if (!isRaceDay) return
    const id = setInterval(() => setLightsOn(v => !v), 500)
    return () => clearInterval(id)
  }, [isRaceDay])

  const gpLabel = race.name.replace(' GP', '').replace(' Grand Prix', '').toUpperCase()

  const normalSegments = [
    { key: 'd' as keyof Cd, value: days,    label: 'ДНІВ',   color: 'red'    as LightColor },
    { key: 'h' as keyof Cd, value: hours,   label: 'ГОДИН',  color: 'orange' as LightColor },
    { key: 'm' as keyof Cd, value: minutes, label: 'ХВИЛИН', color: 'yellow' as LightColor },
    { key: 's' as keyof Cd, value: seconds, label: 'СЕК',    color: 'green'  as LightColor },
  ]

  const weekSegments = [
    { value: hours,   label: 'ГОДИН',  color: 'orange' as LightColor },
    { value: minutes, label: 'ХВИЛИН', color: 'yellow' as LightColor },
    { value: seconds, label: 'СЕК',    color: 'green'  as LightColor },
  ]

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

      {/* ── Normal countdown (days > 0) ── */}
      {isNormal && (
        <div className={styles.countdown}>
          {normalSegments.map((seg, i) => (
            <React.Fragment key={seg.label}>
              {i > 0 && <span className={styles.sep}>:</span>}
              <div className={styles.segment}>
                <div className={styles.lights}>
                  {Array.from({ length: 3 }, (_, j) => (
                    <div key={j} className={`${styles.light} ${LIGHT_CLASS[seg.color]}`} />
                  ))}
                </div>
                <span className={styles.segNum}>{String(seg.value).padStart(2, '0')}</span>
                <span className={styles.segLabel}>{seg.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Race week (day of race, > 2h) ── */}
      {isRaceWeek && (
        <div className={styles.countdown}>
          {weekSegments.map((seg, i) => (
            <React.Fragment key={seg.label}>
              {i > 0 && <span className={styles.sep}>:</span>}
              <div className={styles.segment}>
                <div className={styles.lights}>
                  {Array.from({ length: 3 }, (_, j) => (
                    <div key={j} className={`${styles.light} ${LIGHT_CLASS[seg.color]}`} />
                  ))}
                </div>
                <span className={styles.segNum}>{String(seg.value).padStart(2, '0')}</span>
                <span className={styles.segLabel}>{seg.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Race day (< 2h) ── */}
      {isRaceDay && (
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
      )}
    </div>
  )
}

export default NextRaceCard
