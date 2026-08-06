import React, { useEffect, useRef, useState } from 'react'
import { useSportStore, getSetTargets, type SportEvent, type SportEventInput, type WorkoutProgram, type WorkoutExercise, type WorkoutSetTarget, type WorkoutExerciseLog } from '../../store/sportStore'
import type { SportProfile, SportPR } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import PillSelector from '@/shared/components/ui/PillSelector'
import { SPACE_TYPE_CONFIG } from '../../data/spaceTypes'
import AddWorkoutSheet from '../AddWorkoutSheet'
import ActiveWorkoutSheet from '../ActiveWorkoutSheet'
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

const BODY_MEASUREMENT_OPTIONS: { name: string; unit: string }[] = [
  { name: 'Вага',              unit: 'кг' },
  { name: 'Зріст',             unit: 'см' },
  { name: 'Груди',             unit: 'см' },
  { name: 'Талія',             unit: 'см' },
  { name: 'Стегна',            unit: 'см' },
  { name: 'Біцепс',            unit: 'см' },
  { name: 'Плечі',             unit: 'см' },
  { name: 'Передпліччя',       unit: 'см' },
  { name: 'Литки',             unit: 'см' },
  { name: 'Шия',               unit: 'см' },
  { name: '% жиру',            unit: '%' },
]

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
  isOpen:              boolean
  profile:             SportProfile | null
  color:               string
  onClose:             () => void
  onSave:              (data: Partial<SportProfile>) => Promise<void>
  onMeasurementsSave:  (measurements: SportPR[]) => Promise<void>
}

const ProfileEditSheet: React.FC<ProfileSheetProps> = ({ isOpen, profile, color, onClose, onSave, onMeasurementsSave }) => {
  const [sport, setSport]     = useState(profile?.sport ?? '')
  const [level, setLevel]     = useState<SportProfile['level']>(profile?.level ?? null)
  const [goal, setGoal]       = useState(profile?.goal ?? '')
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl ?? '')
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
      setPhotoUrl(profile?.photoUrl ?? '')
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
      await onSave({ sport, level, goal, photoUrl })
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
          <div className={`${styles.field} ${styles.photoField}`}>
            <ImageUploadButton
              currentUrl={photoUrl}
              folder="sport-profile"
              onUpload={setPhotoUrl}
              variant="circle"
              placeholder="Фото"
            />
          </div>

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

          <PRTracker
            prs={profile?.measurements ?? []}
            color={color}
            onSave={onMeasurementsSave}
            title="ПАРАМЕТРИ ТІЛА"
            emptyText="Зафіксуй перший параметр — вага, зріст, обхват грудей…"
            namePlaceholder="Назва параметра…"
            addLabel="Додати параметр"
            nameOptions={BODY_MEASUREMENT_OPTIONS}
            bare
          />
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
  prs:              SportPR[]
  color:            string
  onSave:           (prs: SportPR[]) => Promise<void>
  title?:           string
  emptyText?:       string
  namePlaceholder?: string
  addLabel?:        string
  /** Якщо задано — вибір назви через пігулки замість вільного тексту (+ "Інше" для кастомної) */
  nameOptions?:     { name: string; unit: string }[]
  /** Компактний варіант без секційних відступів — для вбудовування в інші форми (напр. ProfileEditSheet) */
  bare?:            boolean
}

const CUSTOM_NAME = '__custom__'

