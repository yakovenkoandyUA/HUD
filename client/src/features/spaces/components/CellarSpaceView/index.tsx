import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrinksStore } from '@/features/drinks/store/drinksStore'
import DrinkCard from '@/features/drinks/components/DrinkCard'
import AddDrinkSheet from '@/features/drinks/components/AddDrinkSheet'
import { DRINK_TYPE_LABELS, type DrinkStatus, type DrinkType } from '@/features/drinks/types'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
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
  spaceId:        string
  color:          string
  spaceName:      string
  isOwner:        boolean
  coverUrl?:      string
  coverPosition?: string
  onBack:         () => void
  onEditSpace:    () => void
}

/**
 * CellarSpaceView — вигляд простору типу 'cellar'.
 * Рендерить колекцію алкогольних напоїв усередині SpaceDetail.
 */
const CellarSpaceView: React.FC<Props> = ({ color, coverUrl, coverPosition, onBack, isOwner, onEditSpace }) => {
  const navigate = useNavigate()
  const { drinks, isLoading, fetchDrinks } = useDrinksStore()

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter,   setTypeFilter]   = useState<FilterType>('all')
  const [search,       setSearch]       = useState('')
  const [addOpen,      setAddOpen]      = useState(false)

  React.useEffect(() => { fetchDrinks() }, [fetchDrinks])

  const filtered = useMemo(() => drinks
    .filter(d => statusFilter === 'all' || d.status === statusFilter)
    .filter(d => typeFilter   === 'all' || d.type   === typeFilter)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.brand.toLowerCase().includes(search.toLowerCase()))
  , [drinks, statusFilter, typeFilter, search])

  const usedTypes = useMemo(() => new Set(drinks.map(d => d.type)), [drinks])

  const coverSrc = coverUrl || SPACE_TYPE_CONFIG.cellar.iconSrc
  const colorVar = { '--space-color': color || 'var(--accent)' } as React.CSSProperties

  return (
    <div className={styles.root}>
      {/* Hero */}
      <div className={styles.hero}>
        <img
          src={coverSrc}
          alt=""
          className={styles.heroCoverImg}
          style={{ objectPosition: coverUrl ? `center ${coverPosition ?? 'center'}` : 'center center' }}
          aria-hidden="true"
        />
        <div className={styles.heroOverlay} style={colorVar} />

        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>

        {isOwner && (
          <button type="button" className={styles.editBtn} onClick={onEditSpace} aria-label="Редагувати простір">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}

        <div className={styles.heroInfo}>
          <span className={styles.heroType} style={colorVar}>Drink Deep</span>
          <h1 className={styles.heroName}>DRINK DEEP</h1>
        </div>
      </div>

      {/* Search + add */}
      <div className={styles.searchRow}>
        <input
          className={styles.search}
          placeholder="Пошук..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {isOwner && (
          <button className={styles.addBtn} style={colorVar} onClick={() => setAddOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
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
    </div>
  )
}

export default CellarSpaceView
