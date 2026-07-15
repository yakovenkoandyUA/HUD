import React, { useEffect, useRef } from 'react'

interface UseSwipeTabsOptions {
  /** Total number of tabs */
  count: number
  /** Currently active tab index */
  activeIndex: number
  /** Called with the new index on a valid swipe */
  onChange: (index: number) => void
  /** Disable the gesture entirely (e.g. when active tab has its own pan gesture) */
  enabled?: boolean
}

/**
 * useSwipeTabs
 * ------------
 * Returns a ref to attach to a page container. Detects horizontal swipe
 * gestures in the vertical center zone (15–85 % of screen height) and calls
 * onChange with prev/next index.
 *
 * Distinguishes horizontal from vertical: only fires when |dx| >= 60 px and
 * |dx| > |dy| * 1.5, so normal scrolling never triggers a tab switch.
 */
export function useSwipeTabs({
  count,
  activeIndex,
  onChange,
  enabled = true,
}: UseSwipeTabsOptions): React.RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null)

  // Keep mutable copies so the effect closure stays stable (no re-attach on every render)
  const activeRef   = useRef(activeIndex)
  const onChangeRef = useRef(onChange)
  const countRef    = useRef(count)
  activeRef.current   = activeIndex
  onChangeRef.current = onChange
  countRef.current    = count

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      const relY = t.clientY / window.innerHeight
      // Ignore touches near the top (AppHeader) and bottom (BottomNav)
      if (relY < 0.15 || relY > 0.85) { tracking = false; return }
      // Don't track if the touch originates inside a horizontally scrollable element
      let node: Element | null = e.target as Element
      while (node && node !== el) {
        const ox = window.getComputedStyle(node).overflowX
        if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth) {
          tracking = false
          return
        }
        node = node.parentElement
      }
      startX   = t.clientX
      startY   = t.clientY
      tracking = true
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const t  = e.changedTouches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (Math.abs(dx) < 60) return                       // too short
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return      // too vertical
      const cur = activeRef.current
      if (dx < 0 && cur < countRef.current - 1) onChangeRef.current(cur + 1)
      if (dx > 0 && cur > 0)                   onChangeRef.current(cur - 1)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [enabled])

  return ref as React.RefObject<HTMLDivElement>
}
