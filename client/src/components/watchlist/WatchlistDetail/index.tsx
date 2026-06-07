import React, { useEffect, useRef, useState } from 'react'
import StarRating from '../StarRating'
import EpisodesList from '../EpisodesList'
import ImageUploadButton from '../../ui/ImageUploadButton'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { formatDateUA } from '../../../utils/formatDate'
import { authFetch } from '../../../services/api'
import { useSeriesEpisodes } from '../../../hooks/useSeriesEpisodes'
import styles from './WatchlistDetail.module.css'
import type { WatchlistItem, WatchlistStatus } from '../../../types'

function formatNextEpisode(date: Date | null): string {
  if (!date) return 'Дата невідома'
  const diff = Math.ceil((date.getTime() - Date.now()) / 1000 / 60 / 60 / 24)
  if (diff === 0) return 'Виходить сьогодні!'
  if (diff === 1) return 'Виходить завтра'
  if (diff > 0) return `Через ${diff} д`
  return 'Вже вийшла'
}

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
 * @prop {(url: string) => void}               [onImageChange]  — upload custom poster/backdrop
 * @prop {(patch) => void}                     [onNotifyChange] — toggle episode/season notifications
 * @prop {() => void}                          onDelete
 */
interface WatchlistDetailProps {
  item: WatchlistItem
  isOpen: boolean
  onClose: () => void
  onStatusChange: (status: WatchlistStatus) => void
  onRatingChange: (rating: number | null) => void
  onImageChange?: (url: string) => void
  onProgressChange?: (patch: { currentSeason?: number; currentEpisode?: number }) => void
  onNotifyChange?: (patch: { notifyNewEpisode?: boolean; notifyNewSeason?: boolean }) => void
  onDelete: () => void
}

const ANIM_MS = 420

const STATUS_OPTIONS_DEFAULT: { value: WatchlistStatus; label: string; color: string }[] = [
  { value: 'want',     label: 'Хочу',       color: 'var(--text2)'    },
  { value: 'watching', label: 'Дивлюсь',    color: 'var(--second)'   },
  { value: 'watched',  label: 'Переглянув', color: 'var(--gold)'     },
  { value: 'dropped',  label: 'Кинув',      color: 'var(--negative)' },
]

const STATUS_OPTIONS_BOOK: { value: WatchlistStatus; label: string; color: string }[] = [
  { value: 'want',     label: 'Хочу прочитати', color: 'var(--text2)'    },
  { value: 'watching', label: 'Читаю',           color: 'var(--second)'   },
  { value: 'watched',  label: 'Прочитав',        color: 'var(--gold)'     },
  { value: 'dropped',  label: 'Кинув',           color: 'var(--negative)' },
]

