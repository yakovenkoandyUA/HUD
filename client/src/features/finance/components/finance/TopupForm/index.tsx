import React, { useState } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import { INCOME_CATEGORIES } from '../../../constants'
import styles from './TopupForm.module.css'

/**
 * TopupForm
 * ---------
 * Форма поповнення балансу з вибором категорії доходу.
 * Відображає категорії у 3-колонковому grid (catCell-стиль, єдиний з ExpenseForm).
 *
 * Props:
 * @prop {(amount: number, description: string, category: string) => void} onTopup
 */
interface TopupFormProps {
  onTopup: (amount: number, description: string, category: string) => void
}

const TopupForm: React.FC<TopupFormProps> = ({ onTopup }) => {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(INCOME_CATEGORIES[0].id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    onTopup(n, description || 'Поповнення', category)
    setAmount('')
    setDescription('')
    setCategory(INCOME_CATEGORIES[0].id)
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
      <Button type="submit" fullWidth>Поповнити</Button>
    </form>
  )
}

export default TopupForm
