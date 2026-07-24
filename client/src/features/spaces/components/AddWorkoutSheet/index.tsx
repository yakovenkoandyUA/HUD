import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import type { SportEventInput, WorkoutMetric } from '../../store/sportStore'
import type { SportEvent } from '../../store/sportStore'
import styles from './AddWorkoutSheet.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

/** Props for AddWorkoutSheet */
interface Props {
  isOpen:      boolean
  color:       string
  onClose:     () => void
  onSave:      (data: SportEventInput) => Promise<void>
  editEvent?:  SportEvent
}

// ── Preset metric templates per sport ─────────────────────────────────────

const METRIC_PRESETS: Record<string, WorkoutMetric[]> = {
  running:  [{ name: 'Відстань', value: '', unit: 'км' }, { name: 'Темп', value: '', unit: 'хв/км' }],
  cycling:  [{ name: 'Відстань', value: '', unit: 'км' }, { name: 'Швидкість', value: '', unit: 'км/год' }],
  swimming: [{ name: 'Довжина', value: '', unit: 'м' }, { name: 'Кількість басейнів', value: '', unit: 'x' }],
  gym:      [{ name: 'Вправи', value: '', unit: '' }],
  football: [{ name: 'Таймів зіграно', value: '', unit: 'x' }],
  yoga:     [],
}

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
 * Підтримує гнучкі метрики через динамічний список.
 *
 * @prop isOpen     — видимість шторки
 * @prop color      — акцентний колір простору
 * @prop onClose    — закрити
 * @prop onSave     — зберегти дані
 * @prop editEvent  — подія для редагування (якщо є)
 */
const AddWorkoutSheet: React.FC<Props> = ({ isOpen, color, onClose, onSave, editEvent }) => {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const [date, setDate]         = useState(todayISO)
  const [title, setTitle]       = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes]       = useState('')
  const [metrics, setMetrics]   = useState<WorkoutMetric[]>([])

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
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, editEvent])

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
          <span className={styles.title}>{editEvent ? 'РЕДАГУВАТИ ТРЕНУВАННЯ' : 'НОВЕ ТРЕНУВАННЯ'}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.body}>

          {/* Назва */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ранкова пробіжка, Зал, Футбол…"
            />
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
