import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { useWatchlistStore } from '../../../store/watchlistStore'
import type { WatchlistItem } from '../../../types'
import styles from './WatchlistStatsSheet.module.css'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

// Fallback хвилини на одиницю — лише коли TMDB не дає точних даних
const FALLBACK_MOVIE_MIN  = 120
const FALLBACK_SERIES_MIN = 45
const FALLBACK_ANIME_MIN  = 24

interface Comparison { Icon: React.FC; text: string }

function countEpisodes(item: WatchlistItem): number {
  if (item.status === 'watched' && item.totalEpisodes) return item.totalEpisodes
  return item.watchedEpisodes?.length ?? 0
}

const WALK_DESTS = [
  { city: 'Вінниці',   km: 260  },
  { city: 'Варшави',   km: 800  },
  { city: 'Берліна',   km: 1400 },
  { city: 'Риму',      km: 2000 },
  { city: 'Мадрида',   km: 3200 },
  { city: 'Пекіна',    km: 6500 },
  { city: 'Токіо',     km: 8300 },
  { city: 'Нью-Йорка', km: 9200 },
]

function walkingText(h: number): string {
  const km = h * 5
  if (km >= 40075) return `Обійти Землю пішки ${(km / 40075).toFixed(1)} рази`
  const dest = [...WALK_DESTS].reverse().find(d => km >= d.km)
  return dest
    ? `Дійти пішки від Києва до ${dest.city}`
    : `Пройти пішки ${Math.round(km)} км`
}

/* ── Icons (SVG, без емодзі) ───────────────────────────────────────────── */

const FilmIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M3 9h4M3 15h4M17 9h4M17 15h4M9 5v14M15 5v14"/>
  </svg>
)

const TvIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="13" rx="2"/>
    <path d="M8 21h8M12 3l4 4M12 3l-4 4"/>
  </svg>
)

const SparkleIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2c0 0 1.4 6 4.5 9S22 14 22 14s-5.4 1.4-8.5 4.5S12 22 12 22s-1.4-5.4-4.5-8.5S2 12 2 12s5.4-1.4 8.5-4.5S12 2 12 2z"/>
  </svg>
)

const WalkIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="13" cy="4" r="1.6" fill="currentColor" stroke="none"/>
    <path d="M11 7l-1 5 3 2 1 6M10 12l-3 2-1 5M13 9l3 1 2 4"/>
  </svg>
)

const PlaneIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12l18-7-7 18-2-8-9-3z"/>
  </svg>
)

const BooksIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 .8v15l-4-.8z"/>
  </svg>
)

const RunIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="15" cy="4" r="1.6" fill="currentColor" stroke="none"/>
    <path d="M9 20l2-6 4 1 3 4M7 13l4-3 2-4 4 2-2 4M5 17l4-2"/>
  </svg>
)

const MoonIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 7 7 0 0 0 21 12.5z"/>
  </svg>
)

function buildComparisons(h: number): Comparison[] {
  const list: Comparison[] = []

  list.push({ Icon: WalkIcon, text: walkingText(h) })

  const flights = Math.max(1, Math.round(h / 10))
  list.push({ Icon: PlaneIcon, text: `Злітати Київ — Нью-Йорк ${flights} ${flights === 1 ? 'раз' : 'разів'}` })

  const books = Math.max(1, Math.round(h / 8))
  list.push({ Icon: BooksIcon, text: `Прочитати ${books} ${books === 1 ? 'книжку' : books < 5 ? 'книжки' : 'книжок'}` })

  const marathons = Math.round(h / 4.5)
  if (marathons >= 1) {
    list.push({ Icon: RunIcon, text: `Пробігти ${marathons} ${marathons === 1 ? 'марафон' : marathons < 5 ? 'марафони' : 'марафонів'}` })
  }

  const titanics = Math.round(h / 3.2)
  if (titanics >= 1) {
    list.push({ Icon: FilmIcon, text: `Переглянути «Титанік» ${titanics} ${titanics === 1 ? 'раз' : 'разів'} — і щоразу плакати в кінці` })
  }

  const nights = Math.round(h / 7)
  list.push({ Icon: MoonIcon, text: `Проспати ${nights} ${nights === 1 ? 'ніч' : nights < 5 ? 'ночі' : 'ночей'} поспіль` })

  return list
}

/**
 * WatchlistStatsSheet
 * -------------------
 * Bottom sheet із загальною статистикою переглядів:
 * сумарна кількість годин (реальна тривалість з TMDB, з фолбеком на оцінку
 * для елементів без даних), розбивка по категоріях і порівняння.
 *
 * Props:
 * @prop {boolean}         isOpen  — чи відкритий sheet
 * @prop {() => void}      onClose — закриття sheet
 * @prop {WatchlistItem[]} items   — всі елементи watchlist (movie + series + anime)
 */
interface WatchlistStatsSheetProps {
  isOpen: boolean
  onClose: () => void
  items: WatchlistItem[]
}

