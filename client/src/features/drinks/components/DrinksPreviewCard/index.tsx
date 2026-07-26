import React, { useEffect } from 'react'
import { useDrinksStore } from '../../store/drinksStore'
import styles from './DrinksPreviewCard.module.css'

interface Props {
  onClick: () => void
}

/**
 * DrinksPreviewCard — мінімалістичний dashboard-блок для колекції алкоголю.
 */
const DrinksPreviewCard: React.FC<Props> = ({ onClick }) => {
  const { drinks, fetchDrinks } = useDrinksStore()

  useEffect(() => {
    if (drinks.length === 0) fetchDrinks()
  }, [drinks.length, fetchDrinks])

  const have     = drinks.filter(d => d.status === 'have').length
  const wishlist = drinks.filter(d => d.status === 'wishlist').length
  const finished = drinks.filter(d => d.status === 'finished').length
  const total    = drinks.length

  const lastAdded = drinks[0]

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.left}>
        <div className={styles.iconWrap}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2h8l1 6H7L8 2z" />
            <path d="M7 8c0 8 2 12 5 12s5-4 5-12" />
            <path d="M9 14s1 1 3 1 3-1 3-1" />
          </svg>
        </div>
        <div className={styles.meta}>
          {total === 0 ? (
            <span className={styles.empty}>Порожня колекція</span>
          ) : (
            <span className={styles.last}>{lastAdded?.name}</span>
          )}
          <span className={styles.sub}>
            {total === 0 ? 'Додай першу пляшку' : `${total} ${total === 1 ? 'напій' : total < 5 ? 'напої' : 'напоїв'}`}
          </span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{have}</span>
          <span className={styles.statLabel}>вдома</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{wishlist}</span>
          <span className={styles.statLabel}>хочу</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{finished}</span>
          <span className={styles.statLabel}>скуштовано</span>
        </div>
      </div>
    </button>
  )
}

export default DrinksPreviewCard
