import React from 'react'
import StarRating from '../StarRating'
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
  want: 'Хочу',
  watching: 'Дивлюсь',
  watched: 'Переглянув',
  dropped: 'Кинув',
}

const STATUS_CLASS: Record<string, string> = {
  want: 'statusWant',
  watching: 'statusWatching',
  watched: 'statusWatched',
  dropped: 'statusDropped',
}

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

        <span className={styles.catBadge}>{CATEGORY_ICON[item.category]}</span>
        <span className={`${styles.statusBadge} ${styles[STATUS_CLASS[item.status]]}`}>
          {STATUS_LABEL[item.status]}
        </span>

        {item.status === 'watching' && <div className={styles.watchingBar} />}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{item.title}</p>
        {item.year && <span className={styles.year}>{item.year}</span>}
        {item.status === 'watched' && item.rating && (
          <StarRating value={item.rating} readOnly size="sm" />
        )}
      </div>
    </button>
  )
}

export default WatchlistCard
