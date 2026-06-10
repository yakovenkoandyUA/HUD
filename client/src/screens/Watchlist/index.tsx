import React, { useMemo, useState, useEffect, useRef } from 'react'
import AppHeader from '../../components/AppHeader'
import WatchlistHero from '../../components/watchlist/WatchlistHero'
import WatchlistSearch from '../../components/watchlist/WatchlistSearch'
import WatchlistGrid from '../../components/watchlist/WatchlistGrid'
import WatchlistDetail from '../../components/watchlist/WatchlistDetail'
import { useWatchlistStore } from '../../store/watchlistStore'
import { useUiStore } from '../../store/uiStore'
import { getToken } from '../../services/api'
import type { WatchlistCategory, WatchlistItem, WatchlistStatus } from '../../types'
import styles from './Watchlist.module.css'

type Tab = WatchlistCategory
type SortBy = 'newest' | 'oldest' | 'year_desc' | 'year_asc' | 'rating'

const STATUS_ORDER: Record<string, number> = {
  watching: 0,
  want:     1,
  watched:  2,
  dropped:  3,
}


const TABS: { id: Tab; label: string }[] = [
  { id: 'movie',  label: 'Фільми' },
  { id: 'series', label: 'Серіали' },
  { id: 'anime',  label: 'Аніме' },
  { id: 'book',   label: 'Книги' },
]

const Watchlist: React.FC = () => {
  const { items, addItem, setStatus, setRating, updateItem, deleteItem, fetchWatchlist } = useWatchlistStore()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('movie')
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())

  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!getToken()) return
    fetchWatchlist()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selected, setSelected] = useState<WatchlistItem | null>(null)
  const lastSelectedRef = useRef<WatchlistItem | null>(null)

  // Keep selected in sync with store so toggles (watchTogether, notify) reflect immediately
  const effectiveSelected = useMemo(
    () => selected ? (items.find(i => i.id === selected.id) ?? selected) : null,
    [items, selected]
  )
  // Hold the last non-null item so WatchlistDetail stays mounted during close animation
  if (effectiveSelected) lastSelectedRef.current = effectiveSelected
  const displayItem = effectiveSelected ?? lastSelectedRef.current

  const watchingItems = useMemo(
    () => items.filter((i) => i.status === 'watching'),
    [items]
  )

  const byCategoryItems = useMemo(
    () => items.filter((i) => i.category === tab),
    [items, tab]
  )

  const availableGenres = useMemo(() => {
    const all = byCategoryItems.flatMap((i) => i.genres ?? [])
    return [...new Set(all)].sort()
  }, [byCategoryItems])

  const tabItems = useMemo(() => {
    const filtered = byCategoryItems.filter(
      (i) => (!activeStatus || i.status === activeStatus) && (activeGenres.size === 0 || (i.genres ?? []).some(g => activeGenres.has(g)))
    )
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
  }, [byCategoryItems, activeStatus, activeGenres, sortBy])

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
    if (alreadyExists) {
      showToast('Вже є у списку', 'info')
      return
    }
    addItem(item)
    showToast('Додано до списку', 'success')
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

  const handleNotifyChange = (patch: { notifyNewEpisode?: boolean; notifyNewSeason?: boolean; watchTogether?: boolean }) => {
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

  return (
    <div className={styles.screen}>
      <AppHeader />

      {/* ── "Дивлюсь зараз" hero strip ── */}
      {watchingItems.length > 0 && (
        <WatchlistHero items={watchingItems} onTap={setSelected} />
      )}

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        {([
          { status: 'watched',  count: stats.watched,  label: 'Переглянув' },
          { status: 'watching', count: stats.watching, label: 'Дивлюсь'    },
          { status: 'want',     count: stats.want,     label: 'Хочу'       },
        ] as const).map(({ status, count, label }, i) => {
          const isActive = activeStatus === status
          return (
            <React.Fragment key={status}>
              {i > 0 && <div className={styles.statDivider} />}
              <button
                type="button"
                className={`${styles.stat} ${isActive ? styles.statActive : ''}`}
                onClick={() => setActiveStatus(isActive ? null : status)}
              >
                <span className={styles.statVal}>
                  {count}
                  {isActive && <span className={styles.statClear}>×</span>}
                </span>
                <span className={styles.statLabel}>{label}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => { setTab(t.id); setActiveStatus(null); setActiveGenres(new Set()) }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Genre strip ── */}
      {availableGenres.length > 0 && (
        <div className={styles.genreStrip}>
          {availableGenres.map((g) => (
            <button
              key={g}
              type="button"
              className={`${styles.genreTag} ${activeGenres.has(g) ? styles.genreTagActive : ''}`}
              onClick={() => setActiveGenres(prev => {
                const next = new Set(prev)
                next.has(g) ? next.delete(g) : next.add(g)
                return next
              })}
            >
              {g}
            </button>
          ))}
        </div>
      )}


      {/* ── Content ── */}
      <div className={styles.content}>
        <div className={styles.searchWrap}>
          <WatchlistSearch category={tab} onAdd={handleAdd} />
          <div className={styles.sortWrap} ref={sortRef}>
            <button
              type="button"
              className={`${styles.sortBtn} ${sortBy !== 'newest' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortOpen((v) => !v)}
              aria-label="Сортування"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M5 8h6M7 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {sortOpen && (
              <div className={styles.sortDropdown}>
                {([
                  { key: 'newest',    label: 'Нові спочатку'  },
                  { key: 'oldest',    label: 'Старі спочатку' },
                  { key: 'year_desc', label: 'Рік: новіші'    },
                  { key: 'year_asc',  label: 'Рік: старіші'   },
                  { key: 'rating',    label: 'Рейтинг'        },
                ] as { key: SortBy; label: string }[]).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={`${styles.sortOption} ${sortBy === o.key ? styles.sortOptionActive : ''}`}
                    onClick={() => { setSortBy(o.key); setSortOpen(false) }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div key={`${tab}-${activeStatus ?? ''}-${[...activeGenres].join(',')}`} className={styles.contentAnimated}>
          <WatchlistGrid items={tabItems} onTap={setSelected} />
        </div>
      </div>

      {/* ── Detail modal ── */}
      {displayItem && (
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
    </div>
  )
}

export default Watchlist
