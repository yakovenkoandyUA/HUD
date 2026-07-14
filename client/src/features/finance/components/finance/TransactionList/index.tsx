import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { Transaction, Category } from '@/shared/types'
import { fmt } from '../../../utils/finance'
import { getServiceLogoUrl, getServiceEmoji } from '../../../utils/serviceLogos'
import { authFetch } from '@/shared/services/api'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { INCOME_CATEGORIES } from '../../../constants'
import Modal from '@/shared/components/ui/Modal'
import styles from './TransactionList.module.css'

const INCOME_LABEL: Record<string, string> = Object.fromEntries(
  INCOME_CATEGORIES.map(c => [c.id, c.label])
)

const FALLBACK_COLOR = 'var(--text3)'
const FALLBACK_ICON  = 'ti-dots'

/**
 * TransactionList
 * ---------------
 * Список транзакцій з кастомними dropdown-фільтрами по типу та категорії.
 * Транзакції з чеком (description = JSON з полем store) показуються з іконкою
 * і відкривають модалку деталей по тапу.
 *
 * Props:
 * @prop {Transaction[]}          transactions — масив транзакцій
 * @prop {(id: string) => void}   [onDelete]   — колбек видалення
 */
interface TransactionListProps {
  transactions: Transaction[]
  onDelete?: (id: string) => void
}

interface ReceiptData {
  store: string
  items: { name: string; price: number; category: string }[]
}

function parseReceipt(description: string): ReceiptData | null {
  try {
    const parsed = JSON.parse(description)
    return parsed.store ? (parsed as ReceiptData) : null
  } catch { return null }
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

const ReceiptIcon: React.FC = () => (
  <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
    <path d="M1 1.5h9V12l-1.5-1-2 1.5-2-1.5L3 12.5 1.5 12 1 12V1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M3 5h5M3 7.5h5M3 10h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
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

// ── Recurring service icon ────────────────────────────────────────────────────

const RecurringIcon: React.FC<{ name: string }> = ({ name }) => {
  const [imgError, setImgError] = useState(false)
  const logoUrl = getServiceLogoUrl(name)
  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={styles.recurringLogo}
        onError={() => setImgError(true)}
      />
    )
  }
  return <span className={styles.recurringEmoji}>{getServiceEmoji(name)}</span>
}

// ── Main component ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_OPTIONS: DropOption[] = [
  { value: 'all',     label: 'Всі' },
  { value: 'income',  label: 'Доходи' },
  { value: 'expense', label: 'Витрати' },
]

