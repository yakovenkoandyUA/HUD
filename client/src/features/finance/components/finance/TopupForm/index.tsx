import React, { useMemo, useState } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import PillSelector from '@/shared/components/ui/PillSelector'
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
 * @prop {(amount: number, description: string, category: string, spaceId?: string | null, walletId?: WalletId) => void} onTopup
 * @prop {boolean}  [showWalletPicker] — показати вибір картки (лише для профілів з walletsEnabled)
 * @prop {WalletId} [defaultWalletId]  — картка, обрана за замовчуванням (активна вкладка)
 */
interface TopupFormProps {
  onTopup: (amount: number, description: string, category: string, spaceId?: string | null, walletId?: WalletId) => void
  showWalletPicker?: boolean
  defaultWalletId?: WalletId
}

const TopupForm: React.FC<TopupFormProps> = ({ onTopup, showWalletPicker = false, defaultWalletId = 'sense' }) => {
  const [walletId, setWalletId] = useState<WalletId>(defaultWalletId)
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
    onTopup(n, description || 'Поповнення', category, selectedSpaceId, walletId)
    setAmount('')
    setDescription('')
    setCategory(INCOME_CATEGORIES[0].id)
    setSelectedSpaceId(null)
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

      <Button type="submit" fullWidth>Поповнити</Button>
    </form>
  )
}

export default TopupForm
