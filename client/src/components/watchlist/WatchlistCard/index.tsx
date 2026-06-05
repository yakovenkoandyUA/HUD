import React from 'react'
import styles from './WatchlistCard.module.css'
import type { WatchlistItem } from '../../../types'

/**
 * WatchlistCard
 * -------------
 * Poster card in the 2-column watchlist grid.
 *
 * Props:
 * @prop {WatchlistItem}  item    — item to display
 * @prop {() => void}     onClick — open detail modal
 */
interface WatchlistCardProps {
  item: WatchlistItem
  onClick: () => void
}

const CATEGORY_ICON: Record<string, string> = {
  movie: '🎬',
  series: '📺',
  anime: '🎌',
  book: '📚',
}

const STATUS_LABEL: Record<string, string> = {
  want:     'ХОЧУ',
  watching: 'ДИВЛЮСЬ',
  watched:  'ГЛЯНУВ',
  dropped:  'КИНУВ',
}

const STATUS_LABEL_BOOK: Record<string, string> = {
  want:     'ХОЧУ',
  watching: 'ЧИТАЮ',
  watched:  'ПРОЧИТАВ',
  dropped:  'КИНУВ',
}

const STATUS_CLASS: Record<string, string> = {
  want:     styles.statusWant,
  watching: styles.statusWatching,
  watched:  styles.statusWatched,
  dropped:  styles.statusDropped,
}

const getStatusLabel = (item: WatchlistItem) =>
  (item.category === 'book' ? STATUS_LABEL_BOOK : STATUS_LABEL)[item.status] ?? null

const WatchlistCard: React.FC<WatchlistCardProps> = ({ item, onClick }) => {
  const imgSrc = item.category === 'book'
    ? item.thumbnail ?? null
    : item.posterPath
      ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
      : null

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.poster}>
        {imgSrc ? (
          <img src={imgSrc} alt={item.title} className={styles.img} loading="lazy" />
        ) : (
          <div className={styles.noImg}>
            <span>{CATEGORY_ICON[item.category]}</span>
          </div>
        )}

        {getStatusLabel(item) && (
          <span className={`${styles.statusBadge} ${STATUS_CLASS[item.status] ?? ''}`}>
            {getStatusLabel(item)}
          </span>
        )}

        {item.status === 'watching' && <div className={styles.watchingBar} />}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{item.title}</p>
        {item.year && <span className={styles.year}>{item.year}</span>}
        {(item.category === 'series' || item.category === 'anime') &&
          item.currentSeason != null && item.currentEpisode != null && (
          <span className={styles.episodeTag}>S{item.currentSeason} E{item.currentEpisode}</span>
        )}
        {item.status === 'watched' && item.rating != null && item.rating > 0 && (
          <span className={styles.ratingTag}>★ {item.rating}</span>
        )}
      </div>
    </button>
  )
}

export default WatchlistCard
