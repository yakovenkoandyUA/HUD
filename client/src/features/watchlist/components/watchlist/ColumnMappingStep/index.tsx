import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  useImportWatchlistStore,
  ALL_MIMIR_FIELDS,
  MIMIR_FIELD_LABELS,
  type MimirField,
} from '../../../store/importWatchlistStore'
import styles from './ColumnMappingStep.module.css'

const IGNORE_VALUE = '__ignore__'
export const CONST_PREFIX = '__const_'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  separator?: boolean
}

interface StyledSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

const StyledSelect: React.FC<StyledSelectProps> = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLabel = options.find(o => !o.separator && o.value === value)?.label ?? '—'
  const isPlaceholder = value === IGNORE_VALUE

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const mouseHandler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', mouseHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', mouseHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  return (
    <div className={styles.selectRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          styles.selectTrigger,
          open ? styles.selectTriggerOpen : '',
          isPlaceholder ? styles.selectTriggerPlaceholder : '',
        ].filter(Boolean).join(' ')}
        onClick={handleToggle}
      >
        <span className={styles.selectTriggerLabel}>{currentLabel}</span>
        <svg
          className={`${styles.selectChevron} ${open ? styles.selectChevronOpen : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className={styles.selectDropdown}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {options.map((opt, i) =>
            opt.separator ? (
              <div key={`sep-${i}`} className={styles.selectSeparator} />
            ) : (
              <button
                key={opt.value}
                type="button"
                className={[
                  styles.selectOption,
                  opt.value === value ? styles.selectOptionActive : '',
                  opt.disabled ? styles.selectOptionDisabled : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (!opt.disabled) {
                    onChange(opt.value)
                    setOpen(false)
                  }
                }}
              >
                {opt.value === value ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className={styles.selectOptionIconGap} />
                )}
                {opt.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

function buildOptions(
  field: MimirField,
  headers: string[],
  assignedColumns: Set<string>,
  currentValue: string,
): SelectOption[] {
  const opts: SelectOption[] = [
    { value: IGNORE_VALUE, label: '— ігнорувати —' },
    ...headers.map(h => ({
      value: h,
      label: h,
      disabled: assignedColumns.has(h) && currentValue !== h,
    })),
  ]

  if (field === 'category') {
    opts.push(
      { value: '__sep__', label: '', separator: true },
      { value: `${CONST_PREFIX}movie`, label: 'Фільм (всі записи)' },
      { value: `${CONST_PREFIX}series`, label: 'Серіал (всі записи)' },
    )
  }

  return opts
}

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

const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({ onNext, onBack }) => {
  const { parsedData, columnMapping, setColumnMapping } = useImportWatchlistStore()

  if (!parsedData) return null

  const { headers, totalRows } = parsedData

  const handleChange = (field: MimirField, value: string) => {
    setColumnMapping({ [field]: value === IGNORE_VALUE ? null : value })
  }

  const assignedColumns = new Set(
    ALL_MIMIR_FIELDS
      .map(f => columnMapping[f])
      .filter((v): v is string => v != null && v !== IGNORE_VALUE && !v.startsWith(CONST_PREFIX))
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
          const options = buildOptions(field, headers, assignedColumns, current)

          return (
            <div key={field} className={`${styles.row} ${isRequired ? styles.rowRequired : ''}`}>
              <span className={styles.fieldName}>
                {MIMIR_FIELD_LABELS[field]}
                {isRequired && <span className={styles.required}>*</span>}
              </span>

              <StyledSelect
                value={current}
                onChange={value => handleChange(field, value)}
                options={options}
              />
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
