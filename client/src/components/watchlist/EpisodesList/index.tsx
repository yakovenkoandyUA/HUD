import React from 'react'
import { useSeriesEpisodes } from '../../../hooks/useSeriesEpisodes'
import styles from './EpisodesList.module.css'

/**
 * EpisodesList
 * ------------
 * Секція епізодів поточного сезону серіалу. Показується тільки для category='series'.
 * Дані беруться з TMDB /tv/{id}/season/{n}, кешуються в localStorage на 24 год.
 *
 * Props:
 * @prop {number} tmdbId  — TMDB ID серіалу
 */
interface EpisodesListProps {
  tmdbId: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function relativeLabel(days: number): string {
  if (days === 0) return 'сьогодні'
  if (days === 1) return 'завтра'
  if (days < 30) return `${days} д`
  const months = Math.ceil(days / 30)
  return `${months} міс`
}

const EpisodesList: React.FC<EpisodesListProps> = ({ tmdbId }) => {
  const { totalSeasons, activeSeason, setActiveSeason, episodes, loading, error } =
    useSeriesEpisodes(tmdbId)

  if (!totalSeasons) return null

  return (
    <div className={styles.root}>
      {/* Season picker */}
      <div className={styles.header}>
        <span className={styles.label}>СЕЗОН</span>
        <div className={styles.seasonPicker}>
          {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.seasonBtn} ${n === activeSeason ? styles.seasonActive : ''}`}
              onClick={() => setActiveSeason(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes */}
      {loading && (
        <div className={styles.skeleton}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonRow} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className={styles.errorMsg}>Не вдалося завантажити епізоди</p>
      )}

      {!loading && !error && (
        <div className={styles.list}>
          {episodes.map((ep) => {
            const isFuture = !!ep.air_date && daysUntil(ep.air_date) > 0
            const days = ep.air_date ? daysUntil(ep.air_date) : null

            return (
              <div key={ep.episode_number} className={styles.row}>
                <span className={styles.epNum}>{ep.episode_number}</span>
                <div className={styles.epInfo}>
                  <span className={styles.epName}>{ep.name || `Епізод ${ep.episode_number}`}</span>
                  {ep.air_date && (
                    <span className={`${styles.epDate} ${isFuture ? styles.epFuture : ''}`}>
                      {isFuture && days !== null ? relativeLabel(days) : formatDate(ep.air_date)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EpisodesList
