import React, { useState } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import PillSelector from '@/shared/components/ui/PillSelector'
import { INCOME_CATEGORIES } from '../../../constants'
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
      <PillSelector
        options={INCOME_CATEGORIES.map(cat => ({
          value: cat.id,
          label: cat.label,
          icon: <i className={`ti ${cat.icon}`} />,
        }))}
        value={category}
        onChange={setCategory}
      />
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
