import React, { useState, useCallback, useEffect, useRef } from 'react'
import { authFetch } from '@/shared/services/api'
import type { WatchlistItem, WatchlistStatus } from '@/shared/types'
import styles from '../../components/watchlist/WatchlistSearch/WatchlistSearch.module.css'

const BOOK_STATUS_LABELS: Record<WatchlistStatus, string> = {
  want:     'Хочу прочитати',
  watching: 'Читаю',
  watched:  'Прочитав',
  dropped:  'Кинув',
}

interface BookResult {
  googleId: string
  title: string
  authors: string[]
  description: string
  year: string
  pageCount: number | null
  genres: string[]
  cover: string | null
  isbn: string | null
  avgRating: number | null
}

/**
 * BookSearch
 * ----------
 * Search bar for books via /api/books/search (Google Books proxy).
 * Fullscreen preview with status picker before adding.
 *
 * Props:
 * @prop {(item: Omit<WatchlistItem, 'id'|'addedAt'>) => void} onAdd — callback to add book
 */
interface BookSearchProps {
  onAdd: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
}

const BookSearch: React.FC<BookSearchProps> = ({ onAdd }) => {
  const [query, setQuery]       = useState('')
  const [active, setActive]     = useState(false)
  const [results, setResults]   = useState<BookResult[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [preview, setPreview]   = useState<BookResult | null>(null)
  const [status, setStatus]     = useState<WatchlistStatus>('want')
  const inputRef                = useRef<HTMLInputElement>(null)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/books/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error()
      setResults(await res.json())
    } catch {
      setError('Помилка пошуку')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search, active])

  const handleCancel = () => {
    setActive(false)
    setQuery('')
    setResults([])
    setPreview(null)
    setError(null)
  }

  const handleAdd = () => {
    if (!preview) return
    onAdd({
      tmdbId:        0,
      title:         preview.title,
      originalTitle: preview.title,
      category:      'book',
      status,
      posterPath:    null,
      backdropPath:  null,
      overview:      preview.description,
      year:          preview.year,
      genres:        preview.genres,
      rating:        null,
      seasonReminder: false,
      reminderDate:  null,
      thumbnail:     preview.cover ?? undefined,
      author:        preview.authors.join(', '),
      pageCount:     preview.pageCount,
      isbn:          preview.isbn,
    })
    handleCancel()
  }

  return (
    <div className={styles.wrap}>
      {active && <div className={styles.searchOverlay} onClick={handleCancel} />}

      <div className={active ? styles.searchBarActive : styles.searchBar}>
        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Пошук книги..."
            value={query}
            onFocus={() => setActive(true)}
            onChange={e => setQuery(e.target.value)}
          />
          {loading && <span className={styles.spinner} />}
          {query && !loading && (
            <button className={styles.clearBtn} onClick={() => { setQuery(''); setResults([]) }}>✕</button>
          )}
        </div>
        {active && (
          <button className={styles.cancelBtn} onClick={handleCancel}>Скасувати</button>
        )}
      </div>

      {/* Results list */}
      {active && (
        <div className={styles.searchResults}>
          {error && <p className={styles.err}>{error}</p>}
          {!error && results.map(book => (
            <button key={book.googleId} className={styles.result} onClick={() => setPreview(book)}>
              <div className={styles.resultImg}>
                {book.cover
                  ? <img src={book.cover} alt={book.title} className={styles.resultPoster} />
                  : <span className={styles.resultImgFallback}>📖</span>
                }
              </div>
              <div className={styles.resultInfo}>
                <span className={styles.resultTitle}>{book.title}</span>
                {book.authors.length > 0 && (
                  <span className={styles.resultAuthor}>{book.authors.join(', ')}</span>
                )}
                <span className={styles.resultYear}>{book.year}{book.pageCount ? ` · ${book.pageCount} стор.` : ''}</span>
              </div>
            </button>
          ))}
          {!loading && !error && query && results.length === 0 && (
            <p className={styles.noResults}>Нічого не знайдено</p>
          )}
        </div>
      )}

      {/* Fullscreen preview */}
      {preview && (
        <div className={styles.previewScreen}>
          <div className={styles.previewHeader}>
            <button className={styles.previewBack} onClick={() => setPreview(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <button className={styles.previewSearchTrigger} onClick={() => setPreview(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span className={styles.previewSearchQuery}>{query}</span>
            </button>
          </div>

          {/* Book hero — cover centered on dark bg */}
          <div className={styles.previewHero} style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {preview.cover
              ? <img src={preview.cover.replace('zoom=1', 'zoom=3').replace('&edge=curl', '')} alt={preview.title} style={{ height: '100%', width: 'auto', objectFit: 'contain', display: 'block' }} />
              : <div className={styles.previewHeroFallback} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📖</div>
            }
            <div className={styles.previewHeroGradient} />
            <div className={styles.previewTitleWrap}>
              <h2 className={styles.previewTitle}>{preview.title}</h2>
              {preview.authors.length > 0 && (
                <p className={styles.previewOriginal}>{preview.authors.join(', ')}</p>
              )}
            </div>
          </div>

          <div className={styles.previewContent}>
            {/* Meta chips */}
            <div className={styles.previewMeta}>
              {preview.year && <span className={styles.previewMetaChip}>{preview.year}</span>}
              {preview.pageCount && <span className={styles.previewMetaChip}>{preview.pageCount} стор.</span>}
              {preview.isbn && <span className={styles.previewMetaChip}>ISBN {preview.isbn}</span>}
              {preview.avgRating && <span className={styles.previewRating}>★ {preview.avgRating}</span>}
            </div>

            {/* Genres */}
            {preview.genres.length > 0 && (
              <div className={styles.previewGenres}>
                {preview.genres.slice(0, 5).map(g => (
                  <span key={g} className={styles.previewGenre}>{g}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {preview.description && (
              <p className={styles.previewOverview}>{preview.description}</p>
            )}

            {/* Status picker */}
            <div className={styles.previewStatusWrap}>
              <p className={styles.previewStatusLabel}>ДОДАТИ ЯК</p>
              <div className={styles.previewStatusChips}>
                {(Object.entries(BOOK_STATUS_LABELS) as [WatchlistStatus, string][]).map(([s, label]) => (
                  <button
                    key={s}
                    className={`${styles.previewStatusChip} ${status === s ? styles.previewStatusActive : ''}`}
                    onClick={() => setStatus(s)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button className={styles.previewAddBtn} onClick={handleAdd}>
              Додати до бібліотеки
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookSearch
