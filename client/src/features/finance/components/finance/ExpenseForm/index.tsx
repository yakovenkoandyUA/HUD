import React, { useState, useEffect, useRef } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import ReceiptScanner from '../ReceiptScanner'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import type { Category } from '@/shared/types'
import styles from './ExpenseForm.module.css'

/**
 * ExpenseForm
 * -----------
 * Форма запису витрат з 5-колонковим гридом категорій (іконка + колір з бекенду).
 * При виборі категорії з підкатегоріями — показує горизонтальні chips для деталізації.
 * Фінальна категорія: selectedSubCategoryId ?? selectedCategoryId.
 * Прив'язка витрат до поїздки — ретроактивно через TripExpensesSheet (при створенні trip-спогаду).
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


const VISIBLE_CATS = 10

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpense }) => {
  const { categories, fetchCategories } = useCategoryStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const canScan = useCanUseFeature('receiptScanner')
  const [amount, setAmount]                     = useState('')
  const [description, setDescription]          = useState('')
  const [selectedCatId, setSelectedCatId]       = useState<string | null>(null)
  const [selectedSubCatId, setSelectedSubCatId] = useState<string | null>(null)
  const [scannerFile, setScannerFile]           = useState<File | null>(null)
  const [catsExpanded, setCatsExpanded]         = useState(false)
  const fileInputRef                            = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const activeCategories = categories.filter(c => c.isActive)
  const parentCats       = activeCategories.filter(c => !c.parentId)
  const selectedCat      = parentCats.find(c => c._id === selectedCatId) ?? null
  const subCats          = selectedCatId
    ? activeCategories.filter(c => c.parentId === selectedCatId)
    : []
  const selectedSubCat   = subCats.find(c => c._id === selectedSubCatId) ?? null
  const finalCat         = selectedSubCat ?? selectedCat
  const canSubmit        = !!amount && parseFloat(amount) > 0 && !!finalCat

  const handleCatSelect = (cat: Category) => {
    if (selectedCatId === cat._id) {
      setSelectedCatId(null)
      setSelectedSubCatId(null)
    } else {
      setSelectedCatId(cat._id)
      setSelectedSubCatId(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !finalCat) return
    const desc = description.trim() || finalCat.name
    onExpense(parseFloat(amount), desc, finalCat.name.toLowerCase())
    setAmount('')
    setDescription('')
    setSelectedCatId(null)
    setSelectedSubCatId(null)
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

      {/* ── Category grid ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>Категорія</span>
          <button type="button" className={styles.scanBtn} onClick={() => {
              if (!activeProfile?.isVerified) { showToast('Підтвердіть email для сканування чеків', 'error'); return }
              if (!canScan) { showToast('Сканер чеків — Personal Memory план', 'error'); window.location.href = '/profile?tab=plan'; return }
              fileInputRef.current?.click()
            }}>
            <CameraIcon />
            Сканувати чек
            {!activeProfile?.isVerified && <span className={styles.verifyBadge}>ВЕРИФІКАЦІЯ</span>}
          </button>
        </div>

        <div className={styles.catGrid}>
          {parentCats.slice(0, VISIBLE_CATS).map(cat => (
            <button
              key={cat._id}
              type="button"
              className={`${styles.catCell} ${selectedCatId === cat._id ? styles.catCellActive : ''}`}
              style={{ '--cat-color': cat.color } as React.CSSProperties}
              onClick={() => handleCatSelect(cat)}
            >
              <div className={styles.catCellIcon}>
                <i className={`ti ${cat.icon}`} />
              </div>
              <span className={styles.catCellName}>{cat.name}</span>
            </button>
          ))}
        </div>
        {parentCats.length > VISIBLE_CATS && (
          <>
            <div className={`${styles.catGridExtra} ${catsExpanded ? styles.catGridExtraOpen : ''}`}>
              {parentCats.slice(VISIBLE_CATS).map(cat => (
                <button
                  key={cat._id}
                  type="button"
                  className={`${styles.catCell} ${selectedCatId === cat._id ? styles.catCellActive : ''}`}
                  style={{ '--cat-color': cat.color } as React.CSSProperties}
                  onClick={() => handleCatSelect(cat)}
                >
                  <div className={styles.catCellIcon}>
                    <i className={`ti ${cat.icon}`} />
                  </div>
                  <span className={styles.catCellName}>{cat.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.catExpandBtn}
              onClick={() => setCatsExpanded(v => !v)}
            >
              {catsExpanded ? 'Згорнути' : `Ще ${parentCats.length - VISIBLE_CATS}`}
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className={catsExpanded ? styles.catExpandIconUp : ''}
              >
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}

        {/* ── Subcategory chips ── */}
        {subCats.length > 0 && (
          <div>
            <p className={styles.subCatLabel}>Уточнити</p>
          <div className={styles.subCatScroll}>
            {subCats.map(sub => (
              <button
                key={sub._id}
                type="button"
                className={`${styles.subChip} ${selectedSubCatId === sub._id ? styles.subChipActive : ''}`}
                style={{ '--cat-color': selectedCat?.color ?? '#9CA3AF' } as React.CSSProperties}
                onClick={() => setSelectedSubCatId(prev => prev === sub._id ? null : sub._id)}
              >
                {sub.name}
              </button>
            ))}
          </div>
          </div>
        )}
      </div>

      {/* ── Optional description ── */}
      <Input
        label={`Опис (необов'язково)`}
        value={description}
        onChange={setDescription}
        placeholder={finalCat?.name ?? 'Деталі...'}
      />

      {finalCat && (
        <div className={styles.selectedInfo}>
          <div
            className={styles.selectedDot}
            style={{ background: finalCat.parentId ? (selectedCat?.color ?? finalCat.color) : finalCat.color }}
          />
          <span>{finalCat.name}</span>
          {selectedSubCat && selectedCat && (
            <span className={styles.selectedParent}> · {selectedCat.name}</span>
          )}
          <button
            type="button"
            className={styles.selectedClear}
            onClick={() => { setSelectedCatId(null); setSelectedSubCatId(null) }}
          >
            ×
          </button>
        </div>
      )}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        Записати витрату
      </Button>
    </form>
  )
}

export default ExpenseForm
