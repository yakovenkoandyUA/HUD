import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import type { Transaction } from '@/shared/types'
import styles from './TripExpensesSheet.module.css'

/**
 * TripExpensesSheet
 * -----------------
 * Bottom sheet що з'являється після створення trip-спогаду.
 * Показує витрати за діапазон дат поїздки, дає вибрати які
 * позначити як "витрати поїздки" (tripMemoryId).
 *
 * Props:
 * @prop {boolean}    isOpen       — чи відкритий sheet
 * @prop {() => void} onClose      — закриття (навігація до спогаду відбувається зовні)
 * @prop {string}     memoryId     — id новоствореного спогаду
 * @prop {string}     memoryTitle  — назва поїздки
 * @prop {string}     dateFrom     — початок поїздки (YYYY-MM-DD)
 * @prop {string}     dateTo       — кінець поїздки (YYYY-MM-DD)
 */
interface TripExpensesSheetProps {
  isOpen: boolean
  onClose: () => void
  memoryId: string
  memoryTitle: string
  dateFrom: string
  dateTo: string
}

const fmt = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const TripExpensesSheet: React.FC<TripExpensesSheetProps> = ({
  isOpen, onClose, memoryId, memoryTitle, dateFrom, dateTo,
}) => {
  const { transactions, fetchTransactions, tagTripExpenses } = useFinanceStore()

  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving]     = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useModalHistory(onClose, isOpen)
  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted, bodyRef: listRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // витрати в діапазоні дат
  const tripExpenses: Transaction[] = transactions.filter(t =>
    t.type === 'expense' &&
    t.date.slice(0, 10) >= dateFrom &&
    t.date.slice(0, 10) <= dateTo &&
    !t.tripMemoryId
  )

  // при відкритті: завантажити транзакції + виділити всі
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!isOpen) return
      await fetchTransactions()
      if (cancelled) return
      // виділяємо всі після завантаження — через мікротаск щоб tripExpenses вже перерахувався
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // синхронізуємо selected з реальним списком витрат
  useEffect(() => {
    setSelected(new Set(tripExpenses.map(t => t.id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripExpenses.length, isOpen])

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selected.size === tripExpenses.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tripExpenses.map(t => t.id)))
    }
  }

  const handleSave = async () => {
    if (selected.size === 0) { onClose(); return }
    setSaving(true)
    tagTripExpenses([...selected], memoryId)
    setSaving(false)
    onClose()
  }

  if (!mounted) return null

  const total = tripExpenses
    .filter(t => selected.has(t.id))
    .reduce((s, t) => s + t.amount, 0)

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />

        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.headerTitle}>ВИТРАТИ ПОЇЗДКИ</span>
            <span className={styles.headerSub}>{memoryTitle} · {fmt(dateFrom)}–{fmt(dateTo)}</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {tripExpenses.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 14l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Витрат за цей період не знайдено</span>
          </div>
        ) : (
          <>
            <div className={styles.selectAllRow}>
              <button type="button" className={styles.selectAllBtn} onClick={toggleAll}>
                <span className={`${styles.checkbox} ${selected.size === tripExpenses.length ? styles.checkboxChecked : ''}`}>
                  {selected.size === tripExpenses.length && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className={styles.selectAllLabel}>
                  {selected.size === tripExpenses.length ? 'Зняти всі' : 'Вибрати всі'}
                </span>
              </button>
              <span className={styles.countLabel}>{tripExpenses.length} транзакцій</span>
            </div>

            <div ref={listRef} className={styles.list}>
              {tripExpenses.map(t => {
                const checked = selected.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.item} ${checked ? styles.itemChecked : ''}`}
                    onClick={() => toggle(t.id)}
                  >
                    <span className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}>
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <div className={styles.itemBody}>
                      <span className={styles.itemDesc}>{t.description}</span>
                      {t.category && <span className={styles.itemCat}>{t.category}</span>}
                    </div>
                    <div className={styles.itemRight}>
                      <span className={styles.itemAmt}>−{t.amount.toLocaleString('uk-UA')} ₴</span>
                      <span className={styles.itemDate}>{fmt(t.date.slice(0, 10))}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className={styles.footer}>
              {selected.size > 0 && (
                <span className={styles.footerTotal}>
                  Обрано: {selected.size} · {total.toLocaleString('uk-UA')} ₴
                </span>
              )}
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {selected.size > 0
                  ? `Позначити ${selected.size} як витрати поїздки`
                  : 'Позначити обрані'}
              </button>
              <button type="button" className={styles.skipBtn} onClick={onClose}>
                Пропустити
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TripExpensesSheet
