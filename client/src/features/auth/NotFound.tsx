import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './NotFound.module.css'

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'

function randomRune() {
  return RUNES[Math.floor(Math.random() * RUNES.length)]
}

/**
 * 404 — Nine Realms screen.
 * Shown when the user navigates to an unknown route.
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate()
  const runeGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const grid = runeGridRef.current
    if (!grid) return

    const cells = Array.from(grid.querySelectorAll<HTMLSpanElement>('span'))
    let cancelled = false

    const flicker = async () => {
      while (!cancelled) {
        const idx = Math.floor(Math.random() * cells.length)
        const cell = cells[idx]
        const prev = cell.textContent
        cell.textContent = randomRune()
        cell.classList.add(styles.runeFlash)
        await new Promise(r => setTimeout(r, 120))
        if (cancelled) break
        cell.classList.remove(styles.runeFlash)
        cell.textContent = prev
        await new Promise(r => setTimeout(r, 60 + Math.random() * 200))
      }
    }

    flicker()
    return () => { cancelled = true }
  }, [])

  const runeCount = 7 * 5
  const staticRunes = Array.from({ length: runeCount }, () => randomRune())

  return (
    <div className={styles.root}>
      <div className={styles.scanlines} aria-hidden />

      <div className={styles.runeGrid} ref={runeGridRef} aria-hidden>
        {staticRunes.map((r, i) => <span key={i}>{r}</span>)}
      </div>

      <div className={styles.content}>
        <div className={styles.heroWrap}>
          <span className={styles.glitchText} data-text="404">404</span>
        </div>

        <div className={styles.divider}>
          <span>ᛟ</span><span>ᚷ</span><span>ᛞ</span><span>ᚱ</span><span>ᛟ</span>
        </div>

        <p className={styles.realm}>NINE REALMS</p>

        <p className={styles.message}>
          Ця сторінка не існує в жодному з дев'яти світів.
        </p>

        <p className={styles.sub}>
          Навіть Одін не зміг би її знайти.
        </p>

        <button className={styles.btn} onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12h18M3 12l7-7M3 12l7 7" />
          </svg>
          ПОВЕРНУТИСЬ ДО КРИНИЦІ
        </button>
      </div>

      <div className={styles.bottomRunes} aria-hidden>
        ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ
      </div>
    </div>
  )
}

export default NotFound
