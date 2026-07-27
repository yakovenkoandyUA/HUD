import React from 'react'
import type { Drink } from '../../types'
import { DRINK_TYPE_LABELS } from '../../types'
import styles from './DrinkCard.module.css'

interface Props {
  /** Drink to display */
  drink: Drink
  onClick: () => void
}

const STATUS_DOT: Record<Drink['status'], string> = {
  wishlist: styles.dotWishlist,
  have:     styles.dotHave,
  finished: styles.dotFinished,
}

/**
 * DrinkCard — compact grid card for a drink in the collection.
 */
const DrinkCard: React.FC<Props> = ({ drink, onClick }) => {
  return (
    <button className={styles.card} onClick={onClick}>
      {drink.photo ? (
        <img src={drink.photo} alt={drink.name} className={styles.photo} />
      ) : (
        <div className={styles.photoPlaceholder}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2h8l1 6H7L8 2z" />
            <path d="M7 8c0 8 2 12 5 12s5-4 5-12" />
            <path d="M9 8v4" />
            <path d="M15 8v4" />
          </svg>
        </div>
      )}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={`${styles.dot} ${STATUS_DOT[drink.status]}`} />
          <span className={styles.name}>{drink.name}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.type}>{DRINK_TYPE_LABELS[drink.type]}</span>
          {drink.ratings.length > 0 && (
            <span className={styles.rating}>
              {Math.round(drink.ratings.reduce((s, r) => s + r.score, 0) / drink.ratings.length * 10) / 10}/10
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default DrinkCard