const WatchlistDetail: React.FC<WatchlistDetailProps> = ({
  item,
  isOpen,
  onClose,
  onStatusChange,
  onRatingChange,
  onImageChange,
  onNotifyChange,
  onDelete,
}) => {
  const [mounted, setMounted]             = useState(isOpen)
  const [visible, setVisible]             = useState(isOpen)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentSeason, setCurrentSeason]   = useState(item.currentSeason ?? 1)
  const [currentEpisode, setCurrentEpisode] = useState(item.currentEpisode ?? 0)
  const [nextEpisodeDate, setNextEpisodeDate] = useState<Date | null>(
    item.nextEpisodeDate ? new Date(item.nextEpisodeDate) : null
  )
  const [nextSeasonDate, setNextSeasonDate]     = useState<string | null>(item.nextSeasonDate ?? null)
  const [showSeasonDatePicker, setShowSeasonDatePicker] = useState(false)
  const progressMounted    = useRef(false)
  const initialNextEpRef   = useRef(item.nextEpisodeDate)

  const isSeriesLike = item.category === 'series' || item.category === 'anime'
  const { episodes } = useSeriesEpisodes(isSeriesLike && item.tmdbId > 0 ? item.tmdbId : null)

  // When episodes load — find nearest future episode and persist its date
  useEffect(() => {
    if (!episodes.length) return
    const now = new Date()
    const nextEp = episodes
      .filter(ep => ep.air_date && new Date(ep.air_date) > now)
      .sort((a, b) => new Date(a.air_date!).getTime() - new Date(b.air_date!).getTime())[0]

    const stored = initialNextEpRef.current
    const shouldUpdate = nextEp?.air_date && (!stored || new Date(stored) < now)
    if (shouldUpdate) {
      setNextEpisodeDate(new Date(nextEp.air_date!))
      authFetch(`/api/watchlist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nextEpisodeDate: nextEp.air_date }),
      }).catch(console.error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes])

  // Debounced PATCH — fires 800ms after last stepper tap, skips initial mount
  useEffect(() => {
    if (!progressMounted.current) { progressMounted.current = true; return }
    const timer = setTimeout(() => {
      authFetch(`/api/watchlist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ currentSeason, currentEpisode }),
      }).catch(console.error)
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeason, currentEpisode])

  const maxSeason  = item.totalSeasons  ?? 1
  const maxEpisode = item.totalEpisodes ?? 99

  const handleSeasonMinus  = () => { if (currentSeason  <= 1)           return; setCurrentSeason(s  => Math.max(1, s - 1)); setCurrentEpisode(0) }
  const handleSeasonPlus   = () => { if (currentSeason  >= maxSeason)   return; setCurrentSeason(s  => s + 1); setCurrentEpisode(0) }
  const handleEpisodeMinus = () => { if (currentEpisode <= 0)           return; setCurrentEpisode(e => Math.max(0, e - 1)) }
  const handleEpisodePlus  = () => { if (currentEpisode >= maxEpisode)  return; setCurrentEpisode(e => e + 1) }

  const requestNotifyPermission = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

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

  const allEpisodesAired = episodes.length > 0 &&
    episodes.every(ep => ep.air_date && new Date(ep.air_date) <= new Date())

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
            {item.pageCount != null && item.pageCount > 0 && (
              <span className={styles.metaChip}>{item.pageCount} стор.</span>
            )}
            {item.authors && item.authors.length > 0 && (
              <span className={styles.metaChip}>{item.authors[0]}</span>
            )}
          </div>

          {/* Genres — read-only */}
          {item.genres && item.genres.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ЖАНРИ</p>
              <div className={styles.genreChips}>
                {item.genres.map(g => (
                  <span key={g} className={styles.genreChip}>{g}</span>
                ))}
              </div>
            </div>
          )}

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
          <div className={styles.statusChips}>
            {(item.category === 'book' ? STATUS_OPTIONS_BOOK : STATUS_OPTIONS_DEFAULT).map((s) => (
              <button
                key={s.value}
                type="button"
                className={`${styles.statusChip} ${item.status === s.value ? styles.active : ''}`}
                data-status={s.value}
                onClick={() => onStatusChange(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Rating - only if watched */}
          {item.status === 'watched' && (
            <>
              <p className={styles.sectionLabel}>Моя оцінка</p>
              <div className={styles.ratingRow}>
                <StarRating value={item.rating} onChange={onRatingChange} size="md" />
                {item.rating != null && item.rating > 0 && (
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

          {/* Progress — series/anime */}
          {(item.category === 'series' || item.category === 'anime') && (
            <div className={styles.progressSection}>
              <div className={styles.stepperGroup}>
                <span className={styles.stepperLabel}>Сезон</span>
                <div className={styles.stepper}>
                  <button type="button" className={styles.stepBtn} onClick={handleSeasonMinus}  disabled={currentSeason  <= 1}>−</button>
                  <span className={styles.stepperValue}>{currentSeason}</span>
                  <button type="button" className={styles.stepBtn} onClick={handleSeasonPlus}   disabled={currentSeason  >= maxSeason}>+</button>
                </div>
              </div>
              <div className={styles.stepperSep} />
              <div className={styles.stepperGroup}>
                <span className={styles.stepperLabel}>Епізод</span>
                <div className={styles.stepper}>
                  <button type="button" className={styles.stepBtn} onClick={handleEpisodeMinus} disabled={currentEpisode <= 0}>−</button>
                  <span className={styles.stepperValue}>{currentEpisode}</span>
                  <button type="button" className={styles.stepBtn} onClick={handleEpisodePlus}  disabled={currentEpisode >= maxEpisode}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* Episodes - series only */}
          {item.category === 'series' && item.tmdbId > 0 && (
            <EpisodesList tmdbId={item.tmdbId} />
          )}

          {/* Notify — series/anime only */}
          {canRemind && onNotifyChange && (
            <div className={styles.notifySection}>
              {!allEpisodesAired && (
                <div className={styles.notifyRow}>
                  <div className={styles.notifyText}>
                    <p className={styles.notifyTitle}>Нова серія</p>
                    <p className={styles.notifyDesc}>{formatNextEpisode(nextEpisodeDate)}</p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${item.notifyNewEpisode ? styles.toggleOn : ''}`}
                    onClick={() => {
                      if (!item.notifyNewEpisode) requestNotifyPermission()
                      onNotifyChange({ notifyNewEpisode: !item.notifyNewEpisode })
                    }}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
              )}
              <div className={styles.notifyRow}>
                <div className={styles.notifyText}>
                  <p className={styles.notifyTitle}>Новий сезон</p>
                  <p className={styles.notifyDesc}>
                    {nextSeasonDate ? (
                      <button
                        type="button"
                        className={styles.pickDateBtn}
                        onClick={() => setShowSeasonDatePicker(true)}
                      >
                        {formatDateUA(nextSeasonDate)} ✎
                      </button>
                    ) : item.notifyNewSeason ? (
                      <button
                        type="button"
                        className={styles.pickDateBtn}
                        onClick={() => setShowSeasonDatePicker(true)}
                      >
                        + Обрати дату
                      </button>
                    ) : 'Дата невідома'}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${item.notifyNewSeason ? styles.toggleOn : ''}`}
                  onClick={() => {
                    if (!item.notifyNewSeason) requestNotifyPermission()
                    const newVal = !item.notifyNewSeason
                    onNotifyChange({ notifyNewSeason: newVal })
                    if (!newVal) {
                      setNextSeasonDate(null)
                      setShowSeasonDatePicker(false)
                      authFetch(`/api/watchlist/${item.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ nextSeasonDate: null }),
                      }).catch(console.error)
                    }
                  }}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            </div>
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

    {showSeasonDatePicker && (
      <CustomDatePicker
        value={nextSeasonDate ?? undefined}
        onChange={(dateStr) => {
          setNextSeasonDate(dateStr)
          setShowSeasonDatePicker(false)
          authFetch(`/api/watchlist/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ nextSeasonDate: dateStr }),
          }).catch(console.error)
        }}
        onClose={() => setShowSeasonDatePicker(false)}
        minDate={new Date()}
      />
    )}
    </>
  )
}

export default WatchlistDetail
