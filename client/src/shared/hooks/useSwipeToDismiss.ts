import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import hintStyles from './useSwipeToDismiss.module.css'

/**
 * useSwipeToDismiss
 * -----------------
 * Imperative swipe-to-dismiss для bottom-sheet модалок.
 * Повертає ref для зовнішнього sheet-елемента (transform target).
 *
 * @param onClose   — callback закриття (викликається після анімації ~280мс)
 * @param options
 *   enabled    — вмикає/вимикає listener (default: true)
 *   bodyRef    — scrollable inner element (якщо відокремлений від sheetRef)
 *   overlayRef — backdrop для анімації opacity при свайпі
 *   sheetRef   — зовнішній ref на sheet-контейнер (якщо не передано — хук створює сам)
 */
export function useSwipeToDismiss(
  onClose: () => void,
  options?: {
    enabled?: boolean
    bodyRef?: RefObject<HTMLElement | null>
    overlayRef?: RefObject<HTMLElement | null>
    sheetRef?: RefObject<HTMLElement | null>
  },
): RefObject<HTMLDivElement | null> {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef  = useRef(onClose)
  const hintElRef   = useRef<HTMLDivElement | null>(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const { enabled = true, bodyRef, overlayRef, sheetRef: externalRef } = options ?? {}

  // One-time global hint: "свайпни вниз щоб закрити" — зникає на першому
  // реальному свайп-закритті будь-якого sheet і більше не показується ніде.
  useEffect(() => {
    if (!enabled) return
    if (useProfileStore.getState().activeProfile?.swipeDismissTutorialSeen) return

    const hint = document.createElement('div')
    hint.className = hintStyles.hint
    hint.textContent = '↓ Свайпни вниз щоб закрити'
    document.body.appendChild(hint)
    const t = requestAnimationFrame(() => hint.classList.add(hintStyles.hintVisible))
    hintElRef.current = hint

    return () => {
      cancelAnimationFrame(t)
      hint.remove()
      if (hintElRef.current === hint) hintElRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let rafId: number
    let detach: (() => void) | undefined

    const attach = () => {
      const sheet = (externalRef?.current ?? internalRef.current) as HTMLElement | null
      // Sheet may still be null if caller gates JSX behind a `mounted` flag;
      // retry after next paint when React has processed the setMounted(true) re-render.
      if (!sheet) return

      let startY     = 0
      let startTime  = 0
      let currentY   = 0
      let isDragging = false

      const scrollEl = () => bodyRef?.current ?? sheet

      const onTouchStart = (e: TouchEvent) => {
        if (scrollEl().scrollTop > 0) return
        startY     = e.touches[0].clientY
        startTime  = Date.now()
        currentY   = startY
        isDragging = true
        sheet.style.transition = 'none'
        if (overlayRef?.current) overlayRef.current.style.transition = 'none'
      }

      const onTouchMove = (e: TouchEvent) => {
        if (!isDragging) return
        if (scrollEl().scrollTop > 0) {
          isDragging = false
          sheet.style.transform = ''
          return
        }
        currentY = e.touches[0].clientY
        const delta = Math.max(0, currentY - startY)
        sheet.style.transform = `translateY(${Math.min(delta * 0.4, 120)}px)`
        if (overlayRef?.current) {
          overlayRef.current.style.opacity = String(Math.max(0, 1 - delta / 400))
        }
        if (delta > 10) e.preventDefault()
      }

      const onTouchEnd = () => {
        if (!isDragging) return
        isDragging = false
        const delta    = currentY - startY
        const velocity = delta / Math.max(1, Date.now() - startTime)

        if (delta >= 80 || (delta > 60 && velocity > 0.5)) {
          sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
          sheet.style.transform  = 'translateY(100%)'
          if (overlayRef?.current) {
            overlayRef.current.style.transition = 'opacity 0.3s ease'
            overlayRef.current.style.opacity    = '0'
          }
          if (hintElRef.current) { hintElRef.current.remove(); hintElRef.current = null }
          if (!useProfileStore.getState().activeProfile?.swipeDismissTutorialSeen) {
            useProfileStore.getState().updateProfile({ swipeDismissTutorialSeen: true })
          }
          setTimeout(() => onCloseRef.current(), 280)
        } else {
          sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
          sheet.style.transform  = ''
          if (overlayRef?.current) {
            overlayRef.current.style.transition = 'opacity 0.3s ease'
            overlayRef.current.style.opacity    = ''
          }
        }
      }

      sheet.addEventListener('touchstart', onTouchStart, { passive: true  })
      sheet.addEventListener('touchmove',  onTouchMove,  { passive: false })
      sheet.addEventListener('touchend',   onTouchEnd,   { passive: true  })

      detach = () => {
        sheet.removeEventListener('touchstart', onTouchStart)
        sheet.removeEventListener('touchmove',  onTouchMove)
        sheet.removeEventListener('touchend',   onTouchEnd)
      }
    }

    let retries = 0
    const tryAttach = () => {
      attach()
      if (!detach && retries++ < 12) {
        rafId = requestAnimationFrame(tryAttach)
      }
    }
    tryAttach()

    return () => {
      cancelAnimationFrame(rafId)
      detach?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return internalRef
}
