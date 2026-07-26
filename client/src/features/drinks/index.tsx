import React, { useEffect, useState, useMemo } from 'react'
import { useDrinksStore } from './store/drinksStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { Navigate, useNavigate } from 'react-router-dom'
import { DRINK_TYPE_LABELS, type DrinkStatus, type DrinkType } from './types'
import AddDrinkSheet from './components/AddDrinkSheet'
import DrinkCard from './components/DrinkCard'
import styles from './Drinks.module.css'

type FilterStatus = 'all' | DrinkStatus
type FilterType = 'all' | DrinkType

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'Всі' },
  { key: 'have',     label: 'Є вдома' },
  { key: 'wishlist', label: 'Хочу' },
  { key: 'finished', label: 'Скуштовано' },
]

/**
 * Drinks — особиста база алкогольних напоїв.
 * Доступна тільки для профілів з drinksEnabled === true.
 */
const DrinksScreen: React.FC = () => {
  const profile = useProfileStore(s => s.activeProfile)
  const navigate = useNavigate()
  const { drinks, isLoading, fetchDrinks } = useDrinksStore()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter,   setTypeFilter]   = useState<FilterType>('all')
  const [search,       setSearch]       = useState('')
  const [addOpen,      setAddOpen]      = useState(false)

  useEffect(() => {
    fetchDrinks()
  }, [fetchDrinks])

  const filtered = useMemo(() => {
    return drinks
      .filter(d => statusFilter === 'all' || d.status === statusFilter)
      .filter(d => typeFilter   === 'all' || d.type   === typeFilter)
      .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase()))
  }, [drinks, statusFilter, typeFilter, search])

  const usedTypes = useMemo(() => {
    const set = new Set(drinks.map(d => d.type))
    return set
  }, [drinks])

  if (!profile?.drinksEnabled) return <Navigate to="/" replace />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.title}>Cellar</span>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.search}
          placeholder="Пошук..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Status filter */}
      <div className={styles.pills}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.pill} ${statusFilter === f.key ? styles.pillActive : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Type filter — only show types that exist */}
      {usedTypes.size > 1 && (
        <div className={styles.pills}>
          <button
            className={`${styles.pill} ${typeFilter === 'all' ? styles.pillActive : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            Всі типи
          </button>
          {(Object.entries(DRINK_TYPE_LABELS) as [DrinkType, string][])
            .filter(([k]) => usedTypes.has(k))
            .map(([k, label]) => (
              <button
                key={k}
                className={`${styles.pill} ${typeFilter === k ? styles.pillActive : ''}`}
                onClick={() => setTypeFilter(k)}
              >
                {label}
              </button>
            ))}
        </div>
      )}

      {isLoading && drinks.length === 0 ? (
        <div className={styles.empty}>Завантаження...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {drinks.length === 0
            ? 'Додай першу пляшку до колекції'
            : 'Нічого не знайдено'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(drink => (
            <DrinkCard key={drink._id} drink={drink} onClick={() => navigate(`/drinks/${drink._id}`)} />
          ))}
        </div>
      )}

      {addOpen && <AddDrinkSheet onClose={() => setAddOpen(false)} />}
    </div>
  )
}

export default DrinksScreen
