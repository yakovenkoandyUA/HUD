import React, { useEffect, useRef, useState } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import type { WorkoutExercise, WorkoutProgram } from '../../store/sportStore'
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
  onFinish: (completedIds: string[]) => Promise<void>
}

function targetSetsOf(ex: WorkoutExercise): number {
  return ex.sets && ex.sets > 0 ? ex.sets : 1
}

function pluralUk(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const SET_WORD: [string, string, string] = ['підхід', 'підходи', 'підходів']
const REP_WORD: [string, string, string] = ['повторення', 'повторення', 'повторень']

// Активна картка: розгорнутий опис — "2 підходи × 10 повторень"
function metaLineActive(ex: WorkoutExercise): string {
  const parts: string[] = []
  if (ex.sets && ex.reps) parts.push(`${ex.sets} ${pluralUk(ex.sets, SET_WORD)} × ${ex.reps} ${pluralUk(ex.reps, REP_WORD)}`)
  else if (ex.sets) parts.push(`${ex.sets} ${pluralUk(ex.sets, SET_WORD)}`)
  else if (ex.reps) parts.push(`${ex.reps} ${pluralUk(ex.reps, REP_WORD)}`)
  if (ex.duration) parts.push(`${ex.duration}с`)
  if (ex.notes) parts.push(ex.notes)
  return parts.join(' · ')
}

// Locked-рядок: короткий підпис — "1 підхід"
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
  const [restState, setRestState]         = useState<RestState | null>(null)
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

  // Rest timer tick — chained setTimeout, 1s cadence
  useEffect(() => {
    if (!restState) return
    const isDone = restState.secondsLeft <= 0
    const t = setTimeout(() => {
      if (isDone) {
        if (navigator.vibrate) navigator.vibrate(200)
        setRestState(null)
      } else {
        setRestState(prev => prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : prev)
      }
    }, isDone ? 0 : 1000)
    return () => clearTimeout(t)
  }, [restState])

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

  const completeSet = (ex: WorkoutExercise, exIndex: number) => {
    const target = targetSetsOf(ex)
    const next   = doneCountOf(ex) + 1
    setCompletedSets(prev => ({ ...prev, [ex.id]: next }))

    const isLastSetOfExercise = next >= target
    const isLastExercise      = exIndex === exercises.length - 1
    if (isLastSetOfExercise && isLastExercise) return

    const restSec = ex.restSec && ex.restSec > 0 ? ex.restSec : DEFAULT_REST_SEC
    setRestState({ exerciseId: ex.id, totalSec: restSec, secondsLeft: restSec })
  }

  const adjustRest = (delta: number) => {
    setRestState(prev => prev ? { ...prev, secondsLeft: Math.max(0, prev.secondsLeft + delta) } : prev)
  }

  const handleFinish = async () => {
    setBusy(true)
    try {
      await onFinish(exercises.filter(isExDone).map(e => e.id))
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
              const target = targetSetsOf(ex)
              const cur    = doneCountOf(ex)
              const isResting = restState?.exerciseId === ex.id

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
                      {metaLineActive(ex) && <span className={styles.stepMeta}>{metaLineActive(ex)}</span>}

                      {!isResting && (
                        <>
                          {target > 1 && <span className={styles.setProgressLabel}>Підхід {cur + 1} із {target}</span>}
                          <button type="button" className={styles.setDoneBtn} style={{ background: color }} onClick={() => completeSet(ex, i)}>
                            {isLastSet ? 'Завершити вправу' : `Завершити підхід ${cur + 1}`}
                          </button>
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
