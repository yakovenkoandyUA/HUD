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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' })
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
          const platformLabels = [...new Set(
            item.platforms.map(p => PLATFORM_SHORT[p] ?? p.slice(0, 3).toUpperCase())
          )].slice(0, 4)
          return (
            <div key={item.id} className={styles.card} onClick={() => onTap(item)}>
              {src
                ? <img src={src} alt={item.title} className={styles.bg} loading="lazy" />
                : <div className={styles.bgFallback} />
              }
              <div className={styles.gradient} />
              <div className={styles.footer}>
                <span className={styles.title}>{item.title}</span>
                <div className={styles.meta}>
                  <span className={styles.dot} />
                  <span className={styles.playing}>Граю</span>
                  {item.hoursPlayed != null && item.hoursPlayed > 0 && (
                    <span className={styles.hours}>{item.hoursPlayed} год</span>
                  )}
                  {item.completedAt && (
                    <span className={styles.completedAt}>✓ {formatDate(item.completedAt)}</span>
                  )}
                  {platformLabels.length > 0 && (
                    <span className={styles.platforms}>{platformLabels.join(' · ')}</span>
                  )}
                </div>
              </div>
              <div className={styles.bar} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GameHero
