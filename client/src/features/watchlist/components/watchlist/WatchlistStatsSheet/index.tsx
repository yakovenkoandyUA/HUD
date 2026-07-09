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

// Колір бульбашки: сірий (немає рейтингу) → gold (5★)
function ratingToColor(avgRating: number | null): string {
  if (avgRating === null) return '#3a4260'
  const t = (avgRating - 1) / 4  // 0..1
  // lerp: #4a5a8a → #d4a017
  const r = Math.round(0x4a + t * (0xd4 - 0x4a))
  const g = Math.round(0x5a + t * (0xa0 - 0x5a))
  const b = Math.round(0x8a + t * (0x17 - 0x8a))
  return `rgb(${r},${g},${b})`
}

interface GenreBubble {
  name: string
  value: number
  avgRating: number | null
  color: string
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
    .map(([name, { count, ratingSum, ratingCount }]) => {
      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null
      return { name, value: count, avgRating, color: ratingToColor(avgRating) }
    })

  return {
    root: { name: 'root', color: 'transparent', children },
    watchedCount: active.length,
  }
}

const UA_MONTHS = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']

function computeMonthly(items: WatchlistItem[]) {
  const now = new Date()
  const bins = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return { month: UA_MONTHS[d.getMonth()], count: 0 }
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
      background: '#252a40',
      border: '1px solid #3a4260',
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 12,
      fontFamily: 'var(--font-body)',
      color: '#e8d5a0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    },
  },
  axis: {
    ticks: { text: { fill: '#6a5830', fontSize: 10, fontFamily: 'var(--font-body)' } },
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

  const { totalH, movieWatched, seriesCount, animeCount, seriesEp, animeEp, root, watchedCount, monthBins } = stats

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
                    colors={(node) => (node.data as GenreBubble).color ?? '#3a4260'}
                    childColor={{ from: 'color', modifiers: [['brighter', 0.3]] }}
                    padding={6}
                    enableLabels={true}
                    label={(node) => node.id}
                    labelsFilter={(n) => n.node.depth === 1 && n.node.radius > 22}
                    labelsSkipRadius={22}
                    labelTextColor="#e8d5a0"
                    theme={nivoTheme}
                    animate={true}
                    motionConfig="gentle"
                    tooltip={({ id, value, data }) => {
                      const d = data as GenreBubble
                      return (
                        <div className={styles.tooltip}>
                          <span className={styles.tooltipDot} style={{ background: d.color }} />
                          <span className={styles.tooltipName}>{id}</span>
                          <span className={styles.tooltipMeta}>
                            {value} тайт.
                            {d.avgRating != null && <> · {'★'.repeat(Math.round(d.avgRating))}</>}
                          </span>
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
              <div className={styles.barWrap}>
                <ResponsiveBar
                  data={monthBins}
                  keys={['count']}
                  indexBy="month"
                  colors={['#6a4fc8']}
                  borderRadius={4}
                  padding={0.25}
                  theme={nivoTheme}
                  enableLabel={false}
                  axisBottom={{ tickSize: 0, tickPadding: 8 }}
                  axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 3 }}
                  gridYValues={3}
                  enableGridX={false}
                  tooltip={({ indexValue, value }) => (
                    <div className={styles.tooltip}>
                      <span className={styles.tooltipName}>{indexValue}</span>
                      <span className={styles.tooltipMeta}>{value}</span>
                    </div>
                  )}
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
