import React from 'react'
import WatchlistCard from '../WatchlistCard'
import styles from './WatchlistGrid.module.css'
import type { WatchlistItem } from '@/shared/types'

/**
 * WatchlistGrid
 * -------------
 * 2-column poster grid for a single category tab.
 *
 * Props:
 * @prop {WatchlistItem[]} items   — filtered items for the active category
 * @prop {(item: WatchlistItem) => void} onTap — open detail modal
 * @prop {boolean} hasHero — WatchlistHero is shown above (affects tvScreen vertical position)
 */
interface WatchlistGridProps {
  items: WatchlistItem[]
  onTap: (item: WatchlistItem) => void
  hasHero?: boolean
}

const WatchlistGrid: React.FC<WatchlistGridProps> = ({ items, onTap, hasHero = false }) => {
  if (!items.length) {
    return (
      <div className={styles.empty}>
        <div className={`${styles.tvScreen} ${hasHero ? '' : styles.tvScreenHigh}`} aria-hidden="true" />
        <div className={styles.emptyImgWrap}>
          <img src="/mimir/mimir-empty-watchlist.webp" alt="" className={styles.emptyImg} draggable={false} />
        </div>
        <p className={styles.emptyText}>Список порожній</p>
        <p className={styles.emptyHint}>Знайди щось цікаве через пошук вище</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <WatchlistCard key={item.id} item={item} onClick={() => onTap(item)} />
      ))}
    </div>
  )
}

export default WatchlistGrid
