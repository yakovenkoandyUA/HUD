import React from 'react'
import WatchlistCard from '../WatchlistCard'
import styles from './WatchlistGrid.module.css'
import type { WatchlistItem } from '../../../types'

/**
 * WatchlistGrid
 * -------------
 * 2-column poster grid for a single category tab.
 *
 * Props:
 * @prop {WatchlistItem[]} items   — filtered items for the active category
 * @prop {(item: WatchlistItem) => void} onTap — open detail modal
 */
interface WatchlistGridProps {
  items: WatchlistItem[]
  onTap: (item: WatchlistItem) => void
}

const WatchlistGrid: React.FC<WatchlistGridProps> = ({ items, onTap }) => {
  if (!items.length) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🎬</span>
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
