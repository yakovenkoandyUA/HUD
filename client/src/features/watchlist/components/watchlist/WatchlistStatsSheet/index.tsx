import React, { useEffect, useState, useMemo, useRef } from 'react'
import { ResponsiveCirclePacking } from '@nivo/circle-packing'
import { ResponsiveBar } from '@nivo/bar'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'
import type { WatchlistItem } from '@/shared/types'
import styles from './WatchlistStatsSheet.module.css'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const FALLBACK_MOVIE_MIN  = 120
const FALLBACK_SERIES_MIN = 45
const FALLBACK_ANIME_MIN  = 24

function countEpisodes(item: WatchlistItem): number {
  if (item.status === 'watched' && item.totalEpisodes) return item.totalEpisodes
  return item.watchedEpisodes?.length ?? 0
}

// ── Chart data ─────────────────────────────────────────────────────────────────

// Curated палітра: кожен жанр — свій hue [h, s%, l%], без кислотних відтінків
const GENRE_BASE: [number, number, number][] = [
  [202, 60, 42],  // steel blue
  [258, 52, 42],  // purple
  [22,  65, 44],  // orange
  [340, 55, 42],  // rose
  [43,  65, 42],  // gold
  [185, 52, 38],  // teal
  [275, 50, 40],  // violet
  [320, 55, 42],  // pink
  [55,  60, 42],  // amber
  [163, 42, 36],  // jade (muted, not neon)
]

function genreColor(index: number, avgRating: number | null): string {
  const [h, s, l] = GENRE_BASE[index % GENRE_BASE.length]
  if (avgRating === null) return `hsl(${h}, 14%, 26%)`
  const t = (avgRating - 1) / 4
  const rs = Math.round(s * (0.45 + 0.55 * t))
  const rl = Math.round(l * (0.82 + 0.18 * t))
  return `hsl(${h}, ${rs}%, ${rl}%)`
}

function genreTextColor(avgRating: number | null): string {
  return avgRating !== null && avgRating >= 3.5 ? '#1a120a' : '#c8b890'
}

interface GenreBubble {
  name: string
  value: number
  avgRating: number | null
  color: string
  textColor: string
}

interface CirclePackRoot {
  name: string
  color: string
  children: GenreBubble[]
}

function computeCirclePack(items: WatchlistItem[]): { root: CirclePackRoot; watchedCount: number } {
  const active = items.filter(i => i.status === 'watched' || i.status === 'watching')
  const genreMap: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {}

  active.forEach(item => {
    item.genres.forEach(g => {
      if (!genreMap[g]) genreMap[g] = { count: 0, ratingSum: 0, ratingCount: 0 }
      genreMap[g].count++
      if (item.rating != null) {
        genreMap[g].ratingSum += item.rating
        genreMap[g].ratingCount++
      }
    })
  })

  const children: GenreBubble[] = Object.entries(genreMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, { count, ratingSum, ratingCount }], i) => {
      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null
      return { name, value: count, avgRating, color: genreColor(i, avgRating), textColor: genreTextColor(avgRating) }
    })

  return {
    root: { name: 'root', color: 'transparent', children },
    watchedCount: active.length,
  }
}

const UA_MONTHS = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']
const UA_MONTHS_FULL = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

interface MonthBin {
  month: string
  count: number
  fullLabel: string   // "Липень 2025" — для tooltip
  isCurrent: boolean
}

function computeMonthly(items: WatchlistItem[]): MonthBin[] {
  const now = new Date()
  const bins: MonthBin[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const isCurrent = i === 11
    return {
      month: UA_MONTHS[d.getMonth()],
      fullLabel: `${UA_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`,
      count: 0,
      isCurrent,
    }
  })
  items.forEach(item => {
    const d = new Date(item.addedAt)
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
    if (monthsAgo >= 0 && monthsAgo < 12) bins[11 - monthsAgo].count++
  })
  return bins
}

// ── Nivo theme ─────────────────────────────────────────────────────────────────

