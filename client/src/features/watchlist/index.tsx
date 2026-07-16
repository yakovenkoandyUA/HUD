import React, { useMemo, useState, useEffect, useRef } from 'react'
import AppHeader from '@/shared/components/layout/AppHeader'
import WatchlistHero from './components/watchlist/WatchlistHero'
import WatchlistSearch from './components/watchlist/WatchlistSearch'
import WatchlistGrid from './components/watchlist/WatchlistGrid'
import WatchlistDetail from './components/watchlist/WatchlistDetail'
import GameSearch from './games/games/GameSearch'
import GameCard from './games/games/GameCard'
import GameDetail from './games/games/GameDetail'
import GameHero from './games/games/GameHero'
import WatchlistStatsSheet from './components/watchlist/WatchlistStatsSheet'
import ImportWatchlistModal from './components/watchlist/ImportWatchlistModal'
import BookSearch from './books/BookSearch'
import { useWatchlistStore } from '@/features/watchlist/store/watchlistStore'
import { useGamesStore } from '@/features/watchlist/store/gamesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { getToken } from '@/shared/services/api'
import type { WatchlistCategory, WatchlistItem, WatchlistStatus, GameItem, GameStatus } from '@/shared/types'
import { openmojiUrl } from './utils/openmojiUrl'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useSwipeTabs } from '@/shared/hooks/useSwipeTabs'
import styles from './Watchlist.module.css'

type Tab = WatchlistCategory | 'game' | 'book'
type SortBy = 'newest' | 'oldest' | 'year_desc' | 'year_asc' | 'rating'
type WatchScope = 'all' | 'together' | 'solo'
type GameStatusFilter = 'all' | GameStatus
type GameSortBy = 'added' | 'rating' | 'hours' | 'title'

const WATCH_SCOPE_OPTIONS: { key: WatchScope; label: string }[] = [
  { key: 'all',      label: 'Всі'       },
  { key: 'together', label: 'Разом'     },
  { key: 'solo',     label: 'Особисте'  },
]


const GAME_SORT_OPTIONS: { id: GameSortBy; label: string }[] = [
  { id: 'added',  label: 'За датою додавання' },
  { id: 'rating', label: 'За оцінкою'         },
  { id: 'hours',  label: 'За годинами'        },
  { id: 'title',  label: 'За назвою'          },
]

const STATUS_ORDER: Record<string, number> = {
  watching: 0,
  want:     1,
  watched:  2,
  dropped:  3,
}

const ALL_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'movie',  label: 'Фільми',  icon: '1F3AC' },
  { id: 'series', label: 'Серіали', icon: '1F4FA' },
  { id: 'anime',  label: 'Аніме',   icon: '1F338' },
  { id: 'game',   label: 'Ігри',    icon: '1F3AE' },
  { id: 'book',   label: 'Книги',   icon: '1F4DA' },
]

const STAT_LABELS: Record<string, { short: string }> = {
  watched:  { short: 'переглянуто' },
  watching: { short: 'дивлюся'     },
  want:     { short: 'хочу'        },
}

