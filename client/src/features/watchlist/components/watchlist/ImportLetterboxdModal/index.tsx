import React, { useRef, useState } from 'react'
import Modal from '@/shared/components/ui/Modal'
import { parseCsv } from '../../../utils/parseCsv'
import { TMDB_GENRES } from '../../../utils/tmdbGenres'
import type { WatchlistItem } from '@/shared/types'
import styles from './ImportLetterboxdModal.module.css'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

/**
 * ImportLetterboxdModal
 * ----------------------
 * Масовий імпорт фільмів з Letterboxd CSV-експорту (diary.csv / watched.csv /
 * watchlist.csv) — парсить файл, шукає кожен фільм у TMDB по назві+року,
 * створює watchlist-записи. Без серверних змін — той самий TMDB-пошук і
 * `addItem`, що й ручне додавання через WatchlistSearch.
 *
 * Props:
 * @prop {boolean}                                          isOpen
 * @prop {() => void}                                       onClose
 * @prop {WatchlistItem[]}                                  existingItems — для пропуску дублікатів без зайвих TMDB-запитів
 * @prop {(item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void} onAdd
 */
interface ImportLetterboxdModalProps {
  isOpen: boolean
  onClose: () => void
  existingItems: WatchlistItem[]
  onAdd: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => void
}

interface TmdbMovie {
  id: number
  title: string
  original_title?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date?: string
  genre_ids?: number[]
}

type Phase = 'idle' | 'importing' | 'done'

async function searchTmdbMovie(title: string, year: string): Promise<TmdbMovie | null> {
  const qs = new URLSearchParams({ api_key: TMDB_KEY, query: title, language: 'uk', page: '1' })
  if (year) qs.set('year', year)
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${qs}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0] ?? null
}

const ImportLetterboxdModal: React.FC<ImportLetterboxdModalProps> = ({
  isOpen, onClose, existingItems, onAdd,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [phase, setPhase]       = useState<Phase>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary]   = useState({ created: 0, skipped: 0, duplicates: 0 })

  const reset = () => {
    setFileName('')
    setPhase('idle')
    setProgress({ done: 0, total: 0 })
    setSummary({ created: 0, skipped: 0, duplicates: 0 })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) return

    const isDiary = Object.prototype.hasOwnProperty.call(rows[0], 'Watched Date')
    const existingTmdbIds = new Set(existingItems.filter(i => i.category === 'movie').map(i => i.tmdbId))

    setPhase('importing')
    setProgress({ done: 0, total: rows.length })

    let created = 0, skipped = 0, duplicates = 0

    for (const row of rows) {
      const title = (row['Name'] || row['Title'] || '').trim()
      const year  = (row['Year'] || '').trim()

      if (!title) {
        skipped++
        setProgress(p => ({ ...p, done: p.done + 1 }))
        continue
      }

      try {
        const match = await searchTmdbMovie(title, year)
        if (!match) {
          skipped++
        } else if (existingTmdbIds.has(match.id)) {
          duplicates++
        } else {
          const ratingRaw = parseFloat(row['Rating'] ?? '')
          const rating = !Number.isNaN(ratingRaw) && ratingRaw > 0 ? Math.round(ratingRaw * 2) : null

          onAdd({
            tmdbId: match.id,
            title: match.title,
            originalTitle: match.original_title ?? '',
            category: 'movie',
            status: isDiary ? 'watched' : 'want',
            posterPath: match.poster_path ?? null,
            backdropPath: match.backdrop_path ?? null,
            overview: match.overview ?? '',
            year: (match.release_date ?? '').slice(0, 4),
            genres: (match.genre_ids ?? []).map(id => TMDB_GENRES[id]).filter(Boolean),
            runtimeMin: null,
            episodeRuntimeMin: null,
            rating,
            seasonReminder: false,
            reminderDate: null,
          })
          existingTmdbIds.add(match.id)
          created++
        }
      } catch {
        skipped++
      }

      setProgress(p => ({ ...p, done: p.done + 1 }))
      await new Promise(r => setTimeout(r, 280)) // TMDB rate-limit throttle
    }

    setSummary({ created, skipped, duplicates })
    setPhase('done')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ІМПОРТ З LETTERBOXD" draggable>
      <div className={styles.body}>
        {phase === 'idle' && (
          <>
            <p className={styles.hint}>
              Експортуй дані на Letterboxd (Settings → Import &amp; Export → Export your data)
              і обери файл <code>diary.csv</code> або <code>watched.csv</code> (переглянуті) —
              чи <code>watchlist.csv</code> (хочу подивитись).
            </p>
            <label className={styles.fileBtn}>
              Обрати CSV-файл
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className={styles.fileInput}
                onChange={handleFileChange}
              />
            </label>
          </>
        )}

        {phase === 'importing' && (
          <div className={styles.progressWrap}>
            <div className={styles.spinner} />
            <p className={styles.progressText}>
              Імпорт «{fileName}»… {progress.done} / {progress.total}
            </p>
          </div>
        )}

        {phase === 'done' && (
          <div className={styles.summaryWrap}>
            <p className={styles.summaryLine}>
              <b className={styles.summaryNum}>{summary.created}</b> додано
            </p>
            {summary.duplicates > 0 && (
              <p className={styles.summaryLine}>
                <b className={styles.summaryNum}>{summary.duplicates}</b> вже були у списку
              </p>
            )}
            {summary.skipped > 0 && (
              <p className={styles.summaryLine}>
                <b className={styles.summaryNum}>{summary.skipped}</b> не знайдено в TMDB
              </p>
            )}
            <button type="button" className={styles.doneBtn} onClick={handleClose}>
              Готово
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ImportLetterboxdModal
