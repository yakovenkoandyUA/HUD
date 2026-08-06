import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { DriverRaceResult } from '../../../hooks/useDriverRaceResults'
import { F1_SEASON_2026 } from '../../../data/f1Season2026'
import styles from './DriverRecentResults.module.css'

/**
 * DriverRecentResults
 * ---------------------
 * "Останні гонки" — список останніх результатів пілота (найновіші перші),
 * клік по рядку веде на існуючу сторінку гонки /f1/:round.
 *
 * Props:
 * @prop {DriverRaceResult[]} results — гонки поточного сезону (Jolpica)
 * @prop {boolean}            loading
 * @prop {number}             [limit] — скільки показати (default 5)
 */

interface Props {
  results: DriverRaceResult[]
  loading: boolean
  limit?:  number
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' }).toUpperCase()
}

function posClass(pos: number | null): string {
  if (pos === 1) return styles.posGold
  if (pos === 2) return styles.posSilver
  if (pos === 3) return styles.posBronze
  return styles.posOther
}

function Skeleton() {
  return (
    <div className={styles.list}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skRow} />
      ))}
    </div>
  )
}

const DriverRecentResults: React.FC<Props> = ({ results, loading, limit = 5 }) => {
  const navigate = useNavigate()

  if (loading) return <Skeleton />
  if (results.length === 0) return <p className={styles.empty}>Дані відсутні</p>

  const shown = results.slice(0, limit)

  return (
    <div className={styles.list}>
      {shown.map(r => {
        const race = F1_SEASON_2026.find(x => x.round === r.round)
        return (
          <div key={r.round} className={styles.row} onClick={() => navigate(`/f1/${r.round}`)}>
            <span className={styles.flag}>{race?.flag ?? '🏁'}</span>
            <div className={styles.info}>
              <span className={styles.name}>{race?.name ?? r.raceName}</span>
              <span className={styles.circuit}>{race?.circuit ?? r.circuitName}</span>
            </div>
            <span className={styles.date}>{fmtDate(r.date)}</span>
            <span className={`${styles.posBadge} ${posClass(r.finishPosition)}`}>
              {r.status === 'finished' ? (r.finishPosition ?? '—') : r.status.toUpperCase()}
            </span>
            <span className={styles.points}>{r.points}&nbsp;PTS</span>
            <span className={styles.chevron}>›</span>
          </div>
        )
      })}
    </div>
  )
}

export default DriverRecentResults
