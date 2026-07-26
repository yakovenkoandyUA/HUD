import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrinksStore } from '@/features/drinks/store/drinksStore'
import DrinkCard from '@/features/drinks/components/DrinkCard'
import AddDrinkSheet from '@/features/drinks/components/AddDrinkSheet'
import AddSpaceExpenseSheet from '../AddSpaceExpenseSheet'
import { DRINK_TYPE_LABELS, type DrinkStatus, type DrinkType } from '@/features/drinks/types'
import styles from './CellarSpaceView.module.css'

type FilterStatus = 'all' | DrinkStatus
type FilterType   = 'all' | DrinkType

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'Всі' },
  { key: 'have',     label: 'Є вдома' },
  { key: 'wishlist', label: 'Хочу' },
  { key: 'finished', label: 'Скуштовано' },
]

interface Props {
  spaceId: string
  color:   string
  isOwner: boolean
}

/**
 * CellarSpaceView — контент простору типу 'cellar'.
 * Hero — стандартний від SpaceDetail (з назвою з БД, upload обкладинки).
 */
const CellarSpaceView: React.FC<Props> = ({ spaceId, color, isOwner }) => {
  const navigate = useNavigate()
  const { drinks, isLoading, fetchDrinks } = useDrinksStore()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter,   setTypeFilter]   = useState<FilterType>('all')
  const [search,       setSearch]       = useState('')
  const [addOpen,      setAddOpen]      = useState(false)
  const [expenseOpen,  setExpenseOpen]  = useState(false)

  React.useEffect(() => { fetchDrinks() }, [fetchDrinks])

  const filtered = useMemo(() => drinks
    .filter(d => statusFilter === 'all' || d.status === statusFilter)
    .filter(d => typeFilter   === 'all' || d.type   === typeFilter)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase()))
  , [drinks, statusFilter, typeFilter, search])

  const usedTypes = useMemo(() => new Set(drinks.map(d => d.type)), [drinks])

  const colorVar = { '--space-color': color || 'var(--accent)' } as React.CSSProperties

  return (
    <div className={styles.root}>
      {/* Quick actions */}
      <div className={styles.actions} style={colorVar}>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2h8l1 6H7L8 2z" />
              <path d="M7 8c0 8 2 12 5 12s5-4 5-12" />
              <path d="M9 14s1 1 3 1 3-1 3-1" />
            </svg>
          </span>
          Напій
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setExpenseOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
          </span>
          Витрата
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
      </div>

      {/* Search + add */}
      <div className={styles.searchRow}>
        <input
          className={styles.search}
          placeholder="Пошук..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Status filter */}
      <div className={styles.pills}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.pill} ${statusFilter === f.key ? styles.pillActive : ''}`}
            style={statusFilter === f.key ? colorVar : undefined}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Type filter */}
      {usedTypes.size > 1 && (
        <div className={styles.pills}>
          <button
            className={`${styles.pill} ${typeFilter === 'all' ? styles.pillActive : ''}`}
            style={typeFilter === 'all' ? colorVar : undefined}
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
                style={typeFilter === k ? colorVar : undefined}
                onClick={() => setTypeFilter(k)}
              >
                {label}
              </button>
            ))}
        </div>
      )}

      {/* Grid */}
      {isLoading && drinks.length === 0 ? (
        <div className={styles.empty}>Завантаження...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {drinks.length === 0 ? 'Додай першу пляшку до колекції' : 'Нічого не знайдено'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(drink => (
            <DrinkCard key={drink._id} drink={drink} onClick={() => navigate(`/drinks/${drink._id}`)} />
          ))}
        </div>
      )}

      {addOpen && <AddDrinkSheet onClose={() => setAddOpen(false)} />}
      <AddSpaceExpenseSheet
        isOpen={expenseOpen}
        spaceId={spaceId}
        color={color}
        onClose={() => setExpenseOpen(false)}
        onExpenseAdded={() => {}}
      />
    </div>
  )
}

export default CellarSpaceView