const nivoTheme = {
  background: 'transparent',
  tooltip: {
    container: {
      background: '#1e2235',
      border: '1px solid #4a5280',
      borderRadius: 10,
      padding: '8px 14px',
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      color: '#e8d5a0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    },
  },
  axis: {
    ticks: { text: { fill: '#7a6840', fontSize: 11, fontFamily: 'var(--font-body)' } },
    domain: { line: { stroke: 'transparent' } },
  },
  grid: { line: { stroke: '#2e3450', strokeDasharray: '3 3' } },
}

/**
 * WatchlistStatsSheet
 * -------------------
 * Bottom sheet із статистикою медіатеки: години, circle pack жанрів × рейтингів, активність по місяцях.
 *
 * Props:
 * @prop {boolean}         isOpen  — чи відкритий sheet
 * @prop {() => void}      onClose — закриття sheet
 * @prop {WatchlistItem[]} items   — всі елементи watchlist
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
        .catch(() => {})
    })
  }, [isOpen, items, updateItem])

  const stats = useMemo(() => {
    const movies  = items.filter(i => i.category === 'movie')
    const series  = items.filter(i => i.category === 'series')
    const anime   = items.filter(i => i.category === 'anime')

    const watchedMovies  = movies.filter(i => i.status === 'watched')
    const movieWatched   = watchedMovies.length
    const movieMinutes   = watchedMovies.reduce((s, i) => s + (i.runtimeMin ?? FALLBACK_MOVIE_MIN), 0)
    const seriesCount    = series.length
    const animeCount     = anime.length
    const seriesEp       = series.reduce((s, i) => s + countEpisodes(i), 0)
    const animeEp        = anime.reduce((s, i) => s + countEpisodes(i), 0)
    const seriesMinutes  = series.reduce((s, i) => s + countEpisodes(i) * (i.episodeRuntimeMin ?? FALLBACK_SERIES_MIN), 0)
    const animeMinutes   = anime.reduce((s, i) => s + countEpisodes(i) * (i.episodeRuntimeMin ?? FALLBACK_ANIME_MIN), 0)
    const totalH         = Math.round((movieMinutes + seriesMinutes + animeMinutes) / 60)

    const { root, watchedCount } = computeCirclePack(items)
    const monthBins = computeMonthly(items)

    return { movieWatched, seriesCount, animeCount, seriesEp, animeEp, totalH, root, watchedCount, monthBins }
  }, [items])

  const { totalH, movieWatched, seriesCount, animeCount, seriesEp, animeEp, root, monthBins } = stats

  if (!mounted) return null

  const days = (totalH / 24).toFixed(1)
  const hasActivity = monthBins.some(b => b.count > 0)
  const hasBubbles = root.children.length > 0

  const summaryParts: string[] = []
  if (movieWatched > 0) summaryParts.push(`${movieWatched} фільм${movieWatched === 1 ? '' : 'ів'}`)
  if (seriesCount > 0)  summaryParts.push(`${seriesEp} еп. серіалів`)
  if (animeCount > 0)   summaryParts.push(`${animeEp} еп. аніме`)

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
            <div className={styles.heroBlock}>
              <span className={styles.heroNum}>{totalH.toLocaleString('uk')}</span>
              <span className={styles.heroLabel}>ГОДИН</span>
              <span className={styles.heroDays}>{days} доби</span>
            </div>

            {summaryParts.length > 0 && (
              <p className={styles.summary}>{summaryParts.join(' · ')}</p>
            )}

            <div className={styles.divider}>
              <span className={styles.dividerLabel}>ЖАНРИ × РЕЙТИНГ</span>
            </div>

            {hasBubbles ? (
              <>
                <div className={styles.bubbleContainer}>
                  <ResponsiveCirclePacking
                    data={root}
                    value="value"
                    id="name"
                    colors={(node) => (node.data as unknown as GenreBubble).color ?? '#3a4260'}
                    childColor={{ from: 'color', modifiers: [['brighter', 0.3]] }}
                    padding={6}
                    enableLabels={true}
                    label={(node) => node.id}
                    labelsFilter={(n) => n.node.depth === 1 && n.node.radius > 22}
                    labelsSkipRadius={22}
                    labelTextColor={(node) => (node.data as unknown as GenreBubble).textColor ?? '#c8b890'}
                    theme={nivoTheme}
                    animate={true}
                    motionConfig="gentle"
                    tooltip={({ id, value, data }) => {
                      if (id === 'root') return <></>
                      const d = data as unknown as GenreBubble
                      return (
                        <div className={styles.tooltip}>
                          <span className={styles.tooltipDot} style={{ background: d.color }} />
                          <div className={styles.tooltipBody}>
                            <span className={styles.tooltipName}>{id}</span>
                            <span className={styles.tooltipSub}>
                              {value} у жанрі{d.avgRating != null ? ` · ${'★'.repeat(Math.round(d.avgRating))}` : ''}
                            </span>
                          </div>
                        </div>
                      )
                    }}
                  />
                </div>

                <div className={styles.bubbleLegend}>
                  <span className={styles.legendHint}>розмір = кількість тайтлів</span>
                  <div className={styles.ratingScale}>
                    <span className={styles.scaleLabel}>без оцінки</span>
                    <div className={styles.scaleGradient} />
                    <span className={styles.scaleLabel}>5★</span>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.chartEmpty}>Немає даних</p>
            )}

            <div className={styles.divider}>
              <span className={styles.dividerLabel}>АКТИВНІСТЬ</span>
            </div>

            {hasActivity ? (
              <div className={styles.barWrapTall}>
                <ResponsiveBar
                  data={monthBins as unknown as import('@nivo/bar').BarDatum[]}
                  keys={['count']}
                  indexBy="month"
                  colors={(bar) => {
                    const d = bar.data as unknown as MonthBin
                    return d.isCurrent ? '#d4a017' : '#6a4fc8'
                  }}
                  borderRadius={4}
                  padding={0.3}
                  theme={nivoTheme}
                  enableLabel={false}
                  margin={{ top: 8, right: 8, bottom: 32, left: 8 }}
                  axisBottom={{ tickSize: 0, tickPadding: 8 }}
                  axisLeft={null}
                  enableGridY={false}
                  enableGridX={false}
                  tooltip={({ data, value }) => {
                    const d = data as unknown as MonthBin
                    return (
                      <div className={styles.tooltip}>
                        <span className={styles.tooltipName}>{d.fullLabel}</span>
                        <span className={styles.tooltipMeta}>{value} тайт.</span>
                      </div>
                    )
                  }}
                  animate={true}
                  motionConfig="gentle"
                />
              </div>
            ) : (
              <p className={styles.chartEmpty}>Активності поки немає</p>
            )}

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
