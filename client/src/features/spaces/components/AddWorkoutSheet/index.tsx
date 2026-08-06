import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import TimeWheelPicker from '@/shared/components/ui/TimeWheelPicker'
import PillSelector from '@/shared/components/ui/PillSelector'
import RepeatConfigScreen from '@/features/sprint/components/sprint/RepeatConfigScreen'
import ReminderFields, { type ReminderUnit } from '@/features/sprint/components/sprint/ReminderFields'
import type { RepeatConfig } from '@/shared/types'
import type { SportEventInput, SportEventReminder, SportRepeatType, WorkoutMetric, WorkoutProgram } from '../../store/sportStore'
import type { SportEvent } from '../../store/sportStore'
import styles from './AddWorkoutSheet.module.css'

const REMINDER_UNIT_LABEL: Record<ReminderUnit, [string, string, string]> = {
  minutes: ['хвилину', 'хвилини', 'хвилин'],
  hours:   ['годину', 'години', 'годин'],
  days:    ['день', 'дні', 'днів'],
  weeks:   ['тиждень', 'тижні', 'тижнів'],
}

function pluralUnit(amount: number, forms: [string, string, string]): string {
  const mod10 = amount % 10
  const mod100 = amount % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function formatReminderShort(amount: number, unit: ReminderUnit): string {
  return `За ${amount} ${pluralUnit(amount, REMINDER_UNIT_LABEL[unit])}`
}

const REPEAT_OPTIONS: { value: SportRepeatType; label: string }[] = [
  { value: 'none',    label: 'Ніколи' },
  { value: 'daily',   label: 'Щодня' },
  { value: 'weekly',  label: 'Щотижня' },
  { value: 'monthly', label: 'Щомісяця' },
  { value: 'yearly',  label: 'Щороку' },
  { value: 'custom',  label: 'Кастом' },
]

const UNIT_MAP: Record<Exclude<SportRepeatType, 'none' | 'custom'>, RepeatConfig['unit']> = {
  daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year',
}

function formatRepeatSummary(repeat: SportRepeatType, config: RepeatConfig | null): string {
  if (repeat === 'none')    return 'Не повторюється'
  if (repeat === 'daily')   return 'Щодня'
  if (repeat === 'weekly')  return 'Щотижня'
  if (repeat === 'monthly') return 'Щомісяця'
  if (repeat === 'yearly')  return 'Щороку'
  if (repeat === 'custom' && config) {
    const WEEK_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
    const UNITS: Record<RepeatConfig['unit'], [string, string]> = {
      day: ['день', 'дні'], week: ['тиждень', 'тижні'], month: ['місяць', 'місяці'], year: ['рік', 'роки'],
    }
    const [sing, plur] = UNITS[config.unit]
    let label = config.interval === 1 ? `Кожен ${sing}` : `Кожні ${config.interval} ${plur}`
    if (config.unit === 'week' && config.weekDays?.length) {
      label += ' — ' + [...config.weekDays].sort((a, b) => a - b).map(d => WEEK_DAY_LABELS[d]).join(', ')
    }
    return label
  }
  return 'Кастом'
}

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
  /** Існуючі програми простору — дозволяють прив'язати тренування до програми */
  programs?:  WorkoutProgram[]
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
const AddWorkoutSheet: React.FC<Props> = ({ isOpen, color, onClose, onSave, editEvent, prefill, programs }) => {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [busy, setBusy]         = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const [date, setDate]         = useState(todayISO)
  const [time, setTime]         = useState<string | null>(null)
  const [timeOpen, setTimeOpen] = useState(false)
  const [title, setTitle]       = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes]       = useState('')
  const [metrics, setMetrics]   = useState<WorkoutMetric[]>([])
  const [programIds, setProgramIds]       = useState<string[]>([])
  const [repeat, setRepeat]               = useState<SportRepeatType>('none')
  const [repeatConfig, setRepeatConfig]   = useState<RepeatConfig | null>(null)
  const [showRepeatScreen, setShowRepeatScreen] = useState(false)

  const [reminder, setReminder]                 = useState<SportEventReminder | null>(null)
  const [reminderAmount, setReminderAmount]     = useState<number | ''>(1)
  const [reminderUnit, setReminderUnit]         = useState<ReminderUnit>('hours')
  const [showReminderEditor, setShowReminderEditor] = useState(false)

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
        setTime(editEvent.time ?? null)
        setTitle(editEvent.title)
        setDuration(editEvent.duration != null ? String(editEvent.duration) : '')
        setNotes(editEvent.notes)
        setMetrics(editEvent.metrics.map(m => ({ ...m })))
        setProgramIds(editEvent.programIds ?? [])
        setRepeat(editEvent.repeat ?? 'none')
        setRepeatConfig(editEvent.repeatConfig ?? null)
        setReminder(editEvent.reminder ?? null)
        if (editEvent.reminder) { setReminderAmount(editEvent.reminder.amount); setReminderUnit(editEvent.reminder.unit) }
      } else if (prefill) {
        setDate(prefill.date ?? todayISO())
        setTime(prefill.time ?? null)
        setTitle(prefill.title ?? '')
        setDuration(prefill.duration != null ? String(prefill.duration) : '')
        setNotes(prefill.notes ?? '')
        setMetrics((prefill.metrics ?? []).map(m => ({ ...m })))
        setProgramIds([])
        setRepeat('none')
        setRepeatConfig(null)
        setReminder(null)
      } else {
        setDate(todayISO())
        setTime(null)
        setTitle('')
        setDuration('')
        setNotes('')
        setMetrics([])
        setProgramIds([])
        setRepeat('none')
        setRepeatConfig(null)
        setReminder(null)
        setReminderAmount(1)
        setReminderUnit('hours')
      }
      setShowReminderEditor(false)
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

  const selectRepeat = (value: SportRepeatType) => {
    setRepeat(value)
    if (value === 'custom') {
      setShowRepeatScreen(true)
    } else if (value === 'none') {
      setRepeatConfig(null)
    } else {
      setRepeatConfig({ interval: 1, unit: UNIT_MAP[value as Exclude<SportRepeatType, 'none' | 'custom'>], endsType: 'never' })
    }
  }

  const toggleProgram = (id: string) => {
    if (id === '') { setProgramIds([]); return }
    setProgramIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const selectedPrograms = programs?.filter(p => programIds.includes(p._id)) ?? []

  const handleSave = async () => {
    if (!date || busy) return
    setBusy(true)
    try {
      await onSave({
        date,
        time,
        title:        title.trim() || 'Тренування',
        duration:     duration ? parseInt(duration, 10) : null,
        metrics:      metrics.filter(m => m.name.trim()),
        notes:        notes.trim(),
        repeat,
        repeatConfig: repeat === 'none' ? null : repeatConfig,
        programIds:   selectedPrograms.map(p => p._id),
        programNames: selectedPrograms.map(p => p.name),
        reminder,
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

          {/* Дата + Час + Тривалість */}
          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{repeat === 'none' ? 'ДАТА' : 'ДАТА ПОЧАТКУ'}</label>
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

            <div className={styles.field}>
              <label className={styles.fieldLabel}>ЧАС</label>
              <button type="button" className={styles.dateBtn} onClick={() => setTimeOpen(true)}>
                {time ?? '—'}
              </button>
              {timeOpen && (
                <TimeWheelPicker
                  value={time ?? '09:00'}
                  title="Час тренування"
                  onSave={v => { setTime(v); setTimeOpen(false) }}
                  onClose={() => setTimeOpen(false)}
                />
              )}
            </div>

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
          </div>

          {/* Нагадування */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАГАДУВАННЯ</label>
            <button
              type="button"
              className={`${styles.reminderToggleBtn} ${reminder ? styles.reminderToggleBtnActive : ''}`}
              onClick={() => setShowReminderEditor(v => !v)}
            >
              {reminder ? formatReminderShort(reminder.amount, reminder.unit) : 'Нагадати про тренування'}
              {reminder && (
                <span
                  className={styles.reminderClear}
                  onClick={e => { e.stopPropagation(); setReminder(null); setShowReminderEditor(false) }}
                >
                  ✕
                </span>
              )}
            </button>
            <div className={`${styles.reminderAccordion} ${showReminderEditor ? styles.reminderAccordionOpen : ''}`}>
              <div className={styles.reminderAccordionInner}>
                <ReminderFields
                  amount={reminderAmount}
                  unit={reminderUnit}
                  onAmountChange={setReminderAmount}
                  onUnitChange={setReminderUnit}
                  suffix="до тренування"
                />
                <button
                  type="button"
                  className={styles.reminderConfirmBtn}
                  onClick={() => {
                    setReminder({ amount: Math.max(1, Math.min(999, Number(reminderAmount) || 1)), unit: reminderUnit })
                    setShowReminderEditor(false)
                  }}
                >
                  Підтвердити
                </button>
              </div>
            </div>
          </div>

          {/* Повторення */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ПОВТОРЕННЯ</label>
            <PillSelector options={REPEAT_OPTIONS} value={repeat} onChange={selectRepeat} columns={3} />
            {repeat === 'custom' && (
              <button type="button" className={styles.dateBtn} onClick={() => setShowRepeatScreen(true)}>
                {formatRepeatSummary(repeat, repeatConfig)}
              </button>
            )}
          </div>

          {/* Програма (мультивибір) */}
          {programs && programs.length > 0 && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>ПРОГРАМА</label>
              <div className={styles.programChips}>
                <button
                  type="button"
                  className={`${styles.programChip} ${programIds.length === 0 ? styles.programChipActive : ''}`}
                  onClick={() => toggleProgram('')}
                >
                  Без програми
                </button>
                {programs.map(p => (
                  <button
                    key={p._id}
                    type="button"
                    className={`${styles.programChip} ${programIds.includes(p._id) ? styles.programChipActive : ''}`}
                    onClick={() => toggleProgram(p._id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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

      {showRepeatScreen && (
        <RepeatConfigScreen
          initial={repeatConfig ?? { interval: 1, unit: 'week', endsType: 'never' }}
          onSave={config => { setRepeatConfig(config); setShowRepeatScreen(false) }}
          onClose={() => setShowRepeatScreen(false)}
        />
      )}
    </div>
  )
}

export default AddWorkoutSheet
