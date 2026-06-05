import React from 'react'
import styles from './WatchlistHero.module.css'
import type { WatchlistItem } from '../../../types'

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780'
const TMDB_POSTER   = 'https://image.tmdb.org/t/p/w342'

/**
 * WatchlistHero
 * -------------
 * "Дивлюсь зараз" horizontal scroll strip with large poster cards.
 * Two cards visible at once, third peeks from the edge.
 *
 * Props:
 * @prop {WatchlistItem[]}                    items — watching items
 * @prop {(item: WatchlistItem) => void}      onTap — open detail modal
 */
interface WatchlistHeroProps {
  items: WatchlistItem[]
  onTap: (item: WatchlistItem) => void
}

const WatchlistHero: React.FC<WatchlistHeroProps> = ({ items, onTap }) => {
  if (!items.length) return null

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>ДИВЛЮСЬ ЗАРАЗ</p>
      <div className={styles.scrollRow}>
        {items.map((item) => {
          const heroSrc = item.category === 'book'
            ? item.thumbnail ?? null
            : item.backdropPath
              ? `${TMDB_BACKDROP}${item.backdropPath}`
              : item.posterPath
                ? `${TMDB_POSTER}${item.posterPath}`
                : item.thumbnail ?? null

          return (
            <div
              key={item.id}
              className={styles.heroCard}
              onClick={() => onTap(item)}
            >
              {heroSrc
                ? <img src={heroSrc} alt={item.title} className={styles.heroPoster} loading="lazy" />
                : <div className={styles.heroPosterFallback} />
              }
              <div className={styles.heroGradient} />
              <span className={styles.heroTitle}>{item.title}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WatchlistHero
