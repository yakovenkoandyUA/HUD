import React, { useEffect } from 'react'
import { useDrinksStore } from '../../store/drinksStore'
import { DRINK_TYPE_LABELS } from '../../types'
import styles from './DrinksPreviewCard.module.css'

interface Props {
  /** Navigate to /drinks */
  onClick: () => void
}

/**
 * DrinksPreviewCard — compact dashboard widget showing collection stats.
 */
const DrinksPreviewCard: React.FC<Props> = ({ onClick }) => {
  const { drinks, fetchDrinks } = useDrinksStore()

  useEffect(() => {
    if (drinks.length === 0) fetchDrinks()
  }, [drinks.length, fetchDrinks])

  const have     = drinks.filter(d => d.status === 'have').length
  const wishlist = drinks.filter(d => d.status === 'wishlist').length
  const finished = drinks.filter(d => d.status === 'finished').length

  const recent = drinks.slice(0, 4)

  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{have}</span>
          <span className={styles.statLabel}>вдома</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{wishlist}</span>
          <span className={styles.statLabel}>хочу</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{finished}</span>
          <span className={styles.statLabel}>скуштовано</span>
        </div>
      </div>

      {recent.length > 0 && (
        <div className={styles.recent}>
          {recent.map(d => (
            <div key={d._id} className={styles.bottle}>
              {d.photo ? (
                <img src={d.photo} alt={d.name} className={styles.bottlePhoto} />
              ) : (
                <div className={styles.bottlePlaceholder}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2h8l1 6H7L8 2z" />
                    <path d="M7 8c0 8 2 12 5 12s5-4 5-12" />
                  </svg>
                </div>
              )}
              <span className={styles.bottleName}>{d.name}</span>
              <span className={styles.bottleType}>{DRINK_TYPE_LABELS[d.type]}</span>
            </div>
          ))}
        </div>
      )}

      {drinks.length === 0 && (
        <p className={styles.empty}>Додай першу пляшку до колекції</p>
      )}
    </button>
  )
}

export default DrinksPreviewCard
