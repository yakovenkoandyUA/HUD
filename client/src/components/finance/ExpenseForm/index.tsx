import React, { useState, useEffect, useRef } from 'react'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import ReceiptScanner from '../ReceiptScanner'
import { authFetch } from '../../../services/api'
import { useCategoryStore } from '../../../store/categoryStore'
import type { Category } from '../../../types'
import styles from './ExpenseForm.module.css'

/**
 * ExpenseForm
 * -----------
 * Форма запису витрат з вибором категорії (іконка + колір з бекенду) та скануванням чеку.
 * Категорії завантажуються з /api/categories, активні (isActive: true) відображаються.
 *
 * Props:
 * @prop {(amount: number, description: string, category: string) => void} onExpense — колбек після підтвердження
 */
interface ExpenseFormProps {
  onExpense: (amount: number, description: string, category: string) => void
}

const CameraIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 4C1 3.448 1.448 3 2 3h1.191L4.25 1.5h4.5L9.809 3H11c.552 0 1 .448 1 1v6.5c0 .552-.448 1-1 1H2c-.552 0-1-.448-1-1V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <circle cx="6.5" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const PlusIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpense }) => {
  const { categories, fetchCategories, addCategory } = useCategoryStore()
  const [amount, setAmount]             = useState('')
  const [description, setDescription]  = useState('')
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [scannerFile, setScannerFile]   = useState<File | null>(null)

  const [addingCat, setAddingCat]       = useState(false)
  const [newCatValue, setNewCatValue]   = useState('')
  const [savingCat, setSavingCat]       = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)
  const newCatRef                       = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    if (addingCat) newCatRef.current?.focus()
  }, [addingCat])

  const activeCategories = categories.filter(c => c.isActive)
  const selectedCat      = activeCategories.find(c => c._id === selectedId) ?? null
  const canSubmit        = !!amount && parseFloat(amount) > 0 && !!selectedId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !selectedCat) return
    const desc = description.trim() || selectedCat.name
    onExpense(parseFloat(amount), desc, selectedCat.name.toLowerCase())
    setAmount('')
    setDescription('')
    setSelectedId(null)
  }

  const handleCatSelect = (cat: Category) => {
    setSelectedId(cat._id)
    if (!description) setDescription('')
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
      const created: Category = await r.json()
      addCategory(created)
      setSelectedId(created._id)
      setNewCatValue('')
      setAddingCat(false)
    } catch { /* ignore */ } finally {
      setSavingCat(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScannerFile(file)
  }

  const scanCategories = activeCategories.map(c => ({ label: c.name, value: c.name.toLowerCase() }))

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

      {/* ── Category picker ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Категорія</span>
          <button type="button" className={styles.scanBtn} onClick={() => fileInputRef.current?.click()}>
            <CameraIcon />
            Сканувати чек
          </button>
        </div>

        <div className={styles.categoriesScroll}>
          {activeCategories.map(cat => (
            <button
              key={cat._id}
              type="button"
              className={`${styles.catChip} ${selectedId === cat._id ? styles.catChipActive : ''}`}
              style={{ '--cat-color': cat.color } as React.CSSProperties}
              onClick={() => handleCatSelect(cat)}
            >
              <div className={styles.catChipIcon}>
                <i className={`ti ${cat.icon}`} />
              </div>
              <span className={styles.catChipName}>{cat.name}</span>
            </button>
          ))}

          {/* Add new category */}
          {addingCat ? (
            <div className={styles.newCatInline}>
              <input
                ref={newCatRef}
                className={styles.newCatInput}
                placeholder="Назва..."
                value={newCatValue}
                onChange={e => setNewCatValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); saveNewCategory() }
                  if (e.key === 'Escape') { setAddingCat(false); setNewCatValue('') }
                }}
                onBlur={() => { if (!newCatValue.trim()) { setAddingCat(false) } }}
                maxLength={24}
              />
              <button
                type="button"
                className={styles.newCatSaveBtn}
                onClick={saveNewCategory}
                disabled={savingCat || !newCatValue.trim()}
              >
                <CheckIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.catChipAdd}
              onClick={() => setAddingCat(true)}
            >
              <div className={styles.catChipAddIcon}>
                <PlusIcon />
              </div>
              <span className={styles.catChipName}>Нова</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Optional description ── */}
      <Input
        label={`Опис (необов'язково)`}
        value={description}
        onChange={setDescription}
        placeholder={selectedCat?.name ?? 'Деталі...'}
      />

      <Button type="submit" fullWidth disabled={!canSubmit}>
        Записати витрату
      </Button>
    </form>
  )
}

export default ExpenseForm
