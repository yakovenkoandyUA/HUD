import React, { useEffect, useRef, useState } from 'react'
import styles from './Modal.module.css'

/**
 * Modal
 * -----
 * Оверлей-модалка. Закривається по кліку на тло або Escape.
 * На мобільних: при фокусі на input/textarea — автоскрол щоб не перекривалось клавіатурою.
 * Якщо draggable={true}: свайп вниз закриває (тільки коли контент прокручено у верх).
 *
 * Props:
 * @prop {boolean}         isOpen
 * @prop {() => void}      onClose
 * @prop {string}          [title]
 * @prop {React.ReactNode} children
 * @prop {boolean}         [draggable=false] — вмикає drag-to-dismiss свайп
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  draggable?: boolean
}

const ANIM_MS = 420

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, draggable = false }) => {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const modalRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Drag state — all in refs, no re-renders during touch movement
  const drag        = useRef({ startY: 0, startTime: 0, active: false })
  const dragClosing = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      if (!dragClosing.current) {
        // Normal close — clear any leftover inline styles so CSS exit animation works
        if (modalRef.current)   { modalRef.current.style.transform = '';   modalRef.current.style.transition = '' }
        if (overlayRef.current) { overlayRef.current.style.opacity = '';   overlayRef.current.style.transition = '' }
      }
      dragClosing.current = false
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Scroll focused input into view when keyboard opens on mobile
  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
    el.addEventListener('focusin', handleFocusIn)
    return () => el.removeEventListener('focusin', handleFocusIn)
  }, [mounted])

  const onTouchStart = (e: React.TouchEvent) => {
    if (!draggable) return
    // Don't activate drag if the modal content is scrolled down
    if (modalRef.current && modalRef.current.scrollTop > 0) return
    drag.current = { startY: e.touches[0].clientY, startTime: Date.now(), active: true }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return
    const deltaY = e.touches[0].clientY - drag.current.startY
    if (deltaY <= 0) return // only allow dragging downward
    if (modalRef.current) {
      modalRef.current.style.transform  = `translateY(${deltaY}px)`
      modalRef.current.style.transition = 'none'
    }
    if (overlayRef.current) {
      overlayRef.current.style.opacity    = String(Math.max(0, 1 - deltaY / 400))
      overlayRef.current.style.transition = 'none'
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!drag.current.active) return
    drag.current.active = false
    const deltaY   = e.changedTouches[0].clientY - drag.current.startY
    const velocity = deltaY / Math.max(1, Date.now() - drag.current.startTime)

    if (deltaY >= 120 || (deltaY > 60 && velocity > 0.5)) {
      // Threshold met — animate off screen then close
      dragClosing.current = true
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        modalRef.current.style.transform  = 'translateY(100%)'
      }
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity 0.3s ease'
        overlayRef.current.style.opacity    = '0'
      }
      setTimeout(() => onClose(), 300)
    } else {
      // Below threshold — snap back
      if (modalRef.current) {
        modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        modalRef.current.style.transform  = 'translateY(0)'
      }
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity 0.3s ease'
        overlayRef.current.style.opacity    = '1'
      }
    }
  }

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${visible ? styles.modalVisible : styles.modalHidden}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {title && (
          <div className={styles.header}>
            <h3 className={styles.title}>{title}</h3>
            <button className={styles.close} onClick={onClose}>✕</button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}

export default Modal
