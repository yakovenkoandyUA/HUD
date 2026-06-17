import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useModalHistory } from '../../../hooks/useModalHistory'
import styles from './GameDetail.module.css'
import type { GameItem, GameStatus } from '../../../types'

const PS_PLATFORMS = new Set(['PS5', 'PS4'])

const STATUS_OPTIONS: { value: GameStatus; label: string; color: string }[] = [
  { value: 'announced', label: 'Анонс',    color: 'var(--accent)'    },
  { value: 'want',      label: 'Хочу',     color: 'var(--text2)'     },
  { value: 'playing',   label: 'Граю',     color: '#2DD4BF'          },
  { value: 'completed', label: 'Пройдено', color: 'var(--gold)'      },
  { value: 'dropped',   label: 'Кинув',    color: 'var(--negative)'  },
]

/**
 * GameDetail
 * ----------
 * Bottom-sheet with full game details: status, platinum toggle, rating, notes, hours.
 *
 * Props:
 * @prop {GameItem}                                        item
 * @prop {boolean}                                         isOpen
 * @prop {() => void}                                      onClose
 * @prop {(id: string, updates: Partial<GameItem>) => void} onUpdate
 * @prop {(id: string) => void}                            onDelete
 */
interface GameDetailProps {
  item: GameItem
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<GameItem>) => void
  onDelete: (id: string) => void
}

const ANIM_MS = 380

const GameDetail: React.FC<GameDetailProps> = ({ item, isOpen, onClose, onUpdate, onDelete }) => {
  const [mounted, setMounted]             = useState(false)
  const [visible, setVisible]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notes, setNotes]                 = useState(item.notes ?? '')
  const [hours, setHours]                 = useState<string>(item.hoursPlayed != null ? String(item.hoursPlayed) : '')

  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoursTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sheetRef = useSwipeToDismiss(onClose, { overlayRef, bodyRef })

  useModalHistory(onClose, isOpen)

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
      setNotes(item.notes ?? '')
      setHours(item.hoursPlayed != null ? String(item.hoursPlayed) : '')
      setConfirmDelete(false)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [isOpen, item.notes, item.hoursPlayed])

  if (!mounted) return null

  const isPS = item.platforms.some(p => PS_PLATFORMS.has(p))

  const handleStatus = (status: GameStatus) => {
    onUpdate(item.id, {
      status,
      completedAt: status === 'completed' ? new Date().toISOString().slice(0, 10) : item.completedAt,
    })
  }

  const handlePlatinum = () => {
    onUpdate(item.id, { platinum: !item.platinum })
  }

  const handleRating = (r: number) => {
    onUpdate(item.id, { rating: item.rating === r ? null : r })
  }

  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => onUpdate(item.id, { notes: val }), 800)
  }

  const handleHoursChange = (val: string) => {
    setHours(val)
    if (hoursTimer.current) clearTimeout(hoursTimer.current)
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0) {
      hoursTimer.current = setTimeout(() => onUpdate(item.id, { hoursPlayed: n }), 800)
    }
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete(item.id)
    onClose()
  }

  return (
    <>
      <div
        ref={overlayRef}
        className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}
      >
        <div className={styles.handle} />

        {/* Hero */}
        <div className={styles.hero}>
          {item.backgroundUrl ? (
            <img src={item.backgroundUrl} alt={item.title} className={styles.heroImg} />
          ) : (
            <div className={styles.heroFallback} />
          )}
          <div className={styles.heroGradient} />
          <div className={styles.heroContent}>
            <h2 className={styles.title}>{item.title}</h2>
            {item.releaseDate && (
              <span className={styles.releaseYear}>{item.releaseDate.slice(0, 4)}</span>
            )}
          </div>
        </div>

        <div ref={bodyRef} className={styles.body}>
          {/* Meta row */}
          <div className={styles.metaRow}>
            {item.platforms.map(p => (
              <span key={p} className={styles.platformChip}>{p}</span>
            ))}
            {item.metacritic && (
              <span className={`${styles.metacritic} ${item.metacritic >= 75 ? styles.mcGood : item.metacritic >= 50 ? styles.mcOk : styles.mcBad}`}>
                MC {item.metacritic}
              </span>
            )}
            {item.genres.slice(0, 2).map(g => (
              <span key={g} className={styles.genreChip}>{g}</span>
            ))}
          </div>

          {/* Status */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>СТАТУС</p>
            <div className={styles.statusChips}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`${styles.statusChip} ${item.status === s.value ? styles.statusChipActive : ''}`}
                  style={item.status === s.value ? { borderColor: s.color, color: s.color } as React.CSSProperties : undefined}
                  onClick={() => handleStatus(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platinum — only for PS */}
          {isPS && (
            <div className={styles.section}>
              <button
                type="button"
                className={`${styles.platinumBtn} ${item.platinum ? styles.platinumActive : ''}`}
                onClick={handlePlatinum}
              >
                <span className={styles.platinumIcon}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8L8 1z" fill="currentColor"/>
                  </svg>
                </span>
                <span className={styles.platinumLabel}>
                  {item.platinum ? 'Platinum отримано ✓' : 'Позначити Platinum'}
                </span>
              </button>
            </div>
          )}

          {/* Rating 1–10 */}
          {(item.status === 'completed' || item.status === 'dropped' || item.status === 'playing') && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ОЦІНКА</p>
              <div className={styles.ratingRow}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.ratingBtn} ${item.rating != null && n <= item.rating ? styles.ratingActive : ''}`}
                    onClick={() => handleRating(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hours played */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>ГОДИН ЗІГРАНО</p>
            <div className={styles.hoursRow}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <input
                type="number"
                min="0"
                className={styles.hoursInput}
                value={hours}
                onChange={e => handleHoursChange(e.target.value)}
                placeholder="0"
              />
              <span className={styles.hoursUnit}>год</span>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>НОТАТКИ</p>
            <textarea
              className={styles.notesInput}
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Враження, проходження, секрети..."
              rows={3}
            />
          </div>

          {/* Completed date */}
          {item.completedAt && (
            <p className={styles.completedDate}>
              Пройдено: {new Date(item.completedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {/* Delete */}
          <button
            type="button"
            className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`}
            onClick={handleDelete}
          >
            {confirmDelete ? 'Підтвердити видалення' : 'Видалити з колекції'}
          </button>
        </div>
      </div>
    </>
  )
}

export default GameDetail
