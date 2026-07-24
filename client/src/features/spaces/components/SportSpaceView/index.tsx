import React, { useEffect, useRef, useState } from 'react'
import { useSportStore, type SportEvent, type SportEventInput, type WorkoutProgram, type WorkoutExercise } from '../../store/sportStore'
import type { SportProfile, SportPR } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
import AddWorkoutSheet from '../AddWorkoutSheet'
import { parseWorkoutFile } from '../../utils/parseWorkoutFile'
import styles from './SportSpaceView.module.css'

// ── Types ──────────────────────────────────────────────────────────────────

interface SpaceTx {
  _id:       string
  type:      'income' | 'expense'
  amount:    number
  desc:      string
  title?:    string
  category?: string
  date:      string
}

/** Props for SportSpaceView */
interface Props {
  spaceId:         string
  color:           string
  spaceName:       string
  profile:         SportProfile | null
  onProfileUpdate: (p: SportProfile) => void
  coverUrl?:       string
  coverPosition?:  string
  isOwner?:        boolean
  onEditSpace?:    () => void
  onBack?:         () => void
  spaceTxs?:       SpaceTx[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  running:  'Біг',
  cycling:  'Велосипед',
  swimming: 'Плавання',
  gym:      'Зал',
  football: 'Футбол',
  tennis:   'Теніс',
  crossfit: 'CrossFit',
  yoga:     'Йога',
  other:    'Інший',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Початківець',
  intermediate: 'Середній',
  advanced:     'Просунутий',
}

const SPORT_OPTIONS = Object.entries(SPORT_LABELS).map(([value, label]) => ({ value, label }))

const MONTHS_SHORT = ['січ.','лют.','бер.','квіт.','трав.','черв.','лип.','серп.','вер.','жов.','лист.','груд.']

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function fmtDateShort(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`
}

function fmtDuration(min: number | null): string {
  if (!min) return ''
  if (min < 60) return `${min} хв`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} г ${m} хв` : `${h} г`
}

function pluralStreak(n: number): string {
  if (n === 1) return 'день поспіль'
  if (n >= 2 && n <= 4) return 'дні поспіль'
  return 'днів поспіль'
}

function calcStreak(events: SportEvent[]): number {
  if (!events.length) return 0
  const dates = [...new Set(events.map(e => e.date.slice(0, 10)))].sort().reverse()
  let streak = 0
  let cur = new Date()
  cur.setHours(0, 0, 0, 0)
  for (const d of dates) {
    const dt = new Date(d + 'T00:00:00')
    const diff = Math.round((cur.getTime() - dt.getTime()) / 86_400_000)
    if (diff > 1) break
    streak++
    cur = dt
  }
  return streak
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Profile edit sheet ─────────────────────────────────────────────────────

interface ProfileSheetProps {
  isOpen:    boolean
  profile:   SportProfile | null
  color:     string
  onClose:   () => void
  onSave:    (data: Partial<SportProfile>) => Promise<void>
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, color, onClose, onSave }) => {
  const [sport, setSport]   = useState(profile?.sport ?? '')
  const [level, setLevel]   = useState<SportProfile['level']>(profile?.level ?? null)
  const [goal, setGoal]     = useState(profile?.goal ?? '')
  const [busy, setBusy]     = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setSport(profile?.sport ?? '')
      setLevel(profile?.level ?? null)
      setGoal(profile?.goal ?? '')
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, profile])

  const handleSave = async () => {
    setBusy(true)
    try {
      await onSave({ sport, level, goal })
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
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>ПРОФІЛЬ</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ВИД СПОРТУ</label>
            <div className={styles.sportGrid}>
              {SPORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.sportChip} ${sport === o.value ? styles.sportChipOn : ''}`}
                  style={sport === o.value ? colorVar : undefined}
                  onClick={() => setSport(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>РІВЕНЬ</label>
            <div className={styles.levelRow}>
              {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  className={`${styles.levelChip} ${level === l ? styles.levelChipOn : ''}`}
                  style={level === l ? colorVar : undefined}
                  onClick={() => setLevel(l)}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ЦІЛЬ</label>
            <input
              className={styles.fieldInput}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Пробігти марафон, жим 120 кг…"
            />
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button type="button" className={styles.saveBtn} style={{ background: color }} onClick={handleSave} disabled={busy}>
            {busy ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PR Tracker ─────────────────────────────────────────────────────────────

interface PRTrackerProps {
  prs:     SportPR[]
  color:   string
  onSave:  (prs: SportPR[]) => Promise<void>
}

const PRTracker: React.FC<PRTrackerProps> = ({ prs, color, onSave }) => {
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [value, setValue]     = useState('')
  const [unit, setUnit]       = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const [date, setDate]       = useState('')
  const [saving, setSaving]   = useState(false)

  const handleAdd = async () => {
    if (!name.trim() || !value.trim()) return
    setSaving(true)
    const newPR: SportPR = { id: genId(), name: name.trim(), value: value.trim(), unit: unit.trim(), date: date || null }
    try { await onSave([...prs, newPR]) } finally { setSaving(false) }
    setName(''); setValue(''); setUnit(''); setDate(''); setOpen(false)
  }

  const handleDelete = async (id: string) => {
    await onSave(prs.filter(p => p.id !== id))
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.section} style={colorVar}>
      <div className={styles.prHeader}>
        <h3 className={styles.sectionTitle}>РЕКОРДИ (PR)</h3>
      </div>

      {prs.length > 0 && (
        <div className={styles.prList}>
          {prs.map(pr => (
            <div key={pr.id} className={styles.prRow}>
              <div className={styles.prMain}>
                <span className={styles.prName}>{pr.name}</span>
                {pr.date && <span className={styles.prDate}>{fmtDateShort(pr.date)}</span>}
              </div>
              <div className={styles.prRight}>
                <span className={styles.prValue}>{pr.value}</span>
                {pr.unit && <span className={styles.prUnit}>{pr.unit}</span>}
                <button type="button" className={styles.prDelete} onClick={() => handleDelete(pr.id)} aria-label="Видалити">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {prs.length === 0 && !open && (
        <p className={styles.prEmpty}>Зафіксуй перший рекорд — жим, дистанція, час…</p>
      )}

      {open ? (
        <div className={styles.prAddForm}>
          <div className={styles.prAddRow}>
            <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Назва (Жим лежачи, 5 km…)" />
          </div>
          <div className={styles.prAddRow}>
            <input className={`${styles.fieldInput} ${styles.prAddValue}`} value={value} onChange={e => setValue(e.target.value)} placeholder="100" />
            <input className={`${styles.fieldInput} ${styles.prAddUnit}`}  value={unit}  onChange={e => setUnit(e.target.value)}  placeholder="кг" />
            <button type="button" className={`${styles.fieldInput} ${styles.prDateBtn}`} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Дата'}
            </button>
          </div>
          {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          <div className={styles.prAddBtns}>
            <button type="button" className={styles.prCancelBtn} onClick={() => { setOpen(false); setName(''); setValue(''); setUnit(''); setDate('') }}>Скасувати</button>
            <button type="button" className={styles.prSaveBtn} style={{ background: color }} onClick={handleAdd} disabled={!name.trim() || !value.trim() || saving}>
              {saving ? '…' : 'Зберегти'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.prOpenBtn} onClick={() => setOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          Додати рекорд
        </button>
      )}
    </div>
  )
}

// ── Program sheet (create / edit) ─────────────────────────────────────────

interface ProgramSheetProps {
  isOpen:   boolean
  color:    string
  program:  WorkoutProgram | null
  onClose:  () => void
  onSave:   (name: string, exercises: WorkoutExercise[]) => Promise<void>
  onDelete: (() => void) | null
}

const ProgramSheet: React.FC<ProgramSheetProps> = ({ isOpen, color, program, onClose, onSave, onDelete }) => {
  const [name, setName]           = useState(program?.name ?? '')
  const [exercises, setExercises] = useState<WorkoutExercise[]>(program?.exercises ?? [])
  const [busy, setBusy]           = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setName(program?.name ?? '')
      setExercises(program?.exercises ?? [])
      setConfirmDel(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, program])

  const addExercise = () => setExercises(prev => [...prev, { id: genId(), name: '', sets: null, reps: null }])

  const updateEx = (id: string, patch: Partial<WorkoutExercise>) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))

  const removeEx = (id: string) => setExercises(prev => prev.filter(e => e.id !== id))

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return
    setBusy(true)
    try { await onSave(name.trim(), exercises); onClose() }
    finally { setBusy(false) }
  }

  if (!mounted) return null
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div ref={overlayRef} className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`} style={colorVar}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{program ? 'РЕДАГУВАТИ ПРОГРАМУ' : 'НОВА ПРОГРАМА'}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>НАЗВА</label>
            <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Силова A, Кардіо…" />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>ВПРАВИ</label>
            {exercises.map((ex, i) => (
              <div key={ex.id} className={styles.exRow}>
                <div className={styles.exNum}>{i + 1}</div>
                <div className={styles.exFields}>
                  <input
                    className={styles.fieldInput}
                    value={ex.name}
                    onChange={e => updateEx(ex.id, { name: e.target.value })}
                    placeholder="Назва вправи…"
                  />
                  <div className={styles.exMeta}>
                    <input
                      className={`${styles.fieldInput} ${styles.exSmall}`}
                      type="number" inputMode="numeric" min="1"
                      value={ex.sets ?? ''} onChange={e => updateEx(ex.id, { sets: e.target.value ? +e.target.value : null })}
                      placeholder="Підх."
                    />
                    <input
                      className={`${styles.fieldInput} ${styles.exSmall}`}
                      type="number" inputMode="numeric" min="1"
                      value={ex.reps ?? ''} onChange={e => updateEx(ex.id, { reps: e.target.value ? +e.target.value : null })}
                      placeholder="Повт."
                    />
                    <input
                      className={`${styles.fieldInput} ${styles.exNotes}`}
                      value={ex.notes ?? ''}
                      onChange={e => updateEx(ex.id, { notes: e.target.value })}
                      placeholder="Нотатка…"
                    />
                    <button type="button" className={styles.exRemove} onClick={() => removeEx(ex.id)} aria-label="Видалити">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className={styles.addExBtn} onClick={addExercise}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
              Додати вправу
            </button>
          </div>

          {onDelete && (
            <button type="button" className={styles.deleteProgramBtn}
              onClick={() => { if (confirmDel) onDelete(); else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500) } }}>
              {confirmDel ? 'Підтвердити видалення' : 'Видалити програму'}
            </button>
          )}
        </div>

        <div className={styles.sheetFooter}>
          <button type="button" className={styles.saveBtn} style={{ background: color }}
            onClick={handleSave} disabled={busy || !name.trim() || exercises.length === 0}>
            {busy ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Active workout sheet (step-by-step execution) ──────────────────────────

interface ActiveWorkoutProps {
  isOpen:   boolean
  color:    string
  program:  WorkoutProgram | null
  onClose:  () => void
  onFinish: (completedIds: string[]) => Promise<void>
}

const ActiveWorkoutSheet: React.FC<ActiveWorkoutProps> = ({ isOpen, color, program, onClose, onFinish }) => {
  const [checked, setChecked]   = useState<Set<string>>(new Set())
  const [busy, setBusy]         = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    if (isOpen) {
      setChecked(new Set())
      setBusy(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleFinish = async () => {
    setBusy(true)
    try { await onFinish([...checked]); onClose() }
    finally { setBusy(false) }
  }

  if (!mounted || !program) return null

  const total    = program.exercises.length
  const done     = checked.size
  const allDone  = done === total
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div ref={overlayRef} className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`} style={colorVar}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div ref={sheetRef} className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}>
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{program.name.toUpperCase()}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className={styles.activeWorkoutProgress}>
          <div className={styles.activeWorkoutProgressBar}>
            <div className={styles.activeWorkoutProgressFill}
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: color }} />
          </div>
          <span className={styles.activeWorkoutProgressLabel}>{done}/{total}</span>
        </div>

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.activeExList}>
            {program.exercises.map((ex, i) => {
              const isDone = checked.has(ex.id)
              return (
                <button
                  key={ex.id}
                  type="button"
                  className={`${styles.activeExRow} ${isDone ? styles.activeExRowDone : ''}`}
                  onClick={() => toggle(ex.id)}
                >
                  <div className={`${styles.activeExCheck} ${isDone ? styles.activeExCheckDone : ''}`} style={isDone ? { background: color, borderColor: color } : undefined}>
                    {isDone && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M2 7l4 4 6-7"/></svg>}
                  </div>
                  <div className={styles.activeExInfo}>
                    <span className={`${styles.activeExName} ${isDone ? styles.activeExNameDone : ''}`}>
                      {i + 1}. {ex.name}
                    </span>
                    {(ex.sets || ex.reps || ex.notes) && (
                      <span className={styles.activeExMeta}>
                        {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} підходи` : ex.reps ? `${ex.reps} повт.` : ''}
                        {ex.notes ? (ex.sets || ex.reps ? ` · ${ex.notes}` : ex.notes) : ''}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.sheetFooter}>
          <button type="button" className={styles.saveBtn} style={{ background: allDone ? color : undefined }}
            onClick={handleFinish} disabled={busy || done === 0}>
            {busy ? 'Збереження…' : allDone ? 'Завершити тренування' : `Завершити (${done}/${total})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Workout calendar (current month) ──────────────────────────────────────

interface HeatmapProps {
  events: SportEvent[]
  color:  string
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTH_NAMES = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень']

const WorkoutHeatmap: React.FC<HeatmapProps> = ({ events, color }) => {
  const [offset, setOffset] = useState(0) // 0 = current month, -1 = prev, etc.

  const countByDate: Record<string, number> = {}
  for (const e of events) {
    const d = e.date.slice(0, 10)
    countByDate[d] = (countByDate[d] ?? 0) + 1
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayIso = now.toISOString().slice(0, 10)

  const displayDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year  = displayDate.getFullYear()
  const month = displayDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7

  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isoOf = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapNav}>
        <button
          type="button"
          className={styles.heatmapNavBtn}
          onClick={() => setOffset(o => o - 1)}
          aria-label="Попередній місяць"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 3L5 7l4 4"/>
          </svg>
        </button>
        <span className={styles.heatmapMonthName}>{MONTH_NAMES[month]} {year}</span>
        <button
          type="button"
          className={styles.heatmapNavBtn}
          onClick={() => setOffset(o => o + 1)}
          disabled={offset >= 0}
          aria-label="Наступний місяць"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 3l4 4-4 4"/>
          </svg>
        </button>
      </div>

      <div className={styles.heatmapWeekRow}>
        {WEEK_DAYS.map(d => (
          <span key={d} className={styles.heatmapWeekDay}>{d}</span>
        ))}
      </div>

      <div className={styles.heatmapCalGrid}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className={styles.heatmapCalEmpty} />
          const iso   = isoOf(day)
          const count = countByDate[iso] ?? 0
          const isToday = iso === todayIso
          return (
            <div
              key={iso}
              className={`${styles.heatmapCalCell} ${isToday ? styles.heatmapCalToday : ''} ${count > 0 ? styles.heatmapCalActive : ''}`}
              style={count > 0 ? { background: color, opacity: count >= 2 ? 1 : 0.7 } : undefined}
            >
              <span className={styles.heatmapCalDay}>{day}</span>
              {count > 1 && <span className={styles.heatmapCalDot} />}
            </div>
          )
        })}
      </div>

      <div className={styles.heatmapLegend}>
        <div className={styles.heatmapLegendItem}>
          <div className={styles.heatmapLegendCell} />
          <span>без тренування</span>
        </div>
        <div className={styles.heatmapLegendItem}>
          <div className={styles.heatmapLegendCell} style={{ background: color, opacity: 0.7 }} />
          <span>1 тренування</span>
        </div>
        <div className={styles.heatmapLegendItem}>
          <div className={styles.heatmapLegendCell} style={{ background: color }} />
          <span>2+</span>
        </div>
      </div>
    </div>
  )
}

// ── Workout row (compact) ──────────────────────────────────────────────────

interface WorkoutRowProps {
  event:    SportEvent
  onEdit:   () => void
  onDelete: () => void
}

const WorkoutRow: React.FC<WorkoutRowProps> = ({ event, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) { onDelete() }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500) }
  }

  const primaryMetric = event.metrics.find(m => m.name && m.value)

  return (
    <div className={styles.workoutRow}>
      <div className={styles.workoutDateCol}>
        <span className={styles.workoutDateDay}>{parseInt(event.date.slice(8, 10))}</span>
        <span className={styles.workoutDateMon}>{MONTHS_SHORT[parseInt(event.date.slice(5, 7)) - 1]}</span>
      </div>
      <div className={styles.workoutMain}>
        <span className={styles.workoutTitle}>{event.title || 'Тренування'}</span>
        <span className={styles.workoutMeta}>
          {event.duration ? <span className={styles.workoutDuration}>{fmtDuration(event.duration)}</span> : null}
          {primaryMetric && <span className={styles.workoutMetricInline}>{primaryMetric.value}{primaryMetric.unit ? ` ${primaryMetric.unit}` : ''}</span>}
        </span>
      </div>
      <div className={styles.workoutActions}>
        <button type="button" className={styles.workoutEditBtn} onClick={onEdit} aria-label="Редагувати">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          type="button"
          className={`${styles.workoutDeleteBtn} ${confirmDelete ? styles.workoutDeleteBtnConfirm : ''}`}
          onClick={handleDelete}
          aria-label="Видалити"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * SportSpaceView
 * --------------
 * Typed view для просторів типу 'sports'. Hero + stats row,
 * профіль (вид спорту/рівень/ціль), PR трекер, workout log, витрати.
 *
 * @prop spaceId         — ID простору
 * @prop color           — акцентний колір
 * @prop spaceName       — назва простору
 * @prop profile         — sportProfile
 * @prop onProfileUpdate — callback після збереження профілю
 * @prop coverUrl        — URL обкладинки
 * @prop isOwner         — чи поточний юзер власник
 * @prop onEditSpace     — відкрити шторку редагування простору
 * @prop onBack          — навігація назад
 * @prop spaceTxs        — транзакції простору
 */
const SportSpaceView: React.FC<Props> = ({
  spaceId, color, spaceName, profile, onProfileUpdate,
  coverUrl, coverPosition, isOwner, onEditSpace, onBack, spaceTxs = [],
}) => {
  const { showToast } = useUiStore()
  const {
    eventsBySpace, programsBySpace, sessionsBySpace,
    loading, fetchEvents, createEvent, updateEvent, deleteEvent, updateProfile,
    fetchPrograms, createProgram, updateProgram, deleteProgram,
    fetchSessions, createSession, deleteSession,
  } = useSportStore()

  const [addOpen, setAddOpen]             = useState(false)
  const [editingEvent, setEditingEvent]   = useState<SportEvent | null>(null)
  const [importPrefill, setImportPrefill] = useState<SportEventInput | null>(null)
  const gpxInputRef = useRef<HTMLInputElement>(null)
  const [profileOpen, setProfileOpen]     = useState(false)
  const [programSheetOpen, setProgramSheetOpen] = useState(false)
  const [editingProgram, setEditingProgram]     = useState<WorkoutProgram | null>(null)
  const [activeWorkout, setActiveWorkout]       = useState<WorkoutProgram | null>(null)

  const events = eventsBySpace[spaceId] ?? []

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!cancelled) await fetchEvents(spaceId)
      if (!cancelled) await fetchPrograms(spaceId)
      if (!cancelled) await fetchSessions(spaceId)
    }
    load()
    return () => { cancelled = true }
  }, [spaceId, fetchEvents, fetchPrograms, fetchSessions])

  const handleCreate = async (data: SportEventInput) => {
    try {
      await createEvent(spaceId, data)
      showToast('Тренування збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleUpdate = async (data: SportEventInput) => {
    if (!editingEvent) return
    try {
      await updateEvent(spaceId, editingEvent._id, data)
      showToast('Оновлено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const openEdit = (event: SportEvent) => {
    setEditingEvent(event)
    setAddOpen(true)
  }

  const closeSheet = () => {
    setAddOpen(false)
    setEditingEvent(null)
    setImportPrefill(null)
  }

  const handleGpxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const parsed = await parseWorkoutFile(file)
      setImportPrefill(parsed)
      setEditingEvent(null)
      setAddOpen(true)
    } catch {
      showToast('Не вдалось розпарсити файл', 'error')
    }
  }

  const handleDelete = (eventId: string) => {
    deleteEvent(spaceId, eventId)
    showToast('Видалено', 'success')
  }

  const handleProfileSave = async (data: Partial<SportProfile>) => {
    try {
      const updated = await updateProfile(spaceId, data)
      onProfileUpdate(updated)
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handlePRSave = async (prs: SportPR[]) => {
    try {
      const updated = await updateProfile(spaceId, { prs })
      onProfileUpdate(updated)
    } catch {
      showToast('Помилка збереження', 'error')
    }
  }

  const handleProgramSave = async (name: string, exercises: WorkoutExercise[]) => {
    try {
      if (editingProgram) {
        await updateProgram(spaceId, editingProgram._id, { name, exercises })
      } else {
        await createProgram(spaceId, { name, exercises })
      }
      showToast('Збережено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const handleProgramDelete = async () => {
    if (!editingProgram) return
    await deleteProgram(spaceId, editingProgram._id)
    setProgramSheetOpen(false)
    setEditingProgram(null)
    showToast('Програму видалено', 'success')
  }

  const handleFinishWorkout = async (completedIds: string[]) => {
    if (!activeWorkout) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      await createSession(spaceId, {
        programId:          activeWorkout._id,
        programName:        activeWorkout.name,
        date:               today,
        completedExercises: completedIds,
        totalExercises:     activeWorkout.exercises.length,
        notes:              '',
      })
      await fetchEvents(spaceId)
      showToast('Тренування завершено', 'success')
    } catch {
      showToast('Помилка збереження', 'error')
      throw new Error('Failed')
    }
  }

  const programs  = programsBySpace[spaceId] ?? []
  const sessions  = sessionsBySpace[spaceId] ?? []

  // ── Derived stats ──

  const now     = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const thisMonthEvents  = events.filter(e => e.date.slice(0, 7) === monthStr)
  const streak           = calcStreak(events)
  const totalMinutes     = events.reduce((s, e) => s + (e.duration ?? 0), 0)
  const monthlyExpenses  = spaceTxs
    .filter(t => t.type === 'expense' && t.date.slice(0, 7) === monthStr)
    .reduce((s, t) => s + t.amount, 0)

  const isProfileEmpty = !profile?.sport && !profile?.goal

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={styles.root} style={colorVar}>

      {/* ── Hero ── */}
      <div className={`${styles.hero} ${styles.heroCovered}`}>
        <img
          src={coverUrl || SPACE_TYPE_CONFIG.sports.iconSrc}
          alt=""
          className={styles.heroCoverImg}
          style={{ objectPosition: coverUrl ? `center ${coverPosition ?? 'center'}` : 'center center' }}
          aria-hidden="true"
        />
        <div className={styles.heroCoverOverlay} />

        <button type="button" className={styles.heroBackBtn} onClick={onBack} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>

        <div className={styles.heroContent}>
          <h1 className={`${styles.heroName} ${coverUrl ? styles.heroNameCovered : ''}`}>{spaceName}</h1>
          <div className={styles.heroMeta}>
            {profile?.sport && <span className={styles.heroSportBadge}>{SPORT_LABELS[profile.sport] ?? profile.sport}</span>}
            {profile?.level && <span className={styles.heroLevelBadge}>{LEVEL_LABELS[profile.level]}</span>}
          </div>
          {profile?.goal && <span className={styles.heroGoal}>{profile.goal}</span>}
        </div>

        {isOwner && (
          <button type="button" className={styles.heroEditBtn} onClick={onEditSpace} aria-label="Редагувати простір">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{thisMonthEvents.length}</span>
          <span className={styles.statLabel}>трен./міс</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{streak > 0 ? streak : '—'}</span>
          <span className={styles.statLabel}>{pluralStreak(streak)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{totalMinutes > 0 ? fmtDuration(totalMinutes) : '—'}</span>
          <span className={styles.statLabel}>загалом</span>
        </div>
      </div>

      {/* ── Profile card ── */}
      <div className={styles.profileSection}>
        <div className={styles.profileSectionHeader}>
          <span className={styles.sectionTitle}>ПРОФІЛЬ</span>
          {!isProfileEmpty && (
            <button type="button" className={styles.profileEditBtn} onClick={() => setProfileOpen(true)} aria-label="Редагувати профіль">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>

        {isProfileEmpty ? (
          <div className={styles.profileSetupCard}>
            <p className={styles.profileSetupText}>Вкажи вид спорту та ціль — і простір стане персональним тренувальним щоденником</p>
            <button type="button" className={styles.profileSetupBtn} onClick={() => setProfileOpen(true)}>Налаштувати профіль</button>
          </div>
        ) : (
          <div className={styles.profileCard} onClick={() => setProfileOpen(true)}>
            <div className={styles.profileInfo}>
              {profile?.sport && <span className={styles.sportBadge}>{SPORT_LABELS[profile.sport] ?? profile.sport}</span>}
              {profile?.level && <span className={styles.levelText}>{LEVEL_LABELS[profile.level]}</span>}
              {profile?.goal  && <span className={styles.goalText}>{profile.goal}</span>}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.profileChevron} aria-hidden="true">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── PR Tracker ── */}
      <PRTracker prs={profile?.prs ?? []} color={color} onSave={handlePRSave} />

      {/* ── Workout programs ── */}
      <div className={styles.programsSection}>
        <div className={styles.programsHeader}>
          <span className={styles.sectionTitle}>ПРОГРАМИ</span>
          {programs.length < 7 && (
            <button type="button" className={styles.addProgramBtn} style={{ color }}
              onClick={() => { setEditingProgram(null); setProgramSheetOpen(true) }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
              Додати
            </button>
          )}
        </div>

        {programs.length === 0 ? (
          <p className={styles.programsEmpty}>Створи програму тренування — вправи, підходи, повторення.</p>
        ) : (
          <div className={styles.programsList}>
            {programs.map(prog => {
              const progSessions = sessions.filter(s => s.programId === prog._id)
              const last3        = progSessions.slice(0, 3)
              return (
                <div key={prog._id} className={styles.programCard}>
                  <div className={styles.programCardTop}>
                    <div className={styles.programCardInfo}>
                      <span className={styles.programCardName}>{prog.name}</span>
                      <span className={styles.programCardCount}>{prog.exercises.length} вправ</span>
                    </div>
                    <div className={styles.programCardBtns}>
                      <button type="button" className={styles.programEditBtn}
                        onClick={() => { setEditingProgram(prog); setProgramSheetOpen(true) }} aria-label="Редагувати">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" className={styles.programStartBtn} style={{ background: color }}
                        onClick={() => setActiveWorkout(prog)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        Почати
                      </button>
                    </div>
                  </div>
                  {last3.length > 0 && (
                    <div className={styles.programSessions}>
                      {last3.map(s => (
                        <div key={s._id} className={styles.programSessionRow}>
                          <span className={styles.programSessionDate}>{s.date.slice(8,10)}.{s.date.slice(5,7)}</span>
                          <span className={styles.programSessionScore}>
                            {s.completedExercises.length}/{s.totalExercises}
                          </span>
                          <button
                            type="button"
                            className={styles.programSessionDeleteBtn}
                            onClick={() => deleteSession(spaceId, s._id)}
                            aria-label="Видалити сесію"
                          >
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                              <path d="M2 2l10 10M12 2L2 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.actionsSection}>
        <button type="button" className={styles.addWorkoutBtn} style={colorVar} onClick={() => { setEditingEvent(null); setImportPrefill(null); setAddOpen(true) }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Додати тренування
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.plusIcon} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.importBtn} onClick={() => gpxInputRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          GPX / TCX
        </button>
        <input
          ref={gpxInputRef}
          type="file"
          accept=".gpx,.tcx"
          className={styles.hiddenInput}
          onChange={handleGpxFile}
        />
      </div>

      {/* ── Workout log ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>ТРЕНУВАННЯ</h3>

        {events.length > 0 && <WorkoutHeatmap events={events} color={color} />}

        {loading && events.length === 0 ? (
          <div className={styles.loadingRow}>
            <span className={styles.loadingDot} style={{ background: color }} />
          </div>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p className={styles.emptyTitle}>Тренувань ще немає</p>
            <p className={styles.emptyDesc}>Додай перше тренування — пробіжка, зал, басейн або що завгодно.</p>
            <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddOpen(true)}>+ Тренування</button>
          </div>
        ) : (
          <div className={styles.workoutList}>
            {events.map(event => (
              <WorkoutRow
                key={event._id}
                event={event}
                onEdit={() => openEdit(event)}
                onDelete={() => handleDelete(event._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Expenses ── */}
      {spaceTxs.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>ВИТРАТИ</h3>
          {monthlyExpenses > 0 && (
            <div className={styles.expenseMonthRow}>
              <span className={styles.expenseMonthLabel}>цього місяця</span>
              <span className={styles.expenseMonthVal}>₴{monthlyExpenses.toLocaleString('uk-UA', { minimumFractionDigits: 0 })}</span>
            </div>
          )}
          <div className={styles.txList}>
            {spaceTxs.map((t, idx) => {
              const curDate  = t.date.slice(0, 10)
              const prevDate = idx > 0 ? spaceTxs[idx - 1].date.slice(0, 10) : null
              const isIncome = t.type === 'income'
              const catColor = isIncome ? 'var(--positive)' : 'var(--negative)'
              return (
                <React.Fragment key={t._id}>
                  {curDate !== prevDate && <div className={styles.txDateHeader}>{fmtDate(curDate)}</div>}
                  <div className={styles.spaceTx}>
                    <div className={styles.txLeft}>
                      <div className={styles.txTypeIcon} style={{ '--cat-color': catColor } as React.CSSProperties}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {isIncome ? <path d="M8 13V3M3 8l5-5 5 5"/> : <path d="M8 3v10M3 8l5 5 5-5"/>}
                        </svg>
                      </div>
                      <div className={styles.txContent}>
                        <span className={styles.txTitle}>{t.title || t.desc || t.category || '—'}</span>
                        {t.category && <span className={styles.txSub}>{t.category}</span>}
                      </div>
                    </div>
                    <span className={`${styles.txAmount} ${isIncome ? styles.txAmountPos : styles.txAmountNeg}`}>
                      {isIncome ? '+' : '−'}₴{t.amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      <AddWorkoutSheet
        isOpen={addOpen}
        color={color}
        onClose={closeSheet}
        onSave={editingEvent ? handleUpdate : handleCreate}
        editEvent={editingEvent ?? undefined}
        prefill={importPrefill}
      />

      <ProfileEditSheet
        isOpen={profileOpen}
        profile={profile}
        color={color}
        onClose={() => setProfileOpen(false)}
        onSave={handleProfileSave}
      />

      <ProgramSheet
        isOpen={programSheetOpen}
        color={color}
        program={editingProgram}
        onClose={() => { setProgramSheetOpen(false); setEditingProgram(null) }}
        onSave={handleProgramSave}
        onDelete={editingProgram ? handleProgramDelete : null}
      />

      <ActiveWorkoutSheet
        isOpen={activeWorkout !== null}
        color={color}
        program={activeWorkout}
        onClose={() => setActiveWorkout(null)}
        onFinish={handleFinishWorkout}
      />
    </div>
  )
}

export default SportSpaceView