const Watchlist: React.FC = () => {
  const { items, addItem, setStatus, setRating, updateItem, deleteItem, fetchWatchlist, isLoading } = useWatchlistStore()
  const { items: games, fetchGames, addGame, updateGame, deleteGame, loading: gamesLoading } = useGamesStore()
  const { showToast } = useUiStore()
  const { accepted, fetchFamily } = useFamilyStore()
  const { activeProfile } = useProfileStore()

  const enabledTabIds = activeProfile?.mediaEnabledTabs ?? ['movie', 'series', 'anime', 'game']
  const TABS = ALL_TABS.filter(t => enabledTabIds.includes(t.id))

  const [tab, setTab] = useState<Tab>(() => {
    const first = ALL_TABS.find(t => enabledTabIds.includes(t.id))
    return first?.id ?? 'movie'
  })
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [watchScope, setWatchScope] = useState<WatchScope>('all')
  const [gameStatusFilter, setGameStatusFilter] = useState<GameStatusFilter>('all')
  const [gameSortBy, setGameSortBy] = useState<GameSortBy>('added')
  const [gameSortOpen, setGameSortOpen] = useState(false)
  const [gameGenreFilter, setGameGenreFilter] = useState<string | null>(null)
  const [gamePlatformFilter, setGamePlatformFilter] = useState<string | null>(null)
  const gameSortRef = useRef<HTMLDivElement>(null)

  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (!getToken()) return
    fetchWatchlist()
    fetchGames()
    if (accepted.length === 0) fetchFamily()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Watchlist state ──
  const [selected, setSelected] = useState<WatchlistItem | null>(null)
  const lastSelectedRef = useRef<WatchlistItem | null>(null)
  const effectiveSelected = useMemo(
    () => selected ? (items.find(i => i.id === selected.id) ?? selected) : null,
    [items, selected]
  )
  if (effectiveSelected) lastSelectedRef.current = effectiveSelected
  const displayItem = effectiveSelected ?? lastSelectedRef.current

  // ── Games state ──
  const [gameSearchOpen, setGameSearchOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null)
  const lastSelectedGameRef = useRef<GameItem | null>(null)
  const effectiveSelectedGame = useMemo(
    () => selectedGame ? (games.find(g => g.id === selectedGame.id) ?? selectedGame) : null,
    [games, selectedGame]
  )
  if (effectiveSelectedGame) lastSelectedGameRef.current = effectiveSelectedGame
  const displayGame = effectiveSelectedGame ?? lastSelectedGameRef.current

  const watchingItems = useMemo(
    () => items.filter((i) => i.status === 'watching'),
    [items]
  )

  const byCategoryItems = useMemo(
    () => items.filter((i) => i.category === (tab as WatchlistCategory)),
    [items, tab]
  )

  const availableGenres = useMemo(() => {
    const all = byCategoryItems.flatMap((i) => i.genres ?? [])
    return [...new Set(all)].sort()
  }, [byCategoryItems])

  const tabItems = useMemo(() => {
    const filtered = byCategoryItems.filter(i => {
      if (activeStatus && i.status !== activeStatus) return false
      if (activeGenres.size > 0 && !(i.genres ?? []).some(g => activeGenres.has(g))) return false
      if (watchScope === 'together') return (i.watchedWith ?? []).length > 0
      if (watchScope === 'solo')     return (i.watchedWith ?? []).length === 0
      return true
    })
    const arr = [...filtered]
    const byStatus = (a: WatchlistItem, b: WatchlistItem) =>
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
    switch (sortBy) {
      case 'oldest':    return arr.sort((a, b) => byStatus(a, b) || a.addedAt.localeCompare(b.addedAt))
      case 'year_desc': return arr.sort((a, b) => byStatus(a, b) || (Number(b.year) || 0) - (Number(a.year) || 0))
      case 'year_asc':  return arr.sort((a, b) => byStatus(a, b) || (Number(a.year) || 0) - (Number(b.year) || 0))
      case 'rating':    return arr.sort((a, b) => byStatus(a, b) || (b.rating ?? 0) - (a.rating ?? 0))
      default:          return arr.sort((a, b) => byStatus(a, b) || b.addedAt.localeCompare(a.addedAt))
    }
  }, [byCategoryItems, activeStatus, activeGenres, watchScope, sortBy])

  const gamesByStatus = useMemo(
    () => gameStatusFilter === 'all' ? games : games.filter(g => g.status === gameStatusFilter),
    [games, gameStatusFilter]
  )

  const availableGameGenres = useMemo(() => {
    const counts = new Map<string, number>()
    gamesByStatus.forEach(g => g.genres.forEach(genre => counts.set(genre, (counts.get(genre) ?? 0) + 1)))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 12)
  }, [gamesByStatus])

  const availableGamePlatforms = useMemo(() => {
    const all = gamesByStatus.flatMap(g => g.platforms)
    return [...new Set(all)].sort()
  }, [gamesByStatus])

  useEffect(() => {
    if (gameGenreFilter && !availableGameGenres.includes(gameGenreFilter)) setGameGenreFilter(null)
  }, [availableGameGenres, gameGenreFilter])

  useEffect(() => {
    if (gamePlatformFilter && !availableGamePlatforms.includes(gamePlatformFilter)) setGamePlatformFilter(null)
  }, [availableGamePlatforms, gamePlatformFilter])

  const filteredGames = useMemo(() => {
    let list = gameGenreFilter ? gamesByStatus.filter(g => g.genres.includes(gameGenreFilter)) : gamesByStatus
    if (gamePlatformFilter) list = list.filter(g => g.platforms.includes(gamePlatformFilter))
    const sorted = [...list]
    switch (gameSortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
        break
      case 'hours':
        sorted.sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0))
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'uk'))
        break
      default:
        sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    }
    return sorted
  }, [gamesByStatus, gameGenreFilter, gamePlatformFilter, gameSortBy])

  const playingGames = useMemo(() => games.filter(g => g.status === 'playing'), [games])

  const gameStats = useMemo(() => ({
    playing:    games.filter(g => g.status === 'playing').length,
    want:       games.filter(g => g.status === 'want').length,
    completed:  games.filter(g => g.status === 'completed').length,
    totalHours: Math.round(games.reduce((s, g) => s + (g.hoursPlayed ?? 0), 0)),
  }), [games])

  useEffect(() => {
    if (!gameSortOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (gameSortRef.current && !gameSortRef.current.contains(e.target as Node)) setGameSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [gameSortOpen])

  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [sortOpen])

  const stats = useMemo(() => {
    const watched  = byCategoryItems.filter((i) => i.status === 'watched').length
    const watching = byCategoryItems.filter((i) => i.status === 'watching').length
    const want     = byCategoryItems.filter((i) => i.status === 'want').length
    const rated    = byCategoryItems.filter((i) => i.rating !== null)
    const avg      = rated.length
      ? (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1)
      : null
    return { watched, watching, want, avg }
  }, [byCategoryItems])

  const handleAdd = (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    const alreadyExists = items.some(
      (i) => i.tmdbId === item.tmdbId && i.category === item.category && item.tmdbId !== 0
    )
    if (alreadyExists) { showToast('Вже є у списку', 'info'); return }
    addItem(item)
    useAchievementsStore.getState().unlock('first-watchlist')
    showToast('Додано до списку', 'success')
  }

  const handleAddGame = (game: Omit<GameItem, 'id' | 'addedAt'>) => {
    addGame(game)
    useAchievementsStore.getState().unlock('first-watchlist')
    showToast(`${game.title} додано`, 'success')
  }

  const handleStatusChange = (status: WatchlistStatus) => {
    if (!selected) return

    const isSeriesLike = selected.category === 'series' || selected.category === 'anime'
    const tmdbId       = selected.tmdbId
    const myId         = activeProfile?.id ?? ''
    const tmdbKey      = import.meta.env.VITE_TMDB_API_KEY as string | undefined

    if (status === 'watched' && isSeriesLike && tmdbId && tmdbKey) {
      setStatus(selected.id, status)
      setSelected(prev => prev ? { ...prev, status } : null)

      interface TmdbSeason { season_number: number; episode_count: number }
      interface TmdbTvDetails { seasons: TmdbSeason[] }

      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}`)
        .then(r => r.json())
        .then((d: TmdbTvDetails) => {
          const allEpisodes: { season: number; episode: number; userId: string }[] = []
          for (const s of d.seasons ?? []) {
            if (s.season_number === 0) continue
            for (let ep = 1; ep <= s.episode_count; ep++) {
              allEpisodes.push({ season: s.season_number, episode: ep, userId: myId })
            }
          }
          if (allEpisodes.length > 0) {
            updateItem(selected.id, { watchedEpisodes: allEpisodes })
            setSelected(prev => prev ? { ...prev, watchedEpisodes: allEpisodes } : null)
          }
        })
        .catch(() => {})
      return
    }

    setStatus(selected.id, status)
    setSelected((prev) => prev ? { ...prev, status } : null)
  }

  const handleRatingChange = (rating: number | null) => {
    if (!selected) return
    setRating(selected.id, rating)
    setSelected((prev) => prev ? { ...prev, rating } : null)
  }

  const handleImageChange = (url: string) => {
    if (!selected) return
    updateItem(selected.id, { thumbnail: url || undefined })
    setSelected((prev) => prev ? { ...prev, thumbnail: url || undefined } : null)
  }

  const handleNotifyChange = (patch: { notifyNewEpisode?: boolean; notifyNewSeason?: boolean; watchedWith?: string[] }) => {
    if (!selected) return
    updateItem(selected.id, patch)
    setSelected((prev) => prev ? { ...prev, ...patch } : null)
  }

  const handleDelete = () => {
    if (!selected) return
    deleteItem(selected.id)
    showToast('Видалено зі списку', 'info')
    setSelected(null)
  }

  const isGame = tab === 'game'
  const isBook = tab === 'book'
  const isMedia = !isGame && !isBook

  const tabIndex = TABS.findIndex(t => t.id === tab)
  const swipeRef = useSwipeTabs({
    count: TABS.length,
    activeIndex: tabIndex >= 0 ? tabIndex : 0,
    onChange: i => {
      setTab(TABS[i].id)
      setActiveStatus(null)
      setActiveGenres(new Set())
    },
  })

  useEffect(() => {
    if (!enabledTabIds.includes(tab)) {
      const first = ALL_TABS.find(t => enabledTabIds.includes(t.id))
      if (first) setTab(first.id)
    }
  }, [enabledTabIds, tab])

  return (
    <div ref={swipeRef} className={styles.screen}>
      <AppHeader />

      {/* ── Stats row — hidden on games and book tabs ── */}
      {isMedia && (
        <div className={styles.statsRow}>
          <div className={styles.statsPills}>
            {(['want', 'watching', 'watched'] as const).map((status, i) => {
              const isActive = activeStatus === status
              return (
                <React.Fragment key={status}>
                  {i > 0 && <span className={styles.statSep}>·</span>}
                  <button type="button" className={`${styles.stat} ${isActive ? styles.statActive : ''}`} onClick={() => setActiveStatus(isActive ? null : status)}>
                    <span className={styles.statNum}>{stats[status]}</span>
                    <span className={styles.statLabel}>{STAT_LABELS[status].short}</span>
                    {isActive && <span className={styles.statClear}>×</span>}
                  </button>
                </React.Fragment>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.statsBtn}
            onClick={() => setStatsOpen(true)}
            aria-label="Статистика перегляду"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <rect x="1" y="8" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="6" y="5" width="3" height="9" rx="1" fill="currentColor" opacity="0.75"/>
              <rect x="11" y="1" width="3" height="13" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Game stats row ── */}
      {isGame && (
        <div className={styles.statsRow}>
          <div className={styles.statsPills}>
            {(['playing', 'want', 'completed'] as const).map((status, i) => {
              const isActive = gameStatusFilter === status
              const count = status === 'playing' ? gameStats.playing : status === 'want' ? gameStats.want : gameStats.completed
              const label = status === 'playing' ? 'граю' : status === 'want' ? 'хочу' : 'пройдено'
              return (
                <React.Fragment key={status}>
                  {i > 0 && <span className={styles.statSep}>·</span>}
                  <button
                    type="button"
                    className={`${styles.stat} ${isActive ? styles.statActive : ''}`}
                    onClick={() => setGameStatusFilter(isActive ? 'all' : status)}
                  >
                    <span className={styles.statNum}>{count}</span>
                    <span className={styles.statLabel}>{label}</span>
                    {isActive && <span className={styles.statClear}>×</span>}
                  </button>
                </React.Fragment>
              )
            })}
            <span className={styles.statSep}>·</span>
            <div className={styles.stat}>
              <span className={styles.statNum}>{gameStats.totalHours}</span>
              <span className={styles.statLabel}>годин</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Content (scrollable) ── */}
      <div className={styles.content}>
        {/* hero scrolls away — media or games */}
        {isMedia && watchingItems.length > 0 && <WatchlistHero items={watchingItems} onTap={setSelected} />}
        {isGame && gameStatusFilter === 'all' && (
          <GameHero items={playingGames} onTap={setSelectedGame} />
        )}

        {/* ── Tabs — sticky ── */}
        <div className={styles.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => {
                setTab(t.id)
                setActiveStatus(null)
                setActiveGenres(new Set())
              }}
            >
              <img src={openmojiUrl(t.icon)} alt="" className={styles.tabIcon} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Media content ── */}
        {isMedia && (
          <>
            {availableGenres.length > 0 && (
              <div className={styles.genreStrip}>
                {availableGenres.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.genreTag} ${activeGenres.has(g) ? styles.genreTagActive : ''}`}
                    onClick={() =>
                      setActiveGenres(prev => {
                        const next = new Set(prev)
                        next.has(g) ? next.delete(g) : next.add(g)
                        return next
                      })
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.searchWrap}>
              <WatchlistSearch category={tab as WatchlistCategory} onAdd={handleAdd} />
              {(tab === 'movie' || tab === 'series' || tab === 'anime') && (
                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() => setImportOpen(true)}
                  aria-label="Імпорт"
                  title="Імпорт зі стороннього сервісу"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8M8 10l-3-3M8 10l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12.5v1A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <div className={styles.sortWrap} ref={sortRef}>
                <button
                  type="button"
                  className={`${styles.sortBtn} ${sortBy !== 'newest' || watchScope !== 'all' ? styles.sortBtnActive : ''}`}
                  onClick={() => setSortOpen(v => !v)}
                  aria-label="Сортування"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4h10M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {sortOpen && (
                  <div className={styles.sortDropdown}>
                    {accepted.length > 0 && (
                      <>
                        <p className={styles.dropdownSection}>ПОКАЗАТИ</p>
                        {WATCH_SCOPE_OPTIONS.map(o => (
                          <button
                            key={o.key}
                            type="button"
                            className={`${styles.sortOption} ${watchScope === o.key ? styles.sortOptionActive : ''}`}
                            onClick={() => { setWatchScope(o.key); setSortOpen(false) }}
                          >
                            {watchScope === o.key && <span className={styles.sortOptionDot} />}
                            {o.label}
                          </button>
                        ))}
                        <div className={styles.dropdownDivider} />
                      </>
                    )}
                    <p className={styles.dropdownSection}>СОРТУВАННЯ</p>
                    {(
                      [
                        { key: 'newest', label: 'Нові спочатку' },
                        { key: 'oldest', label: 'Старі спочатку' },
                        { key: 'year_desc', label: 'Рік: новіші' },
                        { key: 'year_asc', label: 'Рік: старіші' },
                        { key: 'rating', label: 'Рейтинг' },
                      ] as { key: SortBy; label: string }[]
                    ).map(o => (
                      <button
                        key={o.key}
                        type="button"
                        className={`${styles.sortOption} ${sortBy === o.key ? styles.sortOptionActive : ''}`}
                        onClick={() => { setSortBy(o.key); setSortOpen(false) }}
                      >
                        {sortBy === o.key && <span className={styles.sortOptionDot} />}
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className={styles.mediaSkeleton}>
                {Array.from({ length: 9 }, (_, i) => <div key={i} className={styles.skeletonCard} />)}
              </div>
            ) : (
              <div key={`${tab}-${activeStatus ?? ''}-${[...activeGenres].join(',')}-${sortBy}-${watchScope}`} className={styles.contentAnimated}>
                <WatchlistGrid items={tabItems} onTap={setSelected} />
              </div>
            )}
          </>
        )}

        {/* ── Books content ── */}
        {isBook && (
          <>
            <div className={styles.searchWrap}>
              <BookSearch onAdd={handleAdd} />
            </div>
            <div className={styles.contentAnimated}>
              <WatchlistGrid
                items={items.filter(i => i.category === 'book')}
                onTap={setSelected}
              />
            </div>
          </>
        )}

        {/* ── Games content ── */}
        {isGame && (
          <>
            <div className={styles.searchWrap}>
              <button
                type="button"
                className={styles.gameSearchTrigger}
                onClick={() => setGameSearchOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Пошук гри...
              </button>
              <div className={styles.sortWrap} ref={gameSortRef}>
                <button
                  type="button"
                  className={`${styles.sortBtn} ${(gameSortBy !== 'added' || gameGenreFilter !== null || gamePlatformFilter !== null || gameStatusFilter === 'dropped' || gameStatusFilter === 'announced') ? styles.sortBtnActive : ''}`}
                  onClick={() => setGameSortOpen(v => !v)}
                  aria-label="Сортування і фільтр"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4h10M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {gameSortOpen && (
                  <div className={styles.sortDropdown}>
                    <p className={styles.dropdownSection}>СТАТУС</p>
                    {(['dropped', 'announced'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.sortOption} ${gameStatusFilter === s ? styles.sortOptionActive : ''}`}
                        onClick={() => { setGameStatusFilter(gameStatusFilter === s ? 'all' : s); setGameSortOpen(false) }}
                      >
                        {gameStatusFilter === s && <span className={styles.sortOptionDot} />}
                        {s === 'dropped' ? 'Кинув' : 'Анонси'}
                      </button>
                    ))}
                    <div className={styles.dropdownDivider} />
                    <p className={styles.dropdownSection}>СОРТУВАННЯ</p>
                    {GAME_SORT_OPTIONS.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        className={`${styles.sortOption} ${gameSortBy === o.id ? styles.sortOptionActive : ''}`}
                        onClick={() => { setGameSortBy(o.id); setGameSortOpen(false) }}
                      >
                        {gameSortBy === o.id && <span className={styles.sortOptionDot} />}
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {availableGameGenres.length > 1 && (
              <div className={styles.genreStrip}>
                <button
                  type="button"
                  className={`${styles.genreTag} ${gameGenreFilter === null ? styles.genreTagActive : ''}`}
                  onClick={() => setGameGenreFilter(null)}
                >
                  Всі
                </button>
                {availableGameGenres.map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`${styles.genreTag} ${gameGenreFilter === g ? styles.genreTagActive : ''}`}
                    onClick={() => setGameGenreFilter(gameGenreFilter === g ? null : g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {availableGamePlatforms.length > 1 && (
              <div className={styles.platformRail}>
                <button
                  type="button"
                  className={`${styles.platformPill} ${gamePlatformFilter === null ? styles.platformPillActive : ''}`}
                  onClick={() => setGamePlatformFilter(null)}
                >
                  Всі
                </button>
                {availableGamePlatforms.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.platformPill} ${gamePlatformFilter === p ? styles.platformPillActive : ''}`}
                    onClick={() => setGamePlatformFilter(gamePlatformFilter === p ? null : p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {gamesLoading ? (
              <div className={styles.gamesSkeleton}>
                {Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeletonCard} />)}
              </div>
            ) : (
              <div key={`game-${gameStatusFilter}-${gameGenreFilter ?? ''}-${gameSortBy}-${gamePlatformFilter ?? ''}`} className={styles.contentAnimated}>
                {filteredGames.length === 0 ? (
                  <div className={styles.emptyGames}>
                    <img src="/mimir/mimir-empty-watchlist.png" alt="" className={styles.emptyMimirImg} draggable={false} />
                    <p className={styles.emptyText}>
                      {gameGenreFilter
                        ? 'Немає ігор цього жанру'
                        : gameStatusFilter === 'all' ? 'Додай першу гру через пошук' : 'Немає ігор у цій категорії'}
                    </p>
                  </div>
                ) : (
                  <div className={styles.gamesGrid}>
                    {filteredGames.map(game => (
                      <GameCard key={game.id} item={game} onClick={() => setSelectedGame(game)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Watchlist detail modal ── */}
      {displayItem && (isMedia || isBook) && (
        <WatchlistDetail
          item={displayItem}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onRatingChange={handleRatingChange}
          onImageChange={handleImageChange}
          onNotifyChange={handleNotifyChange}
          onSimilarAdd={addItem}
          onDelete={handleDelete}
        />
      )}

      {/* ── Game detail modal ── */}
      {displayGame && (
        <GameDetail
          item={displayGame}
          isOpen={effectiveSelectedGame !== null}
          onClose={() => setSelectedGame(null)}
          onUpdate={(id, updates) => updateGame(id, updates)}
          onDelete={(id) => {
            const g = games.find(i => i.id === id)
            deleteGame(id)
            setSelectedGame(null)
            if (g) showToast(`${g.title} видалено`, 'info')
          }}
        />
      )}

      {/* ── Stats sheet ── */}
      <WatchlistStatsSheet
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        items={items}
      />

      {/* ── Game search overlay ── */}
      <GameSearch
        isOpen={gameSearchOpen}
        onClose={() => setGameSearchOpen(false)}
        onAdd={handleAddGame}
      />

      {/* ── Universal watchlist import ── */}
      <ImportWatchlistModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  )
}

export default Watchlist
