import React, { useState, useEffect, useRef, useMemo } from 'react'
import Input from '@/shared/components/ui/Input'
import Button from '@/shared/components/ui/Button'
import ReceiptScanner from '../ReceiptScanner'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { useCategoryStore } from '@/features/finance/store/categoryStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { INCOME_ONLY_NAMES } from '@/features/finance/constants'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import type { Category } from '@/shared/types'
import styles from './ExpenseForm.module.css'

/**
 * ExpenseForm
 * -----------
 * Форма запису витрат з 5-колонковим гридом категорій (іконка + колір з бекенду).
 * При виборі категорії з підкатегоріями — показує горизонтальні chips для деталізації.
 * Фінальна категорія: selectedSubCategoryId ?? selectedCategoryId.
 * Необов'язковий вибір простору — прив'язує витрату до простору з увімкненим модулем finance.
 *
 * Props:
 * @prop {(amount: number, description: string, category: string, spaceId?: string | null, subcategory?: string | null) => void} onExpense
 */
interface ExpenseFormProps {
  onExpense: (amount: number, description: string, category: string, spaceId?: string | null, subcategory?: string | null, date?: string) => void
}

const CameraIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 4C1 3.448 1.448 3 2 3h1.191L4.25 1.5h4.5L9.809 3H11c.552 0 1 .448 1 1v6.5c0 .552-.448 1-1 1H2c-.552 0-1-.448-1-1V4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <circle cx="6.5" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)


const VISIBLE_CATS = 10

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpense }) => {
  const { categories, fetchCategories, trackCategoryUsage } = useCategoryStore()
  const transactions = useFinanceStore(s => s.transactions)
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const canScan = useCanUseFeature('receiptScanner')
  const spaces = useSpacesStore(s => s.spaces)
  const fetchSpaces = useSpacesStore(s => s.fetchSpaces)
  const financeSpaces = spaces.filter(sp => sp.modules.includes('finance'))
  const [amount, setAmount]                     = useState('')
  const [description, setDescription]          = useState('')
  const [selectedCatId, setSelectedCatId]       = useState<string | null>(null)
  const [selectedSubCatId, setSelectedSubCatId] = useState<string | null>(null)
  const [selectedSpaceId, setSelectedSpaceId]   = useState<string | null>(null)
  const [scannerFile, setScannerFile]           = useState<File | null>(null)
  const [catsExpanded, setCatsExpanded]         = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [date, setDate]                         = useState<string>(new Date().toISOString().slice(0, 10))
  const [showDatePicker, setShowDatePicker]     = useState(false)
  const fileInputRef                            = useRef<HTMLInputElement>(null)
  const cameraInputRef                          = useRef<HTMLInputElement>(null)

  const today       = new Date().toISOString().slice(0, 10)
  const isToday     = date === today
  const dateLabel   = isToday ? 'Сьогодні' : new Date(date + 'T12:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (spaces.length === 0) fetchSpaces() }, [])

  const catFrequency = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.category) {
        const name = tx.category.toLowerCase()
        freq[name] = (freq[name] ?? 0) + 1
      }
    }
    return freq
  }, [transactions])

  const activeCategories = categories.filter(c => c.isActive)
  const parentCats = activeCategories
    .filter(c => !c.parentId)
    .filter(c => !INCOME_ONLY_NAMES.has(c.name.toLowerCase()))
    .slice()
    .sort((a, b) => (catFrequency[b.name.toLowerCase()] ?? 0) - (catFrequency[a.name.toLowerCase()] ?? 0))
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
    const categoryName = (selectedCat ?? finalCat).name.toLowerCase()
    const subcategoryName = selectedSubCat ? selectedSubCat.name : null
    if (selectedCatId) trackCategoryUsage(selectedCatId)
    onExpense(parseFloat(amount), desc, categoryName, selectedSpaceId, subcategoryName, isToday ? undefined : date)
    setAmount('')
    setDescription('')
    setSelectedCatId(null)
    setSelectedSubCatId(null)
    setSelectedSpaceId(null)
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
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
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
          <div className={styles.scanWrap}>
          <button type="button" className={styles.scanBtn} onClick={() => {
              if (!activeProfile?.isVerified) { showToast('Підтвердіть email для сканування чеків', 'error'); return }
              if (!canScan) { showToast('Сканер чеків — план PERSONAL', 'error'); window.location.href = '/profile?tab=plan'; return }
              setShowSourcePicker(v => !v)
            }}>
            <CameraIcon />
            Сканувати чек
            {!activeProfile?.isVerified && <span className={styles.verifyBadge}>ВЕРИФІКАЦІЯ</span>}
          </button>
          {showSourcePicker && (
            <div className={styles.sourcePicker}>
              <button type="button" className={styles.sourceOption} onClick={() => { setShowSourcePicker(false); cameraInputRef.current?.click() }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 5C1.5 4.17 2.17 3.5 3 3.5h1.5L6 1.5h6l1.5 2H15c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H3c-.83 0-1.5-.67-1.5-1.5V5z"/>
                  <circle cx="9" cy="9" r="2.5"/>
                </svg>
                Камера
              </button>
              <button type="button" className={styles.sourceOption} onClick={() => { setShowSourcePicker(false); fileInputRef.current?.click() }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="3" width="15" height="12" rx="1.5"/>
                  <circle cx="6" cy="7.5" r="1.5"/>
                  <path d="M1.5 12l4-4 3 3 2.5-2.5 4 4"/>
                </svg>
                Світлини
              </button>
            </div>
          )}
          </div>
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

      {/* ── Space link (shown only if user has spaces with finance module) ── */}
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

      {/* ── Date selector ── */}
      <div className={styles.dateRow}>
        <button
          type="button"
          className={`${styles.dateBtn} ${!isToday ? styles.dateBtnActive : ''}`}
          onClick={() => setShowDatePicker(v => !v)}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="3" width="14" height="12" rx="1.5"/>
            <path d="M5 1v4M11 1v4M1 7h14"/>
          </svg>
          {dateLabel}
        </button>
        {!isToday && (
          <button type="button" className={styles.dateClear} onClick={() => { setDate(today); setShowDatePicker(false) }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6"/>
            </svg>
          </button>
        )}
      </div>

      {showDatePicker && (
        <CustomDatePicker
          value={date}
          onChange={d => { setDate(d); setShowDatePicker(false) }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        {isToday ? 'Записати витрату' : `Записати за ${dateLabel}`}
      </Button>
    </form>
  )
}

export default ExpenseForm
