import React, { useEffect, useState, useMemo, useRef } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsivePie } from '@nivo/pie'
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
  if (item.watchedEpisodes?.length) return item.watchedEpisodes.length
  if (item.status === 'watched' && item.totalEpisodes) return item.totalEpisodes
  return 0
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

interface PieGenreDatum {
  id: string
  label: string
  value: number
  color: string
  avgRating: number | null
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

  const sorted = Object.entries(genreMap).sort((a, b) => b[1].count - a[1].count)
  const top5 = sorted.slice(0, 5)
  const otherCount = sorted.slice(5).reduce((s, [, v]) => s + v.count, 0)

  const children: GenreBubble[] = top5.map(([name, { count, ratingSum, ratingCount }], i) => {
    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : null
    return { name, value: count, avgRating, color: genreColor(i, avgRating), textColor: genreTextColor(avgRating) }
  })

  if (otherCount > 0) {
    children.push({ name: 'Інше', value: otherCount, avgRating: null, color: 'hsl(220, 14%, 26%)', textColor: '#c8b890' })
  }

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
      background: 'transparent',
      border: 'none',
      borderRadius: 0,
      padding: 0,
      boxShadow: 'none',
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
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
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
            const ep = d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || null
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

    return { movieWatched, seriesCount, animeCount, seriesEp, animeEp, totalH, movieMinutes, seriesMinutes, animeMinutes, root, watchedCount, monthBins }
  }, [items])

  const { totalH, movieWatched, seriesCount, animeCount, seriesEp, animeEp, movieMinutes, seriesMinutes, animeMinutes, root, watchedCount, monthBins } = stats

  if (!mounted) return null

  const days = (totalH / 24).toFixed(1)
  const hasActivity = monthBins.some(b => b.count > 0)
  const hasBubbles = root.children.length > 0

  const summaryParts: string[] = []
  if (movieWatched > 0) summaryParts.push(`${movieWatched} фільм${movieWatched === 1 ? '' : 'ів'}`)
  if (seriesCount > 0)  summaryParts.push(`${seriesEp} еп. серіалів`)
  if (animeCount > 0)   summaryParts.push(`${animeEp} еп. аніме`)

  const totalMin = movieMinutes + seriesMinutes + animeMinutes
  const moviePct  = totalMin > 0 ? Math.round(movieMinutes  / totalMin * 100) : 0
  const seriesPct = totalMin > 0 ? Math.round(seriesMinutes / totalMin * 100) : 0
  const animePct  = totalMin > 0 ? 100 - moviePct - seriesPct : 0
  const hasMediaBreakdown = (movieMinutes > 0 ? 1 : 0) + (seriesMinutes > 0 ? 1 : 0) + (animeMinutes > 0 ? 1 : 0) > 1

  const maxGenreCount = root.children[0]?.value ?? 1
  const centerGenre = selectedGenre ? root.children.find(g => g.name === selectedGenre) : null
  const centerNum    = centerGenre ? centerGenre.value : watchedCount
  const centerName   = centerGenre ? centerGenre.name.toUpperCase() : 'ТАЙТЛІВ'
  const centerRating = centerGenre?.avgRating != null ? (centerGenre.avgRating / 2).toFixed(1) : null

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
              <span className={styles.heroNum}>{String(totalH)}</span>
              <span className={styles.heroLabel}>ГОДИН · за весь час</span>
              <span className={styles.heroDays}>{days} доби</span>
            </div>

            {(watchedCount > 0 || summaryParts.length > 0) && (
              <p className={styles.summary}>
                {watchedCount > 0 && `${watchedCount} тайтлів`}
                {summaryParts.length > 0 && ` · ${summaryParts.join(' · ')}`}
              </p>
            )}

            {hasMediaBreakdown && (
              <>
                <div className={styles.divider}>
                  <span className={styles.dividerLabel}>РОЗПОДІЛ ЧАСУ</span>
                </div>
                <div className={styles.stackSection}>
                  <div className={styles.stackBar}>
                    {movieMinutes > 0  && <div className={styles.stackSegMovie}  style={{ width: `${moviePct}%`  }} />}
                    {seriesMinutes > 0 && <div className={styles.stackSegSeries} style={{ width: `${seriesPct}%` }} />}
                    {animeMinutes > 0  && <div className={styles.stackSegAnime}  style={{ width: `${animePct}%`  }} />}
                  </div>
                  <div className={styles.stackLabels}>
                    {movieMinutes > 0  && <span className={styles.stackLabel}><i className={styles.stackDotMovie}  />Фільми {moviePct}%</span>}
                    {seriesMinutes > 0 && <span className={styles.stackLabel}><i className={styles.stackDotSeries} />Серіали {seriesPct}%</span>}
                    {animeMinutes > 0  && <span className={styles.stackLabel}><i className={styles.stackDotAnime}  />Аніме {animePct}%</span>}
                  </div>
                </div>
              </>
            )}

            <div className={styles.divider}>
              <span className={styles.dividerLabel}>ТОП ЖАНРИ</span>
            </div>

            {hasBubbles ? (
              <>
                <div className={styles.donutWrap}>
                  <div className={styles.donutCenter}>
                    <span className={styles.donutCenterNum}>{centerNum}</span>
                    <span className={styles.donutCenterLabel}>{centerName}</span>
                    {centerRating && <span className={styles.donutCenterRating}>★ {centerRating}</span>}
                  </div>
                  <ResponsivePie<PieGenreDatum>
                    data={root.children.map(g => ({
                      id: g.name,
                      label: g.name,
                      value: g.value,
                      color: g.color,
                      avgRating: g.avgRating,
                    }))}
                    innerRadius={0.58}
                    padAngle={1.2}
                    cornerRadius={4}
                    colors={{ datum: 'data.color' }}
                    borderWidth={0}
                    activeOuterRadiusOffset={6}
                    enableArcLabels={false}
                    enableArcLinkLabels={false}
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    theme={nivoTheme}
                    tooltip={() => null}
                    onClick={(datum) => {
                      setSelectedGenre(prev => prev === datum.id ? null : datum.id as string)
                    }}
                  />
                </div>
                <div className={styles.rankingBars}>
                  {root.children.map(g => (
                    <div key={g.name} className={styles.rankingRow}>
                      <span className={styles.rankingName}>{g.name}</span>
                      <div className={styles.rankingTrack}>
                        <div
                          className={styles.rankingFill}
                          style={{ width: `${(g.value / maxGenreCount) * 100}%`, background: g.color }}
                        />
                      </div>
                      <span className={styles.rankingCount}>{g.value}</span>
                    </div>
                  ))}
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
