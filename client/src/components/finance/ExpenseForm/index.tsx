import React, { useState, useEffect, useRef } from 'react'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import ReceiptScanner from '../ReceiptScanner'
import { authFetch } from '../../../services/api'
import styles from './ExpenseForm.module.css'

/**
 * ExpenseForm
 * -----------
 * Форма запису витрат з вибором категорії та скануванням чеку.
 * Дефолтні категорії завжди присутні на фронті; кастомні — зберігаються в БД per-user.
 *
 * Props:
 * @prop {(amount: number, description: string, category: string) => void} onExpense — колбек після підтвердження
 */
interface ExpenseFormProps {
  onExpense: (amount: number, description: string, category: string) => void
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

interface CustomCategory {
  id: string
  name: string
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
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
  { id: 'інше', label: 'Інше', hasNote: true },
]

const CameraIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 4C1 3.448 1.448 3 2 3h1.191L4.25 1.5h4.5L9.809 3H11c.552 0 1 .448 1 1v6.5c0 .552-.448 1-1 1H2c-.552 0-1-.448-1-1V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <circle cx="6.5" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpense }) => {
  const [amount, setAmount]                     = useState('')
  const [selected, setSelected]                 = useState<string | null>(null)
  const [subSelected, setSubSelected]           = useState<string | null>(null)
  const [note, setNote]                         = useState('')
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [showNewCat, setShowNewCat]             = useState(false)
  const [newCatValue, setNewCatValue]           = useState('')
  const [savingCat, setSavingCat]               = useState(false)
  const [scannerFile, setScannerFile]           = useState<File | null>(null)
  const fileInputRef                            = useRef<HTMLInputElement>(null)
  const newCatInputRef                          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    authFetch('/api/categories')
      .then(r => r.ok ? r.json() : [])
      .then((data: { _id: string; name: string }[]) => {
        setCustomCategories(data.map(c => ({ id: c._id, name: c.name })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (showNewCat) newCatInputRef.current?.focus()
  }, [showNewCat])

  const selectedCat       = DEFAULT_CATEGORIES.find(c => c.id === selected)
  const selectedCustomCat = customCategories.find(c => c.id === selected)
  const hasSub            = !!selectedCat?.sub
  const isTransportReady  = hasSub ? !!subSelected : true
  const canSubmit         = !!amount && parseFloat(amount) > 0 && !!selected && isTransportReady

  const buildDescription = (): string => {
    if (selectedCustomCat) return selectedCustomCat.name
    if (!selectedCat) return ''
    if (hasSub && subSelected) {
      const sub = selectedCat.sub!.find(s => s.id === subSelected)
      const base = sub?.label ?? selectedCat.label
      return note.trim() ? `${base}: ${note.trim()}` : base
    }
    const base = selectedCat.label
    return note.trim() ? `${base}: ${note.trim()}` : base
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const resolvedCategory = selectedCustomCat
      ? selectedCustomCat.name.toLowerCase()
      : (subSelected || selected || 'інше')
    onExpense(parseFloat(amount), buildDescription(), resolvedCategory)
    setAmount('')
    setSelected(null)
    setSubSelected(null)
    setNote('')
  }

  const handleCatClick = (id: string) => {
    setSelected(id)
    setSubSelected(null)
    setNote('')
    setShowNewCat(false)
  }

  const saveNewCategory = async () => {
    const name = newCatValue.trim()
    if (!name || savingCat) return
    setSavingCat(true)
    try {
      const r = await authFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (!r.ok) throw new Error()
      const created: { _id: string; name: string } = await r.json()
      const newCat: CustomCategory = { id: created._id, name: created.name }
      setCustomCategories(prev => [...prev, newCat])
      setSelected(newCat.id)
      setSubSelected(null)
      setNote('')
      setShowNewCat(false)
      setNewCatValue('')
    } catch {
      // ignore
    } finally {
      setSavingCat(false)
    }
  }

  const deleteCustomCategory = (id: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== id))
    if (selected === id) setSelected(null)
    authFetch(`/api/categories/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const handleScanClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScannerFile(file)
  }

  const scanCategories = [
    { label: 'Продукти', value: 'продукти' },
    { label: 'Кава', value: 'кава' },
    { label: 'Транспорт', value: 'транспорт' },
    { label: 'Фібі', value: 'фібі' },
    { label: 'Інше', value: 'інше' },
    ...customCategories.map(c => ({ label: c.name, value: c.name.toLowerCase() })),
  ]

  if (scannerFile) {
    return (
      <ReceiptScanner
        file={scannerFile}
        allCategories={scanCategories}
        onSave={(amt, desc, cat) => { onExpense(amt, desc, cat) }}
        onCancel={() => setScannerFile(null)}
      />
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* hidden file input — always in DOM so ref is valid */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Input
        label="Сума (₴)"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="0"
      />

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Категорія</span>
          <button type="button" className={styles.scanBtn} onClick={handleScanClick}>
            <CameraIcon />
            Сканувати чек
          </button>
        </div>

        <div className={styles.chips}>
          {DEFAULT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.chip} ${selected === cat.id ? styles.chipActive : ''}`}
              onClick={() => handleCatClick(cat.id)}
            >
              {cat.label}
            </button>
          ))}

          {customCategories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.chip} ${styles.chipCustom} ${selected === cat.id ? styles.chipActive : ''}`}
              onClick={() => handleCatClick(cat.id)}
            >
              {cat.name}
              <span
                className={styles.chipDelete}
                role="button"
                aria-label="Видалити категорію"
                onClick={e => { e.stopPropagation(); deleteCustomCategory(cat.id) }}
              >
                ×
              </span>
            </button>
          ))}

          {!showNewCat && (
            <button
              type="button"
              className={styles.chipNew}
              onClick={() => setShowNewCat(true)}
            >
              + Нова...
            </button>
          )}
        </div>

        {showNewCat && (
          <div className={styles.newCatRow}>
            <input
              ref={newCatInputRef}
              className={styles.newCatInput}
              placeholder="Назва категорії..."
              value={newCatValue}
              onChange={e => setNewCatValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); saveNewCategory() }
                if (e.key === 'Escape') { setShowNewCat(false); setNewCatValue('') }
              }}
            />
            <button
              type="button"
              className={styles.newCatSaveBtn}
              onClick={saveNewCategory}
              disabled={savingCat || !newCatValue.trim()}
            >
              OK
            </button>
            <button
              type="button"
              className={styles.newCatCancelBtn}
              onClick={() => { setShowNewCat(false); setNewCatValue('') }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {hasSub && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Тип транспорту</div>
          <div className={styles.chips}>
            {selectedCat!.sub!.map(sub => (
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
