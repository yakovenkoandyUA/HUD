import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useProfileStore } from '@/shared/store/profileStore'
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
 * @prop {React.ReactNode} [titleInfo] — опційний елемент поруч із заголовком (напр. InfoToggle)
 * @prop {React.ReactNode} children
 * @prop {boolean}         [draggable=false] — вмикає drag-to-dismiss свайп
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  titleInfo?: React.ReactNode
  children: React.ReactNode
  draggable?: boolean
}

const ANIM_MS = 360
const SWIPE_DISMISS_HINT_LIMIT = 2

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, titleInfo, children, draggable = false }) => {
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
  const [showHint, setShowHint] = useState(false)

  // Body scroll lock — tied to mounted, not isOpen, so it stays locked during close animation
  useEffect(() => {
    if (!mounted) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mounted])

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      if (!dragClosing.current) {
        if (modalRef.current) {
          modalRef.current.style.transform  = ''
          modalRef.current.style.transition = 'transform 0.32s cubic-bezier(0.4, 0, 1, 1), opacity 0.28s ease-in'
        }
        if (overlayRef.current) {
          overlayRef.current.style.opacity    = ''
          overlayRef.current.style.transition = 'opacity 0.32s ease-in'
        }
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

  // Hint "свайпни вниз щоб закрити" — тільки для модалок середньої висоти (≤55% viewport).
  // Рендериться inline (вгорі), виміри беруться після rAF щоб layout вже був завершений.
  useEffect(() => {
    if (!draggable || !mounted) return
    const profile = useProfileStore.getState().activeProfile
    if (profile?.swipeDismissTutorialSeen) return
    const shownCount = profile?.swipeDismissShownCount ?? 0
    if (shownCount >= SWIPE_DISMISS_HINT_LIMIT) return

    let cancelled = false
    const t = requestAnimationFrame(() => {
      if (cancelled) return
      const modalHeight = modalRef.current?.getBoundingClientRect().height ?? 0
      if (modalHeight > window.innerHeight * 0.55) return
      setShowHint(true)
      const nextCount = shownCount + 1
      useProfileStore.getState().updateProfile({
        swipeDismissShownCount: nextCount,
        ...(nextCount >= SWIPE_DISMISS_HINT_LIMIT ? { swipeDismissTutorialSeen: true } : {}),
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(t)
      setShowHint(false)
    }
  }, [draggable, mounted])

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
      const deltaY  = e.touches[0].clientY - drag.current.startY
      const delta   = Math.max(0, deltaY)
      const damped  = Math.min(delta * 0.4, 120)
      if (delta > 10) e.preventDefault()
      modal.style.transform  = `translateY(${damped}px)`
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
        setShowHint(false)
        if (!useProfileStore.getState().activeProfile?.swipeDismissTutorialSeen) {
          useProfileStore.getState().updateProfile({ swipeDismissTutorialSeen: true })
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

  // Будь-яке усвідомлене закриття draggable-модалки (×, тап по фону, не лише свайп)
  // теж рахується як "побачив підказку" — інакше юзер, що завжди тапає ×, бачить її вічно.
  const handleClose = () => {
    if (draggable && !useProfileStore.getState().activeProfile?.swipeDismissTutorialSeen) {
      useProfileStore.getState().updateProfile({ swipeDismissTutorialSeen: true })
    }
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={handleClose}
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
        {showHint && (
          <div className={`${styles.swipeHint} ${showHint ? styles.swipeHintVisible : ''}`}>
            ↓ Свайпни вниз щоб закрити
          </div>
        )}
        {title && (
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>{title}</h3>
              {titleInfo}
            </div>
            <button className={styles.close} onClick={handleClose}>✕</button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}

export default Modal
