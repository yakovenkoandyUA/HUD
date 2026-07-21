import React from 'react'
import type { SpaceTask } from '@/features/spaces/types'
import styles from './SpaceTaskItem.module.css'

/**
 * SpaceTaskItem
 * -------------
 * Рядок задачі простору зі swipe-to-delete (ліво) та кнопкою ×.
 *
 * Props:
 * @prop {SpaceTask}              task       — задача простору
 * @prop {string}                 [spaceColor] — колір простору для чекбокса
 * @prop {(task: SpaceTask) => void} onToggle — toggle done/undone
 * @prop {(id: string) => void}   onDelete   — видалення задачі
 */
interface SpaceTaskItemProps {
  task: SpaceTask
  spaceColor?: string
  onToggle: (task: SpaceTask) => void
  onDelete: (id: string) => void
}

const SWIPE_THRESHOLD = 80

const SpaceTaskItem: React.FC<SpaceTaskItemProps> = ({ task, spaceColor, onToggle, onDelete }) => {
  const itemRef     = React.useRef<HTMLDivElement>(null)
  const slideRef    = React.useRef<HTMLDivElement>(null)
  const revealRef   = React.useRef<HTMLDivElement>(null)
  const startXRef   = React.useRef(0)
  const offsetRef   = React.useRef(0)
  const swipingRef  = React.useRef(false)
  const deletingRef = React.useRef(false)

  const onDeleteRef = React.useRef(onDelete)
  React.useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])

  const applyOffset = React.useCallback((offset: number, animate = false) => {
    if (slideRef.current) {
      slideRef.current.style.transition = animate ? 'transform 0.18s ease' : 'none'
      slideRef.current.style.transform  = offset !== 0 ? `translateX(${offset}px)` : ''
    }
    if (revealRef.current) {
      revealRef.current.style.opacity = String(Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD))
    }
  }, [])

  const collapseAndDelete = React.useCallback(() => {
    const el = itemRef.current
    if (el) {
      const h = el.offsetHeight
      el.style.maxHeight = `${h}px`
      el.style.overflow  = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'max-height 0.22s ease, opacity 0.18s ease'
        el.style.maxHeight  = '0'
        el.style.opacity    = '0'
      }))
    }
    setTimeout(() => onDeleteRef.current(task._id), 240)
  }, [task._id])

  const triggerDelete = React.useCallback(() => {
    if (deletingRef.current) return
    deletingRef.current = true
    applyOffset(-SWIPE_THRESHOLD, true)
    setTimeout(collapseAndDelete, 180)
  }, [applyOffset, collapseAndDelete])

  const triggerDeleteRef = React.useRef(triggerDelete)
  React.useEffect(() => { triggerDeleteRef.current = triggerDelete }, [triggerDelete])

  React.useEffect(() => {
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
      triggerDeleteRef.current()
    } else {
      applyOffset(0, true)
      offsetRef.current = 0
    }
  }

  return (
    <div
      ref={itemRef}
      className={`${styles.spaceTask} ${task.done ? styles.spaceTaskDone : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={revealRef} className={styles.taskSwipeReveal} aria-hidden="true">
        <svg width="16" height="18" viewBox="0 0 18 20" fill="none">
          <path d="M1 4h16M6 4V2h6v2M3 4l1 14a1 1 0 001 1h8a1 1 0 001-1L15 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 8v6M11 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
      <div ref={slideRef} className={styles.taskSlideContent}>
        <button
          type="button"
          className={styles.taskCheckbox}
          onClick={() => onToggle(task)}
          aria-label={task.done ? 'Позначити незроблено' : 'Позначити зроблено'}
        >
          <div
            className={styles.taskCheckBox}
            style={task.done ? { '--space-color': spaceColor ?? 'var(--accent)' } as React.CSSProperties : undefined}
          >
            {task.done && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1.5 5l2.5 2.5 4.5-4"/>
              </svg>
            )}
          </div>
        </button>
        <span className={styles.taskTitle}>{task.title}</span>
        <button
          type="button"
          className={styles.taskDeleteBtn}
          onClick={() => onDeleteRef.current(task._id)}
          aria-label="Видалити задачу"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SpaceTaskItem
