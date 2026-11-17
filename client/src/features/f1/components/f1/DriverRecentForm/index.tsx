import { Link } from 'react-router-dom'
import { F1_SEASON_2026 } from '../../../data/f1Season2026'
import type { DriverRaceResult } from '../../../hooks/useDriverRaceResults'
import styles from './DriverRecentForm.module.css'

interface DriverRecentFormProps {
  results: DriverRaceResult[]
  loading: boolean
}

const resultLabels = { dnf: 'Схід', dns: 'Не стартував', dsq: 'Дискваліфікація' }

/** Links the latest five race results in newest-first order. */
function DriverRecentForm({ results, loading }: DriverRecentFormProps) {
  return (
    <section className={styles.section} aria-label="Останні результати">
      <h2 className={styles.title}>Останні результати</h2>
      {loading || results.length === 0 ? (
        <p role="status" className={styles.status}>
          {loading ? 'Завантажуємо результати…' : 'Результати недоступні'}
        </p>
      ) : (
        <ol className={styles.form}>
          {results.slice(0, 5).map(result => {
            const race = F1_SEASON_2026.find(item => result.date ? item.date === result.date : item.round === result.round)
            const position = result.status === 'finished' ? result.finishPosition : null
            const value = result.status === 'finished' ? (position == null ? '—' : `P${position}`) : result.status.toUpperCase()
            const label = result.status === 'finished' ? (position == null ? 'Позиція невідома' : `Місце ${position}`) : resultLabels[result.status]
            const raceName = result.raceName || race?.name || `Етап ${result.round}`
            const content = (
              <>
                <span className={styles.position} data-podium={position != null && position >= 1 && position <= 3 ? position : undefined}>{value}</span>
                <span className={styles.round}>Етап {result.round}</span>
              </>
            )
            return (
              <li key={result.round}>
                {race ? (
                  <Link className={styles.tile} to={`/f1/${race.round}`} aria-label={`${raceName}. ${label}`} title={raceName}>
                    {content}
                  </Link>
                ) : <div className={styles.tile}>{content}</div>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default DriverRecentForm
