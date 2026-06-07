import React from 'react'
import { useSeriesEpisodes } from '../../../hooks/useSeriesEpisodes'
import styles from './EpisodesList.module.css'

/**
 * EpisodesList
 * ------------
 * Interactive episode list with tap-to-toggle watched tracking.
 * Season 0 (Specials/OVA) is automatically filtered out.
 * Progress bar and "mark as watched" hint shown in 'watching' status.
 *
 * Props:
 * @prop {number}   tmdbId           — TMDB series ID
 * @prop {number[]} seasons          — available season numbers (built from totalSeasons)
 * @prop {{ season: number; episode: number }[]} watchedEpisodes — watched state
 * @prop {(s: number, e: number) => void} onToggleEpisode — toggle watched for one episode
 * @prop {string}   status           — WatchlistStatus ('watching' shows progress)
 * @prop {number}   [initialSeason]  — season to show first (default: first valid season)
 * @prop {() => void} [onMarkWatched] — called when user taps "mark as watched" hint
 */
interface EpisodesListProps {
  tmdbId: number
  seasons: number[]
  watchedEpisodes: { season: number; episode: number }[]
  onToggleEpisode: (season: number, episode: number) => void
  status: string
  initialSeason?: number
  onMarkWatched?: () => void
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
  return `${Math.ceil(days / 30)} міс`
}

const EpisodesList: React.FC<EpisodesListProps> = ({
  tmdbId, seasons, watchedEpisodes, onToggleEpisode, status, initialSeason, onMarkWatched,
}) => {
  // Season 0 on TMDB = Specials/OVA — filter to keep only main seasons
  const validSeasons = seasons.filter(s => s > 0)
  const seasonsToShow = validSeasons.length > 0 ? validSeasons : [1]

  const maxSeason = seasonsToShow[seasonsToShow.length - 1] ?? 1
  const defaultSeason = initialSeason && initialSeason > 0 && initialSeason <= maxSeason
    ? initialSeason
    : seasonsToShow[0] ?? 1

  const { activeSeason, setActiveSeason, episodes, loading, error } =
    useSeriesEpisodes(tmdbId, defaultSeason)

  const isWatched = (s: number, e: number) =>
    watchedEpisodes.some(w => w.season === s && w.episode === e)

  const airedEpisodes = episodes.filter(
    ep => ep.air_date && new Date(ep.air_date) <= new Date()
  )
  const watchedInSeason = watchedEpisodes.filter(w => w.season === activeSeason).length
  const allWatched = airedEpisodes.length > 0 && watchedInSeason === airedEpisodes.length

  return (
    <div className={styles.wrap}>
      {/* Season picker — only when more than one season */}
      {seasonsToShow.length > 1 && (
        <div className={styles.seasonRow}>
          <span className={styles.seasonLabel}>СЕЗОН</span>
          <div className={styles.seasonBtns}>
            {seasonsToShow.map(s => (
              <button
                key={s}
                type="button"
                className={`${styles.seasonBtn} ${activeSeason === s ? styles.seasonActive : ''}`}
                onClick={() => setActiveSeason(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar — only in 'watching' status */}
      {status === 'watching' && airedEpisodes.length > 0 && (
        <div className={styles.progressRow}>
          <span className={styles.progressText}>
            {watchedInSeason} / {airedEpisodes.length} серій
          </span>
          <div className={styles.progressBarWrap}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${Math.min((watchedInSeason / airedEpisodes.length) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed hint */}
      {status === 'watching' && allWatched && onMarkWatched && (
        <div className={styles.completedHint}>
          <span className={styles.completedText}>Всі серії переглянуто!</span>
          <button type="button" className={styles.completedBtn} onClick={onMarkWatched}>
            Позначити як Переглянув
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.skeleton}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonRow} />)}
        </div>
      )}

      {error && !loading && (
        <p className={styles.errorMsg}>Не вдалося завантажити епізоди</p>
      )}

      {!loading && !error && (
        <div className={styles.list}>
          {episodes.map(ep => {
            const days = ep.air_date ? daysUntil(ep.air_date) : null
            const aired = days !== null ? days <= 0 : false
            const watched = isWatched(activeSeason, ep.episode_number)
            const canInteract = status === 'watching'

            return (
              <button
                key={ep.episode_number}
                type="button"
                className={`${styles.episode} ${canInteract && watched ? styles.episodeWatched : ''} ${!aired ? styles.episodeFuture : ''}`}
                onClick={() => { if (canInteract && aired) onToggleEpisode(activeSeason, ep.episode_number) }}
                style={{ cursor: canInteract && aired ? 'pointer' : 'default' }}
              >
                {canInteract && (
                  <div className={`${styles.epCheck} ${watched ? styles.epCheckDone : ''}`}>
                    {watched && (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                    )}
                  </div>
                )}
                <span className={styles.epNum}>{ep.episode_number}</span>
                <span className={styles.epTitle}>{ep.name || `Епізод ${ep.episode_number}`}</span>
                {!aired && days !== null && days > 0 && (
                  <span className={styles.epDate}>{relativeLabel(days)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EpisodesList
