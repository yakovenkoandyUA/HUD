import React, { useState } from 'react'
import type { DriverStats } from '../../../hooks/useDriverStats'
import type { DriverRaceResult } from '../../../hooks/useDriverRaceResults'
import styles from './DriverSeasonSummary.module.css'

/**
 * DriverSeasonSummary
 * --------------------
 * "Продуктивність сезону" — кільце з очками пілота (CSS conic-gradient,
 * заповнення відносно лідера чемпіонату) + горизонтальні бари
 * перемог/подіумів/поулів/найшв. кіл/DNF відносно кількості пройдених гонок.
 * "Повна статистика" розгортає додаткові похідні показники з результатів гонок.
 *
 * Props:
 * @prop {number}             points         — очки пілота
 * @prop {number}             maxPoints      — очки лідера чемпіонату (для кільця)
 * @prop {number}             position       — місце в заліку
 * @prop {DriverStats | null} stats          — сезонна статистика
 * @prop {DriverRaceResult[]} results        — гонки сезону (для розгорнутих показників)
 * @prop {number}             racesCompleted — кількість пройдених гонок (для нормалізації барів)
 * @prop {string}             teamColor      — колір команди (CSS custom prop)
 */

interface Props {
  points:         number
  maxPoints:      number
  position:       number
  stats:          DriverStats | null
  results:        DriverRaceResult[]
  racesCompleted: number
  teamColor:      string
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.barValue}>{value}</span>
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

const DriverSeasonSummary: React.FC<Props> = ({ points, maxPoints, position, stats, results, racesCompleted, teamColor }) => {
  const [expanded, setExpanded] = useState(false)
  const ringPct = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0

  const finished = results.filter(r => r.finishPosition != null)
  const avgFinish = finished.length > 0
    ? (finished.reduce((sum, r) => sum + (r.finishPosition ?? 0), 0) / finished.length).toFixed(1)
    : '—'
  const bestFinish = finished.length > 0
    ? Math.min(...finished.map(r => r.finishPosition ?? 99))
    : '—'
  const avgPoints = results.length > 0 ? (points / results.length).toFixed(1) : '—'

  return (
    <div className={styles.card} style={{ '--team-color': teamColor } as React.CSSProperties}>
      <span className={styles.title}>ПРОДУКТИВНІСТЬ СЕЗОНУ</span>

      <div className={styles.body}>
        <div className={styles.ringWrap}>
          <div className={styles.ring} style={{ '--pct': ringPct } as React.CSSProperties}>
            <div className={styles.ringInner}>
              <span className={styles.ringValue}>{points}</span>
              <span className={styles.ringLabel}>PTS</span>
            </div>
          </div>
          <span className={styles.posLabel}>{position} МІСЦЕ</span>
        </div>

        <div className={styles.bars}>
          <Bar label="Перемоги"       value={stats?.wins ?? 0}        max={racesCompleted} />
          <Bar label="Подіуми"        value={stats?.podiums ?? 0}     max={racesCompleted} />
          <Bar label="Пол-позиції"    value={stats?.poles ?? 0}       max={racesCompleted} />
          <Bar label="Найшв. кола"    value={stats?.fastestLaps ?? 0} max={racesCompleted} />
          <Bar label="DNF"            value={stats?.dnf ?? 0}         max={racesCompleted} />
        </div>
      </div>

      <div className={`${styles.extra} ${expanded ? styles.extraOpen : ''}`}>
        <div className={styles.extraGrid}>
          <div className={styles.extraCell}>
            <span className={styles.extraValue}>{racesCompleted}</span>
            <span className={styles.extraLabel}>Пройдено гонок</span>
          </div>
          <div className={styles.extraCell}>
            <span className={styles.extraValue}>{avgFinish}</span>
            <span className={styles.extraLabel}>Середня позиція</span>
          </div>
          <div className={styles.extraCell}>
            <span className={styles.extraValue}>{bestFinish}</span>
            <span className={styles.extraLabel}>Найкращий результат</span>
          </div>
          <div className={styles.extraCell}>
            <span className={styles.extraValue}>{avgPoints}</span>
            <span className={styles.extraLabel}>Очок за гонку</span>
          </div>
        </div>
      </div>

      <button className={styles.moreBtn} onClick={() => setExpanded(e => !e)}>
        <span className={styles.moreBtnIcon}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        ПОВНА СТАТИСТИКА
        <ChevronIcon open={expanded} />
      </button>
    </div>
  )
}

export default DriverSeasonSummary
