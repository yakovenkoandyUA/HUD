import React, { useState, useEffect } from 'react'
import { authFetch } from '../../../services/api'
import { useUiStore } from '../../../store/uiStore'
import styles from './ReceiptScanner.module.css'

/**
 * ReceiptScanner
 * ---------------
 * Компонент preview та підтвердження розпізнаного чеку.
 * Отримує файл фото, надсилає в /api/receipt/scan (Anthropic Vision),
 * показує лоадер → preview → підтвердження.
 *
 * Props:
 * @prop {File}                          file           — фото чеку (вже вибрано користувачем)
 * @prop {{ label: string, value: string }[]} allCategories — список категорій для select
 * @prop {Function}                      onSave         — (amount, description, category)
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
  onSave: (amount: number, description: string, category: string) => void
  onCancel: () => void
}

const fmtPrice = (n: number) =>
  n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ file, allCategories, onSave, onCancel }) => {
  const [status, setStatus]     = useState<'loading' | 'preview' | 'error'>('loading')
  const [result, setResult]     = useState<ReceiptResult | null>(null)
  const [category, setCategory] = useState(allCategories[0]?.value ?? 'продукти')
  const { showToast }           = useUiStore()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        console.log('File selected:', file?.name, file?.size, file?.type)
        const base64 = await fileToBase64(file)
        console.log('Base64 ready, length:', base64?.length)
        console.log('Sending to backend:', `${import.meta.env.VITE_API_URL}/api/receipt/scan`)
        const response = await authFetch('/api/receipt/scan', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        })
        console.log('Response status:', response.status)
        console.log('Response body:', await response.clone().text())

        if (!response.ok) throw new Error('API error')
        const data: ReceiptResult = await response.json()
        if (!data.total || !Array.isArray(data.items)) throw new Error('Invalid JSON')

        if (!cancelled) {
          setResult(data)
          setStatus('preview')
        }
      } catch {
        if (!cancelled) {
          showToast('Не вдалось розпізнати чек, спробуй ще раз', 'error')
          onCancel()
        }
      }
    }

    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = () => {
    if (!result) return
    const description = JSON.stringify({ store: result.store, items: result.items })
    onSave(result.total, description, category)
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
          <span className={styles.previewStore}>🧾 {result.store || 'Чек'}</span>
          <span className={styles.previewTotal}>{fmtPrice(result.total)} ₴</span>
        </div>

        <div className={styles.divider} />

        <ul className={styles.itemList}>
          {result.items.map((item, i) => (
            <li key={i} className={styles.itemRow}>
              <span className={styles.itemName}>{item.name}</span>
              <span className={styles.itemPrice}>{fmtPrice(item.price)} ₴</span>
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        <div className={styles.categoryRow}>
          <span className={styles.categoryLabel}>Категорія:</span>
          <select
            className={styles.categorySelect}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {allCategories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Скасувати
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Записати {fmtPrice(result.total)} ₴
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
