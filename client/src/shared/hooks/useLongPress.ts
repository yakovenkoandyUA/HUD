import { useCallback, useRef } from 'react'

export function useLongPress(callback: () => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    timer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50)
      callback()
    }, ms)
  }, [callback, ms])

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); start() },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
  }
}
