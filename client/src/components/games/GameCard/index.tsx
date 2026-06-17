import React from 'react'
import styles from './GameCard.module.css'
import type { GameItem } from '../../../types'

const STATUS_LABEL: Record<string, string> = {
  announced: 'АНОНС',
  want:      'ХОЧУ',
  playing:   'ГРАЮ',
  completed: 'ПРОЙДЕНО',
  dropped:   'КИНУВ',
}

const STATUS_CLASS: Record<string, string> = {
  announced: styles.statusAnnounced,
  want:      styles.statusWant,
  playing:   styles.statusPlaying,
  completed: styles.statusCompleted,
  dropped:   styles.statusDropped,
}

const PS_PLATFORMS = new Set(['PS5', 'PS4'])

/**
 * GameCard
 * --------
 * Cover card in the 2-column games grid.
 *
 * Props:
 * @prop {GameItem}   item    — game to display
 * @prop {() => void} onClick — open detail sheet
 */
interface GameCardProps {
  item: GameItem
  onClick: () => void
}

const GameCard: React.FC<GameCardProps> = ({ item, onClick }) => {
  const isPS = item.platforms.some(p => PS_PLATFORMS.has(p))

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cover}>
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className={styles.img} loading="lazy" />
        ) : (
          <div className={styles.noImg}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="5"/>
              <path d="M6 12h4M8 10v4"/>
              <circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none"/>
              <circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </div>
        )}

        <span className={`${styles.statusBadge} ${STATUS_CLASS[item.status] ?? ''}`}>
          {STATUS_LABEL[item.status]}
        </span>

        {item.platinum && isPS && (
          <div className={styles.platinumBadge} title="Platinum">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8L8 1z" fill="currentColor"/>
            </svg>
          </div>
        )}

        {item.status === 'playing' && <div className={styles.playingBar} />}
      </div>

      <div className={styles.info}>
        <p className={styles.title}>{item.title}</p>
        <div className={styles.meta}>
          {item.releaseDate && (
            <span className={styles.year}>{item.releaseDate.slice(0, 4)}</span>
          )}
          {item.status === 'completed' && item.rating != null && item.rating > 0 && (
            <span className={styles.ratingTag}>★ {item.rating}</span>
          )}
        </div>
      </div>
    </button>
  )
}

export default GameCard
