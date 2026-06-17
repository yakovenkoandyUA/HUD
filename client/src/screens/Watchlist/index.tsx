import React, { useMemo, useState, useEffect, useRef } from 'react'
import AppHeader from '../../components/AppHeader'
import WatchlistHero from '../../components/watchlist/WatchlistHero'
import WatchlistSearch from '../../components/watchlist/WatchlistSearch'
import WatchlistGrid from '../../components/watchlist/WatchlistGrid'
import WatchlistDetail from '../../components/watchlist/WatchlistDetail'
import GameSearch from '../../components/games/GameSearch'
import GameCard from '../../components/games/GameCard'
import GameDetail from '../../components/games/GameDetail'
import { useWatchlistStore } from '../../store/watchlistStore'
import { useGamesStore } from '../../store/gamesStore'
import { useUiStore } from '../../store/uiStore'
import { useFamilyStore } from '../../store/familyStore'
import { getToken } from '../../services/api'
import type { WatchlistCategory, WatchlistItem, WatchlistStatus, GameItem, GameStatus } from '../../types'
import { openmojiUrl } from '../../utils/openmojiUrl'
import styles from './Watchlist.module.css'

type Tab = WatchlistCategory | 'game'
type SortBy = 'newest' | 'oldest' | 'year_desc' | 'year_asc' | 'rating'
type WatchScope = 'all' | 'together' | 'solo'
type GameStatusFilter = 'all' | GameStatus

const WATCH_SCOPE_OPTIONS: { key: WatchScope; label: string }[] = [
  { key: 'all',      label: 'Всі'       },
  { key: 'together', label: 'Разом'     },
  { key: 'solo',     label: 'Особисте'  },
]

const GAME_STATUS_TABS: { id: GameStatusFilter; label: string }[] = [
  { id: 'all',       label: 'Всі'      },
  { id: 'playing',   label: 'Граю'     },
  { id: 'want',      label: 'Хочу'     },
  { id: 'completed', label: 'Пройдено' },
  { id: 'announced', label: 'Анонси'   },
  { id: 'dropped',   label: 'Кинув'    },
]

const STATUS_ORDER: Record<string, number> = {
  watching: 0,
  want:     1,
  watched:  2,
  dropped:  3,
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'movie',  label: 'Фільми',  icon: '1F3AC' },
  { id: 'series', label: 'Серіали', icon: '1F4FA' },
  { id: 'anime',  label: 'Аніме',   icon: '1F338' },
  { id: 'game',   label: 'Ігри',    icon: '1F3AE' },
]

const STAT_LABELS: Record<string, { short: string }> = {
  watched:  { short: 'переглянуто' },
  watching: { short: 'дивлюся'     },
  want:     { short: 'хочу'        },
}

const Watchlist: React.FC = () => {
  const { items, addItem, setStatus, setRating, updateItem, deleteItem, fetchWatchlist } = useWatchlistStore()
  const { items: games, fetchGames, addGame, updateGame, deleteGame } = useGamesStore()
  const { showToast } = useUiStore()
  const { accepted, fetchFamily } = useFamilyStore()
  const [tab, setTab] = useState<Tab>('movie')
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [watchScope, setWatchScope] = useState<WatchScope>('all')
  const [gameStatusFilter, setGameStatusFilter] = useState<GameStatusFilter>('all')

  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

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

  const filteredGames = useMemo(() => {
    if (gameStatusFilter === 'all') return games
    return games.filter(g => g.status === gameStatusFilter)
  }, [games, gameStatusFilter])

  const gameStats = useMemo(() => ({
    total:     games.length,
    playing:   games.filter(g => g.status === 'playing').length,
    completed: games.filter(g => g.status === 'completed').length,
    platinum:  games.filter(g => g.platinum).length,
  }), [games])

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
    showToast('Додано до списку', 'success')
  }

  const handleAddGame = (game: Omit<GameItem, 'id' | 'addedAt'>) => {
    addGame(game)
    showToast(`${game.title} додано`, 'success')
  }

  const handleStatusChange = (status: WatchlistStatus) => {
    if (!selected) return
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

  return (
    <div className={styles.screen}>
      <AppHeader />

      {/* ── Stats row — hidden on games tab ── */}
      {!isGame && (
        <div className={styles.statsRow}>
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
      )}

      {/* ── Game stats row ── */}
      {isGame && (
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{gameStats.total}</span>
            <span className={styles.statLabel}>всього</span>
          </div>
          <span className={styles.statSep}>·</span>
          <div className={styles.stat}>
            <span className={styles.statNum}>{gameStats.playing}</span>
            <span className={styles.statLabel}>граю</span>
          </div>
          <span className={styles.statSep}>·</span>
          <div className={styles.stat}>
            <span className={styles.statNum}>{gameStats.completed}</span>
            <span className={styles.statLabel}>пройдено</span>
          </div>
          <span className={styles.statSep}>·</span>
          <div className={styles.stat}>
            <span className={styles.statNum}>{gameStats.platinum}</span>
            <span className={styles.statLabel}>platinum</span>
          </div>
        </div>
      )}

      {/* ── Content (scrollable) ── */}
      <div className={styles.content}>
        {/* hero scrolls away — only for media tabs */}
        {!isGame && watchingItems.length > 0 && <WatchlistHero items={watchingItems} onTap={setSelected} />}

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
        {!isGame && (
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

            <div key={`${tab}-${activeStatus ?? ''}-${[...activeGenres].join(',')}-${sortBy}-${watchScope}`} className={styles.contentAnimated}>
              <WatchlistGrid items={tabItems} onTap={setSelected} />
            </div>
          </>
        )}

        {/* ── Games content ── */}
        {isGame && (
          <>
            <div className={styles.searchWrap}>
              <GameSearch onAdd={handleAddGame} />
            </div>

            <div className={styles.tabsInner}>
              {GAME_STATUS_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.innerTab} ${gameStatusFilter === t.id ? styles.innerTabActive : ''}`}
                  onClick={() => setGameStatusFilter(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div key={`game-${gameStatusFilter}`} className={styles.contentAnimated}>
              {filteredGames.length === 0 ? (
                <div className={styles.emptyGames}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="5"/>
                    <path d="M6 12h4M8 10v4"/>
                    <circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                  <p className={styles.emptyText}>
                    {gameStatusFilter === 'all' ? 'Додай першу гру через пошук' : 'Немає ігор у цій категорії'}
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
          </>
        )}
      </div>

      {/* ── Watchlist detail modal ── */}
      {displayItem && !isGame && (
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
    </div>
  )
}

export default Watchlist
