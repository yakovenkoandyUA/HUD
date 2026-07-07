import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'
import type { WatchlistItem } from '@/shared/types'
import styles from './WatchlistStatsSheet.module.css'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

// Fallback хвилини на одиницю — лише коли TMDB не дає точних даних
const FALLBACK_MOVIE_MIN  = 120
const FALLBACK_SERIES_MIN = 45
const FALLBACK_ANIME_MIN  = 24

interface Comparison { Icon: React.FC; text: string; joke: boolean }

function countEpisodes(item: WatchlistItem): number {
  if (item.status === 'watched' && item.totalEpisodes) return item.totalEpisodes
  return item.watchedEpisodes?.length ?? 0
}

// Українська плюралізація (1/2-4/5+, з винятком 11-14)
function pluralUA(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few
  return many
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8l1.5-4h3L6 8M9 8l1.5-4h3L12 8M15 8l1.5-4h3L18 8" />
    <rect x="3" y="8" width="18" height="12" rx="1.5"/>
    <path d="M9 12l5 3-5 3v-6Z" fill="currentColor" stroke="none"/>
  </svg>
)

const TvIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M9 9.5l5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none"/>
    <path d="M8 22h8"/>
  </svg>
)

const SparkleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2c0 0 1.4 6 4.5 9S22 14 22 14s-5.4 1.4-8.5 4.5S12 22 12 22s-1.4-5.4-4.5-8.5S2 12 2 12s5.4-1.4 8.5-4.5S12 2 12 2z"/>
    <circle cx="19" cy="5" r="1.4"/>
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

const CoffeeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/>
    <path d="M16 10h1.5a2.3 2.3 0 0 1 0 4.6H16"/>
    <path d="M8 3.5c.4.7.4 1.3 0 2M12 3.5c.4.7.4 1.3 0 2"/>
  </svg>
)

const QueueIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="6" r="2"/>
    <path d="M4 14c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5"/>
    <circle cx="17" cy="7.5" r="1.7"/>
    <path d="M14.5 14c.3-1.8 1.5-2.8 2.5-2.8s2.2 1 2.5 2.8"/>
    <path d="M3 20h18"/>
  </svg>
)

const MusicIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l11-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="17" cy="16" r="3"/>
  </svg>
)

const GameIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="8" width="20" height="9" rx="4"/>
    <path d="M7 11v3M5.5 12.5h3"/>
    <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none"/>
    <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none"/>
  </svg>
)

const PopcornIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 9l1 12h8l1-12"/>
    <path d="M5.5 9a2 2 0 1 1 2.3-3.3A2.2 2.2 0 0 1 12 4.8a2.2 2.2 0 0 1 4.2.9A2 2 0 1 1 18.5 9Z"/>
  </svg>
)

interface ComparisonGen { build: (h: number) => Comparison | null }

const COMPARISON_GENERATORS: ComparisonGen[] = [
  { build: h => ({ Icon: WalkIcon, joke: false, text: walkingText(h) }) },

  { build: h => {
    const n = Math.max(1, Math.round(h / 10))
    return { Icon: PlaneIcon, joke: false, text: `Злітати Київ — Нью-Йорк ${n} ${pluralUA(n, 'раз', 'рази', 'разів')}` }
  } },

  { build: h => {
    const n = Math.max(1, Math.round(h / 8))
    return { Icon: BooksIcon, joke: false, text: `Прочитати ${n} ${pluralUA(n, 'книжку', 'книжки', 'книжок')}` }
  } },

  { build: h => {
    const n = Math.round(h / 4.5)
    if (n < 1) return null
    return { Icon: RunIcon, joke: false, text: `Пробігти ${n} ${pluralUA(n, 'марафон', 'марафони', 'марафонів')}` }
  } },

  { build: h => {
    const n = Math.round(h / 7)
    if (n < 1) return null
    return { Icon: MoonIcon, joke: false, text: `Проспати ${n} ${pluralUA(n, 'ніч', 'ночі', 'ночей')} поспіль` }
  } },

  { build: h => {
    const n = Math.round(h / 3.2)
    if (n < 1) return null
    return { Icon: FilmIcon, joke: true, text: `Передивитись «Титанік» ${n} ${pluralUA(n, 'раз', 'рази', 'разів')} — і щоразу сподіватись, що Джек виживе` }
  } },

  { build: h => {
    const n = Math.max(1, Math.round(h / 3))
    return { Icon: CoffeeIcon, joke: true, text: `Випити ${n} ${pluralUA(n, 'чашку', 'чашки', 'чашок')} кави, щоб не заснути на середині` }
  } },

  { build: h => {
    const n = Math.max(1, Math.round(h * 60 / 25))
    return { Icon: QueueIcon, joke: true, text: `Простояти в черзі в Новій Пошті ${n} ${pluralUA(n, 'раз', 'рази', 'разів')}` }
  } },

  { build: h => {
    const n = Math.max(1, Math.round(h * 60 / 3.5))
    return { Icon: MusicIcon, joke: true, text: `Прослухати улюблену пісню на повторі ${n} ${pluralUA(n, 'раз', 'рази', 'разів')}` }
  } },

  { build: h => {
    const n = Math.round(h / 50)
    if (n < 1) return null
    return { Icon: GameIcon, joke: true, text: `Пройти «Відьмака 3» з нуля ${n} ${pluralUA(n, 'раз', 'рази', 'разів')}` }
  } },

  { build: h => {
    const kg = +(h / 2 * 0.2).toFixed(1)
    if (kg < 0.1) return null
    return { Icon: PopcornIcon, joke: true, text: `З'їсти ${kg.toLocaleString('uk')} кг кінотеатрального попкорну` }
  } },
]

const SHOWN_COUNT = 6

function buildComparisons(h: number): Comparison[] {
  const built = shuffle(COMPARISON_GENERATORS)
    .map(g => g.build(h))
    .filter((c): c is Comparison => c !== null)

  return built.slice(0, SHOWN_COUNT)
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
  // isOpen у залежностях — пул жартів/порівнянь перемішується щоразу при відкритті sheet
  const comparisons = useMemo(() => totalH > 0 ? buildComparisons(totalH) : [], [totalH, isOpen])

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
                  <span className={`${styles.breakIcon} ${styles.breakIconAccent}`}><FilmIcon /></span>
                  <span className={styles.breakNum}>{movieWatched}</span>
                  <span className={styles.breakLbl}>фільмів</span>
                </div>
              )}
              {seriesCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={`${styles.breakIcon} ${styles.breakIconSecond}`}><TvIcon /></span>
                  <span className={styles.breakNum}>{seriesEp}</span>
                  <span className={styles.breakLbl}>еп. серіалів</span>
                </div>
              )}
              {animeCount > 0 && (
                <div className={styles.breakItem}>
                  <span className={`${styles.breakIcon} ${styles.breakIconGold}`}><SparkleIcon /></span>
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
                <div
                  key={i}
                  className={styles.compRow}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className={`${styles.compIcon} ${c.joke ? styles.compIconJoke : ''}`}><c.Icon /></span>
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