function getCategoryForTx(tx: Transaction, cats: Category[]): Category | undefined {
  return cats.find(c =>
    c.name.toLowerCase() === (tx.category ?? '').toLowerCase()
  )
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const renameTransaction                  = useFinanceStore(s => s.renameTransaction)
  const patchTransaction                   = useFinanceStore(s => s.patchTransaction)
  const { categories, fetchCategories }    = useCategoryStore()

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const [pendingDelete, setPendingDelete]         = useState<string | null>(null)
  const [typeFilter, setTypeFilter]               = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter]       = useState('all')
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null)
  const [isAnimating, setIsAnimating]             = useState(false)
  const [displayedList, setDisplayedList]         = useState<Transaction[]>([])
  const [editingId, setEditingId]                 = useState<string | null>(null)
  const [editingTitle, setEditingTitle]           = useState('')
  const [visibleCount, setVisibleCount]           = useState(20)
  const [newItemIds, setNewItemIds]               = useState<Set<string>>(new Set())
  const sentinelRef       = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef  = useRef(false)
  const prevIdsRef        = useRef<Set<string>>(new Set())

  // ── Receipt item editing ──
  type ReceiptItem = { name: string; price: number; category: string }
  const [editingItems, setEditingItems]       = useState<ReceiptItem[]>([])
  const [itemEditKey, setItemEditKey]         = useState<string | null>(null) // "idx-name" | "idx-price"
  const [savingReceipt, setSavingReceipt]     = useState(false)

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

  const sorted = useMemo(() =>
    [...transactions].sort((a, b) => {
      const tA = new Date(a.createdAt ?? a.date).getTime()
      const tB = new Date(b.createdAt ?? b.date).getTime()
      return tB - tA
    }),
  [transactions])

  // All matching transactions (before slicing for infinite scroll)
  const filteredAll = useMemo(() => isDefault
    ? sorted
    : sorted
        .filter(t => t.date.startsWith(currentMonth))
        .filter(t => typeFilter === 'all' || (typeFilter === 'income' ? t.type === 'topup' : t.type === 'expense'))
        .filter(t => categoryFilter === 'all' || t.category === categoryFilter),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sorted, typeFilter, categoryFilter, isDefault])

  const list = useMemo(() => filteredAll.slice(0, visibleCount), [filteredAll, visibleCount])

  const hasMore = visibleCount < filteredAll.length

  // Reset visible count and animation tracking when filters change
  useEffect(() => {
    setVisibleCount(20)
    prevIdsRef.current = new Set()
  }, [typeFilter, categoryFilter])

  // IntersectionObserver — load 20 more when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isLoadingMoreRef.current = true
          setVisibleCount(c => c + 20)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, displayedList.length])

  // Animate on filter change
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setDisplayedList(list)
      setIsAnimating(false)
    }, 150)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, categoryFilter])

  // Sync without animation when transactions data changes (initial load, add, delete, scroll)
  useEffect(() => {
    const currentIds = new Set(list.map(t => t.id))

    if (isLoadingMoreRef.current && prevIdsRef.current.size > 0) {
      const incoming = new Set([...currentIds].filter(id => !prevIdsRef.current.has(id)))
      if (incoming.size > 0) {
        setNewItemIds(incoming)
        setTimeout(() => setNewItemIds(new Set()), 320)
      }
    }

    isLoadingMoreRef.current = false
    prevIdsRef.current = currentIds
    setDisplayedList(list)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, visibleCount])

  const handleDeleteClick   = (id: string) => setPendingDelete(id)
  const handleConfirmDelete = (id: string) => { onDelete?.(id); setPendingDelete(null) }
  const handleCancelDelete  = () => setPendingDelete(null)

  const handleTitleClick = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation()
    const receipt = parseReceipt(t.description)
    setEditingId(t.id)
    setEditingTitle(t.title ?? (receipt ? receipt.store : t.description))
  }

  const handleTitleSave = async (id: string) => {
    const trimmed = editingTitle.trim()
    setEditingId(null)
    if (!trimmed) return
    const tx = transactions.find(t => t.id === id)
    if (!tx) return
    const oldTitle = tx.title
    renameTransaction(id, trimmed)
    try {
      await authFetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: trimmed }),
      })
    } catch {
      renameTransaction(id, oldTitle)
    }
  }

  const receiptModalData = selectedReceiptTx ? parseReceipt(selectedReceiptTx.description) : null

  // Sync editable items when modal opens
  useEffect(() => {
    if (receiptModalData) {
      setEditingItems(receiptModalData.items.map(i => ({ ...i })))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReceiptTx])

  const receiptNewTotal = editingItems.reduce((s, i) => s + i.price, 0)

  const handleReceiptSave = async () => {
    if (!selectedReceiptTx || !receiptModalData || savingReceipt) return
    setSavingReceipt(true)
    const newDesc   = JSON.stringify({ store: receiptModalData.store, items: editingItems })
    const newAmount = Math.round(receiptNewTotal * 100) / 100
    const prevDesc   = selectedReceiptTx.description
    const prevAmount = selectedReceiptTx.amount
    patchTransaction(selectedReceiptTx.id, { description: newDesc, amount: newAmount })
    try {
      const res = await authFetch(`/api/transactions/${selectedReceiptTx.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ desc: newDesc, amount: newAmount }),
      })
      if (!res.ok) throw new Error()
      // Keep modal open with updated tx reflected via store
      setSelectedReceiptTx(prev => prev ? { ...prev, description: newDesc, amount: newAmount } : null)
    } catch {
      patchTransaction(selectedReceiptTx.id, { description: prevDesc, amount: prevAmount })
    } finally {
      setSavingReceipt(false)
    }
  }

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
      <div className={`${styles.transactionList} ${isAnimating ? styles.fadeOut : styles.fadeIn}`}>
      {displayedList.length === 0 ? (
        <div className={styles.emptyState}>
          <img src="/mimir/mimir-empty-finance.png" alt="" className={styles.emptyImg} draggable={false} />
          <p className={styles.emptyText}>Транзакцій немає</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {displayedList.map((t) => {

            const isPending  = pendingDelete === t.id
            const receipt    = parseReceipt(t.description)
            const isRecurring = !!(t.recurringId || t.description === 'Регулярний платіж')
            return (
              <li key={t.id} className={`${styles.item} ${isPending ? styles.itemPending : ''} ${newItemIds.has(t.id) ? styles.itemNew : ''}`}>
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
                    <div
                      className={`${styles.left} ${receipt ? styles.leftClickable : ''}`}
                      onClick={receipt ? () => setSelectedReceiptTx(t) : undefined}
                    >
                      {t.type === 'expense' ? (() => {
                        if (isRecurring && t.title) {
                          return (
                            <div className={`${styles.txCatIcon} ${styles.txCatIconRecurring}`}>
                              <RecurringIcon name={t.title} />
                            </div>
                          )
                        }
                        const cat = getCategoryForTx(t, categories)
                        return (
                          <div
                            className={styles.txCatIcon}
                            style={{ '--cat-color': cat?.color ?? FALLBACK_COLOR } as React.CSSProperties}
                          >
                            <i className={`ti ${cat?.icon ?? FALLBACK_ICON}`} />
                          </div>
                        )
                      })() : (
                        <div
                          className={styles.txCatIcon}
                          style={{ '--cat-color': t.type === 'topup' ? 'var(--positive)' : 'var(--negative)' } as React.CSSProperties}
                        >
                          <i className={`ti ${t.type === 'topup' ? 'ti-arrow-up' : 'ti-arrow-down'}`} />
                        </div>
                      )}
                      {receipt && (
                        <span className={styles.receiptIconWrap}>
                          <ReceiptIcon />
                        </span>
                      )}
                      <div>
                        <div className={styles.desc}>
                          {editingId === t.id ? (
                            <input
                              className={styles.titleInput}
                              value={editingTitle}
                              autoFocus
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={() => handleTitleSave(t.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleTitleSave(t.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <span
                                className={styles.titleEditable}
                                onClick={e => handleTitleClick(e, t)}
                              >
                                {t.title ?? (receipt ? receipt.store : t.description)}
                              </span>
                              {(receipt || isRecurring) && t.category && (
                                <span className={styles.txCategory}> · {t.category}</span>
                              )}
                              {t.type === 'topup' && t.incomeCategory && (
                                <span className={styles.incomeChip}>
                                  {INCOME_LABEL[t.incomeCategory] ?? t.incomeCategory}
                                </span>
                              )}
                            </>
                          )}
                        </div>
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
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
      {!hasMore && filteredAll.length > 20 && (
        <p className={styles.allLoaded}>Всі {filteredAll.length} транзакцій завантажено</p>
      )}
      </div>

      {/* ── Receipt detail modal ── */}
      <Modal
        isOpen={!!selectedReceiptTx}
        onClose={() => setSelectedReceiptTx(null)}
        title={`🧾 ${receiptModalData?.store ?? 'Чек'}`}
        draggable
      >
        {selectedReceiptTx && receiptModalData && (
          <div className={styles.receiptModal}>
            <div className={styles.receiptModalDate}>
              {formatDate(selectedReceiptTx.date)}
            </div>

            <div className={styles.receiptModalItems}>
              {editingItems.map((item, i) => (
                <div key={i} className={styles.receiptModalItem}>
                  {/* Name cell */}
                  {itemEditKey === `${i}-name` ? (
                    <input
                      className={styles.receiptItemInput}
                      value={item.name}
                      autoFocus
                      onChange={e => setEditingItems(prev => prev.map((it, j) => j === i ? { ...it, name: e.target.value } : it))}
                      onBlur={() => setItemEditKey(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setItemEditKey(null) }}
                    />
                  ) : (
                    <span
                      className={`${styles.receiptModalItemName} ${styles.receiptItemEditable}`}
                      onClick={() => setItemEditKey(`${i}-name`)}
                    >
                      {item.name}
                    </span>
                  )}
                  {/* Price cell */}
                  {itemEditKey === `${i}-price` ? (
                    <input
                      className={`${styles.receiptItemInput} ${styles.receiptItemInputPrice}`}
                      type="number"
                      value={item.price}
                      autoFocus
                      min={0}
                      step={0.01}
                      onChange={e => setEditingItems(prev => prev.map((it, j) => j === i ? { ...it, price: parseFloat(e.target.value) || 0 } : it))}
                      onBlur={() => setItemEditKey(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setItemEditKey(null) }}
                    />
                  ) : (
                    <span
                      className={`${styles.receiptModalItemPrice} ${styles.receiptItemEditable}`}
                      onClick={() => setItemEditKey(`${i}-price`)}
                    >
                      {fmt(item.price)} ₴
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.receiptModalTotal}>
              <span>Разом</span>
              <span>{fmt(receiptNewTotal)} ₴</span>
            </div>

            <button
              type="button"
              className={styles.receiptSaveBtn}
              onClick={handleReceiptSave}
              disabled={savingReceipt}
            >
              {savingReceipt ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TransactionList
