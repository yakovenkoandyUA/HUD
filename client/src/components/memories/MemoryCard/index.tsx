import React, { useState } from 'react'
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

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick }) => {
  const [loaded, setLoaded] = useState(false)

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
          <span className={styles.placeholderIcon}>📷</span>
        </div>
      )}

      <div className={styles.overlay}>
        <div className={styles.meta}>
          <span className={styles.title}>{memory.title.toUpperCase()}</span>
          <span className={styles.date}>
            {memory.location ? `${memory.location} · ` : ''}
            {formatMemoryDate(memory.date)}
          </span>
        </div>
        {memory.photos.length > 0 && (
          <span className={styles.photoCount}>
            🖼 {memory.photos.length}
          </span>
        )}
      </div>
    </div>
  )
}

export default MemoryCard
