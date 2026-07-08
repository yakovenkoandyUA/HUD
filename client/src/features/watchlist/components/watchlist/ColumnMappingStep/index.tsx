import React from 'react'
import {
  useImportWatchlistStore,
  ALL_MIMIR_FIELDS,
  MIMIR_FIELD_LABELS,
  type MimirField,
} from '../../../store/importWatchlistStore'
import styles from './ColumnMappingStep.module.css'

/**
 * ColumnMappingStep
 * -----------------
 * Таблиця відповідності: CSV-колонка → поле MIMIR.
 * Дропдауни попередньо заповнені suggestedMapping.
 *
 * Props:
 * @prop {() => void} onNext — перейти до preview
 * @prop {() => void} onBack — повернутись до upload
 */
interface ColumnMappingStepProps {
  onNext: () => void
  onBack: () => void
}

const IGNORE_VALUE = '__ignore__'

const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({ onNext, onBack }) => {
  const { parsedData, columnMapping, setColumnMapping } = useImportWatchlistStore()

  if (!parsedData) return null

  const { headers, totalRows } = parsedData

  const handleChange = (field: MimirField, value: string) => {
    setColumnMapping({ [field]: value === IGNORE_VALUE ? null : value })
  }

  // Which CSV columns are already assigned to another field
  const assignedColumns = new Set(
    ALL_MIMIR_FIELDS
      .map(f => columnMapping[f])
      .filter((v): v is string => v != null && v !== IGNORE_VALUE)
  )

  const titleMapped = columnMapping.title != null && columnMapping.title !== IGNORE_VALUE

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>
        Файл містить <b>{totalRows}</b> рядків. Вкажи, яка колонка відповідає якому полю MIMIR.
      </p>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Поле MIMIR</span>
          <span>Колонка у файлі</span>
        </div>

        {ALL_MIMIR_FIELDS.map(field => {
          const current = columnMapping[field] ?? IGNORE_VALUE
          const isRequired = field === 'title'

          return (
            <div key={field} className={`${styles.row} ${isRequired ? styles.rowRequired : ''}`}>
              <span className={styles.fieldName}>
                {MIMIR_FIELD_LABELS[field]}
                {isRequired && <span className={styles.required}>*</span>}
              </span>

              <select
                className={styles.select}
                value={current}
                onChange={e => handleChange(field, e.target.value)}
              >
                <option value={IGNORE_VALUE}>— ігнорувати —</option>
                {headers.map(h => (
                  <option
                    key={h}
                    value={h}
                    disabled={assignedColumns.has(h) && current !== h}
                  >
                    {h}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад
        </button>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={onNext}
          disabled={!titleMapped}
        >
          Переглянути
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ColumnMappingStep
