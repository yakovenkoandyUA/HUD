import React from 'react'
import styles from './GameHero.module.css'
import type { GameItem } from '../../../types'

/**
 * GameHero
 * --------
 * "Граю зараз" horizontal hero strip — shown when playing games exist.
 * Two cards visible at once, third peeks from the right edge.
 * Uses backgroundUrl (wide screenshot) for atmosphere + coverUrl portrait overlay.
 *
 * Props:
 * @prop {GameItem[]}                        items   — games with status 'playing'
 * @prop {(item: GameItem) => void}          onTap   — open detail sheet
 * @prop {(id: string) => void}              onAddHour — quick +1h without opening detail
 */
interface GameHeroProps {
  items: GameItem[]
  onTap: (item: GameItem) => void
  onAddHour: (id: string) => void
}

const GameHero: React.FC<GameHeroProps> = ({ items, onTap, onAddHour }) => {
  if (!items.length) return null

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>ГРАЮ ЗАРАЗ</p>
      <div className={styles.scrollRow}>
        {items.map(item => (
          <div key={item.id} className={styles.card} onClick={() => onTap(item)}>
            {item.backgroundUrl ? (
              <img src={item.backgroundUrl} alt={item.title} className={styles.bg} loading="lazy" />
            ) : (
              <div className={styles.bgFallback} />
            )}
            <div className={styles.gradient} />

            {item.coverUrl && (
              <div className={styles.cover}>
                <img src={item.coverUrl} alt={item.title} className={styles.coverImg} />
              </div>
            )}

            <div className={styles.info}>
              <p className={styles.title}>{item.title}</p>
              <div className={styles.meta}>
                <span className={styles.dot} />
                <span className={styles.playing}>Граю</span>
                {item.hoursPlayed != null && item.hoursPlayed > 0 && (
                  <span className={styles.hours}>{item.hoursPlayed} год</span>
                )}
              </div>
            </div>

            <button
              type="button"
              className={styles.addHourBtn}
              onClick={e => { e.stopPropagation(); onAddHour(item.id) }}
              title="+1 година"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>1г</span>
            </button>

            <div className={styles.bar} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameHero
