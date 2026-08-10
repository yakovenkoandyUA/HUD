import React, { useState, useEffect } from 'react'
import { authFetch } from '@/shared/services/api'
import { useUiStore } from '@/shared/store/uiStore'
import { compressImage } from '@/shared/utils/uploadToCloudinary'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import styles from './ReceiptScanner.module.css'

/**
 * ReceiptScanner
 * ---------------
 * Компонент preview та підтвердження розпізнаного чеку.
 * Отримує файл фото, надсилає в /api/receipt/scan (Anthropic Vision),
 * показує лоадер → preview з редагуванням позицій → підтвердження.
 *
 * Props:
 * @prop {File}                          file           — фото чеку (вже вибрано користувачем)
 * @prop {{ label: string, value: string }[]} allCategories — список категорій для select
 * @prop {Function}                      onSave         — (amount, description, category, date?)
 * @prop {Function}                      onCancel       — повернутись до форми
 */
interface ReceiptItem {
  name: string
  price: number
  category: string
}

interface ReceiptResult {
  store: string
  total: number
  date: string | null
  items: ReceiptItem[]
}

interface ReceiptScannerProps {
  file: File
  allCategories: { label: string; value: string }[]
  onSave: (amount: number, description: string, category: string, date?: string) => void
  onCancel: () => void
}

const fmtPrice = (n: number) =>
  n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ file, allCategories, onSave, onCancel }) => {
  const [status, setStatus]       = useState<'loading' | 'preview'>('loading')
  const [result, setResult]       = useState<ReceiptResult | null>(null)
  const [storeName, setStoreName] = useState('')
  const [items, setItems]         = useState<ReceiptItem[]>([])
  const [category, setCategory]   = useState(allCategories[0]?.value ?? 'продукти')
  const [date, setDate]           = useState<string>(new Date().toISOString().slice(0, 10))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const { showToast }             = useUiStore()

  const today   = new Date().toISOString().slice(0, 10)
  const isToday = date === today
  const dateLabel = isToday ? 'Сьогодні' : new Date(date + 'T12:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        // Transcodes HEIC → JPEG (Anthropic Vision doesn't accept HEIC) and downsizes
        // large camera photos before they go into a base64 JSON body.
        const compressed = await compressImage(file)
        const base64 = await fileToBase64(compressed)
        const response = await authFetch('/api/receipt/scan', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64, mimeType: compressed.type }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { error?: string; code?: string; limit?: number }
          const err = new Error(data.error ?? 'API error') as Error & { code?: string; limit?: number }
          err.code = data.code
          err.limit = data.limit
          throw err
        }
        const data: ReceiptResult = await response.json()
        if (!data.total || !Array.isArray(data.items)) throw new Error('Invalid JSON')

        if (!cancelled) {
          setResult(data)
          setStoreName(data.store || '')
          setItems(data.items)
          if (data.date && DATE_RE.test(data.date)) setDate(data.date)
          setStatus('preview')
        }
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof Error ? (err as Error & { code?: string; limit?: number }).code : undefined
          const limit = err instanceof Error ? (err as Error & { code?: string; limit?: number }).limit : undefined
          if (code === 'PLAN_LIMIT') {
            showToast(`Ліміт сканувань чеків на цей місяць вичерпано (${limit}). Оновіть план для більшої кількості.`, 'error')
          } else if (code === 'PLAN_GATE') {
            showToast('Сканер чеків недоступний на вашому плані', 'error')
          } else {
            showToast('Не вдалось розпізнати чек, спробуй ще раз', 'error')
          }
          onCancel()
        }
      }
    }

    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateItem = (i: number, field: 'name' | 'price', value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const computedTotal = Math.round(items.reduce((sum, item) => sum + (item.price || 0), 0) * 100) / 100

  const handleSave = () => {
    if (!result) return
    const description = JSON.stringify({ store: storeName || result.store, items })
    onSave(computedTotal, description, category, isToday ? undefined : date)
  }

  if (status === 'loading') {
    return (
      <div className={styles.loadingPanel}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Розпізнаю чек...</span>
      </div>
    )
  }

  if (status === 'preview' && result) {
    return (
      <div className={styles.previewPanel}>
        <div className={styles.previewHeader}>
          <div className={styles.storeInputWrap}>
            <svg className={styles.storeIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
            <input
              className={styles.storeInput}
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="Назва магазину"
            />
          </div>
          <span className={styles.previewTotal}>{fmtPrice(computedTotal)} ₴</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.editHint}>Торкніться назви або суми для редагування</div>

        <ul className={styles.itemList}>
          {items.map((item, i) => (
            <li key={i} className={styles.itemRow}>
              <input
                className={styles.itemNameInput}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
              />
              <input
                className={styles.itemPriceInput}
                type="number"
                value={item.price}
                onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
              />
              <button
                type="button"
                className={styles.itemRemoveBtn}
                onClick={() => removeItem(i)}
                aria-label="Видалити позицію"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        <div className={styles.categorySection}>
          <label className={styles.categoryLabel} htmlFor="receipt-cat">КАТЕГОРІЯ</label>
          <div className={styles.selectWrap}>
            <select
              id="receipt-cat"
              className={styles.categorySelect}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {allCategories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <svg className={styles.selectArrow} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className={styles.dateSection}>
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
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Скасувати
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Записати {fmtPrice(computedTotal)} ₴
          </button>
        </div>
      </div>
    )
  }

  return null
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default ReceiptScanner
