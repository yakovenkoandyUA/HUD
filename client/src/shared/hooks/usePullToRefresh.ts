import { useRef, useEffect } from 'react'

interface Options {
  onRefresh: () => void
  threshold?: number
  enabled?: boolean
}

/**
 * usePullToRefresh
 * ----------------
 * Свайп вниз (pull) з нульового скролу → викликає onRefresh.
 * Прикріплюється до scrollable контейнера (scrollRef).
 *
 * @param scrollRef — ref на скролабельний div
 * @param options.onRefresh  — callback при trigger
 * @param options.threshold  — мінімальна дистанція свайпу (px), default 72
 * @param options.enabled    — вмикач, default true
 */
export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  { onRefresh, threshold = 72, enabled = true }: Options,
) {
  const startY    = useRef<number | null>(null)
  const pulling   = useRef(false)
  const refreshed = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return
      startY.current  = e.touches[0].clientY
      pulling.current = true
      refreshed.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && el.scrollTop === 0) {
        el.style.transition = 'none'
        el.style.transform  = `translateY(${Math.min(delta * 0.4, 48)}px)`
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return
      const delta = e.changedTouches[0].clientY - startY.current
      el.style.transition = 'transform 0.25s ease'
      el.style.transform  = ''
      if (delta >= threshold && !refreshed.current) {
        refreshed.current = true
        onRefresh()
      }
      pulling.current = false
      startY.current  = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: true })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
      el.style.transform  = ''
      el.style.transition = ''
    }
  }, [enabled, threshold, onRefresh])
}
