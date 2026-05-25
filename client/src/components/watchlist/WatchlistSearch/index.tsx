import React, { useCallback, useEffect, useRef, useState } from 'react'
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

const STATUS_OPTIONS: { value: WatchlistStatus; label: string }[] = [
  { value: 'want',     label: 'Хочу' },
  { value: 'watching', label: 'Дивлюсь' },
  { value: 'watched',  label: 'Переглянув' },
  { value: 'dropped',  label: 'Кинув' },
]

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
}

/**
 * WatchlistSearch
 * ---------------
 * Search bar with TMDB / Google Books results and inline add flow.
 *
 * Props:
 * @prop {WatchlistCategory}                         category — current active tab
 * @prop {(item: Omit<WatchlistItem,'id'|'addedAt'>) => void} onAdd — add to store
 */
interface WatchlistSearchProps {
  category: WatchlistCategory
  onAdd: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
}

const WatchlistSearch: React.FC<WatchlistSearchProps> = ({ category, onAdd }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [status, setStatus] = useState<WatchlistStatus>('want')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setIsOpen(false); return }
    setLoading(true)
    setError('')
    try {
      if (category === 'book') {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`
        )
        const data = await res.json()
        const items: SearchResult[] = (data.items ?? []).map((b: any) => ({
          tmdbId: 0,
          title: b.volumeInfo?.title ?? 'Невідома назва',
          originalTitle: b.volumeInfo?.title ?? '',
          posterPath: null,
          backdropPath: null,
          overview: b.volumeInfo?.description ?? '',
          year: b.volumeInfo?.publishedDate?.slice(0, 4) ?? '',
          genres: b.volumeInfo?.categories ?? [],
          authors: b.volumeInfo?.authors ?? [],
          pageCount: b.volumeInfo?.pageCount,
          thumbnail: b.volumeInfo?.imageLinks?.thumbnail?.replace('http://', 'https://'),
        }))
        setResults(items)
      } else {
        const endpoint = category === 'movie' ? 'search/movie' : 'search/tv'
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=uk&page=1`
        )
        const data = await res.json()
        let list = data.results ?? []

        if (category === 'anime') {
          list = list.filter(
            (r: any) =>
              r.genre_ids?.includes(16) &&
              (r.origin_country?.includes('JP') || r.original_language === 'ja')
          )
        }

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
    timerRef.current = setTimeout(() => search(query), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  // close dropdown on category change
  useEffect(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelected(null)
  }, [category])

  const handleSelect = (r: SearchResult) => {
    setSelected(r)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  const handleAdd = () => {
    if (!selected) return
    onAdd({
      tmdbId: selected.tmdbId,
      title: selected.title,
      originalTitle: selected.originalTitle,
      category,
      status,
      posterPath: selected.posterPath,
      backdropPath: selected.backdropPath,
      overview: selected.overview,
      year: selected.year,
      genres: selected.genres,
      rating: null,
      seasonReminder: false,
      reminderDate: null,
      authors: selected.authors,
      pageCount: selected.pageCount,
      thumbnail: selected.thumbnail,
    })
    setSelected(null)
    setStatus('want')
  }

  const hasKey = !!TMDB_KEY && TMDB_KEY !== 'your_tmdb_api_key_here'

  return (
    <div className={styles.wrap}>
      {/* Search input */}
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
          placeholder={
            category === 'book'
              ? 'Пошук книги...'
              : category === 'anime'
              ? 'Пошук аніме...'
              : category === 'series'
              ? 'Пошук серіалу...'
              : 'Пошук фільму...'
          }
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

      {!hasKey && category !== 'book' && (
        <p className={styles.apiWarning}>
          Додай VITE_TMDB_API_KEY у .env для пошуку
        </p>
      )}

      {error && <p className={styles.err}>{error}</p>}

      {/* Search results dropdown */}
      {isOpen && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((r, i) => {
            const thumb = r.thumbnail
              ?? (r.posterPath ? `${TMDB_IMG}${r.posterPath}` : null)
            return (
              <button
                key={`${r.tmdbId}-${i}`}
                type="button"
                className={styles.result}
                onClick={() => handleSelect(r)}
              >
                <div className={styles.resultImg}>
                  {thumb
                    ? <img src={thumb} alt={r.title} className={styles.resultPoster} />
                    : <span className={styles.resultImgFallback}>?</span>
                  }
                </div>
                <div className={styles.resultInfo}>
                  <span className={styles.resultTitle}>{r.title}</span>
                  {r.year && <span className={styles.resultYear}>{r.year}</span>}
                  {r.originalTitle && r.originalTitle !== r.title && (
                    <span className={styles.resultOriginal}>{r.originalTitle}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {isOpen && results.length === 0 && !loading && query && (
        <div className={styles.noResults}>Нічого не знайдено</div>
      )}

      {/* Add panel - shown after selecting a result */}
      {selected && (
        <div className={styles.addPanel}>
          <div className={styles.addPreview}>
            {(selected.thumbnail ?? (selected.posterPath ? `${TMDB_IMG}${selected.posterPath}` : null)) ? (
              <img
                src={selected.thumbnail ?? `${TMDB_IMG}${selected.posterPath}`}
                alt={selected.title}
                className={styles.addPoster}
              />
            ) : (
              <div className={styles.addPosterFallback}>?</div>
            )}
            <div className={styles.addMeta}>
              <p className={styles.addTitle}>{selected.title}</p>
              {selected.year && <span className={styles.addYear}>{selected.year}</span>}
            </div>
            <button
              type="button"
              className={styles.addCancel}
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>

          <div className={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.statusBtn} ${status === opt.value ? styles.statusActive : ''}`}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button type="button" className={styles.addBtn} onClick={handleAdd}>
            Додати до списку
          </button>
        </div>
      )}
    </div>
  )
}

export default WatchlistSearch
