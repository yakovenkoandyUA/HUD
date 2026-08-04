import React, { useRef, useCallback, useState } from 'react'
import Modal from '@/shared/components/ui/Modal'
import InfoToggle from '@/shared/components/ui/InfoToggle'
import { authFetch } from '@/shared/services/api'
import { useImportWatchlistStore } from '../../../store/importWatchlistStore'
import { CONST_PREFIX } from '../ColumnMappingStep'
import { useWatchlistStore } from '../../../store/watchlistStore'
import { useUiStore } from '@/shared/store/uiStore'
import ColumnMappingStep from '../ColumnMappingStep'
import ImportPreviewTable from '../ImportPreviewTable'
import styles from './ImportWatchlistModal.module.css'

const SUPPORTED_EXTENSIONS = [
  '.csv', 'text/csv',
  '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls', 'application/vnd.ms-excel',
  '.pdf', 'application/pdf',
  '.png', '.jpg', '.jpeg', '.webp', 'image/*',
]
const AI_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp']

function isAiFile(name: string): boolean {
  return AI_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))
}

/**
 * ImportWatchlistModal
 * --------------------
 * Універсальний імпорт Watchlist з CSV/XLSX або AI-розпізнавання (PDF/зображення).
 * Кроки: upload → mapping → preview → confirming → done.
 *
 * Props:
 * @prop {boolean}    isOpen
 * @prop {() => void} onClose
 */
interface ImportWatchlistModalProps {
  isOpen: boolean
  onClose: () => void
}

