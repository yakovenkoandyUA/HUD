import React, { useRef, useCallback, useEffect, useState } from 'react'
import PriorityBadge from '@/shared/components/ui/PriorityBadge'
import type { UnifiedTodo, SprintTag } from '@/shared/types'
import { isRecurring, isRoutineDueOnDay, calcStreak } from '../../../utils/sprint'
import styles from './TaskCard.module.css'

/**
 * TaskCard
 * --------
 * Уніфікована картка задачі: Спринт / Покупка / Todo.
 * Тап на тіло картки (не чекбокс) → відкриває TaskDetailModal.
 * Свайп вліво → червоний reveal + fly-to-bin анімація видалення.
 *
 * Props:
 * @prop {UnifiedTodo}    item          — дані задачі
 * @prop {() => void}     onToggle      — перемикання done
 * @prop {() => void}     onDelete      — видалення
 * @prop {() => void}     onOpenDetail  — відкрити детальну картку
 */
interface TaskCardProps {
  item: UnifiedTodo
  onToggle: () => void
  onDelete: () => void
  onOpenDetail: () => void
}

const TAG_LABEL: Record<SprintTag, string> = {
  dev:        'Розробка',
  mentorship: 'Менторство',
  personal:   'Особисте',
  learning:   'Навчання',
}

const TAG_COLOR: Record<SprintTag, string> = {
  dev:        'var(--accent)',
  mentorship: 'var(--second)',
  personal:   'var(--gold)',
  learning:   'var(--orange)',
}

const TAG_BG: Record<SprintTag, string> = {
  dev:        'var(--accent-soft)',
  mentorship: 'var(--second-soft)',
  personal:   'var(--gold-dim)',
  learning:   'var(--orange-s)',
}

function getDueDateDiff(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function getDueDateColor(dateStr: string): string {
  const diff = getDueDateDiff(dateStr)
  if (diff < 0)  return 'var(--negative)'
  if (diff <= 1) return 'var(--gold)'
  return 'var(--text3)'
}

function formatDueDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Сьогодні'
  if (diff === 1) return 'Завтра'
  const DAYS   = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.']
  return `${DAYS[target.getDay()]} ${target.getDate()} ${MONTHS[target.getMonth()]}`
}


function getMissedDays(item: UnifiedTodo): number {
  if (!isRecurring(item)) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  if (item.completionLog?.includes(todayStr)) return 0
  let missed = 0
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (isRoutineDueOnDay(item, d) && !(item.completionLog?.includes(iso))) {
      missed++
    }
  }
  return missed
}

function getDayWord(n: number): string {
  if (n === 1) return 'день'
  if (n >= 2 && n <= 4) return 'дні'
  return 'днів'
}

const SWIPE_THRESHOLD = 80

