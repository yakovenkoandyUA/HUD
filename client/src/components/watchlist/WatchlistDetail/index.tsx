import React, { useEffect, useState } from 'react'
import StarRating from '../StarRating'
import EpisodesList from '../EpisodesList'
import CustomDatePicker from '../../ui/CustomDatePicker'
import ImageUploadButton from '../../ui/ImageUploadButton'
import { formatDateUA } from '../../../utils/formatDate'
import styles from './WatchlistDetail.module.css'
import type { WatchlistItem, WatchlistStatus } from '../../../types'

/**
 * WatchlistDetail
 * ---------------
 * Bottom-sheet modal with full item details, status change,
 * personal rating, season reminder toggle, custom photo upload and delete.
 *
 * Props:
 * @prop {WatchlistItem}                       item
 * @prop {boolean}                             isOpen
 * @prop {() => void}                          onClose
 * @prop {(status: WatchlistStatus) => void}   onStatusChange
 * @prop {(rating: number | null) => void}     onRatingChange
 * @prop {(date?: string) => void}             onToggleReminder
 * @prop {(url: string) => void}               [onImageChange]  — upload custom poster/backdrop
 * @prop {() => void}                          onDelete
 */
interface WatchlistDetailProps {
  item: WatchlistItem
  isOpen: boolean
  onClose: () => void
  onStatusChange: (status: WatchlistStatus) => void
  onRatingChange: (rating: number | null) => void
  onToggleReminder: (date?: string) => void
  onImageChange?: (url: string) => void
  onDelete: () => void
}

const ANIM_MS = 420

const STATUS_OPTIONS: { value: WatchlistStatus; label: string }[] = [
  { value: 'want',     label: 'Хочу' },
  { value: 'watching', label: 'Дивлюсь' },
  { value: 'watched',  label: 'Переглянув' },
  { value: 'dropped',  label: 'Кинув' },
]

const WatchlistDetail: React.FC<WatchlistDetailProps> = ({
  item,
  isOpen,
  onClose,
  onStatusChange,
  onRatingChange,
  onToggleReminder,
  onImageChange,
  onDelete,
}) => {
  const [mounted, setMounted]             = useState(isOpen)
  const [visible, setVisible]             = useState(isOpen)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reminderDate, setReminderDate]   = useState(item.reminderDate ?? '')
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      setConfirmDelete(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!mounted) return null

  const backdropSrc = item.backdropPath
    ? `https://image.tmdb.org/t/p/w780${item.backdropPath}`
    : item.thumbnail ?? null

  const posterSrc = item.category === 'book'
    ? item.thumbnail ?? null
    : item.posterPath
      ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
      : null

  const canRemind = item.category === 'series' || item.category === 'anime'

  const handleReminderToggle = () => {
    onToggleReminder(reminderDate || undefined)
  }

  return (
    <>
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Backdrop ── */}
        <div className={styles.backdropWrap}>
          {backdropSrc ? (
            <img src={backdropSrc} alt={item.title} className={styles.backdrop} />
          ) : posterSrc ? (
            <img src={posterSrc} alt={item.title} className={styles.backdropPoster} />
          ) : (
            <div className={styles.backdropFallback} />
          )}
          <div className={styles.backdropGrad} />
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            ✕
          </button>
          <div className={styles.backdropTitle}>
            <h2 className={styles.title}>{item.title}</h2>
            {item.originalTitle && item.originalTitle !== item.title && (
              <p className={styles.originalTitle}>{item.originalTitle}</p>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {/* Meta row */}
          <div className={styles.metaRow}>
            {item.year && <span className={styles.metaChip}>{item.year}</span>}
            {item.genres.slice(0, 3).map((g) => (
              <span key={g} className={styles.metaChip}>{g}</span>
            ))}
            {item.pageCount && (
              <span className={styles.metaChip}>{item.pageCount} стор.</span>
            )}
            {item.authors?.length && (
              <span className={styles.metaChip}>{item.authors[0]}</span>
            )}
          </div>

          {/* Custom poster — show when no TMDB backdrop */}
          {!item.backdropPath && onImageChange && (
            <>
              <p className={styles.sectionLabel}>Постер</p>
              <ImageUploadButton
                currentUrl={item.thumbnail}
                folder="mimir/watchlist"
                onUpload={onImageChange}
                variant="square"
                placeholder="Додати постер"
              />
            </>
          )}

          {/* Overview */}
          {item.overview && (
            <p className={styles.overview}>{item.overview}</p>
          )}

          {/* Status selector */}
          <p className={styles.sectionLabel}>Статус</p>
          <div className={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.statusBtn} ${item.status === opt.value ? styles.statusActive : ''}`}
                onClick={() => onStatusChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Rating - only if watched */}
          {item.status === 'watched' && (
            <>
              <p className={styles.sectionLabel}>Моя оцінка</p>
              <div className={styles.ratingRow}>
                <StarRating value={item.rating} onChange={onRatingChange} size="md" />
                {item.rating && (
                  <button
                    type="button"
                    className={styles.clearRating}
                    onClick={() => onRatingChange(null)}
                  >
                    прибрати
                  </button>
                )}
              </div>
            </>
          )}

          {/* Episodes - series only */}
          {item.category === 'series' && item.tmdbId > 0 && (
            <>
              <p className={styles.sectionLabel}>Епізоди</p>
              <EpisodesList tmdbId={item.tmdbId} />
            </>
          )}

          {/* Season reminder - series/anime only */}
          {canRemind && (
            <>
              <p className={styles.sectionLabel}>Нагадати про новий сезон</p>
              <div className={styles.reminderRow}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${item.seasonReminder ? styles.toggleOn : ''}`}
                  onClick={handleReminderToggle}
                >
                  <span className={styles.toggleKnob} />
                </button>
                {item.seasonReminder && (
                  <button
                    type="button"
                    className={styles.reminderDateTrigger}
                    onClick={() => setShowDatePicker(true)}
                  >
                    {reminderDate ? formatDateUA(reminderDate) : 'Вибрати дату'}
                  </button>
                )}
              </div>
              {item.seasonReminder && item.reminderDate && (
                <p className={styles.reminderNote}>
                  Нагадування заплановано на {formatDateUA(item.reminderDate)}
                </p>
              )}
            </>
          )}

          {/* Delete */}
          <div className={styles.deleteSection}>
            {confirmDelete ? (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>Видалити зі списку?</span>
                <button type="button" className={styles.confirmYes} onClick={onDelete}>
                  Так, видалити
                </button>
                <button
                  type="button"
                  className={styles.confirmNo}
                  onClick={() => setConfirmDelete(false)}
                >
                  Скасувати
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setConfirmDelete(true)}
              >
                Видалити зі списку
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {showDatePicker && (
      <CustomDatePicker
        value={reminderDate || undefined}
        onChange={(val) => { setReminderDate(val); setShowDatePicker(false) }}
        onClose={() => setShowDatePicker(false)}
      />
    )}
    </>
  )
}

export default WatchlistDetail
