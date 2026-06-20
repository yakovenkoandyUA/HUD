import React, { useEffect, useMemo, useRef, useState } from 'react'
import AppHeader from '../../components/AppHeader'
import GameCard from '../../components/games/GameCard'
import GameHero from '../../components/games/GameHero'
import GameSearch from '../../components/games/GameSearch'
import GameDetail from '../../components/games/GameDetail'
import { useGamesStore } from '../../store/gamesStore'
import { useUiStore } from '../../store/uiStore'
import { getToken } from '../../services/api'
import type { GameItem, GameStatus } from '../../types'
import styles from './Games.module.css'

type StatusFilter = 'all' | GameStatus

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',       label: 'Всі'      },
  { id: 'playing',   label: 'Граю'     },
  { id: 'want',      label: 'Хочу'     },
  { id: 'completed', label: 'Пройдено' },
  { id: 'announced', label: 'Анонси'   },
  { id: 'dropped',   label: 'Кинув'    },
]

const Games: React.FC = () => {
  const { items, loading, fetchGames, addGame, updateGame, deleteGame } = useGamesStore()
  const { showToast } = useUiStore()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected]         = useState<GameItem | null>(null)
  const lastSelectedRef                 = useRef<GameItem | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!getToken()) return
      await fetchGames()
      if (cancelled) return
    }
    load()
    return () => { cancelled = true }
  }, [fetchGames])

  const effectiveSelected = useMemo(
    () => selected ? (items.find(i => i.id === selected.id) ?? selected) : null,
    [items, selected],
  )
  if (effectiveSelected) lastSelectedRef.current = effectiveSelected
  const displayItem = effectiveSelected ?? lastSelectedRef.current

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter(i => i.status === statusFilter)
  }, [items, statusFilter])

  const playingNow = useMemo(() => items.filter(i => i.status === 'playing'), [items])

  const stats = useMemo(() => ({
    total:      items.length,
    playing:    items.filter(i => i.status === 'playing').length,
    completed:  items.filter(i => i.status === 'completed').length,
    platinum:   items.filter(i => i.platinum).length,
    totalHours: Math.round(items.reduce((s, i) => s + (i.hoursPlayed ?? 0), 0)),
  }), [items])

  const handleAdd = (game: Omit<GameItem, 'id' | 'addedAt'>) => {
    addGame(game)
    showToast(`${game.title} додано`, 'success')
  }

  const handleUpdate = (id: string, updates: Partial<GameItem>) => {
    updateGame(id, updates)
  }

  const handleDelete = (id: string) => {
    const g = items.find(i => i.id === id)
    deleteGame(id)
    setSelected(null)
    if (g) showToast(`${g.title} видалено`, 'info')
  }

  const handleAddHour = (id: string) => {
    const game = items.find(i => i.id === id)
    if (!game) return
    const updated = Math.round((game.hoursPlayed ?? 0) + 1)
    updateGame(id, { hoursPlayed: updated })
    showToast('+1 година зараховано', 'success')
  }

  return (
    <div className={styles.screen}>
      <AppHeader />

      {/* Stats row — tap a stat to filter */}
      <div className={styles.statsRow}>
        <div className={styles.stat} onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
          <span className={styles.statNum}>{stats.total}</span>
          <span className={styles.statLabel}>всього</span>
        </div>
        <div className={styles.statSep} />
        <div className={styles.stat} onClick={() => setStatusFilter('playing')} style={{ cursor: 'pointer' }}>
          <span className={`${styles.statNum} ${styles.statNumTeal}`}>{stats.playing}</span>
          <span className={styles.statLabel}>граю</span>
        </div>
        <div className={styles.statSep} />
        <div className={styles.stat} onClick={() => setStatusFilter('completed')} style={{ cursor: 'pointer' }}>
          <span className={`${styles.statNum} ${styles.statNumGold}`}>{stats.completed}</span>
          <span className={styles.statLabel}>пройдено</span>
        </div>
        <div className={styles.statSep} />
        {stats.totalHours > 0 ? (
          <div className={styles.stat}>
            <span className={`${styles.statNum} ${styles.statNumAccent}`}>{stats.totalHours}</span>
            <span className={styles.statLabel}>годин</span>
          </div>
        ) : (
          <div className={styles.stat}>
            <span className={`${styles.statNum} ${styles.statNumAccent}`}>{stats.platinum}</span>
            <span className={styles.statLabel}>platinum</span>
          </div>
        )}
      </div>

      {/* "Граю зараз" hero strip */}
      {statusFilter === 'all' && (
        <GameHero
          items={playingNow}
          onTap={setSelected}
          onAddHour={handleAddHour}
        />
      )}

      {/* Search */}
      <GameSearch onAdd={handleAdd} />

      {/* Status filter tabs */}
      <div className={styles.tabsWrap}>
        <div className={styles.tabs}>
          {STATUS_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${statusFilter === t.id ? styles.tabActive : ''}`}
              onClick={() => setStatusFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className={styles.content}>
        {loading && items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.spinner} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
              <rect x="2" y="6" width="20" height="12" rx="5"/>
              <path d="M6 12h4M8 10v4"/>
              <circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none"/>
              <circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            <p className={styles.emptyText}>
              {statusFilter === 'all' ? 'Додай першу гру через пошук' : 'Немає ігор у цій категорії'}
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(game => (
              <GameCard
                key={game.id}
                item={game}
                onClick={() => setSelected(game)}
              />
            ))}
          </div>
        )}
      </div>

      {displayItem && (
        <GameDetail
          item={displayItem}
          isOpen={effectiveSelected !== null}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default Games
