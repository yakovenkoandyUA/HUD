import { useEffect, useRef } from 'react'

// Module-level guard: when we call history.back() ourselves in cleanup, briefly suppress
// all popstate handlers so they don't cascade-close other modals that just opened.
// React StrictMode double-invokes effects; without this guard the deferred popstate
// from the cleanup's history.back() fires onto the remounted effect's handler.
let isBackingUp = false

/**
 * useModalHistory
 * ---------------
 * При монтуванні пушить фейковий запис у history.
 * Системний swipe "назад" або кнопка "←" перехоплюється через popstate
 * і викликає onClose замість реального переходу на попередню сторінку.
 *
 * Використовувати у будь-якій модалці/bottom-sheet що не має власного URL.
 *
 * @param onClose — колбек закриття модалки
 * @param isOpen  — монтувати лише коли модалка відкрита
 */
export function useModalHistory(onClose: () => void, isOpen: boolean): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ modal: true }, '')

    const handler = () => {
      if (isBackingUp) return
      onCloseRef.current()
    }

    window.addEventListener('popstate', handler)

    return () => {
      window.removeEventListener('popstate', handler)
      if (window.history.state?.modal) {
        isBackingUp = true
        window.history.back()
        setTimeout(() => { isBackingUp = false }, 50)
      }
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps
}
