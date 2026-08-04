import React, { useState } from 'react'
import styles from './InfoToggle.module.css'

/**
 * InfoToggle
 * ----------
 * Кругла кнопка (i), що відкриває плаваючу підказку у стилі Міміра
 * (аватар + бульбашка) — не займає місця в лейауті, з'являється поверх
 * контенту і закривається тапом убік. Для непередбачуваного або нового
 * для юзера функціоналу (частковий пошук, незвичний флоу тощо).
 *
 * @prop {string} text        - текст пояснення
 * @prop {string} [ariaLabel] - aria-label кнопки (default: "Пояснення")
 * @prop {'left'|'right'} [align] - з якого краю кнопки розкривати попап (default: "left" — вправо)
 */
interface InfoToggleProps {
  text: string
  ariaLabel?: string
  align?: 'left' | 'right'
}

const InfoToggle: React.FC<InfoToggleProps> = ({ text, ariaLabel = 'Пояснення', align = 'left' }) => {
  const [open, setOpen] = useState(false)

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles.btnActive : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7v4" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`${styles.popover} ${align === 'right' ? styles.popoverRight : ''}`}>
            <img src="/mimir/mimir-pointing.webp" alt="" className={styles.avatar} draggable={false} />
            <div className={styles.bubble}>
              <p className={styles.bubbleText}>{text}</p>
            </div>
          </div>
        </>
      )}
    </span>
  )
}

export default InfoToggle
