import React, { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '../../../services/api'
import styles from './WatchlistSearch.module.css'
import type { WatchlistCategory, WatchlistItem, WatchlistStatus } from '../../../types'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMG = 'https://image.tmdb.org/t/p/w92'

const TMDB_GENRES: Record<number, string> = {
  28: 'Бойовик', 12: 'Пригоди', 16: 'Анімація', 35: 'Комедія',
  80: 'Кримінал', 99: 'Документальний', 18: 'Драма', 10751: 'Сімейний',
  14: 'Фентезі', 36: 'Історичний', 27: 'Жахи', 10402: 'Музичний',
  9648: 'Містика', 10749: 'Романтика', 878: 'Фантастика', 53: 'Трилер',
  10752: 'Воєнний', 37: 'Вестерн', 10759: 'Пригоди',
  10765: 'Sci-Fi & Fantasy', 10762: 'Дитячий', 10766: 'Мило', 10767: 'Ток-шоу',
}

interface SearchResult {
  tmdbId: number
  title: string
  originalTitle: string
  posterPath: string | null
  backdropPath: string | null
  overview: string
  year: string
  genres: string[]
  authors?: string[]
  pageCount?: number
  thumbnail?: string
  totalEpisodes?: number | null
  totalSeasons?: number | null
  nextEpisodeDate?: string | null
}

/**
 * WatchlistSearch
 * ---------------
 * Search bar with TMDB / Google Books results and fullscreen preview before adding.
 * Tap a result → fullscreen preview slides in (slideInRight).
 * "←" returns to results; "ДОДАТИ ДО СПИСКУ" saves and closes.
 *
 * Props:
 * @prop {WatchlistCategory}                          category — current active tab
 * @prop {(item: Omit<WatchlistItem,'id'|'addedAt'>) => void} onAdd — add to store
 */
interface WatchlistSearchProps {
  category: WatchlistCategory
  onAdd: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
}

const STATUS_PREVIEW_DEFAULT: { value: WatchlistStatus; label: string }[] = [
  { value: 'want',     label: 'ХОЧУ'    },
  { value: 'watching', label: 'ДИВЛЮСЬ' },
  { value: 'watched',  label: 'ГЛЯНУВ'  },
]

const STATUS_PREVIEW_BOOK: { value: WatchlistStatus; label: string }[] = [
  { value: 'want',     label: 'ХОЧУ'      },
  { value: 'watching', label: 'ЧИТАЮ'     },
  { value: 'watched',  label: 'ПРОЧИТАВ'  },
]

const WatchlistSearch: React.FC<WatchlistSearchProps> = ({ category, onAdd }) => {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [isOpen, setIsOpen]   = useState(false)
  const [searchActive, setSearchActive] = useState(false)

  // Fullscreen preview
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preview, setPreview]               = useState<SearchResult | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewDetails, setPreviewDetails] = useState<any>(null)
  const [selectedStatus, setSelectedStatus] = useState<WatchlistStatus>('want')
  const [loadingDetails, setLoadingDetails] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activateSearch = () => {
    setSearchActive(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const deactivateSearch = () => {
    setSearchActive(false)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setPreview(null)
    setPreviewDetails(null)
    setSelectedStatus('want')
    inputRef.current?.blur()
  }

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setIsOpen(false); return }
    setLoading(true)
    setError('')
    try {
      if (category === 'book') {
        const res = await authFetch(`/api/books/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) { setError('Помилка пошуку книг'); return }
        const items: SearchResult[] = await res.json()
        setResults(items)
      } else {
        const endpoint = category === 'movie' ? 'search/movie' : 'search/tv'
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=uk&page=1`
        )
        const data = await res.json()
        let list = data.results ?? []

        if (category === 'anime') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          list = list.filter((r: any) =>
            r.genre_ids?.includes(16) &&
            (r.origin_country?.includes('JP') || r.original_language === 'ja')
          )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: SearchResult[] = list.slice(0, 10).map((r: any) => ({
          tmdbId: r.id,
          title: r.title ?? r.name ?? 'Без назви',
          originalTitle: r.original_title ?? r.original_name ?? '',
          posterPath: r.poster_path ?? null,
          backdropPath: r.backdrop_path ?? null,
          overview: r.overview ?? '',
          year: (r.release_date ?? r.first_air_date ?? '').slice(0, 4),
          genres: (r.genre_ids ?? []).map((id: number) => TMDB_GENRES[id]).filter(Boolean),
        }))
        setResults(items)
      }
      setIsOpen(true)
    } catch {
      setError('Помилка пошуку')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); setIsOpen(false); return }
    const minLen = category === 'book' ? 3 : 2
    const delay  = category === 'book' ? 900 : 500
    if (query.trim().length < minLen) return
    timerRef.current = setTimeout(() => search(query), delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search, category])

  useEffect(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setPreview(null)
    setPreviewDetails(null)
    setSelectedStatus('want')
    setSearchActive(false)
  }, [category])

  const handleResultClick = async (result: SearchResult) => {
    setPreview(result)
    setPreviewDetails(null)
    setSelectedStatus('want')

    if (category === 'book' || !TMDB_KEY) return

    setLoadingDetails(true)
    let cancelled = false
    try {
      const endpoint = category === 'movie'
        ? `https://api.themoviedb.org/3/movie/${result.tmdbId}`
        : `https://api.themoviedb.org/3/tv/${result.tmdbId}`

      const r = await fetch(`${endpoint}?api_key=${TMDB_KEY}&language=uk-UA`)
      if (r.ok && !cancelled) {
        const data = await r.json()
        setPreviewDetails(data)
      }
    } catch { /* silent */ }
    finally {
      if (!cancelled) setLoadingDetails(false)
    }
    // allow GC to set cancelled if component unmounts during fetch
    return () => { cancelled = true }
  }

  const handleAdd = () => {
    if (!preview) return
    const d = previewDetails
    const genres = d?.genres?.map((g: { name: string }) => g.name) ?? preview.genres
    const backdropPath = d?.backdrop_path ?? preview.backdropPath

    onAdd({
      tmdbId:        preview.tmdbId,
      title:         preview.title,
      originalTitle: preview.originalTitle,
      category,
      status:        selectedStatus,
      posterPath:    preview.posterPath,
      backdropPath,
      overview:      d?.overview || preview.overview,
      year:          preview.year,
      genres,
      rating:        null,
      seasonReminder: false,
      reminderDate:  null,
      authors:       preview.authors,
      pageCount:     preview.pageCount,
      thumbnail:     preview.thumbnail,
      totalEpisodes:   d?.number_of_episodes   ?? null,
      totalSeasons:    d?.number_of_seasons    ?? null,
      nextEpisodeDate: d?.next_episode_to_air?.air_date ?? null,
    })
    deactivateSearch()
  }

  const hasKey = !!TMDB_KEY && TMDB_KEY !== 'your_tmdb_api_key_here'
  const showResults = searchActive && !preview && (isOpen || !!error || (!hasKey && category !== 'book'))
  const statusPreviewOptions = category === 'book' ? STATUS_PREVIEW_BOOK : STATUS_PREVIEW_DEFAULT

  const placeholder =
    category === 'book'   ? 'Пошук книги...'   :
    category === 'anime'  ? 'Пошук аніме...'   :
    category === 'series' ? 'Пошук серіалу...' :
                            'Пошук фільму...'

  const heroSrc = (() => {
    if (!preview) return null
    if (previewDetails?.backdrop_path) return `https://image.tmdb.org/t/p/w780${previewDetails.backdrop_path}`
    if (preview.backdropPath)          return `https://image.tmdb.org/t/p/w780${preview.backdropPath}`
    if (preview.posterPath)            return `https://image.tmdb.org/t/p/w500${preview.posterPath}`
    return preview.thumbnail ?? null
  })()

  return (
    <div className={styles.wrap}>
      {/* Backdrop overlay — closes search */}
      {searchActive && !preview && (
        <div className={styles.searchOverlay} onClick={deactivateSearch} />
      )}

      {/* Search bar — fixed to top when active */}
      <div className={`${styles.searchBar} ${searchActive ? styles.searchBarActive : ''}`}>
        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={activateSearch}
            placeholder={placeholder}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
              aria-label="Очистити"
            >
              ✕
            </button>
          )}
          {loading && <div className={styles.spinner} />}
        </div>

        {searchActive && (
          <button type="button" className={styles.cancelBtn} onClick={deactivateSearch}>
            Скасувати
          </button>
        )}
      </div>

      {/* Results panel */}
      {showResults && (
        <div className={styles.searchResults}>
          {!hasKey && category !== 'book' && (
            <p className={styles.apiWarning}>
              Додай VITE_TMDB_API_KEY у .env для пошуку
            </p>
          )}

          {error && <p className={styles.err}>{error}</p>}

          {isOpen && results.length > 0 && results.map((r, i) => {
            const thumb = r.thumbnail ?? (r.posterPath ? `${TMDB_IMG}${r.posterPath}` : null)
            return (
              <button
                key={`${r.tmdbId}-${i}`}
                type="button"
                className={styles.result}
                onClick={() => handleResultClick(r)}
              >
                <div className={styles.resultImg}>
                  {thumb
                    ? <img src={thumb} alt={r.title} className={styles.resultPoster} />
                    : <span className={styles.resultImgFallback}>?</span>
                  }
                </div>
                <div className={styles.resultInfo}>
                  <span className={styles.resultTitle}>{r.title}</span>
                  {category === 'book' && r.authors && r.authors.length > 0 && (
                    <span className={styles.resultAuthor}>{r.authors.join(', ')}</span>
                  )}
                  {category !== 'book' && r.originalTitle && r.originalTitle !== r.title && (
                    <span className={styles.resultOriginal}>{r.originalTitle}</span>
                  )}
                  {r.year && <span className={styles.resultYear}>{r.year}</span>}
                </div>
              </button>
            )
          })}

          {isOpen && results.length === 0 && !loading && query && (
            <div className={styles.noResults}>Нічого не знайдено</div>
          )}
        </div>
      )}

      {/* ── Fullscreen Preview ── */}
      {preview && (
        <div className={styles.previewScreen}>
          {/* Hero */}
          <div className={styles.previewHero}>
            {heroSrc ? (
              <img src={heroSrc} alt={preview.title} className={styles.previewHeroImg} />
            ) : (
              <div className={styles.previewHeroFallback} />
            )}
            <div className={styles.previewHeroGradient} />

            <button
              type="button"
              className={styles.previewBack}
              onClick={() => { setPreview(null); setPreviewDetails(null) }}
              aria-label="Назад"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className={styles.previewTitleWrap}>
              <h2 className={styles.previewTitle}>{preview.title}</h2>
              {preview.originalTitle && preview.originalTitle !== preview.title && (
                <p className={styles.previewOriginal}>{preview.originalTitle}</p>
              )}
            </div>
          </div>

          {/* Content */}
          <div className={styles.previewContent}>
            {loadingDetails ? (
              <div className={styles.previewSkeleton}>
                <div className={styles.previewSkeletonLine} />
                <div className={styles.previewSkeletonLine} style={{ width: '60%' }} />
              </div>
            ) : (
              <>
                {/* Meta chips */}
                <div className={styles.previewMeta}>
                  {preview.year && (
                    <span className={styles.previewMetaChip}>{preview.year}</span>
                  )}
                  {previewDetails?.runtime > 0 && (
                    <span className={styles.previewMetaChip}>
                      {Math.floor(previewDetails.runtime / 60)}г {previewDetails.runtime % 60}хв
                    </span>
                  )}
                  {previewDetails?.number_of_seasons > 0 && (
                    <span className={styles.previewMetaChip}>
                      {previewDetails.number_of_seasons} сезонів
                    </span>
                  )}
                  {previewDetails?.vote_average > 0 && (
                    <span className={styles.previewRating}>
                      ★ {previewDetails.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Genres */}
                {(previewDetails?.genres?.length > 0 || preview.genres.length > 0) && (
                  <div className={styles.previewGenres}>
                    {(previewDetails?.genres?.slice(0, 3) ?? preview.genres.slice(0, 3))
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .map((g: any) => (
                        <span key={typeof g === 'string' ? g : g.id} className={styles.previewGenre}>
                          {typeof g === 'string' ? g : g.name}
                        </span>
                      ))}
                  </div>
                )}

                {/* Overview */}
                {(previewDetails?.overview || preview.overview) && (
                  <p className={styles.previewOverview}>
                    {previewDetails?.overview || preview.overview}
                  </p>
                )}
              </>
            )}

            {/* Status picker */}
            <div className={styles.previewStatusWrap}>
              <p className={styles.previewStatusLabel}>ДОДАТИ ЯК</p>
              <div className={styles.previewStatusChips}>
                {statusPreviewOptions.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`${styles.previewStatusChip} ${selectedStatus === s.value ? styles.previewStatusActive : ''}`}
                    onClick={() => setSelectedStatus(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Add button */}
            <button type="button" className={styles.previewAddBtn} onClick={handleAdd}>
              ДОДАТИ ДО СПИСКУ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WatchlistSearch
