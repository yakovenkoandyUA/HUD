import React, { useEffect, useRef, useState } from 'react'
import styles from './Modal.module.css'

/**
 * Modal
 * -----
 * Оверлей-модалка. Закривається по кліку на тло або Escape.
 * На мобільних: при фокусі на input/textarea — автоскрол щоб не перекривалось клавіатурою.
 *
 * Props:
 * @prop {boolean}         isOpen
 * @prop {() => void}      onClose
 * @prop {string}          [title]
 * @prop {React.ReactNode} children
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

const ANIM_MS = 420

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [mounted, setMounted] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
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

  if (!mounted) return null

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${visible ? styles.modalVisible : styles.modalHidden}`}
        onClick={(e) => e.stopPropagation()}
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