const WatchlistStatsSheet: React.FC<WatchlistStatsSheetProps> = ({ isOpen, onClose, items }) => {
  const { updateItem } = useWatchlistStore()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const attemptedRef = useRef<Set<string>>(new Set())

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Бекфіл реальної тривалості з TMDB для елементів, які впливають на статистику
  useEffect(() => {
    if (!isOpen || !TMDB_KEY) return

    const toFetch = items.filter(i => {
      if (!i.tmdbId || attemptedRef.current.has(i.id)) return false
      if (i.category === 'movie') return i.status === 'watched' && i.runtimeMin == null
      return countEpisodes(i) > 0 && i.episodeRuntimeMin == null
    })
    if (toFetch.length === 0) return

    toFetch.forEach(item => {
      attemptedRef.current.add(item.id)
      const base = item.category === 'movie'
        ? `https://api.themoviedb.org/3/movie/${item.tmdbId}`
        : `https://api.themoviedb.org/3/tv/${item.tmdbId}`
      fetch(`${base}?api_key=${TMDB_KEY}`)
        .then(res => res.ok ? res.json() : null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((d: any) => {
          if (!d) return
          if (item.category === 'movie') {
            if (d.runtime) updateItem(item.id, { runtimeMin: d.runtime })
          } else {
            const ep = d.episode_run_time?.[0]
            if (ep) updateItem(item.id, { episodeRuntimeMin: ep })
          }
        })
        .catch(() => { /* silent — лишається на фолбеку */ })
    })
  }, [isOpen, items, updateItem])

  const stats = useMemo(() => {
    const movies = items.filter(i => i.category === 'movie')
    const series = items.filter(i => i.category === 'series')
    const anime  = items.filter(i => i.category === 'anime')

    const watchedMovies = movies.filter(i => i.status === 'watched')
    const movieWatched  = watchedMovies.length
    const movieMinutes  = watchedMovies.reduce((s, i) => s + (i.runtimeMin ?? FALLBACK_MOVIE_MIN), 0)

    const seriesCount = series.length
    const animeCount  = anime.length
    const seriesEp    = series.reduce((s, i) => s + countEpisodes(i), 0)
    const animeEp     = anime.reduce((s, i)  => s + countEpisodes(i), 0)

    const seriesMinutes = series.reduce((s, i) => s + countEpisodes(i) * (i.episodeRuntimeMin ?? FALLBACK_SERIES_MIN), 0)
    const animeMinutes  = anime.reduce((s, i)  => s + countEpisodes(i) * (i.episodeRuntimeMin ?? FALLBACK_ANIME_MIN), 0)

    const totalH = Math.round((movieMinutes + seriesMinutes + animeMinutes) / 60)

    return { movieWatched, seriesCount, animeCount, seriesEp, animeEp, totalH }
  }, [items])

  const { totalH, movieWatched, seriesCount, animeCount, seriesEp, animeEp } = stats
  const comparisons = useMemo(() => totalH > 0 ? buildComparisons(totalH) : [], [totalH])

  if (!mounted) return null

  const days = (totalH / 24).toFixed(1)

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <div className={styles.header}>МЕДІАТЕКА</div>

        {totalH === 0 ? (
          <div className={styles.empty}>
            Додай фільми та серіали —<br />тоді буде що рахувати
          </div>
        ) : (
          <>
            {/* ── Total hours ── */}
            <div className={styles.heroBlock}>
              <span className={styles.heroNum}>{totalH.toLocaleString('uk')}</span>
              <span className={styles.heroLabel}>ГОДИН</span>
              <span className={styles.heroDays}>{days} доби</span>
            </div>

            {/* ── Category breakdown ── */}
            <div className={styles.breakdown}>
              {movieWatched > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}><FilmIcon /></span>
                  <span className={styles.breakNum}>{movieWatched}</span>
                  <span className={styles.breakLbl}>фільмів</span>
                </div>
              )}
              {seriesCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}><TvIcon /></span>
                  <span className={styles.breakNum}>{seriesEp}</span>
                  <span className={styles.breakLbl}>еп. серіалів</span>
                </div>
              )}
              {animeCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={styles.breakIcon}><SparkleIcon /></span>
                  <span className={styles.breakNum}>{animeEp}</span>
                  <span className={styles.breakLbl}>еп. аніме</span>
                </div>
              )}
            </div>

            <div className={styles.divider}>
              <span className={styles.dividerLabel}>ЗА ЦЕЙ ЧАС МІГ БИ...</span>
            </div>

            {/* ── Comparisons ── */}
            <div className={styles.compList}>
              {comparisons.map((c, i) => (
                <div key={i} className={styles.compRow}>
                  <span className={styles.compIcon}><c.Icon /></span>
                  <span className={styles.compText}>{c.text}</span>
                </div>
              ))}
            </div>

            <p className={styles.note}>
              * рахуємо реальну тривалість з TMDB; без даних — фільм ≈ 2 год, серіал ≈ 45 хв/еп, аніме ≈ 24 хв/еп
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default WatchlistStatsSheet
