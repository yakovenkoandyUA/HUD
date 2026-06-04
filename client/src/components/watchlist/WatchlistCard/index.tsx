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

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  want:     { label: 'ХОЧУ',    bg: 'var(--surface2)',    color: 'var(--text3)'    },
  watching: { label: 'ДИВЛЮСЬ', bg: 'var(--second-soft)', color: 'var(--second)'   },
  watched:  { label: 'ГЛЯНУВ',  bg: 'var(--gold-dim)',    color: 'var(--gold)'     },
  dropped:  { label: 'КИНУВ',   bg: 'var(--accent-soft)', color: 'var(--negative)' },
}

const STATUS_BADGE_BOOK: Record<string, { label: string; bg: string; color: string }> = {
  want:     { label: 'ХОЧУ',     bg: 'var(--surface2)',    color: 'var(--text3)'    },
  watching: { label: 'ЧИТАЮ',    bg: 'var(--second-soft)', color: 'var(--second)'   },
  watched:  { label: 'ПРОЧИТАВ', bg: 'var(--gold-dim)',    color: 'var(--gold)'     },
  dropped:  { label: 'КИНУВ',    bg: 'var(--accent-soft)', color: 'var(--negative)' },
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

        {(item.category === 'book' ? STATUS_BADGE_BOOK : STATUS_BADGE)[item.status] && (
          <span
            className={styles.statusBadge}
            style={{
              background: (item.category === 'book' ? STATUS_BADGE_BOOK : STATUS_BADGE)[item.status].bg,
              color:      (item.category === 'book' ? STATUS_BADGE_BOOK : STATUS_BADGE)[item.status].color,
            }}
          >
            {(item.category === 'book' ? STATUS_BADGE_BOOK : STATUS_BADGE)[item.status].label}
          </span>
        )}

        {item.status === 'watching' && <div className={styles.watchingBar} />}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{item.title}</p>
        {item.year && <span className={styles.year}>{item.year}</span>}
        {item.status === 'watched' && item.rating != null && item.rating > 0 && (
          <StarRating value={item.rating} readOnly size="sm" />
        )}
      </div>
    </button>
  )
}

export default WatchlistCard
