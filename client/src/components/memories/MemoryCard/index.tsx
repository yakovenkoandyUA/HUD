import React, { useState } from 'react'
import DoodleIllustration from '../../ui/DoodleIllustration'
import type { Memory } from '../../../types/memory'
import styles from './MemoryCard.module.css'

/**
 * MemoryCard
 * ----------
 * Картка події-спогаду в 2-колонковому grid.
 * Показує shimmer-скелетон поки обкладинка завантажується.
 *
 * Props:
 * @prop {Memory}       memory  — дані події-спогаду
 * @prop {() => void}   onClick — тап для переходу на сторінку деталей
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

/* Small hand-drawn star positions vary by card to avoid repetition */
const STAR_CONFIGS = [
  { top: '10%', right: '8%', size: 14, rotate: 12 },
  { top: '16%', right: '22%', size: 8, rotate: -8 },
  { top: '6%', right: '32%', size: 10, rotate: 20 },
]

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const [loaded, setLoaded] = useState(false)
  const starIdx = (memory.title.charCodeAt(0) ?? 0) % STAR_CONFIGS.length

  return (
    <div className={styles.card} onClick={onClick}>
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
          <DoodleIllustration variant="memories" size={48} />
        </div>
      )}

      {/* Doodle star decorator */}
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

      <div className={styles.overlay}>
        <div className={styles.meta}>
          <span className={styles.title}>{memory.title.toUpperCase()}</span>
          <span className={styles.date}>
            {memory.location ? `${memory.location} · ` : ''}
            {memory.isTrip && memory.dateEnd
              ? (() => {
                  const [y1, m1, d1] = memory.date.split('-').map(Number)
                  const [y2, m2, d2] = memory.dateEnd.split('-').map(Number)
                  const days = Math.round((Date.UTC(y2, m2-1, d2) - Date.UTC(y1, m1-1, d1)) / 86400000) + 1
                  return `${formatMemoryDate(memory.date)} · ${days}д`
                })()
              : formatMemoryDate(memory.date)}
          </span>
        </div>
        <div className={styles.bottom}>
          {memory.photos.length > 0 && (
            <span className={styles.photoCount}>🖼 {memory.photos.length}</span>
          )}
          {memory.ownerName && (
            <div className={styles.ownerBadge} title={memory.ownerName}>
              {memory.ownerAvatarUrl
                ? <img src={memory.ownerAvatarUrl} alt={memory.ownerName} className={styles.ownerAvatar} />
                : <span className={styles.ownerInitial}>{memory.ownerName[0]}</span>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MemoryCard
