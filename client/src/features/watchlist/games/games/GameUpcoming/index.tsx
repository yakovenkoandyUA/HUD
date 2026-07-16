import React, { useEffect, useRef, useState } from 'react'
import { authFetch } from '@/shared/services/api'
import styles from './GameUpcoming.module.css'
import type { GameItem } from '@/shared/types'

interface UpcomingGame {
  rawgId: number
  title: string
  coverUrl: string
  releaseDate: string
  metacritic: number | null
  platforms: string[]
  genres: string[]
}

const MONTH_UA = ['Січня','Лютого','Березня','Квітня','Травня','Червня','Липня','Серпня','Вересня','Жовтня','Листопада','Грудня']

function formatReleaseDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getDate()} ${MONTH_UA[d.getMonth()]}`
}

const PLATFORM_SHORT: Record<string, string> = {
  'PC': 'PC', 'PS5': 'PS5', 'PS4': 'PS4',
  'Xbox Series': 'XBX', 'Xbox One': 'XBX',
  'Switch': 'NSW', 'iOS': 'iOS', 'Android': 'AND',
}

/**
 * GameUpcoming
 * ------------
 * Horizontal scroll strip of games releasing this month (from RAWG).
 * Tapping a card opens an add-preview with status picker.
 * Skips games already in the user's list (by rawgId).
 *
 * Props:
 * @prop {GameItem[]}                                         ownedGames — user's current list, used to skip duplicates
 * @prop {(game: Omit<GameItem, 'id' | 'addedAt'>) => void}  onAdd      — save game to store
 */
interface GameUpcomingProps {
  ownedGames: GameItem[]
  onAdd: (game: Omit<GameItem, 'id' | 'addedAt'>) => void
}

const STATUS_OPTIONS: { value: GameItem['status']; label: string }[] = [
  { value: 'announced', label: 'Анонс'    },
  { value: 'want',      label: 'Хочу'     },
  { value: 'playing',   label: 'Граю'     },
  { value: 'completed', label: 'Пройдено' },
]

const GameUpcoming: React.FC<GameUpcomingProps> = ({ ownedGames, onAdd }) => {
  const [games, setGames]       = useState<UpcomingGame[]>([])
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState<UpcomingGame | null>(null)
  const [status, setStatus]     = useState<GameItem['status']>('announced')
  const prevRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/games/upcoming')
        if (!res.ok || cancelled) return
        const data: UpcomingGame[] = await res.json()
        if (!cancelled) setGames(data)
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const ownedRawgIds = new Set(ownedGames.map(g => g.rawgId).filter(Boolean))
  const visible = games.filter(g => !ownedRawgIds.has(g.rawgId))

  useEffect(() => {
    if (!preview) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (prevRef.current && !prevRef.current.contains(e.target as Node)) setPreview(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [preview])

  const handleAdd = () => {
    if (!preview) return
    onAdd({
      rawgId:        preview.rawgId,
      title:         preview.title,
      coverUrl:      preview.coverUrl,
      backgroundUrl: '',
      status,
      platforms:     preview.platforms,
      genres:        preview.genres,
      releaseDate:   preview.releaseDate,
      rating:        null,
      hoursPlayed:   null,
      notes:         '',
      platinum:      false,
      metacritic:    null,
      completedAt:   null,
    })
    setPreview(null)
  }

  if (!loading && visible.length === 0) return null

  const now = new Date()
  const monthLabel = `${MONTH_UA[now.getMonth()].toUpperCase()} ${now.getFullYear()}`

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>ВИХОДЯТЬ</span>
        <span className={styles.month}>{monthLabel}</span>
      </div>

      {loading ? (
        <div className={styles.strip}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : (
        <div className={styles.strip}>
          {visible.map(game => (
            <button
              key={game.rawgId}
              type="button"
              className={styles.card}
              onClick={() => { setPreview(game); setStatus('announced') }}
            >
              <div className={styles.cover}>
                {game.coverUrl
                  ? <img src={game.coverUrl} alt={game.title} className={styles.coverImg} loading="lazy" />
                  : <div className={styles.coverFallback} />
                }
                {game.metacritic && (
                  <span className={`${styles.score} ${game.metacritic >= 75 ? styles.scoreGood : game.metacritic >= 50 ? styles.scoreMid : styles.scoreLow}`}>
                    {game.metacritic}
                  </span>
                )}
              </div>
              <p className={styles.cardTitle}>{game.title}</p>
              <p className={styles.cardDate}>{formatReleaseDate(game.releaseDate)}</p>
              {game.platforms.length > 0 && (
                <div className={styles.platforms}>
                  {game.platforms.slice(0, 3).map(p => (
                    <span key={p} className={styles.platformPill}>{PLATFORM_SHORT[p] ?? p}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewCard} ref={prevRef}>
            {preview.coverUrl && (
              <img src={preview.coverUrl} alt={preview.title} className={styles.previewCover} />
            )}
            <div className={styles.previewBody}>
              <p className={styles.previewTitle}>{preview.title}</p>
              <p className={styles.previewDate}>{formatReleaseDate(preview.releaseDate)}</p>
              <div className={styles.statusRow}>
                {STATUS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    className={`${styles.statusChip} ${status === o.value ? styles.statusChipActive : ''}`}
                    onClick={() => setStatus(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className={styles.previewActions}>
                <button type="button" className={styles.addBtn} onClick={handleAdd}>
                  Додати
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setPreview(null)}>
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameUpcoming
