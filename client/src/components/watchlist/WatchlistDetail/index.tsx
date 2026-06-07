import React, { useEffect, useRef, useState } from 'react'
import StarRating from '../StarRating'
import EpisodesList from '../EpisodesList'
import ImageUploadButton from '../../ui/ImageUploadButton'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { formatDateUA } from '../../../utils/formatDate'
import { authFetch } from '../../../services/api'
import { useSeriesEpisodes } from '../../../hooks/useSeriesEpisodes'
import { useProfileStore } from '../../../store/profileStore'
import styles from './WatchlistDetail.module.css'
import type { WatchlistItem, WatchlistStatus } from '../../../types'

interface Comment {
  _id: string
  userId: string
  username: string
  avatarUrl: string | null
  text: string
  createdAt: string
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins < 1)   return 'щойно'
  if (mins < 60)  return `${mins}хв тому`
  if (hours < 24) return `${hours}г тому`
  if (days < 7)   return `${days}д тому`
  return new Date(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

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
  const activeProfile = useProfileStore(s => s.activeProfile)

  const [mounted, setMounted]             = useState(isOpen)
  const [visible, setVisible]             = useState(isOpen)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [comments, setComments]     = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sending, setSending]       = useState(false)
  const [watchedEpisodes, setWatchedEpisodes] = useState<{ season: number; episode: number }[]>(
    item.watchedEpisodes ?? []
  )
  const [nextEpisodeDate, setNextEpisodeDate] = useState<Date | null>(
    item.nextEpisodeDate ? new Date(item.nextEpisodeDate) : null
  )
  const [nextSeasonDate, setNextSeasonDate]     = useState<string | null>(item.nextSeasonDate ?? null)
  const [showSeasonDatePicker, setShowSeasonDatePicker] = useState(false)
  const initialNextEpRef   = useRef(item.nextEpisodeDate)
  const sheetRef           = useRef<HTMLDivElement>(null)
  const swipeStartY        = useRef(0)
  const swipeCurrentY      = useRef(0)

  const isSeriesLike = item.category === 'series' || item.category === 'anime'
  const { episodes } = useSeriesEpisodes(isSeriesLike && item.tmdbId > 0 ? item.tmdbId : null)

  const seasons = Array.from({ length: item.totalSeasons ?? 1 }, (_, i) => i + 1)

  const handleToggleEpisode = (season: number, episode: number) => {
    const already = watchedEpisodes.some(w => w.season === season && w.episode === episode)
    const updated = already
      ? watchedEpisodes.filter(w => !(w.season === season && w.episode === episode))
      : [...watchedEpisodes, { season, episode }]
    setWatchedEpisodes(updated)
    authFetch(`/api/watchlist/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ watchedEpisodes: updated }),
    }).catch(console.error)
  }

  // Load comments when item changes
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await authFetch(`/api/watchlist/${item.id}/comments`)
        if (r.ok && !cancelled) setComments(await r.json())
      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [item.id])

  const handleSend = async () => {
    if (!newComment.trim() || sending) return
    setSending(true)
    const text = newComment.trim()
    const temp: Comment = {
      _id: `temp_${Date.now()}`,
      userId: activeProfile?.id ?? '',
      username: activeProfile?.username ?? '',
      avatarUrl: activeProfile?.avatarUrl ?? null,
      text,
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, temp])
    setNewComment('')
    try {
      const r = await authFetch(`/api/watchlist/${item.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      if (r.ok) {
        const saved: Comment = await r.json()
        setComments(prev => prev.map(c => c._id === temp._id ? saved : c))
      }
    } catch {
      setComments(prev => prev.filter(c => c._id !== temp._id))
    } finally {
      setSending(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setComments(prev => prev.filter(c => c._id !== commentId))
    await authFetch(`/api/watchlist/${item.id}/comments/${commentId}`, { method: 'DELETE' })
  }

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

  // Imperative touchmove — passive:false needed to allow preventDefault
  useEffect(() => {
    if (!mounted) return
    const sheet = sheetRef.current
    if (!sheet) return

    const onMove = (e: TouchEvent) => {
      swipeCurrentY.current = e.touches[0].clientY
      const delta = swipeCurrentY.current - swipeStartY.current
      if (delta > 0 && sheet.scrollTop === 0) {
        e.preventDefault()
        sheet.style.transform = `translateY(${Math.min(delta * 0.4, 80)}px)`
        sheet.style.transition = 'none'
      }
    }

    sheet.addEventListener('touchmove', onMove, { passive: false })
    return () => sheet.removeEventListener('touchmove', onMove)
  }, [mounted])

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY
    swipeCurrentY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    const sheet = sheetRef.current
    if (!sheet) return
    const delta = swipeCurrentY.current - swipeStartY.current
    sheet.style.transition = 'transform 0.25s ease'
    if (delta > 80) {
      sheet.style.transform = 'translateY(100%)'
      setTimeout(onClose, 250)
    } else {
      sheet.style.transform = 'translateY(0)'
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = ''
          sheetRef.current.style.transition = ''
        }
      }, 280)
    }
  }

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
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.handle} />
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
            {item.year && <span className={styles.year}>{item.year}</span>}
            {item.pageCount != null && item.pageCount > 0 && (
              <span className={styles.metaChip}>{item.pageCount} стор.</span>
            )}
            {item.authors && item.authors.length > 0 && (
              <span className={styles.metaChip}>{item.authors[0]}</span>
            )}
            {item.rating != null && item.rating > 0 && (
              <span className={styles.ratingInline}>★ {item.rating}</span>
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

          {/* Rating — interactive only when no rating set yet */}
          {item.status === 'watched' && (item.rating == null || item.rating === 0) && (
            <div className={styles.ratingRow}>
              <StarRating value={item.rating} onChange={onRatingChange} size="md" />
            </div>
          )}

          {/* Episodes — series and anime */}
          {isSeriesLike && item.tmdbId > 0 && (
            <EpisodesList
              tmdbId={item.tmdbId}
              seasons={seasons}
              watchedEpisodes={watchedEpisodes}
              onToggleEpisode={handleToggleEpisode}
              status={item.status}
              initialSeason={item.currentSeason ?? 1}
              onMarkWatched={() => onStatusChange('watched')}
            />
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
              {episodes.length > 0 && <div className={styles.notifyRow}>
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
              </div>}
            </div>
          )}

          {/* Comments */}
          <div className={styles.commentsSection}>
            <p className={styles.sectionLabel}>
              КОМЕНТАРІ{comments.length > 0 ? ` · ${comments.length}` : ''}
            </p>

            {comments.length > 0 && (
              <div className={styles.commentsList}>
                {comments.map(c => (
                  <div key={c._id} className={styles.comment}>
                    <div className={styles.commentAvatar}>
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} alt={c.username} />
                        : <span>{c.username[0]?.toUpperCase() ?? '?'}</span>
                      }
                    </div>
                    <div className={styles.commentBody}>
                      <div className={styles.commentMeta}>
                        <span className={styles.commentAuthor}>{c.username}</span>
                        <span className={styles.commentTime}>{formatRelativeTime(c.createdAt)}</span>
                        {c.userId === activeProfile?.id && (
                          <button
                            type="button"
                            className={styles.commentDelete}
                            onClick={() => handleDeleteComment(c._id)}
                            aria-label="Видалити коментар"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className={styles.commentText}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.commentInput}>
              <input
                className={styles.commentField}
                placeholder="Залишити коментар..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
                maxLength={500}
              />
              <button
                type="button"
                className={styles.commentSend}
                onClick={handleSend}
                disabled={!newComment.trim() || sending}
                aria-label="Надіслати"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8H2M14 8l-5-5M14 8l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

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
