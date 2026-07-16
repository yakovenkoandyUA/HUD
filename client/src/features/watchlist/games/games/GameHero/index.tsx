import React from 'react'
import styles from './GameHero.module.css'
import type { GameItem } from '@/shared/types'

const PLATFORM_SHORT: Record<string, string> = {
  'PC':               'PC',
  'PS5':              'PS5',
  'PS4':              'PS4',
  'Xbox':             'XBX',
  'Xbox Series X':    'XBX',
  'Xbox One':         'XBX',
  'Nintendo Switch':  'NSW',
  'Switch':           'NSW',
  'Mobile':           'MOB',
  'iOS':              'iOS',
  'Android':          'AND',
  'Mac':              'MAC',
}

/**
 * GameHero
 * --------
 * "Граю зараз" large card strip — one full-width card per playing game.
 * Background screenshot fills card; title, platforms and hours at bottom.
 *
 * Props:
 * @prop {GameItem[]}                   items  — games with status 'playing'
 * @prop {(item: GameItem) => void}     onTap  — open detail sheet
 */
interface GameHeroProps {
  items: GameItem[]
  onTap: (item: GameItem) => void
}

const GameHero: React.FC<GameHeroProps> = ({ items, onTap }) => {
  if (!items.length) return null

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>ГРАЮ ЗАРАЗ</p>
      <div className={styles.scrollRow}>
        {items.map(item => {
          const src = item.backgroundUrl ?? item.coverUrl ?? null
          const platform = item.currentPlatform
            ?? (item.platforms.length === 1 ? item.platforms[0] : null)
          const platformShort = platform ? (PLATFORM_SHORT[platform] ?? platform.slice(0, 3).toUpperCase()) : null
          return (
            <div key={item.id} className={styles.card} onClick={() => onTap(item)}>
              {src
                ? <img src={src} alt={item.title} className={styles.bg} loading="lazy" />
                : <div className={styles.bgFallback} />
              }
              <div className={styles.gradient} />
              <div className={styles.footer}>
                <span className={styles.title}>{item.title}</span>
                {(item.hoursPlayed != null && item.hoursPlayed > 0 || platformShort) && (
                  <div className={styles.meta}>
                    {item.hoursPlayed != null && item.hoursPlayed > 0 && (
                      <span className={styles.hours}>{item.hoursPlayed} год</span>
                    )}
                    {item.hoursPlayed != null && item.hoursPlayed > 0 && platformShort && (
                      <span className={styles.sep}>·</span>
                    )}
                    {platformShort && (
                      <span className={styles.platform}>{platformShort}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GameHero
