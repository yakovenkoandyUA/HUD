import React, { useEffect, useState } from 'react'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { ACHIEVEMENT_BY_ID } from '@/features/achievements/data'
import styles from './AchievementUnlockedModal.module.css'

const AUTO_DISMISS_MS = 6000

const RUNE_SRC: Record<string, string> = {
  memory:    '/achive/mimir-runes-transparent/rune-memory.png',
  spaces:    '/achive/mimir-runes-transparent/rune-spaces.png',
  finance:   '/achive/mimir-runes-transparent/rune-finance.png',
  sprint:    '/achive/mimir-runes-transparent/rune-sprint.png',
  watchlist: '/achive/mimir-runes-transparent/rune-watchlist.png',
}

/**
 * AchievementUnlockedModal
 * ------------------------
 * Святковий центрований оверлей при розблокуванні досягнення.
 * Показує руну категорії, назву, flavor text, кількість зароблених рун і
 * порядковий номер ачівки в криниці. Level up вбудований в ту ж картку.
 * Авто-закриття через 6с або тап на overlay/кнопку.
 * Монтується один раз глобально в App.tsx.
 */
const AchievementUnlockedModal: React.FC = () => {
  const pending        = useAchievementsStore(s => s.pending)
  const pendingLevel   = useAchievementsStore(s => s.pendingLevel)
  const dismiss        = useAchievementsStore(s => s.dismiss)
  const dismissLevel   = useAchievementsStore(s => s.dismissLevel)
  const unlockedCount  = useProfileStore(s => s.activeProfile?.unlockedAchievements?.length ?? 0)

  const [visible, setVisible] = useState(false)

  const isOpen = !!pending

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(handleClose, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    dismiss()
    if (pendingLevel) dismissLevel()
  }

  if (!pending) return null

  const meta     = ACHIEVEMENT_BY_ID[pending.id]
  const category = meta?.category ?? 'memory'
  const runeSrc  = RUNE_SRC[category]
  const reward      = meta?.reward ?? 0
  const totalAch    = Object.keys(ACHIEVEMENT_BY_ID).length

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.card} ${visible ? styles.cardVisible : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sparkles */}
        <div className={styles.sparkles} aria-hidden="true">
          <svg className={`${styles.sparkle} ${styles.sparkle1}`} width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <svg className={`${styles.sparkle} ${styles.sparkle2}`} width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <svg className={`${styles.sparkle} ${styles.sparkle3}`} width="8" height="8" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <svg className={`${styles.sparkle} ${styles.sparkle4}`} width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Rune image */}
        <div className={styles.runeWrap} style={{ '--ach-color': pending.color } as React.CSSProperties}>
          <div className={styles.runeGlow} />
          {runeSrc
            ? <img src={runeSrc} alt="" className={styles.runeImg} draggable={false} />
            : <div className={styles.runeFallback} style={{ color: pending.color }}>✦</div>
          }
        </div>

        {/* Header */}
        <p className={styles.kicker}>ДОСЯГНЕННЯ РОЗБЛОКОВАНО</p>
        <p className={styles.title} style={{ color: pending.color }}>{pending.title}</p>

        {/* Flavor quote */}
        {(meta?.flavor ?? pending.description) && (
          <p className={styles.flavor}>«{meta?.flavor ?? pending.description}»</p>
        )}

        {/* Stats row */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue} style={{ color: pending.color }}>+{reward}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ color: pending.color }}>
              <path d="M5 0.5L9.5 5L5 9.5L0.5 5Z" fill="currentColor"/>
            </svg>
            <span className={styles.statLabel}>РУН</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{unlockedCount}<span className={styles.statTotal}> / {totalAch}</span></span>
            <span className={styles.statLabel}>ВІДКРИТО</span>
          </div>
        </div>

        {/* Level up */}
        {pendingLevel && (
          <div className={styles.levelUp} style={{ '--level-color': pendingLevel.color } as React.CSSProperties}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" fill="currentColor"/>
            </svg>
            <span>Новий рівень — <strong>{pendingLevel.label}</strong></span>
          </div>
        )}

        <button type="button" className={styles.closeBtn} onClick={handleClose}>
          Закрити
        </button>
      </div>
    </div>
  )
}

export default AchievementUnlockedModal
