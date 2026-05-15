import React, { useState } from 'react'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import styles from './ExpenseForm.module.css'

/**
 * ExpenseForm
 * -----------
 * Форма запису витрат з вибором категорії.
 *
 * Props:
 * @prop {(amount: number, description: string) => void} onExpense — колбек після підтвердження
 */
interface ExpenseFormProps {
  onExpense: (amount: number, description: string) => void
}

interface SubOption {
  id: string
  label: string
}

interface CategoryOption {
  id: string
  label: string
  sub?: SubOption[]
  hasNote?: boolean
}

const CATEGORIES: CategoryOption[] = [
  { id: 'кава', label: 'Кава' },
  { id: 'продукти', label: 'Продукти' },
  {
    id: 'транспорт',
    label: 'Транспорт',
    sub: [
      { id: 'таксі', label: 'Таксі' },
      { id: 'метро', label: 'Метро' },
      { id: 'транспорт-інше', label: 'Інше' },
    ],
  },
  { id: 'фібі', label: 'Фібі (Троглодіт)' },
  { id: 'коська', label: 'Коська', hasNote: true },
  { id: 'інше', label: 'Інше', hasNote: true },
]

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpense }) => {
  const [amount, setAmount] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [subSelected, setSubSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const selectedCat = CATEGORIES.find((c) => c.id === selected)
  const hasSub = !!selectedCat?.sub
  const isTransportReady = hasSub ? !!subSelected : true
  const canSubmit = !!amount && parseFloat(amount) > 0 && !!selected && isTransportReady

  const buildDescription = (): string => {
    if (!selectedCat) return ''
    if (hasSub && subSelected) {
      const sub = selectedCat.sub!.find((s) => s.id === subSelected)
      const base = sub?.label ?? selectedCat.label
      return note.trim() ? `${base}: ${note.trim()}` : base
    }
    const base = selectedCat.label
    return note.trim() ? `${base}: ${note.trim()}` : base
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onExpense(parseFloat(amount), buildDescription())
    setAmount('')
    setSelected(null)
    setSubSelected(null)
    setNote('')
  }

  const handleCatClick = (id: string) => {
    setSelected(id)
    setSubSelected(null)
    setNote('')
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Сума (₴)"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="0"
      />

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Категорія</div>
        <div className={styles.chips}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.chip} ${selected === cat.id ? styles.chipActive : ''}`}
              onClick={() => handleCatClick(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {hasSub && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Тип транспорту</div>
          <div className={styles.chips}>
            {selectedCat!.sub!.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`${styles.chip} ${subSelected === sub.id ? styles.chipActive : ''}`}
                onClick={() => setSubSelected(sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCat?.hasNote && (
        <Input
          label="Уточнення (необов'язково)"
          value={note}
          onChange={setNote}
          placeholder="Деталі..."
        />
      )}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        Записати витрату
      </Button>
    </form>
  )
}

export default ExpenseForm
