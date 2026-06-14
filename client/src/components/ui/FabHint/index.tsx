import React, { useEffect, useState } from 'react'
import styles from './FabHint.module.css'

const STORAGE_KEY = 'hud-fab-hint-dismissed'

/**
 * FabHint
 * -------
 * One-time curved-arrow hint pointing at the FAB button.
 * Dismissed on tap; state persisted in localStorage.
 *
 * Props:
 * @prop {string}  storageKey — unique key per screen so each screen has its own hint
 * @prop {string}  text       — hint label text
 */
interface FabHintProps {
  storageKey: string
  text?: string
}

const FabHint: React.FC<FabHintProps> = ({ storageKey, text = 'Натисни щоб додати' }) => {
  const key = `${STORAGE_KEY}-${storageKey}`
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    const dismissed = localStorage.getItem(key)
    if (!dismissed) {
      const t = setTimeout(() => { if (!cancelled) setVisible(true) }, 600)
      return () => { cancelled = true; clearTimeout(t) }
    }
    return () => { cancelled = true }
  }, [key])

  const dismiss = () => {
    localStorage.setItem(key, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.hint} onClick={dismiss} role="button" aria-label="Закрити підказку">
      <span className={styles.text}>{text}</span>
      {/* Curved arrow pointing down-right toward FAB */}
      <svg
        className={styles.arrow}
        width="52"
        height="52"
        viewBox="0 0 52 52"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 6 C10 18 20 28 34 36 C40 40 44 42 44 44"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Arrowhead */}
        <path
          d="M36 46 L44 44 L42 36"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default FabHint
