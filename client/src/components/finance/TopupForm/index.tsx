import React, { useState } from 'react'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import styles from './TopupForm.module.css'

/**
 * TopupForm
 * ---------
 * Форма поповнення балансу.
 *
 * Props:
 * @prop {(amount: number, description: string) => void} onTopup
 */
interface TopupFormProps {
  onTopup: (amount: number, description: string) => void
}

const TopupForm: React.FC<TopupFormProps> = ({ onTopup }) => {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    onTopup(n, description || 'Поповнення')
    setAmount('')
    setDescription('')
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
      <Input
        label="Опис"
        value={description}
        onChange={setDescription}
        placeholder="Зарплата, фріланс..."
      />
      <Button type="submit" fullWidth>Поповнити</Button>
    </form>
  )
}

export default TopupForm
