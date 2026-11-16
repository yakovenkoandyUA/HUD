import React, { useMemo, useState } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import PillSelector from '@/shared/components/ui/PillSelector'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { INCOME_CATEGORIES, WALLET_OPTIONS } from '../../../constants'
import type { WalletId } from '@/shared/types'
import styles from './TopupForm.module.css'

/**
 * TopupForm
 * ---------
 * Форма поповнення балансу з вибором категорії доходу.
 * Відображає категорії у 3-колонковому grid (catCell-стиль, єдиний з ExpenseForm).
 * Необов'язковий вибір простору — прив'язує дохід до простору з увімкненим модулем finance.
 *
 * Якщо `showWalletPicker` — вибір картки зарахування (Sense / Mono), за замовчуванням `defaultWalletId`.
 *
 * Props:
 * @prop {(amount: number, description: string, category: string, spaceId?: string | null, walletId?: WalletId, date?: string) => void} onTopup
 * @prop {boolean}  [showWalletPicker] — показати вибір картки (лише для профілів з walletsEnabled)
 * @prop {WalletId} [defaultWalletId]  — картка, обрана за замовчуванням (активна вкладка)
 */
interface TopupFormProps {
  onTopup: (amount: number, description: string, category: string, spaceId?: string | null, walletId?: WalletId, date?: string) => void
  showWalletPicker?: boolean
  defaultWalletId?: WalletId
}

const TopupForm: React.FC<TopupFormProps> = ({ onTopup, showWalletPicker = false, defaultWalletId = 'sense' }) => {
  const [walletId, setWalletId] = useState<WalletId>(defaultWalletId)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const isToday = date === today
  const dateLabel = isToday ? 'Сьогодні' : new Date(date + 'T12:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
  const spaces = useSpacesStore(s => s.spaces)
  const financeSpaces = useMemo(() => spaces.filter(sp => !sp.archived && sp.modules.includes('finance')), [spaces])

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(INCOME_CATEGORIES[0].id)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    onTopup(n, description || 'Поповнення', category, selectedSpaceId, walletId, isToday ? undefined : date)
    setAmount('')
    setDescription('')
    setCategory(INCOME_CATEGORIES[0].id)
    setSelectedSpaceId(null)
    setDate(today)
    setShowDatePicker(false)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {showWalletPicker && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>На яку картку</span>
          <PillSelector options={WALLET_OPTIONS} value={walletId} onChange={setWalletId} />
        </div>
      )}

      <Input
        label="Сума (₴)"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="0"
      />

      <div>
        <div className={styles.categoryLabel}>Категорія</div>
        <div className={styles.catGrid}>
          {INCOME_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.catCell} ${category === cat.id ? styles.catCellActive : ''}`}
              style={{ '--cat-color': cat.color } as React.CSSProperties}
              onClick={() => setCategory(cat.id)}
            >
              <div className={styles.catCellIcon}>
                <i className={`ti ${cat.icon}`} />
              </div>
              <span className={styles.catCellName}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Опис (необов'язково)"
        value={description}
        onChange={setDescription}
        placeholder="Зарплата за червень..."
      />

      {financeSpaces.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Простір (необов'язково)</span>
          <div className={styles.spaceChips}>
            {financeSpaces.map(sp => (
              <button
                key={sp.id}
                type="button"
                className={`${styles.spaceChip} ${selectedSpaceId === sp.id ? styles.spaceChipActive : ''}`}
                style={{ '--space-color': sp.color } as React.CSSProperties}
                onClick={() => setSelectedSpaceId(prev => prev === sp.id ? null : sp.id)}
              >
                <span className={styles.spaceChipDot} />
                {sp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Date selector ── */}
      <div className={styles.dateRow}>
        <button
          type="button"
          className={`${styles.dateBtn} ${!isToday ? styles.dateBtnActive : ''}`}
          onClick={() => setShowDatePicker(v => !v)}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <rect x="1" y="3" width="14" height="12" rx="1.5"/>
            <path d="M5 1v4M11 1v4M1 7h14"/>
          </svg>
          {dateLabel}
        </button>
        {!isToday && (
          <button type="button" className={styles.dateClear} onClick={() => { setDate(today); setShowDatePicker(false) }} aria-label="Скинути дату">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l6 6M8 2l-6 6"/>
            </svg>
          </button>
        )}
      </div>

      {showDatePicker && (
        <CustomDatePicker
          value={date}
          onChange={d => { setDate(d); setShowDatePicker(false) }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      <Button type="submit" fullWidth>{isToday ? 'Поповнити' : `Поповнити за ${dateLabel}`}</Button>
    </form>
  )
}

export default TopupForm
