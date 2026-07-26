import React, { useState } from 'react'
import Modal from '@/shared/components/ui/Modal'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useDrinksStore } from '../../store/drinksStore'
import { useUiStore } from '@/shared/store/uiStore'
import styles from './BuySheet.module.css'

interface Props {
  drinkId: string
  drinkName: string
  defaultPrice: number | null
  onClose: () => void
}

/**
 * BuySheet — logs a drink purchase to Finance transactions.
 */
const BuySheet: React.FC<Props> = ({ drinkId, drinkName, defaultPrice, onClose }) => {
  const { buyDrink } = useDrinksStore()
  const showToast = useUiStore(s => s.showToast)
  const [amount,  setAmount]  = useState(defaultPrice?.toString() ?? '')
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10))
  const [note,    setNote]    = useState(drinkName)
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    const num = parseFloat(amount)
    if (!num || num <= 0) return
    setSaving(true)
    try {
      await buyDrink(drinkId, num, date, note)
      showToast('Списано у фінанси', 'success')
      onClose()
    } catch {
      showToast('Помилка', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="СПИСАТИ У ФІНАНСИ" draggable>
      <div className={styles.body}>
        <p className={styles.hint}>Буде створена витрата в категорії Алкоголь</p>

        <div className={styles.field}>
          <label className={styles.label}>Сума ₴</label>
          <input
            className={styles.input}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Дата</label>
          <CustomDatePicker value={date} onChange={setDate} onClose={() => {}} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Опис транзакції</label>
          <input
            className={styles.input}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0}
        >
          {saving ? 'Зберігаю...' : 'ЗАПИСАТИ ВИТРАТУ'}
        </button>
      </div>
    </Modal>
  )
}

export default BuySheet
