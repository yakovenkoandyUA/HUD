import React, { useMemo } from 'react'
import { useImportWatchlistStore } from '../../../store/importWatchlistStore'
import styles from './ImportPreviewTable.module.css'

const STATUS_LABELS: Record<string, string> = {
  watching: 'ДИВЛЮСЯ',
  watched:  'ПЕРЕГЛЯНУВ',
  want:     'ХОЧУ',
  dropped:  'КИНУВ',
}

const STATUS_KEYWORDS: Record<string, string> = {
  watching: 'watching|смотрю|дивлюся|in progress|в процессе',
  watched:  'completed|watched|полностью|переглянув|finished|подивився',
  want:     'want|планую|буду|planned|plan to watch|хочу',
  dropped:  'dropped|перестал|покинув|кинув|abandoned',
}

function guessStatus(raw: string): string {
  const lower = raw.toLowerCase()
  for (const [key, kws] of Object.entries(STATUS_KEYWORDS)) {
    if (kws.split('|').some(kw => lower.includes(kw))) return key
  }
  return ''
}

/**
 * ImportPreviewTable
 * ------------------
 * Показує перші 10 рядків файлу з урахуванням поточного column mapping.
 * Відображає попередження для нерозпізнаних статусів.
 *
 * Props:
 * @prop {() => void} onConfirm — підтвердити і запустити імпорт
 * @prop {() => void} onBack    — повернутись до маппінгу
 * @prop {boolean}   loading    — блокує кнопку під час запиту
 */
interface ImportPreviewTableProps {
  onConfirm: () => void
  onBack: () => void
  loading: boolean
}

const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({ onConfirm, onBack, loading }) => {
  const { parsedData, columnMapping } = useImportWatchlistStore()

  const preview = useMemo(() => {
    if (!parsedData) return []
    return parsedData.rows.slice(0, 10).map(row => {
      const title    = columnMapping.title    ? (row[columnMapping.title]    ?? '') : ''
      const rawStatus = columnMapping.status  ? (row[columnMapping.status]   ?? '') : ''
      const rating   = columnMapping.rating   ? (row[columnMapping.rating]   ?? '') : ''
      const category = columnMapping.category ? (row[columnMapping.category] ?? '') : ''
      const year     = columnMapping.year     ? (row[columnMapping.year]     ?? '') : ''

      const resolvedStatus = guessStatus(rawStatus)
      const statusUnknown  = rawStatus !== '' && resolvedStatus === ''

      return { title, rawStatus, resolvedStatus, statusUnknown, rating, category, year }
    }).filter(r => r.title !== '')
  }, [parsedData, columnMapping])

  const unknownStatusCount = preview.filter(r => r.statusUnknown).length
  const totalRows = parsedData?.totalRows ?? 0

  return (
    <div className={styles.wrap}>
      {parsedData?.aiParsed && (
        <p className={styles.aiDisclaimer}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Розпізнано через AI — перевір дані перед підтвердженням
        </p>
      )}

      <p className={styles.counter}>
        Показано перших <b>{preview.length}</b> з <b>{totalRows}</b> записів
      </p>

      {unknownStatusCount > 0 && (
        <p className={styles.warning}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1L13 12H1L7 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <path d="M7 5v3.5M7 10v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {unknownStatusCount} записів мають нерозпізнаний статус — буде встановлено «Хочу»
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Назва</th>
              <th>Статус</th>
              <th>Оцінка</th>
              <th>Рік</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td className={styles.titleCell}>{row.title || '—'}</td>
                <td>
                  {row.resolvedStatus
                    ? <span className={`${styles.statusBadge} ${styles[`status_${row.resolvedStatus}`]}`}>
                        {STATUS_LABELS[row.resolvedStatus]}
                      </span>
                    : row.rawStatus
                      ? <span className={styles.statusUnknown}>{row.rawStatus}</span>
                      : <span className={styles.statusEmpty}>—</span>
                  }
                </td>
                <td className={styles.monoCell}>{row.rating || '—'}</td>
                <td className={styles.monoCell}>{row.year || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.tmdbNote}>
        Після підтвердження кожен запис буде збагачено даними з TMDB (постер, жанри, опис).
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.backBtn} onClick={onBack} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад
        </button>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={onConfirm}
          disabled={loading || preview.length === 0}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Імпортуємо…
            </>
          ) : (
            <>
              Підтвердити імпорт
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ImportPreviewTable
