import React, { useMemo, useState, useEffect } from 'react'
import TopBar from '../../components/layout/TopBar'
import WatchlistHero from '../../components/watchlist/WatchlistHero'
import WatchlistSearch from '../../components/watchlist/WatchlistSearch'
import WatchlistGrid from '../../components/watchlist/WatchlistGrid'
import WatchlistDetail from '../../components/watchlist/WatchlistDetail'
import { useWatchlistStore } from '../../store/watchlistStore'
import { useUiStore } from '../../store/uiStore'
import { migrateWatchlistToBackend } from '../../utils/migrateToBackend'
import { getToken } from '../../services/api'
import type { WatchlistCategory, WatchlistItem, WatchlistStatus } from '../../types'
import styles from './Watchlist.module.css'

const SYNC_COLORS: Record<string, string> = {
  synced: 'var(--positive)', syncing: 'var(--gold)', error: 'var(--negative)', local: 'var(--text3)',
}

type Tab = WatchlistCategory

const TABS: { id: Tab; label: string }[] = [
  { id: 'movie',  label: 'Фільми' },
  { id: 'series', label: 'Серіали' },
  { id: 'anime',  label: 'Аніме' },
  { id: 'book',   label: 'Книги' },
]

const Watchlist: React.FC = () => {
  const { items, addItem, setStatus, setRating, toggleReminder, deleteItem, fetchWatchlist, syncStatus } = useWatchlistStore()
  const { showToast } = useUiStore()
  const [tab, setTab] = useState<Tab>('movie')

  useEffect(() => {
    if (!getToken()) return
    migrateWatchlistToBackend().then(() => fetchWatchlist())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [selected, setSelected] = useState<WatchlistItem | null>(null)

  const watchingItems = useMemo(
    () => items.filter((i) => i.status === 'watching'),
    [items]
  )

  const tabItems = useMemo(
    () => items.filter((i) => i.category === tab),
    [items, tab]
  )

  const stats = useMemo(() => {
    const watched  = items.filter((i) => i.status === 'watched').length
    const watching = items.filter((i) => i.status === 'watching').length
    const want     = items.filter((i) => i.status === 'want').length
    const rated    = items.filter((i) => i.rating !== null)
    const avg      = rated.length
      ? (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1)
      : null
    return { watched, watching, want, avg }
  }, [items])

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

  const handleToggleReminder = (date?: string) => {
    if (!selected) return
    toggleReminder(selected.id, date)
    setSelected((prev) =>
      prev ? { ...prev, seasonReminder: !prev.seasonReminder, reminderDate: date ?? prev.reminderDate } : null
    )
  }

  const handleDelete = () => {
    if (!selected) return
    deleteItem(selected.id)
    showToast('Видалено зі списку', 'info')
    setSelected(null)
  }

  return (
    <div className={styles.screen}>
      <TopBar title="Незабутько" right={
        <span title={syncStatus} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SYNC_COLORS[syncStatus] }} />
      } />

      {/* ── "Дивлюсь зараз" hero strip ── */}
      {watchingItems.length > 0 && (
        <WatchlistHero items={watchingItems} onTap={setSelected} />
      )}

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>✓</span>
          <span className={styles.statVal}>{stats.watched}</span>
          <span className={styles.statLabel}>Переглянув</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statIcon}>▶</span>
          <span className={styles.statVal}>{stats.watching}</span>
          <span className={styles.statLabel}>Дивлюсь</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statIcon}>♥</span>
          <span className={styles.statVal}>{stats.want}</span>
          <span className={styles.statLabel}>Хочу</span>
        </div>
        {stats.avg && (
          <>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statIcon}>★</span>
              <span className={styles.statVal}>{stats.avg}</span>
              <span className={styles.statLabel}>Рейтинг</span>
            </div>
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>
        <div className={styles.searchWrap}>
          <WatchlistSearch category={tab} onAdd={handleAdd} />
        </div>

        <WatchlistGrid items={tabItems} onTap={setSelected} />
      </div>

      {/* ── Detail modal ── */}
      {selected && (
        <WatchlistDetail
          item={selected}
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onRatingChange={handleRatingChange}
          onToggleReminder={handleToggleReminder}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default Watchlist
