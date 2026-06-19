import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '../../../hooks/useModalHistory'
import styles from './Modal.module.css'

/**
 * Modal
 * -----
 * Оверлей-модалка. Закривається по кліку на тло або Escape.
 * На мобільних: при фокусі на input/textarea — автоскрол щоб не перекривалось клавіатурою.
 * Якщо draggable={true}: показує drag-bar зверху, свайп вниз по ньому закриває.
 * Touch-listeners на drag handle реєструються як passive:false щоб не скролився фон.
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

const ANIM_MS = 460

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, draggable = false }) => {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const modalRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const handleRef  = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useModalHistory(onClose, isOpen)

  const drag        = useRef({ startY: 0, startTime: 0, active: false })
  const dragClosing = useRef(false)

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      if (!dragClosing.current) {
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
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
    el.addEventListener('focusin', onFocusIn)
    return () => el.removeEventListener('focusin', onFocusIn)
  }, [mounted])

  // Drag-to-dismiss — attached to the whole modal panel (not just the handle bar)
  // Guard: if modal is scrolled down, cancel the drag so inner scroll works normally
  useEffect(() => {
    if (!draggable || !mounted) return
    const modal = modalRef.current
    if (!modal) return

    const onStart = (e: TouchEvent) => {
      if (modal.scrollTop > 0) return
      drag.current = { startY: e.touches[0].clientY, startTime: Date.now(), active: true }
    }

    const onMove = (e: TouchEvent) => {
      if (!drag.current.active) return
      if (modal.scrollTop > 0) {
        drag.current.active = false
        modal.style.transform  = ''
        modal.style.transition = ''
        return
      }
      const deltaY = e.touches[0].clientY - drag.current.startY
      const delta  = Math.max(0, deltaY)
      if (delta > 0) e.preventDefault()
      modal.style.transform  = `translateY(${delta}px)`
      modal.style.transition = 'none'
      if (overlayRef.current) {
        overlayRef.current.style.opacity    = String(Math.max(0, 1 - delta / 400))
        overlayRef.current.style.transition = 'none'
      }
    }

    const onEnd = (e: TouchEvent) => {
      if (!drag.current.active) return
      drag.current.active = false
      const deltaY   = e.changedTouches[0].clientY - drag.current.startY
      const velocity = deltaY / Math.max(1, Date.now() - drag.current.startTime)

      if (deltaY >= 80 || (deltaY > 60 && velocity > 0.5)) {
        dragClosing.current = true
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        modal.style.transform  = 'translateY(100%)'
        if (overlayRef.current) {
          overlayRef.current.style.transition = 'opacity 0.3s ease'
          overlayRef.current.style.opacity    = '0'
        }
        setTimeout(() => onCloseRef.current(), 300)
      } else {
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        modal.style.transform  = 'translateY(0)'
        if (overlayRef.current) {
          overlayRef.current.style.transition = 'opacity 0.3s ease'
          overlayRef.current.style.opacity    = '1'
        }
      }
    }

    modal.addEventListener('touchstart', onStart, { passive: true })
    modal.addEventListener('touchmove',  onMove,  { passive: false })
    modal.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      modal.removeEventListener('touchstart', onStart)
      modal.removeEventListener('touchmove',  onMove)
      modal.removeEventListener('touchend',   onEnd)
    }
  }, [draggable, mounted])

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
        onClick={e => e.stopPropagation()}
      >
        {draggable && (
          <div ref={handleRef} className={styles.dragHandle}>
            <span className={styles.dragBar} />
          </div>
        )}
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
