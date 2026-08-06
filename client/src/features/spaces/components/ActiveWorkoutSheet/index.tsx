import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { getSetTargets, type WorkoutExercise, type WorkoutProgram, type WorkoutSetLog, type WorkoutExerciseLog } from '../../store/sportStore'
import styles from './ActiveWorkoutSheet.module.css'

const DEFAULT_REST_SEC = 60

interface RestState {
  exerciseId: string
  totalSec:   number
  secondsLeft: number
}

/** Props for ActiveWorkoutSheet */
interface Props {
  isOpen:   boolean
  color:    string
  program:  WorkoutProgram | null
  onClose:  () => void
  onFinish: (completedIds: string[], exerciseLogs: WorkoutExerciseLog[]) => Promise<void>
}

function targetSetsOf(ex: WorkoutExercise): number {
  return getSetTargets(ex).length
}

function pluralUk(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const SET_WORD: [string, string, string] = ['підхід', 'підходи', 'підходів']

function targetLabel(reps: number | null, weight: number | null): string {
  const parts: string[] = []
  if (reps) parts.push(`${reps} повт.`)
  if (weight) parts.push(`${weight} кг`)
  return parts.join(' × ')
}

// Locked-рядок: короткий підпис — "3 підходи"
function metaLineLocked(ex: WorkoutExercise): string {
  const target = targetSetsOf(ex)
  return `${target} ${pluralUk(target, SET_WORD)}`
}

function doneLine(target: number): string {
  return target > 1 ? `${target} ${pluralUk(target, SET_WORD)} виконано` : 'виконано'
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * ActiveWorkoutSheet
 * -------------------
 * Покроковий екран виконання програми тренування (аналог кроків рецепту):
 * послідовне розблокування вправ, лічильник підходів, таймер відпочинку між
 * підходами/вправами з вібро-сигналом по завершенню.
 *
 * @prop isOpen   — видимість шторки
 * @prop color    — акцентний колір простору
 * @prop program  — програма що виконується
 * @prop onClose  — закрити без збереження прогресу понад те що вже надіслано
 * @prop onFinish — викликається з масивом id повністю виконаних вправ
 */
const ActiveWorkoutSheet: React.FC<Props> = ({ isOpen, color, program, onClose, onFinish }) => {
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({})
  const [actualLogs, setActualLogs]       = useState<Record<string, WorkoutSetLog[]>>({})
  const [restState, setRestState]         = useState<RestState | null>(null)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [editReps, setEditReps]     = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [busy, setBusy]     = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })

  useEffect(() => {
    const open = () => {
      setCompletedSets({})
      setActualLogs({})
      setEditingExerciseId(null)
      setRestState(null)
      setBusy(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
    const close = () => {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return t
    }
    if (isOpen) {
      open()
      return
    }
    const t = close()
    return () => clearTimeout(t)
  }, [isOpen])

  // Rest timer tick — один steady interval на сесію відпочинку (не перезапускається
  // від adjustRest, бо залежить лише від exerciseId, а не від secondsLeft)
  useEffect(() => {
    if (!restState) return
    const interval = setInterval(() => {
      setRestState(prev => {
        if (!prev) return prev
        const nextSeconds = prev.secondsLeft - 1
        if (nextSeconds <= 0) {
          if (navigator.vibrate) navigator.vibrate(200)
          return null
        }
        return { ...prev, secondsLeft: nextSeconds }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [restState?.exerciseId]) // eslint-disable-line react-hooks/exhaustive-deps -- interval живе всю сесію відпочинку; залежність від secondsLeft перезапускала б його при кожному +15с/−15с

  if (!mounted || !program) return null

  const exercises = program.exercises
  const doneCountOf = (ex: WorkoutExercise) => completedSets[ex.id] ?? 0
  const isExDone     = (ex: WorkoutExercise) => doneCountOf(ex) >= targetSetsOf(ex)
  const activeIndex  = exercises.findIndex(ex => !isExDone(ex))
  const allDone      = activeIndex === -1
  const doneCount    = exercises.filter(isExDone).length
  const colorVar     = { '--space-color': color } as React.CSSProperties

  const totalSetsAll     = exercises.reduce((sum, ex) => sum + targetSetsOf(ex), 0)
  const completedSetsAll = exercises.reduce((sum, ex) => sum + Math.min(doneCountOf(ex), targetSetsOf(ex)), 0)

  const confirmSet = (ex: WorkoutExercise, exIndex: number, log: WorkoutSetLog) => {
    const target = targetSetsOf(ex)
    const next   = doneCountOf(ex) + 1
    setCompletedSets(prev => ({ ...prev, [ex.id]: next }))
    setActualLogs(prev => ({ ...prev, [ex.id]: [...(prev[ex.id] ?? []), log] }))
    setEditingExerciseId(null)

    const isLastSetOfExercise = next >= target
    const isLastExercise      = exIndex === exercises.length - 1
    if (isLastSetOfExercise && isLastExercise) return

    const restSec = ex.restSec && ex.restSec > 0 ? ex.restSec : DEFAULT_REST_SEC
    setRestState({ exerciseId: ex.id, totalSec: restSec, secondsLeft: restSec })
  }

  // Достроково завершити вправу — решта запланованих підходів пропускається без логу
  const skipRestOfExercise = (ex: WorkoutExercise, exIndex: number) => {
    const target = targetSetsOf(ex)
    setCompletedSets(prev => ({ ...prev, [ex.id]: target }))
    setEditingExerciseId(null)

    const isLastExercise = exIndex === exercises.length - 1
    if (isLastExercise) return

    const restSec = ex.restSec && ex.restSec > 0 ? ex.restSec : DEFAULT_REST_SEC
    setRestState({ exerciseId: ex.id, totalSec: restSec, secondsLeft: restSec })
  }

  const startEdit = (ex: WorkoutExercise, target: { reps: number | null; weight: number | null }) => {
    setEditingExerciseId(ex.id)
    setEditReps(target.reps != null ? String(target.reps) : '')
    setEditWeight(target.weight != null ? String(target.weight) : '')
  }

  const adjustRest = (delta: number) => {
    setRestState(prev => prev ? { ...prev, secondsLeft: Math.max(0, prev.secondsLeft + delta) } : prev)
  }

  const handleFinish = async () => {
    setBusy(true)
    try {
      const exerciseLogs: WorkoutExerciseLog[] = exercises
        .filter(ex => (actualLogs[ex.id]?.length ?? 0) > 0)
        .map(ex => ({ exerciseId: ex.id, name: ex.name, sets: actualLogs[ex.id] }))
      await onFinish(exercises.filter(isExDone).map(e => e.id), exerciseLogs)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const ringFraction = restState ? Math.min(1, Math.max(0, restState.secondsLeft / restState.totalSec)) : 0
  const ringCirc = 2 * Math.PI * 17

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

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${totalSetsAll > 0 ? (completedSetsAll / totalSetsAll) * 100 : 0}%`, background: color }} />
          </div>
          <span className={styles.progressLabel}>{completedSetsAll} з {totalSetsAll} {pluralUk(totalSetsAll, SET_WORD)}</span>
        </div>

        {!allDone && (
          <button type="button" className={styles.earlyFinishBtn} onClick={handleFinish} disabled={busy || doneCount === 0}>
            Завершити тренування достроково
          </button>
        )}

        <div ref={bodyRef} className={styles.sheetBody}>
          <div className={styles.stepList}>
            {exercises.map((ex, i) => {
              const done   = isExDone(ex)
              const active = i === activeIndex
              const setTargets = getSetTargets(ex)
              const target = setTargets.length
              const cur    = doneCountOf(ex)
              const isResting = restState?.exerciseId === ex.id
              const currentTarget = setTargets[cur] ?? null
              const isEditing = editingExerciseId === ex.id

              const isLastSet = cur + 1 >= target

              return (
                <div key={ex.id} className={`${styles.stepWrap} ${done ? styles.stepWrapDone : ''}`}>
                  <div className={styles.stepCircleCol}>
                    <div
                      className={`${styles.stepCircle} ${done ? styles.stepCircleDone : ''} ${active ? styles.stepCircleActive : ''}`}
                      style={done ? { background: color } : active ? { background: color } : undefined}
                    >
                      {done && (
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M2 7l4 4 6-7"/></svg>
                      )}
                    </div>
                    {i < exercises.length - 1 && (
                      <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} style={done ? { background: color } : undefined} />
                    )}
                  </div>

                  {done ? (
                    <div className={styles.stepContentDone}>
                      <span className={styles.stepNameDone}>{ex.name}</span>
                      <span className={styles.stepDoneLabel}>{doneLine(target)}</span>
                    </div>
                  ) : active ? (
                    <div className={styles.stepCard} style={{ borderColor: `color-mix(in srgb, ${color} 35%, var(--border))` }}>
                      <span className={styles.stepName}>{ex.name}</span>
                      {ex.notes && <span className={styles.stepMeta}>{ex.notes}</span>}

                      {!isResting && (
                        <>
                          {target > 1 && <span className={styles.setProgressLabel}>Підхід {cur + 1} із {target}</span>}
                          {currentTarget && targetLabel(currentTarget.reps, currentTarget.weight) && (
                            <span className={styles.setTargetLabel}>{targetLabel(currentTarget.reps, currentTarget.weight)}</span>
                          )}

                          {isEditing ? (
                            <div className={styles.setEditRow}>
                              <input
                                className={styles.setEditInput} type="number" inputMode="numeric" min="0"
                                value={editReps} onChange={e => setEditReps(e.target.value)} placeholder="повт."
                              />
                              <input
                                className={styles.setEditInput} type="number" inputMode="numeric" min="0" step="0.5"
                                value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="кг"
                              />
                              <button
                                type="button" className={styles.setDoneBtn} style={{ background: color }}
                                onClick={() => confirmSet(ex, i, { reps: editReps ? +editReps : null, weight: editWeight ? +editWeight : null })}
                              >
                                Зберегти
                              </button>
                            </div>
                          ) : (
                            <div className={styles.setActionRow}>
                              <button
                                type="button" className={styles.setDoneBtn} style={{ background: color }}
                                onClick={() => confirmSet(ex, i, { reps: currentTarget?.reps ?? null, weight: currentTarget?.weight ?? null })}
                              >
                                {isLastSet ? 'Завершити вправу' : `Завершити підхід ${cur + 1}`}
                              </button>
                              <button type="button" className={styles.editSetLink} onClick={() => startEdit(ex, currentTarget ?? { reps: null, weight: null })}>
                                змінити цифри
                              </button>
                            </div>
                          )}

                          {target > 1 && !isLastSet && (
                            <button type="button" className={styles.skipExerciseLink} onClick={() => skipRestOfExercise(ex, i)}>
                              Завершити вправу достроково
                            </button>
                          )}
                        </>
                      )}

                      {isResting && restState && (
                        <div className={styles.restCard}>
                          <svg width="40" height="40" viewBox="0 0 40 40" className={styles.restRing}>
                            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--border)" strokeWidth="3" />
                            <circle
                              cx="20" cy="20" r="17" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={ringCirc}
                              strokeDashoffset={ringCirc * (1 - ringFraction)}
                              transform="rotate(-90 20 20)"
                            />
                          </svg>
                          <div className={styles.restText}>
                            <span className={styles.restLabel}>Відпочинок</span>
                            <span className={styles.restClock}>{fmtClock(restState.secondsLeft)}</span>
                          </div>
                          <div className={styles.restBtns}>
                            <button type="button" className={styles.restAdjustBtn} onClick={() => adjustRest(-15)}>−15с</button>
                            <button type="button" className={styles.restSkipBtn} onClick={() => setRestState(null)}>Пропустити</button>
                            <button type="button" className={styles.restAdjustBtn} onClick={() => adjustRest(15)}>+15с</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.stepContentLocked}>
                      <span className={styles.stepNameLocked}>{ex.name}</span>
                      {metaLineLocked(ex) && <span className={styles.stepMetaLocked}>{metaLineLocked(ex)}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {allDone && (
          <div className={styles.sheetFooter}>
            <button type="button" className={styles.saveBtn} style={{ background: color }}
              onClick={handleFinish} disabled={busy}>
              {busy ? 'Збереження…' : 'Завершити тренування'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActiveWorkoutSheet
