import React, { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '@/shared/services/api'
import styles from './GameSearch.module.css'
import type { GameItem, GameStatus } from '@/shared/types'

interface RawgResult {
  rawgId: number
  title: string
  coverUrl: string
  backgroundUrl: string
  releaseDate: string
  metacritic: number | null
  platforms: string[]
  genres: string[]
}

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: 'want',      label: 'ХОЧУ'     },
  { value: 'playing',   label: 'ГРАЮ'     },
  { value: 'completed', label: 'ПРОЙДЕНО' },
  { value: 'announced', label: 'АНОНС'    },
]

/**
 * GameSearch
 * ----------
 * Fullscreen search overlay triggered by parent (isOpen prop).
 * Searches RAWG via /api/games/search. Tap result → preview → add.
 * Renders nothing when closed — no persistent bar in the screen.
 *
 * Props:
 * @prop {boolean}                                          isOpen  — show/hide overlay
 * @prop {() => void}                                       onClose — called on cancel or add
 * @prop {(game: Omit<GameItem, 'id' | 'addedAt'>) => void} onAdd   — save game to store
 */
interface GameSearchProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (game: Omit<GameItem, 'id' | 'addedAt'>) => void
}

const GameSearch: React.FC<GameSearchProps> = ({ isOpen, onClose, onAdd }) => {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<RawgResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  const [preview, setPreview]     = useState<RawgResult | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<GameStatus>('want')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
    } else {
      reset()
    }
  }, [isOpen])

  const reset = () => {
    setQuery('')
    setResults([])
    setResultsOpen(false)
    setPreview(null)
    setSelectedStatus('want')
    setError('')
    inputRef.current?.blur()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setResultsOpen(false); return }
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/games/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Помилка пошуку')
        return
      }
      const data: RawgResult[] = await res.json()
      setResults(data)
      setResultsOpen(true)
    } catch {
      setError('Помилка пошуку')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setResults([]); setResultsOpen(false); return }
    if (query.trim().length < 2) return
    timerRef.current = setTimeout(() => search(query), 600)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  const handleAdd = () => {
    if (!preview) return
    onAdd({
      rawgId:        preview.rawgId,
      title:         preview.title,
      coverUrl:      preview.coverUrl,
      backgroundUrl: preview.backgroundUrl,
      platforms:     preview.platforms,
      status:        selectedStatus,
      platinum:      false,
      rating:        null,
      genres:        preview.genres,
      releaseDate:   preview.releaseDate,
      metacritic:    preview.metacritic,
      notes:         '',
      hoursPlayed:   null,
      completedAt:   null,
    })
    handleClose()
  }

  if (!isOpen && !preview) return null

  return (
    <div className={styles.wrap}>
      {/* Backdrop */}
      {!preview && (
        <div className={styles.overlay} onClick={handleClose} />
      )}

      {/* Search bar — fixed under AppHeader */}
      {!preview && (
        <div className={styles.searchBar}>
          <div className={styles.inputRow}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className={styles.input}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Пошук гри..."
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { setQuery(''); setResults([]); setResultsOpen(false) }}
              >✕</button>
            )}
            {loading && <div className={styles.spinner} />}
          </div>
          <button type="button" className={styles.cancelBtn} onClick={handleClose}>
            Скасувати
          </button>
        </div>
      )}

      {/* Results list */}
      {!preview && (resultsOpen || !!error) && (
        <div className={styles.results}>
          {error && <p className={styles.err}>{error}</p>}
          {resultsOpen && results.length > 0 && results.map(r => (
            <button
              key={r.rawgId}
              type="button"
              className={styles.result}
              onClick={() => { setPreview(r); setSelectedStatus('want') }}
            >
              <div className={styles.resultThumb}>
                {r.coverUrl
                  ? <img src={r.coverUrl} alt={r.title} className={styles.resultImg} />
                  : <span className={styles.resultImgFallback}>🎮</span>
                }
              </div>
              <div className={styles.resultInfo}>
                <span className={styles.resultTitle}>{r.title}</span>
                {r.releaseDate && <span className={styles.resultYear}>{r.releaseDate.slice(0, 4)}</span>}
                {r.platforms.length > 0 && (
                  <span className={styles.resultPlatforms}>{r.platforms.slice(0, 3).join(' · ')}</span>
                )}
              </div>
              {r.metacritic && (
                <span className={`${styles.metacritic} ${r.metacritic >= 75 ? styles.metacriticGood : r.metacritic >= 50 ? styles.metacriticOk : styles.metacriticBad}`}>
                  {r.metacritic}
                </span>
              )}
            </button>
          ))}
          {resultsOpen && results.length === 0 && !loading && query && (
            <div className={styles.noResults}>Нічого не знайдено</div>
          )}
        </div>
      )}

      {/* Game preview fullscreen */}
      {preview && (
        <div className={styles.previewScreen}>
          <div className={styles.previewHeader}>
            <button type="button" className={styles.previewBack} onClick={() => setPreview(null)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className={styles.previewHero}>
            {preview.backgroundUrl
              ? <img src={preview.backgroundUrl} alt={preview.title} className={styles.previewHeroImg} />
              : <div className={styles.previewHeroFallback} />
            }
            <div className={styles.previewHeroGradient} />
            <div className={styles.previewTitleWrap}>
              <h2 className={styles.previewTitle}>{preview.title}</h2>
            </div>
          </div>

          <div className={styles.previewContent}>
            <div className={styles.previewMeta}>
              {preview.releaseDate && (
                <span className={styles.previewMetaChip}>{preview.releaseDate.slice(0, 4)}</span>
              )}
              {preview.metacritic && (
                <span className={`${styles.previewMetaChip} ${preview.metacritic >= 75 ? styles.metacriticGood : styles.metacriticOk}`}>
                  MC {preview.metacritic}
                </span>
              )}
            </div>

            {preview.platforms.length > 0 && (
              <div className={styles.previewPlatforms}>
                {preview.platforms.map(p => (
                  <span key={p} className={styles.platformChip}>{p}</span>
                ))}
              </div>
            )}

            {preview.genres.length > 0 && (
              <div className={styles.previewGenres}>
                {preview.genres.slice(0, 4).map(g => (
                  <span key={g} className={styles.previewGenre}>{g}</span>
                ))}
              </div>
            )}

            <div className={styles.previewStatusWrap}>
              <p className={styles.previewStatusLabel}>ДОДАТИ ЯК</p>
              <div className={styles.previewStatusChips}>
                {STATUS_OPTIONS.map(s => (
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

            <button type="button" className={styles.addBtn} onClick={handleAdd}>
              ДОДАТИ ДО СПИСКУ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameSearch
