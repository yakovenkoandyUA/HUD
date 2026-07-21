import React, { useState } from 'react'
import DoodleIllustration from '@/shared/components/ui/DoodleIllustration'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { Memory } from '../../../types/memory'
import styles from './MemoryCard.module.css'

/**
 * MemoryCard
 * ----------
 * Polaroid-style memory card used in Spaces and related memories.
 * Photo zone on top, caption below — warm ivory shell, stacked effect for 5+ photos.
 *
 * Props:
 * @prop {Memory}       memory  — memory data
 * @prop {() => void}   onClick — tap handler
 */
interface MemoryCardProps {
  memory: Memory
  onClick: () => void
}

const MONTHS_UA_SHORT = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatMemoryDate(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS_UA_SHORT[m - 1]} ${y}`
}

const STAR_CONFIGS = [
  { top: '10%', right: '8%',  size: 13, rotate: 12  },
  { top: '16%', right: '22%', size: 8,  rotate: -8  },
  { top: '6%',  right: '32%', size: 10, rotate: 20  },
]

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const [loaded, setLoaded] = useState(false)
  const starIdx = (memory.title.charCodeAt(0) ?? 0) % STAR_CONFIGS.length
  const space = useSpacesStore(s => memory.spaceId ? s.spaces.find(sp => sp.id === memory.spaceId) : undefined)

  const dateLabel = memory.isTrip && memory.dateEnd
    ? (() => {
        const [y1, m1, d1] = memory.date.split('-').map(Number)
        const [y2, m2, d2] = memory.dateEnd.split('-').map(Number)
        const days = Math.round((Date.UTC(y2, m2-1, d2) - Date.UTC(y1, m1-1, d1)) / 86400000) + 1
        return `${formatMemoryDate(memory.date)} · ${days}д`
      })()
    : formatMemoryDate(memory.date)

  return (
    <div
      className={styles.card}
      data-stacked={memory.photos.length >= 5 ? '' : undefined}
      onClick={onClick}
    >
      {/* ── Photo zone ── */}
      <div className={styles.photoZone}>
        {memory.coverUrl ? (
          <>
            {!loaded && <div className={styles.shimmer} />}
            <img
              src={memory.coverUrl}
              alt={memory.title}
              className={`${styles.cover} ${loaded ? styles.coverLoaded : ''}`}
              onLoad={() => setLoaded(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className={styles.coverPlaceholder}>
            <DoodleIllustration variant="memories" size={40} />
          </div>
        )}

        {/* Doodle star */}
        <div
          className={styles.doodleStar}
          style={{
            top: STAR_CONFIGS[starIdx].top,
            right: STAR_CONFIGS[starIdx].right,
            transform: `rotate(${STAR_CONFIGS[starIdx].rotate}deg)`,
          }}
          aria-hidden="true"
        >
          <svg
            width={STAR_CONFIGS[starIdx].size}
            height={STAR_CONFIGS[starIdx].size}
            viewBox="0 0 20 20"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 2 L11.5 8 L18 10 L11.5 12 L10 18 L8.5 12 L2 10 L8.5 8 Z"/>
          </svg>
        </div>

        {/* Space badge */}
        {space && (
          <div className={styles.spaceBadge}>
            <span className={styles.spaceDot} style={{ background: space.color }} />
            <span className={styles.spaceName}>{space.name}</span>
          </div>
        )}

        {/* Photo count */}
        {memory.photos.length > 0 && (
          <div className={styles.photoCount}>
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1.5" y="2.5" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="4.7" cy="5.5" r="1" fill="currentColor" />
              <path d="M2 9.5l3-3 2 2 2.5-3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {memory.photos.length}
          </div>
        )}

        {/* Owner badge */}
        {memory.ownerName && (
          <div className={styles.ownerBadge} title={memory.ownerName}>
            {memory.ownerAvatarUrl
              ? <img src={memory.ownerAvatarUrl} alt={memory.ownerName} className={styles.ownerAvatar} />
              : <span className={styles.ownerInitial}>{memory.ownerName[0]}</span>
            }
          </div>
        )}
      </div>

      {/* ── Polaroid caption ── */}
      <div className={styles.caption}>
        <p className={styles.title}>{memory.title.toUpperCase()}</p>
        <p className={styles.date}>
          {memory.location ? `${memory.location} · ${dateLabel}` : dateLabel}
        </p>
      </div>
    </div>
  )
}

export default MemoryCard