const PRTracker: React.FC<PRTrackerProps> = ({
  prs, color, onSave,
  title = 'РЕКОРДИ (PR)',
  emptyText = 'Зафіксуй перший рекорд — жим, дистанція, час…',
  namePlaceholder = 'Назва (Жим лежачи, 5 km…)',
  addLabel = 'Додати рекорд',
  nameOptions,
  bare = false,
}) => {
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [customMode, setCustomMode] = useState(!nameOptions)
  const [value, setValue]     = useState('')
  const [unit, setUnit]       = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const [date, setDate]       = useState('')
  const [saving, setSaving]   = useState(false)

  const resetForm = () => {
    setName(''); setValue(''); setUnit(''); setDate(''); setCustomMode(!nameOptions)
  }

  const selectPreset = (value: string) => {
    if (value === CUSTOM_NAME) {
      setCustomMode(true)
      setName('')
      setUnit('')
      return
    }
    const opt = nameOptions?.find(o => o.name === value)
    setCustomMode(false)
    setName(value)
    setUnit(opt?.unit ?? '')
  }

  const handleAdd = async () => {
    if (!name.trim() || !value.trim()) return
    setSaving(true)
    const newPR: SportPR = { id: genId(), name: name.trim(), value: value.trim(), unit: unit.trim(), date: date || null }
    try { await onSave([...prs, newPR]) } finally { setSaving(false) }
    resetForm(); setOpen(false)
  }

  const handleDelete = async (id: string) => {
    await onSave(prs.filter(p => p.id !== id))
  }

  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <div className={bare ? styles.field : styles.section} style={colorVar}>
      <div className={styles.prHeader}>
        {bare
          ? <label className={styles.fieldLabel}>{title}</label>
          : <h3 className={styles.sectionTitle}>{title}</h3>}
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
        <p className={styles.prEmpty}>{emptyText}</p>
      )}

      {open ? (
        <div className={styles.prAddForm}>
          {nameOptions && (
            <div className={styles.prAddRow}>
              <PillSelector
                options={[...nameOptions.map(o => ({ value: o.name, label: o.name })), { value: CUSTOM_NAME, label: 'Інше' }]}
                value={customMode ? CUSTOM_NAME : name}
                onChange={selectPreset}
              />
            </div>
          )}
          {(!nameOptions || customMode) && (
            <div className={styles.prAddRow}>
              <input className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder={namePlaceholder} />
            </div>
          )}
          <div className={styles.prAddRow}>
            <input className={`${styles.fieldInput} ${styles.prAddValue}`} value={value} onChange={e => setValue(e.target.value)} placeholder="100" />
            <input className={`${styles.fieldInput} ${styles.prAddUnit}`}  value={unit}  onChange={e => setUnit(e.target.value)}  placeholder="кг" />
            <button type="button" className={`${styles.fieldInput} ${styles.prDateBtn}`} onClick={() => setDateOpen(true)}>
              {date ? fmtDate(date) : 'Дата'}
            </button>
          </div>
          {dateOpen && <CustomDatePicker value={date} onChange={v => { setDate(v); setDateOpen(false) }} onClose={() => setDateOpen(false)} />}
          <div className={styles.prAddBtns}>
            <button type="button" className={styles.prCancelBtn} onClick={() => { setOpen(false); resetForm() }}>Скасувати</button>
            <button type="button" className={styles.prSaveBtn} style={{ background: color }} onClick={handleAdd} disabled={!name.trim() || !value.trim() || saving}>
              {saving ? '…' : 'Зберегти'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.prOpenBtn} onClick={() => setOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          {addLabel}
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
  const { showToast } = useUiStore()
  const [name, setName]           = useState(program?.name ?? '')
  const [exercises, setExercises] = useState<WorkoutExercise[]>(program?.exercises ?? [])
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set())
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
      setExercises((program?.exercises ?? []).map(ex => ({ ...ex, setTargets: getSetTargets(ex) })))
      setConfirmDel(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, program])

  const addExercise = () => setExercises(prev => [...prev, { id: genId(), name: '', setTargets: [{ reps: null, weight: null }], restSec: null }])

  const updateEx = (id: string, patch: Partial<WorkoutExercise>) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    if (patch.name?.trim()) setInvalidIds(prev => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next })
  }

  const removeEx = (id: string) => setExercises(prev => prev.filter(e => e.id !== id))

  const addSet = (exId: string) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      const targets = getSetTargets(e)
      const last = targets[targets.length - 1]
      return { ...e, setTargets: [...targets, last ? { ...last } : { reps: null, weight: null }] }
    }))
  }

  const removeSet = (exId: string, index: number) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      const targets = getSetTargets(e)
      if (targets.length <= 1) return e
      return { ...e, setTargets: targets.filter((_, i) => i !== index) }
    }))
  }

  const updateSetTarget = (exId: string, index: number, patch: Partial<WorkoutSetTarget>) => {
    setExercises(prev => prev.map(e => {
      if (e.id !== exId) return e
      const targets = getSetTargets(e)
      return { ...e, setTargets: targets.map((t, i) => i === index ? { ...t, ...patch } : t) }
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) { showToast('Впиши назву програми', 'error'); return }
    if (exercises.length === 0) { showToast('Додай хоча б одну вправу', 'error'); return }
    const empty = exercises.filter(e => !e.name.trim())
    if (empty.length > 0) {
      setInvalidIds(new Set(empty.map(e => e.id)))
      showToast('Заповни назву кожної вправи', 'error')
      return
    }
    setBusy(true)
    try {
      const normalized = exercises.map(e => {
        const setTargets = getSetTargets(e)
        return { ...e, setTargets, sets: setTargets.length, reps: setTargets[0]?.reps ?? null }
      })
      await onSave(name.trim(), normalized)
      onClose()
    }
    catch { /* onSave вже показав toast з причиною */ }
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
            {exercises.map((ex, i) => {
              const setTargets = getSetTargets(ex)
              return (
                <div key={ex.id} className={styles.exCard}>
                  <div className={styles.exCardHeader}>
                    <span className={styles.exNum}>{i + 1}</span>
                    <input
                      className={`${styles.exNameInput} ${invalidIds.has(ex.id) ? styles.fieldInputError : ''}`}
                      value={ex.name}
                      onChange={e => updateEx(ex.id, { name: e.target.value })}
                      placeholder="Назва вправи…"
                    />
                    <button type="button" className={styles.exRemove} onClick={() => removeEx(ex.id)} aria-label="Видалити вправу">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>
                    </button>
                  </div>

                  <div className={styles.setTable}>
                    <div className={styles.setTableHead}>
                      <span>ПІДХІД</span>
                      <span>ПОВТОРИ</span>
                      <span>ВАГА</span>
                      <span />
                    </div>
                    {setTargets.map((set, si) => (
                      <div key={si} className={styles.setTableRow}>
                        <span className={styles.setTableNum}>{si + 1}</span>
                        <input
                          className={styles.setTableInput}
                          type="number" inputMode="numeric" min="0"
                          value={set.reps ?? ''}
                          onChange={e => updateSetTarget(ex.id, si, { reps: e.target.value ? +e.target.value : null })}
                          placeholder="—"
                        />
                        <input
                          className={styles.setTableInput}
                          type="number" inputMode="numeric" min="0" step="0.5"
                          value={set.weight ?? ''}
                          onChange={e => updateSetTarget(ex.id, si, { weight: e.target.value ? +e.target.value : null })}
                          placeholder="—"
                        />
                        {setTargets.length > 1 ? (
                          <button type="button" className={styles.setRowRemove} onClick={() => removeSet(ex.id, si)} aria-label="Видалити підхід">
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12"/></svg>
                          </button>
                        ) : <span />}
                      </div>
                    ))}
                  </div>

                  <button type="button" className={styles.addSetLink} onClick={() => addSet(ex.id)}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
                    Додати підхід
                  </button>

                  <div className={styles.exSecondaryRow}>
                    <div className={styles.exSecondaryField}>
                      <span className={styles.exSecondaryLabel}>ВІДПОЧИНОК, С</span>
                      <input
                        className={styles.exSecondaryInput}
                        type="number" inputMode="numeric" min="0"
                        value={ex.restSec ?? ''} onChange={e => updateEx(ex.id, { restSec: e.target.value ? +e.target.value : null })}
                        placeholder="60"
                      />
                    </div>
                    <div className={styles.exSecondaryField}>
                      <span className={styles.exSecondaryLabel}>ТРИВАЛІСТЬ, С</span>
                      <input
                        className={styles.exSecondaryInput}
                        type="number" inputMode="numeric" min="0"
                        value={ex.duration ?? ''} onChange={e => updateEx(ex.id, { duration: e.target.value ? +e.target.value : null })}
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <input
                    className={styles.exNotesInput}
                    value={ex.notes ?? ''}
                    onChange={e => updateEx(ex.id, { notes: e.target.value })}
                    placeholder="Нотатка до вправи…"
                  />
                </div>
              )
            })}
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
            onClick={handleSave} disabled={busy}>
            {busy ? 'Збереження…' : 'Зберегти'}
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

  const primaryMetric = event.metrics.find(m => m.name && m.value)

  return (
    <div className={styles.workoutRow}>
      <div className={styles.workoutDateCol}>
        <span className={styles.workoutDateDay}>{parseInt(event.date.slice(8, 10))}</span>
        <span className={styles.workoutDateMon}>{MONTHS_SHORT[parseInt(event.date.slice(5, 7)) - 1]}</span>
      </div>
      <div className={styles.workoutMain}>
        <span className={styles.workoutTitle}>
          {event.title || 'Тренування'}
          {event.repeat && event.repeat !== 'none' && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.workoutRepeatIcon} aria-label="Повторюється">
              <path d="M17 2l4 4-4 4"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <path d="M7 22l-4-4 4-4"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          )}
        </span>
        <span className={styles.workoutMeta}>
          {event.duration ? <span className={styles.workoutDuration}>{fmtDuration(event.duration)}</span> : null}
          {primaryMetric && <span className={styles.workoutMetricInline}>{primaryMetric.value}{primaryMetric.unit ? ` ${primaryMetric.unit}` : ''}</span>}
          {event.programNames?.length > 0 && <span className={styles.workoutProgramInline}>{event.programNames.join(', ')}</span>}
        </span>
      </div>
      <div className={styles.workoutActions}>
        <button type="button" className={styles.workoutEditBtn} onClick={onEdit} aria-label="Редагувати">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          type="button"
          className={styles.workoutDeleteBtn}
          onClick={() => setConfirmDelete(true)}
          aria-label="Видалити"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      {confirmDelete && (
        <div className={styles.workoutConfirmBanner}>
          <span className={styles.workoutConfirmText}>Видалити тренування?</span>
          <div className={styles.workoutConfirmBtns}>
            <button type="button" className={styles.workoutConfirmNo} onClick={() => setConfirmDelete(false)}>Ні</button>
            <button type="button" className={styles.workoutConfirmYes} onClick={() => { setConfirmDelete(false); onDelete() }}>Так</button>
          </div>
        </div>
      )}
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

  const handleMeasurementsSave = async (measurements: SportPR[]) => {
    try {
      const updated = await updateProfile(spaceId, { measurements })
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
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка збереження', 'error')
      throw err
    }
  }

  const handleProgramDelete = async () => {
    if (!editingProgram) return
    await deleteProgram(spaceId, editingProgram._id)
    setProgramSheetOpen(false)
    setEditingProgram(null)
    showToast('Програму видалено', 'success')
  }

  const handleFinishWorkout = async (completedIds: string[], exerciseLogs: WorkoutExerciseLog[]) => {
    if (!activeWorkout) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      await createSession(spaceId, {
        programId:          activeWorkout._id,
        programName:        activeWorkout.name,
        date:               today,
        completedExercises: completedIds,
        totalExercises:     activeWorkout.exercises.length,
        exerciseLogs,
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
						<path d="M11 4l-5 5 5 5" />
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
							<path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
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
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
							</svg>
						</button>
					)}
				</div>

				{isProfileEmpty ? (
					<div className={styles.profileSetupCard}>
						<p className={styles.profileSetupText}>Вкажи вид спорту та ціль — і простір стане персональним тренувальним щоденником</p>
						<button type="button" className={styles.profileSetupBtn} onClick={() => setProfileOpen(true)}>
							Налаштувати профіль
						</button>
					</div>
				) : (
					<div className={styles.profileCard} onClick={() => setProfileOpen(true)}>
						{profile?.photoUrl && <img src={profile.photoUrl} alt="" className={styles.profileAvatar} />}
						<div className={styles.profileInfo}>
							{profile?.sport && <span className={styles.sportBadge}>{SPORT_LABELS[profile.sport] ?? profile.sport}</span>}
							{profile?.level && <span className={styles.levelText}>{LEVEL_LABELS[profile.level]}</span>}
							{profile?.goal && <span className={styles.goalText}>{profile.goal}</span>}
						</div>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							className={styles.profileChevron}
							aria-hidden="true"
						>
							<path d="M9 18l6-6-6-6" />
						</svg>
					</div>
				)}
			</div>

			{/* ── Workout programs ── */}
			<div className={styles.programsSection}>
				<div className={styles.programsHeader}>
					<span className={styles.sectionTitle}>ПРОГРАМИ</span>
					{programs.length < 7 && (
						<button
							type="button"
							className={styles.addProgramBtn}
							style={{ color }}
							onClick={() => {
								setEditingProgram(null)
								setProgramSheetOpen(true)
							}}
						>
							<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
								<path d="M7 2v10M2 7h10" />
							</svg>
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
							const last3 = progSessions.slice(0, 3)
							return (
								<div key={prog._id} className={styles.programCard}>
									<div className={styles.programCardTop}>
										<div className={styles.programCardInfo}>
											<span className={styles.programCardName}>{prog.name}</span>
											<span className={styles.programCardCount}>{prog.exercises.length} вправ</span>
										</div>
										<div className={styles.programCardBtns}>
											<button
												type="button"
												className={styles.programEditBtn}
												onClick={() => {
													setEditingProgram(prog)
													setProgramSheetOpen(true)
												}}
												aria-label="Редагувати"
											>
												<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
													<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
												</svg>
											</button>
											<button type="button" className={styles.programStartBtn} style={{ background: color }} onClick={() => setActiveWorkout(prog)}>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
													<polygon points="5 3 19 12 5 21 5 3" />
												</svg>
												Почати
											</button>
										</div>
									</div>
									{last3.length > 0 && (
										<div className={styles.programSessions}>
											{last3.map(s => (
												<div key={s._id} className={styles.programSessionRow}>
													<span className={styles.programSessionDate}>
														{s.date.slice(8, 10)}.{s.date.slice(5, 7)}
													</span>
													<span className={styles.programSessionScore}>
														{s.completedExercises.length}/{s.totalExercises}
													</span>
													<button type="button" className={styles.programSessionDeleteBtn} onClick={() => deleteSession(spaceId, s._id)} aria-label="Видалити сесію">
														<svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
															<path d="M2 2l10 10M12 2L2 12" />
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
			<h3 className={styles.sectionTitle}>ТРЕНУВАННЯ</h3>
			<div className={styles.actionsSection}>
				<button
					type="button"
					className={styles.addWorkoutBtn}
					style={colorVar}
					onClick={() => {
						setEditingEvent(null)
						setImportPrefill(null)
						setAddOpen(true)
					}}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
					</svg>
					Додати тренування
					<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.plusIcon} aria-hidden="true">
						<path d="M7 2v10M2 7h10" />
					</svg>
				</button>
				<button type="button" className={styles.importBtn} onClick={() => gpxInputRef.current?.click()}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
					GPX / TCX
				</button>
				<input ref={gpxInputRef} type="file" accept=".gpx,.tcx" className={styles.hiddenInput} onChange={handleGpxFile} />
			</div>

			{/* ── Workout log ── */}
			<div className={styles.section}>
				{loading && events.length === 0 ? (
					<div className={styles.loadingRow}>
						<span className={styles.loadingDot} style={{ background: color }} />
					</div>
				) : events.length === 0 ? (
					<div className={styles.empty}>
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
							<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
						</svg>
						<p className={styles.emptyTitle}>Тренувань ще немає</p>
						<p className={styles.emptyDesc}>Додай перше тренування — пробіжка, зал, басейн або що завгодно.</p>
						<button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddOpen(true)}>
							+ Тренування
						</button>
					</div>
				) : (
					<div className={styles.workoutList}>
						{events.map(event => (
							<WorkoutRow key={event._id} event={event} onEdit={() => openEdit(event)} onDelete={() => handleDelete(event._id)} />
						))}
					</div>
				)}

				{events.length > 0 && <WorkoutHeatmap events={events} color={color} />}
			</div>

			{/* ── PR Tracker ── */}
			<PRTracker prs={profile?.prs ?? []} color={color} onSave={handlePRSave} />

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
							const curDate = t.date.slice(0, 10)
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
													{isIncome ? <path d="M8 13V3M3 8l5-5 5 5" /> : <path d="M8 3v10M3 8l5 5 5-5" />}
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
				programs={programs}
			/>

			<ProfileEditSheet isOpen={profileOpen} profile={profile} color={color} onClose={() => setProfileOpen(false)} onSave={handleProfileSave} onMeasurementsSave={handleMeasurementsSave} />

			<ProgramSheet
				isOpen={programSheetOpen}
				color={color}
				program={editingProgram}
				onClose={() => {
					setProgramSheetOpen(false)
					setEditingProgram(null)
				}}
				onSave={handleProgramSave}
				onDelete={editingProgram ? handleProgramDelete : null}
			/>

			<ActiveWorkoutSheet isOpen={activeWorkout !== null} color={color} program={activeWorkout} onClose={() => setActiveWorkout(null)} onFinish={handleFinishWorkout} />
		</div>
	)
}

export default SportSpaceView