const ImportWatchlistModal: React.FC<ImportWatchlistModalProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [notFoundOpen, setNotFoundOpen] = useState(false)

  const store = useImportWatchlistStore()
  const { fetchWatchlist } = useWatchlistStore()
  const { showToast } = useUiStore()

  const handleClose = useCallback(() => {
    store.reset()
    setNotFoundOpen(false)
    onClose()
  }, [store, onClose])

  const parseFile = useCallback(async (file: File) => {
    store.setFile(file)
    store.setLoading(true)
    store.setError(null)

    const useAI = isAiFile(file.name)
    const endpoint = useAI ? '/api/watchlist/import/parse-ai' : '/api/watchlist/import/parse'

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await authFetch(endpoint, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Помилка парсингу файлу')
      }
      const data = await res.json() as import('../../../store/importWatchlistStore').ParsedImportData
      store.setParsedData(data)
      store.setColumnMapping(data.suggestedMapping)
      store.setStep('mapping')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Невідома помилка'
      store.setError(msg)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    parseFile(file)
    e.target.value = ''
  }, [parseFile])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!store.parsedData) return
    store.setStep('confirming')
    store.setError(null)

    // Transform __const_* values into synthetic columns
    let rows = store.parsedData.rows
    let mapping = store.columnMapping
    if (mapping.category?.startsWith(CONST_PREFIX)) {
      const constValue = mapping.category.replace(CONST_PREFIX, '')
      const syntheticCol = '__category__'
      rows = rows.map(r => ({ ...r, [syntheticCol]: constValue }))
      mapping = { ...mapping, category: syntheticCol }
    }
    if (mapping.status?.startsWith(CONST_PREFIX)) {
      const constValue = mapping.status.replace(CONST_PREFIX, '')
      const syntheticCol = '__status__'
      rows = rows.map(r => ({ ...r, [syntheticCol]: constValue }))
      mapping = { ...mapping, status: syntheticCol }
    }

    try {
      const res = await authFetch('/api/watchlist/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, mapping }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Помилка імпорту')
      }

      const result = await res.json() as import('../../../store/importWatchlistStore').ImportResult
      store.setImportResult(result)
      store.setStep('done')
      fetchWatchlist()

      const msg = `Імпортовано ${result.imported}`
        + (result.duplicates > 0 ? `, ${result.duplicates} вже були` : '')
        + (result.skipped    > 0 ? `, ${result.skipped} пропущено`   : '')
      showToast(msg, 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Невідома помилка'
      store.setError(msg)
      store.setStep('preview')
    }
  }, [store, fetchWatchlist, showToast])

  const modalTitle = {
    upload:     'ІМПОРТ WATCHLIST',
    mapping:    'НАЛАШТУВАННЯ КОЛОНОК',
    preview:    'ПЕРЕГЛЯД ДАНИХ',
    confirming: 'ІМПОРТ WATCHLIST',
    done:       'ІМПОРТ ЗАВЕРШЕНО',
  }[store.step]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      titleInfo={store.step === 'upload' ? (
        <InfoToggle
          ariaLabel="Про імпорт"
          text="Підтримує CSV, XLSX, PDF і фото списку. Спочатку завантажуєш файл, далі звіряєш колонки з полями MIMIR — система підказує відповідність, але можна поправити вручну перед самим імпортом."
        />
      ) : undefined}
      draggable
    >
      <div className={styles.body}>

        {/* ── Upload step ── */}
        {store.step === 'upload' && (
          <>
            <div
              ref={dropRef}
              className={`${styles.dropZone} ${store.isLoading ? styles.dropZoneLoading : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {store.isLoading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingText}>
                    {store.file && isAiFile(store.file.name)
                      ? 'Розпізнаємо файл через AI…'
                      : 'Парсимо файл…'}
                  </p>
                </div>
              ) : (
                <>
                  <svg className={styles.uploadIcon} width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect x="5" y="8" width="30" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M20 28V16M20 16l-5 5M20 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className={styles.dropText}>Перетягни файл або</p>
                  <label className={styles.fileBtn}>
                    Обрати файл
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_EXTENSIONS.join(',')}
                      className={styles.fileInput}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className={styles.formatsText}>CSV, XLSX — таблиці · PDF, зображення — AI</p>
                </>
              )}
            </div>

            {store.error && (
              <p className={styles.errorText}>{store.error}</p>
            )}

            
          </>
        )}

        {/* ── Mapping step ── */}
        {store.step === 'mapping' && (
          <ColumnMappingStep
            onNext={() => store.setStep('preview')}
            onBack={() => store.setStep('upload')}
          />
        )}

        {/* ── Preview step ── */}
        {store.step === 'preview' && (
          <>
            {store.error && <p className={styles.errorText}>{store.error}</p>}
            <ImportPreviewTable
              onConfirm={handleConfirm}
              onBack={() => store.setStep('mapping')}
              loading={false}
            />
          </>
        )}

        {/* ── Confirming (loading) ── */}
        {store.step === 'confirming' && (
          <div className={styles.confirmingWrap}>
            <div className={styles.spinner} />
            <p className={styles.confirmingText}>
              Шукаємо в TMDB і зберігаємо записи…
            </p>
            <p className={styles.confirmingHint}>
              Це може зайняти до хвилини для великих файлів
            </p>
          </div>
        )}

        {/* ── Done step ── */}
        {store.step === 'done' && store.importResult && (
          <div className={styles.doneWrap}>
            <svg className={styles.doneIcon} width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="22" stroke="var(--accent)" strokeWidth="2"/>
              <path d="M14 24l7 7 13-13" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            <div className={styles.resultLines}>
              <div className={styles.resultLine}>
                <span className={styles.resultNum}>{store.importResult.imported}</span>
                <span className={styles.resultLabel}>імпортовано</span>
              </div>
              {store.importResult.duplicates > 0 && (
                <div className={styles.resultLine}>
                  <span className={styles.resultNum}>{store.importResult.duplicates}</span>
                  <span className={styles.resultLabel}>вже були у списку</span>
                </div>
              )}
              {store.importResult.skipped > 0 && (
                <div className={styles.resultLine}>
                  <span className={styles.resultNum}>{store.importResult.skipped}</span>
                  <span className={styles.resultLabel}>пропущено (порожні рядки)</span>
                </div>
              )}
              {store.importResult.errors.length > 0 && (
                <div className={styles.errorList}>
                  {store.importResult.errors.map((e, i) => (
                    <p key={i} className={styles.resultError}>{e}</p>
                  ))}
                </div>
              )}
            </div>

            {store.parsedData?.truncated && (
              <p className={styles.truncatedWarn}>
                Файл містить більше 1000 рядків — імпортовано перші 1000
              </p>
            )}

            {store.importResult.notFoundInTmdb.length > 0 && (
              <div className={styles.notFoundSection}>
                <button
                  type="button"
                  className={styles.notFoundToggle}
                  onClick={() => setNotFoundOpen(v => !v)}
                >
                  <span>Не знайдено в TMDB (додано без постера)</span>
                  <span className={styles.notFoundCount}>{store.importResult.notFoundInTmdb.length}</span>
                  <svg
                    className={`${styles.notFoundChevron} ${notFoundOpen ? styles.notFoundChevronOpen : ''}`}
                    width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                  >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className={`${styles.notFoundList} ${notFoundOpen ? styles.notFoundListOpen : ''}`}>
                  <div className={styles.notFoundScroll}>
                    <p className={styles.notFoundHint}>Ці тайтли збережено, але без постера і метаданих</p>
                    {store.importResult.notFoundInTmdb.map((title, i) => (
                      <div key={i} className={styles.notFoundItem}>{title}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button type="button" className={styles.doneBtn} onClick={handleClose}>
              Готово
            </button>
          </div>
        )}

      </div>
    </Modal>
  )
}

export default ImportWatchlistModal
