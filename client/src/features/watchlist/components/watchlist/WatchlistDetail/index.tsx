import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import StarRating from '../StarRating'
import EpisodesList from '../EpisodesList'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { formatDateUA } from '@/shared/utils/formatDate'
import { authFetch } from '@/shared/services/api'
import { useSeriesEpisodes } from '../../../hooks/useSeriesEpisodes'
import { useProfileStore } from '@/shared/store/profileStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './WatchlistDetail.module.css'
import type { WatchlistItem, WatchlistStatus } from '@/shared/types'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined

interface SimilarItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date?: string
  first_air_date?: string
}

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
  onNotifyChange?: (patch: { notifyNewEpisode?: boolean; notifyNewSeason?: boolean; watchedWith?: string[] }) => void
  onSimilarAdd?: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
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
  { value: 'watching', label: 'Читаю',          color: 'var(--second)'   },
  { value: 'watched',  label: 'Прочитав',       color: 'var(--gold)'     },
  { value: 'dropped',  label: 'Кинув',          color: 'var(--negative)' },
]


const WatchlistDetail: React.FC<WatchlistDetailProps> = ({
  item,
  isOpen,
  onClose,
  onStatusChange,
  onRatingChange,
  onImageChange,
  onNotifyChange,
  onSimilarAdd,
  onDelete,
}) => {
  const activeProfile = useProfileStore(s => s.activeProfile)
  const { accepted, fetchFamily } = useFamilyStore()
  const { pushModal, popModal } = useUiStore()

  const [mounted, setMounted]             = useState(false)
  const [visible, setVisible]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [comments, setComments]     = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sending, setSending]       = useState(false)

  const [similar, setSimilar]                     = useState<SimilarItem[]>([])
  const [similarPreview, setSimilarPreview]       = useState<SimilarItem | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [similarDetails, setSimilarDetails]       = useState<any>(null)
  const [similarStatus, setSimilarStatus]         = useState<WatchlistStatus>('want')
  const [loadingSimilarDet, setLoadingSimilarDet] = useState(false)
  const [localRating, setLocalRating] = useState<number>(item.rating ?? 0)

  const myId = useProfileStore(s => s.activeProfile?.id ?? '')
  const [watchedEpisodes, setWatchedEpisodes] = useState<{ season: number; episode: number; userId: string }[]>(
    item.watchedEpisodes ?? []
  )
  const [nextEpisodeDate, setNextEpisodeDate] = useState<Date | null>(
    item.nextEpisodeDate ? new Date(item.nextEpisodeDate) : null
  )
  const [nextSeasonDate, setNextSeasonDate]     = useState<string | null>(item.nextSeasonDate ?? null)
  const [showSeasonDatePicker, setShowSeasonDatePicker] = useState(false)
  const initialNextEpRef   = useRef(item.nextEpisodeDate)
  const episodesRef     = useRef<HTMLDivElement>(null)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (accepted.length === 0) fetchFamily()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSeriesLike = item.category === 'series' || item.category === 'anime'
  const isBook       = item.category === 'book'
  const statusOptions = isBook ? STATUS_OPTIONS_BOOK : STATUS_OPTIONS_DEFAULT
  const { episodes } = useSeriesEpisodes(isSeriesLike && item.tmdbId > 0 ? item.tmdbId : null)

  const seasons = Array.from({ length: item.totalSeasons ?? 1 }, (_, i) => i + 1)

  const handleToggleEpisode = (season: number, episode: number) => {
    const already = watchedEpisodes.some(w => w.season === season && w.episode === episode && w.userId === myId)
    const updated = already
      ? watchedEpisodes.filter(w => !(w.season === season && w.episode === episode && w.userId === myId))
      : [...watchedEpisodes, { season, episode, userId: myId }]
    setWatchedEpisodes(updated)
    authFetch(`/api/watchlist/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ watchedEpisodes: updated }),
    }).catch(console.error)
  }

  useEffect(() => {
    setLocalRating(item.rating ?? 0)
  }, [item.rating])

  useEffect(() => {
    setWatchedEpisodes(item.watchedEpisodes ?? [])
    setNextEpisodeDate(item.nextEpisodeDate ? new Date(item.nextEpisodeDate) : null)
    setNextSeasonDate(item.nextSeasonDate ?? null)
    initialNextEpRef.current = item.nextEpisodeDate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

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

  // Load similar items from TMDB
  useEffect(() => {
    if (!item.tmdbId || !TMDB_KEY) return
    let cancelled = false
    const load = async () => {
      try {
        const type = item.category === 'movie' ? 'movie' : 'tv'
        const base = `https://api.themoviedb.org/3/${type}/${item.tmdbId}`
        const qs   = `?api_key=${TMDB_KEY}&language=uk-UA&page=1`

        let r = await fetch(`${base}/recommendations${qs}`)
        if (r.ok) {
          const data = await r.json()
          if (data.results?.length > 0) {
            if (!cancelled) setSimilar(data.results.slice(0, 10))
            return
          }
        }
        // Fallback to similar if recommendations is empty
        r = await fetch(`${base}/similar${qs}`)
        if (r.ok && !cancelled) {
          const data = await r.json()
          setSimilar(data.results?.slice(0, 10) ?? [])
        }
      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [item.tmdbId, item.category])

  const handleSimilarClick = async (s: SimilarItem) => {
    setSimilarPreview(s)
    setSimilarDetails(null)
    setSimilarStatus('want')
    if (!TMDB_KEY) return
    setLoadingSimilarDet(true)
    try {
      const type = item.category === 'movie' ? 'movie' : 'tv'
      const r = await fetch(`https://api.themoviedb.org/3/${type}/${s.id}?api_key=${TMDB_KEY}&language=uk-UA`)
      if (r.ok) setSimilarDetails(await r.json())
    } catch { /* silent */ }
    finally { setLoadingSimilarDet(false) }
  }

  const closeSimilarPreview = () => { setSimilarPreview(null); setSimilarDetails(null) }

  const handleSimilarAdd = () => {
    if (!similarPreview || !onSimilarAdd) return
    const d = similarDetails
    const title = similarPreview.title ?? similarPreview.name ?? ''
    const year = ((d?.release_date ?? d?.first_air_date ?? similarPreview.release_date ?? similarPreview.first_air_date) ?? '').slice(0, 4)
    onSimilarAdd({
      tmdbId:        similarPreview.id,
      title,
      originalTitle: d?.original_title ?? d?.original_name ?? title,
      category:      item.category,
      status:        similarStatus,
      posterPath:    d?.poster_path ?? similarPreview.poster_path ?? null,
      backdropPath:  d?.backdrop_path ?? similarPreview.backdrop_path ?? null,
      overview:      d?.overview ?? similarPreview.overview ?? '',
      year,
      genres:        d?.genres?.map((g: { name: string }) => g.name) ?? [],
      rating:        null,
      seasonReminder: false,
      reminderDate:  null,
      totalEpisodes:   d?.number_of_episodes   ?? null,
      totalSeasons:    d?.number_of_seasons    ?? null,
      nextEpisodeDate: d?.next_episode_to_air?.air_date ?? null,
      watchTogether:   false,
    })
    closeSimilarPreview()
  }

  const similarStatusOptions: { value: WatchlistStatus; label: string }[] = [
    { value: 'want', label: 'ХОЧУ' }, { value: 'watching', label: 'ДИВЛЮСЬ' }, { value: 'watched', label: 'ГЛЯНУВ' },
  ]

  const simHeroSrc = similarPreview
    ? (similarDetails?.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${similarDetails.backdrop_path}`
        : similarPreview.backdrop_path
          ? `https://image.tmdb.org/t/p/w780${similarPreview.backdrop_path}`
          : similarPreview.poster_path
            ? `https://image.tmdb.org/t/p/w500${similarPreview.poster_path}`
            : null)
    : null

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
      pushModal()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true)
      setConfirmDelete(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => { popModal() }
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleStartWatching = () => {
    onStatusChange('watching')
    setTimeout(() => {
      episodesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
  }

  if (!mounted) return null

  const backdropSrc = item.backdropPath
    ? `https://image.tmdb.org/t/p/w780${item.backdropPath}`
    : item.thumbnail ?? null

  const posterSrc = item.posterPath
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
          <div className={styles.handle} />
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
          {/* Meta row — year, rating, genres in one line */}
          <div className={styles.metaRow}>
            {item.year && <span className={styles.year}>{item.year}</span>}
            {item.rating != null && item.rating > 0 && (
              <span className={styles.ratingInline}>★ {item.rating}</span>
            )}
            {item.genres && item.genres.length > 0 && (
              <>
                {(item.year || (item.rating != null && item.rating > 0)) && (
                  <span className={styles.metaSep}>·</span>
                )}
                <div className={styles.genreChips}>
                  {item.genres.map(g => (
                    <span key={g} className={styles.genreChip}>{g}</span>
                  ))}
                </div>
              </>
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

          {/* Book-specific meta */}
          {isBook && (item.author || item.pageCount) && (
            <div className={styles.metaRow} style={{ flexWrap: 'wrap', gap: '8px' }}>
              {item.author && (
                <span className={styles.year}>{item.author}</span>
              )}
              {item.pageCount && (
                <span className={styles.year}>{item.pageCount} стор.</span>
              )}
              {item.isbn && (
                <span className={styles.year} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>ISBN {item.isbn}</span>
              )}
            </div>
          )}

          {/* Status selector */}
          <p className={styles.sectionLabel}>Статус</p>
          <div className={styles.statusChips}>
            {statusOptions.map((s) => (
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

          {/* Start Watching */}
          {item.status === 'want' && isSeriesLike && (
            <button
              type="button"
              className={styles.startWatchingBtn}
              onClick={handleStartWatching}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 3l10 5-10 5V3z" fill="currentColor"/>
              </svg>
              Почати дивитись
            </button>
          )}

          {/* Rating */}
          <div className={styles.ratingWrap}>
            <p className={styles.sectionLabel}>МОЯ ОЦІНКА</p>
            <div className={styles.ratingRow}>
              <StarRating
                value={localRating || null}
                onChange={(r) => { setLocalRating(r); onRatingChange(r) }}
                size="md"
              />
              {localRating > 0 && (
                <button
                  type="button"
                  className={styles.clearRating}
                  onClick={() => { setLocalRating(0); onRatingChange(null) }}
                >
                  прибрати
                </button>
              )}
            </div>
          </div>

          {/* Episodes — series and anime */}
          {isSeriesLike && item.tmdbId > 0 && (
            <div ref={episodesRef}>
              <EpisodesList
                tmdbId={item.tmdbId}
                seasons={seasons}
                watchedEpisodes={watchedEpisodes.filter(w => w.userId === myId)}
                partnerEpisodes={watchedEpisodes
                  .filter(w => w.userId !== myId)
                  .map(w => ({
                    season: w.season,
                    episode: w.episode,
                    name: accepted.find(m => m.id === w.userId)?.name ?? '',
                    avatarUrl: accepted.find(m => m.id === w.userId)?.avatarUrl ?? null,
                  }))}
                onToggleEpisode={handleToggleEpisode}
                status={item.status}
                initialSeason={item.currentSeason ?? 1}
                onMarkWatched={() => onStatusChange('watched')}
              />
            </div>
          )}

          {/* Watch Together — family member selector */}
          {!isBook && onNotifyChange && accepted.length > 0 && (
            <div className={styles.watchedWithSection}>
              <p className={styles.sectionLabel}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
                  <path d="M5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M11 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1 14s0-3 4-3M15 14s0-3-4-3M8 11c2.5 0 4 1.5 4 3H4c0-1.5 1.5-3 4-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                ДИВИТИСЬ РАЗОМ
              </p>
              <div className={styles.watchedWithList}>
                {accepted.map(member => {
                  const checked = (item.watchedWith ?? []).includes(member.id)
                  const toggle = () => {
                    const current = item.watchedWith ?? []
                    const updated = checked
                      ? current.filter(id => id !== member.id)
                      : [...current, member.id]
                    onNotifyChange({ watchedWith: updated })
                  }
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`${styles.watchedWithChip} ${checked ? styles.watchedWithChipOn : ''}`}
                      onClick={toggle}
                    >
                      {member.avatarUrl
                        ? <img src={member.avatarUrl} alt={member.name} className={styles.watchedWithAvatar} />
                        : <span className={styles.watchedWithInitial}>{member.name[0]}</span>
                      }
                      <span className={styles.watchedWithName}>{member.name}</span>
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={styles.watchedWithCheck}>
                          <path d="M1.5 5l2.5 2.5L8.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
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

          {/* Similar */}
          {!isBook && similar.length > 0 && (
            <div className={styles.similarSection}>
              <p className={styles.sectionLabel}>СХОЖІ</p>
              <div className={styles.similarRow}>
                {similar.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={styles.similarCard}
                    onClick={() => handleSimilarClick(s)}
                  >
                    {s.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${s.poster_path}`}
                        alt={s.title ?? s.name}
                        className={styles.similarPoster}
                      />
                    ) : (
                      <div className={styles.similarPosterFallback} />
                    )}
                    <p className={styles.similarTitle}>{s.title ?? s.name}</p>
                    <p className={styles.similarYear}>
                      {(s.release_date ?? s.first_air_date ?? '').slice(0, 4)}
                    </p>
                  </button>
                ))}
              </div>
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

    {similarPreview && (
      <div className={styles.simPreview}>
        {/* Hero */}
        <div className={styles.simHero}>
          {simHeroSrc
            ? <img src={simHeroSrc} alt={similarPreview.title ?? similarPreview.name} className={styles.simHeroImg} />
            : <div className={styles.simHeroFallback} />
          }
          <div className={styles.simHeroGrad} />
          <button type="button" className={styles.simBack} onClick={closeSimilarPreview} aria-label="Назад">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={styles.simTitleWrap}>
            <h2 className={styles.simTitle}>{similarPreview.title ?? similarPreview.name}</h2>
          </div>
        </div>

        {/* Content */}
        <div className={styles.simContent}>
          {loadingSimilarDet ? (
            <div className={styles.simSkeleton}>
              <div className={styles.simSkeletonLine} />
              <div className={styles.simSkeletonLine} style={{ width: '55%' }} />
            </div>
          ) : (
            <>
              <div className={styles.simMeta}>
                {((similarDetails?.release_date ?? similarDetails?.first_air_date ?? similarPreview.release_date ?? similarPreview.first_air_date) ?? '').slice(0, 4) && (
                  <span className={styles.simMetaChip}>
                    {((similarDetails?.release_date ?? similarDetails?.first_air_date ?? similarPreview.release_date ?? similarPreview.first_air_date) ?? '').slice(0, 4)}
                  </span>
                )}
                {similarDetails?.number_of_seasons > 0 && (
                  <span className={styles.simMetaChip}>{similarDetails.number_of_seasons} сезонів</span>
                )}
                {similarDetails?.vote_average > 0 && (
                  <span className={styles.simRating}>★ {similarDetails.vote_average.toFixed(1)}</span>
                )}
              </div>
              {(similarDetails?.genres?.length > 0) && (
                <div className={styles.simGenres}>
                  {similarDetails.genres.slice(0, 3).map((g: { id: number; name: string }) => (
                    <span key={g.id} className={styles.simGenre}>{g.name}</span>
                  ))}
                </div>
              )}
              {(similarDetails?.overview || similarPreview.overview) && (
                <p className={styles.simOverview}>{similarDetails?.overview || similarPreview.overview}</p>
              )}
            </>
          )}

          <div className={styles.simStatusWrap}>
            <p className={styles.simStatusLabel}>ДОДАТИ ЯК</p>
            <div className={styles.simStatusChips}>
              {similarStatusOptions.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`${styles.simStatusChip} ${similarStatus === s.value ? styles.simStatusActive : ''}`}
                  onClick={() => setSimilarStatus(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {onSimilarAdd && (
            <button type="button" className={styles.simAddBtn} onClick={handleSimilarAdd}>
              ДОДАТИ ДО СПИСКУ
            </button>
          )}
        </div>
      </div>
    )}

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
