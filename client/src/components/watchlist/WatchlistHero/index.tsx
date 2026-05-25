import React from 'react'
import styles from './WatchlistHero.module.css'
import type { WatchlistItem } from '../../../types'

/**
 * WatchlistHero
 * -------------
 * Compact horizontal card(s) for "Дивлюсь зараз" items.
 * Each card shows a small poster + label/title/year.
 *
 * Props:
 * @prop {WatchlistItem[]} items    — items with status "watching"
 * @prop {(item: WatchlistItem) => void} onTap — open detail modal
 */
interface WatchlistHeroProps {
  items: WatchlistItem[]
  onTap: (item: WatchlistItem) => void
}

const CATEGORY_ICON: Record<string, string> = {
  movie: '🎬', series: '📺', anime: '🎌', book: '📚',
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92'

const WatchlistHero: React.FC<WatchlistHeroProps> = ({ items, onTap }) => {
  if (!items.length) return null

  return (
    <div className={styles.wrap}>
      {items.map((item) => {
        const imgSrc = item.category === 'book'
          ? item.thumbnail ?? null
          : item.posterPath
            ? `${TMDB_IMG}${item.posterPath}`
            : null

        return (
          <button
            key={item.id}
            type="button"
            className={styles.card}
            onClick={() => onTap(item)}
          >
            <div className={styles.poster}>
              {imgSrc ? (
                <img src={imgSrc} alt={item.title} className={styles.posterImg} loading="lazy" />
              ) : (
                <div className={styles.posterFallback}>
                  <span>{CATEGORY_ICON[item.category]}</span>
                </div>
              )}
            </div>
            <div className={styles.info}>
              <span className={styles.label}>Дивлюсь зараз</span>
              <p className={styles.title}>{item.title}</p>
              {item.year && <span className={styles.year}>{item.year}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default WatchlistHero
