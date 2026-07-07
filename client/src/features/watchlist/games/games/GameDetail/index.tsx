import React, { useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './GameDetail.module.css'
import type { GameItem, GameStatus } from '@/shared/types'

const PS_PLATFORMS = new Set(['PS5', 'PS4'])

const STATUS_OPTIONS: { value: GameStatus; label: string; color: string }[] = [
  { value: 'announced', label: 'Анонс',    color: 'var(--accent)'    },
  { value: 'want',      label: 'Хочу',     color: 'var(--text2)'     },
  { value: 'playing',   label: 'Граю',     color: '#2DD4BF'          },
  { value: 'completed', label: 'Пройдено', color: 'var(--gold)'      },
  { value: 'dropped',   label: 'Кинув',    color: 'var(--negative)'  },
]

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * GameDetail
 * ----------
 * Bottom-sheet with full game details: status, platinum, half-star rating,
 * hours played (with quick-adjust), genres, notes, added/completed dates.
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
  const [showCompletedPicker, setShowCompletedPicker] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoursTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sheetRef = useSwipeToDismiss(onClose, { overlayRef, bodyRef, enabled: mounted })

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

  const adjustHours = (delta: number) => {
    if (hoursTimer.current) clearTimeout(hoursTimer.current)
    const current = parseFloat(hours) || 0
    const next = Math.max(0, current + delta)
    setHours(String(next))
    onUpdate(item.id, { hoursPlayed: next })
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
        {/* Hero */}
        <div className={styles.hero}>
          {item.backgroundUrl ? (
            <img src={item.backgroundUrl} alt={item.title} className={styles.heroImg} />
          ) : (
            <div className={styles.heroFallback} />
          )}
          <div className={styles.heroGradient} />
          <div className={styles.handle} />
          {item.coverUrl && (
            <div className={styles.heroCoverWrap}>
              <img src={item.coverUrl} alt={item.title} className={styles.heroCoverImg} />
            </div>
          )}
          <div className={styles.heroContent}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{item.title}</h2>
              {item.platinum && isPS && (
                <span className={styles.platinumBadgeHero} title="Platinum отримано">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 2 .7-4.1L2 5.4l4.2-.8L8 1z" fill="currentColor"/>
                  </svg>
                </span>
              )}
            </div>
            {item.releaseDate && (
              <span className={styles.releaseYear}>{item.releaseDate.slice(0, 4)}</span>
            )}
          </div>
        </div>

        <div ref={bodyRef} className={styles.body}>
          {/* Meta row — platforms + metacritic only */}
          <div className={styles.metaRow}>
            {item.platforms.map(p => (
              <span key={p} className={styles.platformChip}>{p}</span>
            ))}
            {item.metacritic && (
              <span className={`${styles.metacritic} ${item.metacritic >= 75 ? styles.mcGood : item.metacritic >= 50 ? styles.mcOk : styles.mcBad}`}>
                MC {item.metacritic}
              </span>
            )}
          </div>

          {/* Genres */}
          {item.genres.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ЖАНРИ</p>
              <div className={styles.genreRow}>
                {item.genres.map(g => (
                  <span key={g} className={styles.genreChip}>{g}</span>
                ))}
              </div>
            </div>
          )}

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

          {/* Rating — 5 half-stars, 1–10 scale */}
          {(item.status === 'completed' || item.status === 'dropped' || item.status === 'playing') && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ОЦІНКА</p>
              <div className={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(i => {
                  const full    = i * 2
                  const half    = full - 1
                  const current = item.rating ?? 0
                  const filled  = Math.max(0, Math.min(2, current - (i - 1) * 2))
                  const percent = (filled / 2) * 100
                  return (
                    <div key={i} className={styles.starSlot}>
                      <span className={styles.starBg}>★</span>
                      <span className={styles.starFill} style={{ width: `${percent}%` }}>★</span>
                      <button
                        type="button"
                        className={styles.starHalfBtn}
                        style={{ left: 0 }}
                        onClick={() => handleRating(half)}
                        aria-label={`${half} з 10`}
                      />
                      <button
                        type="button"
                        className={styles.starHalfBtn}
                        style={{ left: '50%' }}
                        onClick={() => handleRating(full)}
                        aria-label={`${full} з 10`}
                      />
                    </div>
                  )
                })}
                {item.rating != null && (
                  <span className={styles.ratingValue}>{item.rating}/10</span>
                )}
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
            <div className={styles.hoursQuickRow}>
              <button type="button" className={styles.hoursQuickBtn} onClick={() => adjustHours(-1)}>−1</button>
              <button type="button" className={styles.hoursQuickBtn} onClick={() => adjustHours(1)}>+1</button>
              <button type="button" className={styles.hoursQuickBtn} onClick={() => adjustHours(5)}>+5</button>
              <button type="button" className={styles.hoursQuickBtn} onClick={() => adjustHours(10)}>+10</button>
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

          {/* Dates */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>ДАТИ</p>
            <div className={styles.datesRow}>
              <div className={styles.dateItem}>
                <span className={styles.dateLabel}>Додано</span>
                <span className={styles.dateValue}>{formatLongDate(item.addedAt)}</span>
              </div>
              {item.status === 'completed' && (
                <div className={styles.dateItem}>
                  <span className={styles.dateLabel}>Пройдено</span>
                  <button
                    type="button"
                    className={styles.dateEditBtn}
                    onClick={() => setShowCompletedPicker(true)}
                  >
                    {item.completedAt ? formatLongDate(item.completedAt) : 'Обрати дату'} ✎
                  </button>
                </div>
              )}
            </div>
          </div>

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

      {showCompletedPicker && (
        <CustomDatePicker
          value={item.completedAt ?? undefined}
          onChange={(dateStr) => {
            onUpdate(item.id, { completedAt: dateStr })
            setShowCompletedPicker(false)
          }}
          onClose={() => setShowCompletedPicker(false)}
          minDate={new Date(item.addedAt)}
        />
      )}
    </>
  )
}

export default GameDetail
