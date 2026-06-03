import React, { useState, useRef, useEffect } from 'react'
import type { Transaction } from '../../../types'
import { fmt } from '../../../utils/finance'
import styles from './TransactionList.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  кава:      '#8B5E3C',
  продукти:  '#4A8B3C',
  таксі:     '#E67E22',
  метро:     '#3498DB',
  транспорт: '#E67E22',
  фібі:      '#9B59B6',
  інше:      '#5a5652',
  'транспорт-інше': '#E67E22',
}

/**
 * TransactionList
 * ---------------
 * Список транзакцій з кастомними dropdown-фільтрами по типу та категорії.
 * За замовчуванням — останні 20. При активному фільтрі — поточний місяць.
 *
 * Props:
 * @prop {Transaction[]}          transactions — масив транзакцій
 * @prop {(id: string) => void}   [onDelete]   — колбек видалення
 */
interface TransactionListProps {
  transactions: Transaction[]
  onDelete?: (id: string) => void
}

type TypeFilter = 'all' | 'income' | 'expense'

// ── Custom dropdown ───────────────────────────────────────────────────────────

interface DropOption { value: string; label: string }

interface DropdownSelectProps {
  value: string
  options: DropOption[]
  onChange: (v: string) => void
  defaultLabel: string
}

const ChevronDown: React.FC = () => (
  <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
    <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CheckMark: React.FC = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
    <path d="M1 4l3 3.5 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DropdownSelect: React.FC<DropdownSelectProps> = ({ value, options, onChange, defaultLabel }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentLabel = options.find(o => o.value === value)?.label ?? defaultLabel
  const isActive = value !== 'all'

  return (
    <div className={styles.dropWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.dropTrigger} ${isActive ? styles.dropTriggerActive : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        {currentLabel}
        <span className={`${styles.dropChevron} ${open ? styles.dropChevronOpen : ''}`}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div className={styles.dropList}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.dropItem} ${value === opt.value ? styles.dropItemActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              <span className={styles.dropItemCheck}>
                {value === opt.value && <CheckMark />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

const TYPE_OPTIONS: DropOption[] = [
  { value: 'all',     label: 'Всі' },
  { value: 'income',  label: 'Доходи' },
  { value: 'expense', label: 'Витрати' },
]

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [typeFilter, setTypeFilter]       = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const currentMonth = new Date().toISOString().slice(0, 7)

  const monthlyCategories: DropOption[] = [
    { value: 'all', label: 'Категорія' },
    ...[...new Set(
      transactions
        .filter(t => t.date.startsWith(currentMonth) && t.category)
        .map(t => t.category as string),
    )].sort().map(c => ({ value: c, label: c })),
  ]

  const isDefault = typeFilter === 'all' && categoryFilter === 'all'

  const list = isDefault
    ? transactions.slice(0, 20)
    : transactions
        .filter(t => t.date.startsWith(currentMonth))
        .filter(t => typeFilter === 'all' || (typeFilter === 'income' ? t.type === 'topup' : t.type === 'expense'))
        .filter(t => categoryFilter === 'all' || t.category === categoryFilter)

  const handleDeleteClick   = (id: string) => setPendingDelete(id)
  const handleConfirmDelete = (id: string) => { onDelete?.(id); setPendingDelete(null) }
  const handleCancelDelete  = () => setPendingDelete(null)

  return (
    <div>
      {/* ── Filter row ── */}
      <div className={styles.filterRow}>
        <span className={styles.filterTitle}>Останні транзакції</span>
        <div className={styles.selects}>
          <DropdownSelect
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={v => setTypeFilter(v as TypeFilter)}
            defaultLabel="Всі"
          />
          <DropdownSelect
            value={categoryFilter}
            options={monthlyCategories}
            onChange={setCategoryFilter}
            defaultLabel="Категорія"
          />
        </div>
      </div>

      {/* ── List ── */}
      {list.length === 0 ? (
        <p className={styles.empty}>Транзакцій немає</p>
      ) : (
        <ul className={styles.list}>
          {list.map((t) => {
            const isPending = pendingDelete === t.id
            return (
              <li key={t.id} className={`${styles.item} ${isPending ? styles.itemPending : ''}`}>
                {isPending ? (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Видалити?</span>
                    <div className={styles.confirmActions}>
                      <button type="button" className={styles.confirmBtn} onClick={() => handleConfirmDelete(t.id)}>
                        Так
                      </button>
                      <button type="button" className={styles.cancelBtn} onClick={handleCancelDelete}>
                        Ні
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.left}>
                      <span
                        className={styles.dot}
                        style={
                          t.type === 'expense' && t.category
                            ? { background: CATEGORY_COLORS[t.category] ?? 'var(--negative)' }
                            : t.type === 'topup'
                              ? { background: 'var(--positive)' }
                              : { background: 'var(--negative)' }
                        }
                      />
                      <div>
                        <div className={styles.desc}>{t.description}</div>
                        <div className={styles.date}>{formatDate(t.date)}</div>
                      </div>
                    </div>
                    <div className={styles.right}>
                      <div className={`${styles.amount} ${t.type === 'topup' ? styles.pos : styles.neg}`}>
                        {t.type === 'topup' ? '+' : '−'}{fmt(t.amount)} ₴
                      </div>
                      {onDelete && (
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteClick(t.id)}
                          aria-label="Видалити"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default TransactionList
