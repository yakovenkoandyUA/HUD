import React, { useState } from 'react'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { INCOME_CATEGORIES } from '../../../constants/categories'
import styles from './TopupForm.module.css'

/**
 * TopupForm
 * ---------
 * Форма поповнення балансу з вибором категорії доходу.
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
      <div className={styles.categoryLabel}>Категорія</div>
      <div className={styles.pills}>
        {INCOME_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.pill} ${category === cat.id ? styles.pillActive : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            <i className={`ti ${cat.icon}`} />
            {cat.label}
          </button>
        ))}
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