const TaskCard: React.FC<TaskCardProps> = ({ item, onToggle, onDelete, onOpenDetail }) => {
  const checkDone  = (item.checklist ?? []).filter(c => c.done).length
  const checkTotal = (item.checklist ?? []).length
  const checkPct   = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0

  const missedDays   = getMissedDays(item)
  const hasMissed    = missedDays > 0
  const streak       = isRecurring(item) ? calcStreak(item) : 0
  const hasLabels    = (item.labels ?? []).length > 0
  const hasDueDate   = !!item.dueDate
  const isOverdue    = hasDueDate && !item.done && getDueDateDiff(item.dueDate!) < 0
  const hasExtras    = hasLabels || hasDueDate || hasMissed
  const showBar      = checkTotal > 0 && checkPct > 0

  // Swipe-to-delete
  const itemRef    = useRef<HTMLLIElement>(null)
  const slideRef   = useRef<HTMLDivElement>(null)
  const revealRef  = useRef<HTMLDivElement>(null)
  const startXRef  = useRef(0)
  const offsetRef  = useRef(0)
  const swipingRef = useRef(false)
  const deletingRef = useRef(false)

  const [confirmClose, setConfirmClose]   = useState(false)
  const [confirmReturn, setConfirmReturn] = useState(false)

  // Keep latest prop refs so imperative handlers don't go stale
  const onDeleteRef  = useRef(onDelete)
  const onToggleRef  = useRef(onToggle)
  const titleRef     = useRef(item.title)
  useEffect(() => { onDeleteRef.current = onDelete },    [onDelete])
  useEffect(() => { onToggleRef.current = onToggle },    [onToggle])
  useEffect(() => { titleRef.current    = item.title },  [item.title])

  const applyOffset = useCallback((offset: number, animate = false) => {
    if (slideRef.current) {
      slideRef.current.style.transition = animate ? 'transform 0.18s ease' : 'none'
      slideRef.current.style.transform  = offset !== 0 ? `translateX(${offset}px)` : ''
    }
    if (revealRef.current) {
      revealRef.current.style.opacity = String(Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD))
    }
  }, [])

  const collapseAndDelete = useCallback(() => {
    const cardEl = itemRef.current
    document.getElementById('sprint-trash-bin')?.removeAttribute('data-active')
    if (cardEl) {
      const h = cardEl.offsetHeight
      cardEl.style.maxHeight = `${h}px`
      cardEl.style.overflow  = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cardEl.style.transition = 'max-height 0.22s ease, opacity 0.18s ease'
        cardEl.style.maxHeight  = '0'
        cardEl.style.opacity    = '0'
      }))
    }
    setTimeout(() => onDeleteRef.current(), 240)
  }, [])

  const triggerDelete = useCallback(() => {
    if (deletingRef.current) return
    deletingRef.current = true
    applyOffset(-SWIPE_THRESHOLD, true)

    const cardEl = itemRef.current
    const binEl  = document.getElementById('sprint-trash-bin')

    if (cardEl && binEl) {
      const cardRect = cardEl.getBoundingClientRect()
      const binRect  = binEl.getBoundingClientRect()

      const ghost = document.createElement('div')
      Object.assign(ghost.style, {
        position:   'fixed',
        left:       `${cardRect.left}px`,
        top:        `${cardRect.top}px`,
        width:      `${cardRect.width}px`,
        height:     `${cardRect.height}px`,
        background: 'var(--surface)',
        zIndex:     '9999',
        pointerEvents: 'none',
        borderRadius: '4px',
        overflow:   'hidden',
        display:    'flex',
        alignItems: 'center',
        paddingLeft: '14px',
        boxSizing:  'border-box',
        fontFamily: 'var(--font-body)',
        fontSize:   '13px',
        color:      'var(--text2)',
        whiteSpace: 'nowrap',
        border:     '1px solid var(--border)',
      })
      ghost.textContent = titleRef.current
      document.body.appendChild(ghost)

      const tx = binRect.left + binRect.width / 2 - cardRect.left - cardRect.width / 2
      const ty = binRect.top  + binRect.height / 2 - cardRect.top  - cardRect.height / 2

      requestAnimationFrame(() => {
        ghost.style.transition = 'transform 0.3s cubic-bezier(0.6, 0, 0.9, 0.5), opacity 0.24s ease 0.05s'
        ghost.style.transform  = `translate(${tx}px, ${ty}px) scale(0.15)`
        ghost.style.opacity    = '0'
        binEl.setAttribute('data-eating', 'true')
      })

      setTimeout(() => {
        ghost.parentNode?.removeChild(ghost)
        binEl.removeAttribute('data-eating')
        collapseAndDelete()
      }, 360)
    } else {
      collapseAndDelete()
    }
  }, [applyOffset, collapseAndDelete])

  // Keep triggerDelete in a ref for use inside the passive-false touchmove handler
  const triggerDeleteRef = useRef(triggerDelete)
  useEffect(() => { triggerDeleteRef.current = triggerDelete }, [triggerDelete])

  const handleToggleDone = () => {
    if (item.done) {
      setConfirmReturn(true)
      return
    }
    setConfirmClose(true)
  }

  const handleConfirmReturn = () => {
    setConfirmReturn(false)
    onToggleRef.current?.()
  }

  const handleConfirmClose = () => {
    setConfirmClose(false)
    const cardEl = itemRef.current
    if (cardEl) {
      cardEl.style.transition = 'transform 0.2s ease, opacity 0.18s ease'
      cardEl.style.transform  = 'translateX(28px)'
      cardEl.style.opacity    = '0'
      setTimeout(() => {
        const h = cardEl.offsetHeight
        cardEl.style.maxHeight = `${h}px`
        cardEl.style.overflow  = 'hidden'
        requestAnimationFrame(() => {
          cardEl.style.transition = 'max-height 0.18s ease'
          cardEl.style.maxHeight  = '0'
        })
        setTimeout(() => onToggleRef.current?.(), 200)
      }, 200)
    } else {
      onToggleRef.current?.()
    }
  }

  // Non-passive touchmove so e.preventDefault() actually prevents scroll
  useEffect(() => {
    const el = itemRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (deletingRef.current) return
      const dx = e.touches[0].clientX - startXRef.current
      if (!swipingRef.current) {
        if (dx < -5) swipingRef.current = true
        else return
      }
      e.preventDefault()
      const clamped = Math.max(-SWIPE_THRESHOLD * 1.5, Math.min(0, dx))
      offsetRef.current = clamped
      applyOffset(clamped)
      const bin = document.getElementById('sprint-trash-bin')
      if (bin) {
        if (clamped <= -SWIPE_THRESHOLD / 2) bin.setAttribute('data-active', 'true')
        else bin.removeAttribute('data-active')
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [applyOffset])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (deletingRef.current) return
    startXRef.current  = e.touches[0].clientX
    offsetRef.current  = 0
    swipingRef.current = false
  }

  const handleTouchEnd = () => {
    if (deletingRef.current || !swipingRef.current) return
    swipingRef.current = false
    if (offsetRef.current <= -SWIPE_THRESHOLD) {
      triggerDelete()
    } else {
      applyOffset(0, true)
      offsetRef.current = 0
      document.getElementById('sprint-trash-bin')?.removeAttribute('data-active')
    }
  }

  const missedLevel = !item.done
    ? missedDays === 0 ? 'none' : missedDays === 1 ? 'warn' : 'danger'
    : 'none'

  return (
    <li
      ref={itemRef}
      className={`${styles.item} ${item.done ? styles.done : ''} ${missedLevel === 'warn' ? styles.cardWarn : missedLevel === 'danger' ? styles.cardDanger : ''} ${isOverdue ? styles.cardOverdue : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Red background revealed on swipe-left */}
      <div ref={revealRef} className={styles.swipeReveal} aria-hidden="true">
        <svg width="17" height="19" viewBox="0 0 18 20" fill="none">
          <path d="M1 4h16M6 4V2h6v2M3 4l1 14a1 1 0 001 1h8a1 1 0 001-1L15 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 8v6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Sliding content layer */}
      <div ref={slideRef} className={styles.slideContent}>
        <div className={styles.inner}>
          <button type="button" className={styles.check} onClick={handleToggleDone} aria-label="Toggle">
            <span className={`${styles.checkBox} ${item.type === 'sprint' ? styles.checkBoxSprint : item.type === 'shopping' ? styles.checkBoxShopping : item.type === 'todo' ? styles.checkBoxTodo : ''}`}>{item.done ? '✓' : ''}</span>
          </button>

          {/* Clickable body → open detail */}
          <div className={styles.body} onClick={onOpenDetail} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpenDetail()}>
            <div className={styles.topRow}>
              <div className={styles.titleLine}>
                {item.isPinned && (
                  <svg className={styles.pinIcon} width="11" height="11" viewBox="0 0 24 24" fill="var(--gold)" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                )}
                {item.type === 'shopping' && item.priority && (
                  <PriorityBadge priority={item.priority} compact={item.priority === 'normal'} />
                )}
                <span className={styles.title}>{item.title}</span>
                {item.ownerName && (
                  <span className={styles.ownerBadge}>{item.ownerName}</span>
                )}
              </div>
              <div className={styles.meta}>
                {streak > 0 && (
                  <span className={styles.streakBadge}>
                    <svg width="9" height="10" viewBox="0 0 9 10" fill="none" aria-hidden="true">
                      <path d="M5.5 1C5.5 1 6.5 3 5.5 4.5C6.5 4 7 3 7 3C7 3 8 5 6.5 6.5C7.5 6.5 8 6 8 6C8 6 7.5 9 4.5 9C2 9 1 7.5 1 6C1 4 3 3.5 3 3.5C3 3.5 2.5 5 3.5 5.5C3.5 4 4.5 2.5 5.5 1Z" fill="currentColor"/>
                    </svg>
                    {streak}
                  </span>
                )}
                {checkTotal > 0 && !item.done && (
                  <span className={styles.checklistBadge}>{checkDone}/{checkTotal}</span>
                )}
                {item.type === 'sprint' && item.tag && (
                  <span className={styles.tagChip} style={{ color: TAG_COLOR[item.tag], background: TAG_BG[item.tag] }}>
                    {TAG_LABEL[item.tag]}
                  </span>
                )}
                {item.type === 'shopping' && item.quantity && <span className={styles.quantity}>{item.quantity}</span>}
              </div>
            </div>

            {hasExtras && (
              <div className={styles.extrasRow}>
                {hasLabels && (
                  <div className={styles.labelPills}>
                    {(item.labels ?? []).map(l => (
                      <span key={l.id} className={styles.labelPill} style={{ background: l.color }} />
                    ))}
                  </div>
                )}
                {hasDueDate && (
                  <span className={`${styles.dueDateBadge} ${isOverdue ? styles.dueDateBadgeOverdue : ''}`} style={{ color: getDueDateColor(item.dueDate!) }}>
                    {isOverdue ? (
                      <svg width="10" height="9" viewBox="0 0 10 9" fill="none" className={styles.dueDateIcon}>
                        <path d="M5 1L9 8H1L5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        <path d="M5 4v1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="5" cy="6.7" r="0.5" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={styles.dueDateIcon}>
                        <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    )}
                    {isOverdue ? `Просрочено · ${formatDueDate(item.dueDate!)}` : formatDueDate(item.dueDate!)}
                  </span>
                )}
                {hasMissed && !item.done && (
                  <span className={`${styles.missedBadge} ${missedLevel === 'danger' ? styles.missedBadgeDanger : ''}`}>
                    Пропущено {missedDays} {getDayWord(missedDays)}
                  </span>
                )}
              </div>
            )}
          </div>

          <button type="button" className={styles.del} onClick={triggerDelete} aria-label="Delete">
            ✕
          </button>
        </div>

        {confirmClose && (
          <div className={styles.confirmBanner}>
            <span className={styles.confirmText}>Закриваємо квест?</span>
            <div className={styles.confirmBtns}>
              <button type="button" className={styles.confirmNo} onClick={() => setConfirmClose(false)}>Ні</button>
              <button type="button" className={styles.confirmYes} onClick={handleConfirmClose}>Так</button>
            </div>
          </div>
        )}

        {confirmReturn && (
          <div className={styles.confirmBanner}>
            <span className={styles.confirmText}>Повернути завершений квест?</span>
            <div className={styles.confirmBtns}>
              <button type="button" className={styles.confirmNo} onClick={() => setConfirmReturn(false)}>Ні</button>
              <button type="button" className={styles.confirmYes} onClick={handleConfirmReturn}>Так</button>
            </div>
          </div>
        )}

        {showBar && (
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${checkPct}%` }} />
          </div>
        )}
      </div>
    </li>
  )
}

export default TaskCard
