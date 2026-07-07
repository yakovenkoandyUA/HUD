import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Memory } from '../../../types/memory'
import styles from './FlashbackModal.module.css'

interface FlashbackItem {
  memory: Memory
  yearsAgo: number
}

interface FlashbackModalProps {
  items: FlashbackItem[]
  onClose: () => void
}

function coverSrc(m: Memory): string | null {
  return m.coverUrl || m.photos[0]?.url || null
}

function titleGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return `linear-gradient(135deg, hsl(${h1},35%,18%) 0%, hsl(${h2},30%,12%) 100%)`
}

function yearsAgoLabel(years: number): string {
  const mod100 = years % 100
  const mod10  = years % 10
  if (mod100 >= 11 && mod100 <= 14) return `${years} РОКІВ ТОМУ`
  if (mod10 === 1) return `${years} РІК ТОМУ`
  if (mod10 >= 2 && mod10 <= 4) return `${years} РОКИ ТОМУ`
  return `${years} РОКІВ ТОМУ`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

/**
 * FlashbackModal
 * --------------
 * Fullscreen попап "цього дня N років тому" — показується раз на добу
 * (sessionStorage). Якщо спогадів кілька — навігація вліво/вправо.
 *
 * Props:
 * @prop {FlashbackItem[]} items   — список спогадів цього дня
 * @prop {() => void}      onClose — закриття попапу
 */
const FlashbackModal: React.FC<FlashbackModalProps> = ({ items, onClose }) => {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)

  const item   = items[idx]
  const memory = item.memory
  const cover  = coverSrc(memory)
  const total  = items.length

  const handleView = () => {
    onClose()
    navigate(`/memories/${memory.id}`)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIdx(i => Math.max(0, i - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (idx < total - 1) setIdx(i => i + 1)
    else onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.card}
        style={cover ? undefined : { background: titleGradient(memory.title) }}
        onClick={e => e.stopPropagation()}
      >
        {cover && <img src={cover} alt="" className={styles.bg} />}
        <div className={styles.gradient} />

        {/* Close */}
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Pagination dots */}
        {total > 1 && (
          <div className={styles.dots}>
            {items.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                onClick={e => { e.stopPropagation(); setIdx(i) }}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            ФЛЕШБЕК
          </div>

          <p className={styles.yearsAgo}>{yearsAgoLabel(item.yearsAgo)}</p>
          <h2 className={styles.title}>{memory.title}</h2>

          {memory.location && (
            <p className={styles.location}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1a3 3 0 013 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              {memory.location}
            </p>
          )}

          <p className={styles.date}>{formatDate(memory.date)}</p>

          <div className={styles.actions}>
            <button type="button" className={styles.viewBtn} onClick={handleView}>
              Переглянути
            </button>
            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              {idx < total - 1 ? 'Наступний' : 'Закрити'}
              {idx < total - 1 && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          {idx > 0 && (
            <button type="button" className={styles.prevBtn} onClick={handlePrev}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M11 7H3M6.5 3.5L3 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Попередній
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FlashbackModal
