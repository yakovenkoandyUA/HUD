import React from 'react'
import type { Plan } from '../../../store/plansStore'
import styles from './PlanCard.module.css'

/**
 * PlanCard
 * --------
 * Card for a single plan in the Plans tab grid.
 * Shows first photo (or pin placeholder), status badge, title, location, date.
 *
 * Props:
 * @prop {Plan}       plan    — plan data
 * @prop {() => void} onClick — tap handler
 */
interface PlanCardProps {
  plan:    Plan
  onClick: () => void
}

const STATUS_CONFIG: Record<Plan['status'], { label: string; cls: string }> = {
  want:    { label: 'ХОЧУ',        cls: styles.badgeWant    },
  planned: { label: 'ЗАПЛАНОВАНО', cls: styles.badgePlanned },
  visited: { label: 'ВІДВІДАЛИ',   cls: styles.badgeVisited },
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onClick }) => {
  const cfg = STATUS_CONFIG[plan.status]

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      {plan.photos[0] ? (
        <img src={plan.photos[0].url} alt={plan.title} className={styles.photo} />
      ) : (
        <div className={styles.photoPlaceholder}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4a6 6 0 0 1 6 6c0 5-6 14-6 14S10 15 10 10a6 6 0 0 1 6-6Z"
              stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="16" cy="10" r="2.5" fill="currentColor"/>
          </svg>
        </div>
      )}

      <div className={styles.content}>
        <span className={`${styles.badge} ${cfg.cls}`}>{cfg.label}</span>
        <h3 className={styles.title}>{plan.title}</h3>

        {plan.location?.name && (
          <p className={styles.location}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 0 1 3-3Z"
                stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            {plan.location.name}
          </p>
        )}

        {plan.plannedDate && (
          <p className={styles.date}>
            {new Date(plan.plannedDate).toLocaleDateString('uk-UA', {
              day: 'numeric', month: 'long',
            })}
          </p>
        )}
      </div>

      {plan.location?.lat && plan.location?.lng && (
        <a
          href={`https://www.google.com/maps?q=${plan.location.lat},${plan.location.lng}`}
          target="_blank"
          rel="noreferrer"
          className={styles.mapsBtn}
          onClick={e => e.stopPropagation()}
          aria-label="Відкрити в Maps"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1a4 4 0 0 1 4 4c0 3-4 8-4 8S3 8 3 5a4 4 0 0 1 4-4Z"
              stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="7" cy="5" r="1.5" fill="currentColor"/>
          </svg>
        </a>
      )}
    </button>
  )
}

export default PlanCard
