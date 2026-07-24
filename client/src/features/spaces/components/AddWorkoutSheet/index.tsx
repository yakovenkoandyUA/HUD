import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import type { SportEventInput, WorkoutMetric } from '../../store/sportStore'
import type { SportEvent } from '../../store/sportStore'
import styles from './AddWorkoutSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

/** Props for AddWorkoutSheet */
interface Props {
  isOpen:     boolean
  color:      string
  onClose:    () => void
  onSave:     (data: SportEventInput) => Promise<void>
  editEvent?: SportEvent
  /** Pre-filled data from GPX/TCX import */
  prefill?:   SportEventInput | null
}

interface WgerSuggestion {
  value:      string
  categoryId: number
}

// Wger category IDs → default metrics to suggest
const STRENGTH_IDS = new Set([10, 11, 12, 13, 14, 15, 16])
const CARDIO_ID    = 17

const STRENGTH_METRICS: WorkoutMetric[] = [
  { name: 'Вага', value: '', unit: 'кг' },
  { name: 'Підходи', value: '', unit: 'x' },
  { name: 'Повтори', value: '', unit: 'x' },
]
const CARDIO_METRICS: WorkoutMetric[] = [
  { name: 'Дистанція', value: '', unit: 'км' },
  { name: 'Час', value: '', unit: 'хв' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * AddWorkoutSheet
 * ---------------
 * Bottom sheet для додавання/редагування тренування.
 * Підтримує гнучкі метрики та Wger exercise autocomplete.
 *
 * @prop isOpen     — видимість шторки
 * @prop color      — акцентний колір простору
 * @prop onClose    — закрити
 * @prop onSave     — зберегти дані
 * @prop editEvent  — подія для редагування (якщо є)
 * @prop prefill    — дані з GPX/TCX імпорту
 */
const AddWorkoutSheet: React.FC<Props> = ({ isOpen, color, onClose, onSave, editEvent, prefill }) => {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const [date, setDate]         = useState(todayISO)
  const [title, setTitle]       = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes]       = useState('')
  const [metrics, setMetrics]   = useState<WorkoutMetric[]>([])

  // Wger autocomplete
  const [suggestions, setSuggestions]       = useState<WgerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wgerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      if (editEvent) {
        setDate(editEvent.date)
        setTitle(editEvent.title)
        setDuration(editEvent.duration != null ? String(editEvent.duration) : '')
        setNotes(editEvent.notes)
        setMetrics(editEvent.metrics.map(m => ({ ...m })))
      } else if (prefill) {
        setDate(prefill.date ?? todayISO())
        setTitle(prefill.title ?? '')
        setDuration(prefill.duration != null ? String(prefill.duration) : '')
        setNotes(prefill.notes ?? '')
        setMetrics((prefill.metrics ?? []).map(m => ({ ...m })))
      } else {
        setDate(todayISO())
        setTitle('')
        setDuration('')
        setNotes('')
        setMetrics([])
      }
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      setSuggestions([])
      setShowSuggestions(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, editEvent, prefill])

  // Wger exercise search
  const handleTitleChange = (val: string) => {
    setTitle(val)
    setShowSuggestions(false)
    if (wgerTimer.current) clearTimeout(wgerTimer.current)
    if (val.trim().length < 2) { setSuggestions([]); return }

    wgerTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(val.trim())}&language=2&format=json`,
          { signal: AbortSignal.timeout(4000) }
        )
        if (!res.ok) return
        const data = await res.json()
        const items: WgerSuggestion[] = (data.suggestions ?? []).slice(0, 6).map(
          (s: { value: string; data?: { category?: { id?: number } } }) => ({
            value:      s.value,
            categoryId: s.data?.category?.id ?? 0,
          })
        )
        setSuggestions(items)
        setShowSuggestions(items.length > 0)
      } catch {
        // network error or timeout — silently ignore
      }
    }, 500)
  }

  const selectSuggestion = (s: WgerSuggestion) => {
    setTitle(s.value)
    setShowSuggestions(false)
    setSuggestions([])
    // Only prefill metrics if user hasn't added any yet
    if (metrics.length === 0) {
      if (STRENGTH_IDS.has(s.categoryId)) {
        setMetrics(STRENGTH_METRICS.map(m => ({ ...m })))
      } else if (s.categoryId === CARDIO_ID) {
        setMetrics(CARDIO_METRICS.map(m => ({ ...m })))
      }
    }
  }

  const addMetric = () => setMetrics(prev => [...prev, { name: '', value: '', unit: '' }])

  const updateMetric = (i: number, field: keyof WorkoutMetric, val: string) => {
    setMetrics(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  }

  const removeMetric = (i: number) => setMetrics(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!date || busy) return
    setBusy(true)
    try {
      await onSave({
        date,
        title:    title.trim() || 'Тренування',
        duration: duration ? parseInt(duration, 10) : null,
        metrics:  metrics.filter(m => m.name.trim()),
        notes:    notes.trim(),
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      style={colorVar}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>{editEvent ? 'РЕДАГУВАТИ ТРЕНУВАННЯ' : prefill ? 'ІМПОРТ ТРЕНУВАННЯ' : 'НОВЕ ТРЕНУВАННЯ'}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>

          {/* Назва + Wger autocomplete */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <div className={styles.autocompleteWrap}>
              <input
                className={styles.fieldInput}
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Ранкова пробіжка, Зал, Футбол…"
                autoComplete="off"
              />
              {showSuggestions && (
                <ul className={styles.suggestions}>
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      className={styles.suggestionItem}
                      onMouseDown={() => selectSuggestion(s)}
                    >
                      {s.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Дата */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ДАТА</label>
            <button type="button" className={styles.dateBtn} onClick={() => setDateOpen(true)}>
              {fmtDate(date)}
            </button>
            {dateOpen && (
              <CustomDatePicker
                value={date}
                onChange={v => { setDate(v); setDateOpen(false) }}
                onClose={() => setDateOpen(false)}
              />
            )}
          </div>

          {/* Тривалість */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ТРИВАЛІСТЬ (хв)</label>
            <input
              className={styles.fieldInput}
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="60"
              min={1}
            />
          </div>

          {/* Метрики */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ПОКАЗНИКИ</label>
            {metrics.map((m, i) => (
              <div key={i} className={styles.metricRow}>
                <input
                  className={`${styles.fieldInput} ${styles.metricName}`}
                  value={m.name}
                  onChange={e => updateMetric(i, 'name', e.target.value)}
                  placeholder="Відстань, Вага, Повтори…"
                />
                <input
                  className={`${styles.fieldInput} ${styles.metricValue}`}
                  value={m.value}
                  onChange={e => updateMetric(i, 'value', e.target.value)}
                  placeholder="0"
                />
                <input
                  className={`${styles.fieldInput} ${styles.metricUnit}`}
                  value={m.unit}
                  onChange={e => updateMetric(i, 'unit', e.target.value)}
                  placeholder="км"
                />
                <button type="button" className={styles.metricRemove} onClick={() => removeMetric(i)} aria-label="Видалити">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12"/>
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" className={styles.addMetricBtn} onClick={addMetric}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M7 2v10M2 7h10"/>
              </svg>
              Додати показник
            </button>
          </div>

          {/* Нотатки */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НОТАТКА</label>
            <textarea
              className={`${styles.fieldInput} ${styles.textarea}`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Самопочуття, нові PR, деталі…"
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: color }}
            onClick={handleSave}
            disabled={busy || !date}
          >
            {busy ? 'Збереження…' : editEvent ? 'Оновити' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddWorkoutSheet
