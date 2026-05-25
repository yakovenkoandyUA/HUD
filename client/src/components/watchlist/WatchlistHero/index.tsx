import React from 'react'
import styles from './WatchlistHero.module.css'
import type { WatchlistItem } from '../../../types'

/**
 * WatchlistHero
 * -------------
 * Horizontal scroll strip showing "Дивлюсь зараз" items
 * with wide backdrop images.
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

const WatchlistHero: React.FC<WatchlistHeroProps> = ({ items, onTap }) => {
  if (!items.length) return null

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Дивлюсь зараз</p>
      <div className={styles.strip}>
        {items.map((item) => {
          const backdropSrc = item.backdropPath
            ? `https://image.tmdb.org/t/p/w500${item.backdropPath}`
            : item.thumbnail ?? null

          return (
            <button
              key={item.id}
              type="button"
              className={styles.card}
              onClick={() => onTap(item)}
            >
              <div className={styles.imgWrap}>
                {backdropSrc ? (
                  <img src={backdropSrc} alt={item.title} className={styles.img} loading="lazy" />
                ) : (
                  <div className={styles.noImg}>
                    <span>{CATEGORY_ICON[item.category]}</span>
                  </div>
                )}
                <div className={styles.overlay} />
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>{item.title}</p>
                {/* {item.year && <span className={styles.cardYear}>{item.year}</span>} */}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WatchlistHero
