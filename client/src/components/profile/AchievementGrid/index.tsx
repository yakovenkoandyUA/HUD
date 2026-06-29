import React, { useState } from 'react'
import { ACHIEVEMENTS } from '../../../data/achievements'
import styles from './AchievementGrid.module.css'

const MONTHS_UA_SHORT = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_UA_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

interface UnlockedEntry {
  id: string
  unlockedAt: string
}

// ── Small badge icons (16×16, same weight as MeTab's menu icons) ──────────

const CoinIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4.8v6.4M6 6.2c0-.8.9-1.4 2-1.4s2 .5 2 1.2c0 1.8-4 .9-4 2.7 0 .7.9 1.3 2 1.3s2-.6 2-1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CupIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 5.5h8v3.5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M11.5 6.3h1a1.7 1.7 0 0 1 0 3.4h-1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5.5 2.8c.3.5.3.9 0 1.4M8 2.8c.3.5.3.9 0 1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const PlayIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6.5 5.5l4 2.5-4 2.5v-5Z" fill="currentColor"/>
  </svg>
)

const CameraIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1.8 5.8C1.8 5 2.5 4.3 3.3 4.3h1.4l.7-1.2h5.2l.7 1.2h1.4c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H3.3c-.8 0-1.5-.7-1.5-1.5v-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="8.8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const PaletteIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13c.9 0 1.4-.6 1.4-1.3 0-.35-.14-.66-.36-.9-.2-.23-.32-.5-.32-.8 0-.66.55-1.2 1.25-1.2H11.5A3 3 0 0 0 14.5 7c0-3-3-5.5-6.5-5.5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5" cy="6.5" r="0.9" fill="currentColor"/>
    <circle cx="8" cy="4.5" r="0.9" fill="currentColor"/>
    <circle cx="11" cy="6.5" r="0.9" fill="currentColor"/>
  </svg>
)

const FlagIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 1.5v13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3.5 2.3h9v6h-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M3.5 2.3h3v2h-3zM9.5 2.3h3v2h-3zM6.5 4.3h3v2h-3zM3.5 6.3h3v2h-3zM9.5 6.3h3v2h-3z" fill="currentColor" opacity="0.55"/>
  </svg>
)

const UsersIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 14c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="11.5" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M10.3 10.7c.4-.1.8-.2 1.2-.2 1.8 0 3.3 1.1 3.3 2.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const BADGE_ICONS: Record<string, React.FC> = {
  'first-transaction':   CoinIcon,
  'first-quest':         CheckIcon,
  'first-recipe-cooked': CupIcon,
  'first-watchlist':     PlayIcon,
  'first-memory':        CameraIcon,
  'theme-changed':       PaletteIcon,
  'first-prediction':    FlagIcon,
  'family-linked':       UsersIcon,
}

/**
 * AchievementGrid
 * ----------------
 * Грід бейджів досягнень БЕЗ примусового порядку — кожна ачівка це окрема
 * картка (іконка + назва), прив'язана до свого модуля застосунку (фінанси/
 * спринт/рецепти/...). Юзер сам обирає що тапнути й дослідити, нічого не
 * заблоковано "до попереднього кроку". Тап розгортає картку — показує
 * опис/підказку прямо під назвою (max-height акордеон, не floating popover).
 *
 * Props:
 * @prop {UnlockedEntry[]} unlocked — розблоковані ачівки юзера
 */
interface AchievementGridProps {
  unlocked: UnlockedEntry[]
}

const AchievementGrid: React.FC<AchievementGridProps> = ({ unlocked }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  const unlockedMap = new Map(unlocked.map(u => [u.id, u.unlockedAt]))

  return (
    <div className={styles.grid}>
      {ACHIEVEMENTS.map((a, i) => {
        const Icon = BADGE_ICONS[a.id]
        const isUnlocked = unlockedMap.has(a.id)
        const isOpen = openId === a.id
        return (
          <button
            key={a.id}
            type="button"
            className={`${styles.card} ${isUnlocked ? styles.cardUnlocked : styles.cardLocked} ${isOpen ? styles.cardOpen : ''}`}
            style={{
              animationDelay: `${i * 45}ms`,
              ...(isUnlocked ? { '--node-color': a.color } : {}),
            } as React.CSSProperties}
            onClick={() => setOpenId(prev => prev === a.id ? null : a.id)}
            aria-expanded={isOpen}
          >
            <div className={styles.cardTop}>
              <span className={styles.icon}>{Icon && <Icon />}</span>
              <span className={styles.title}>{a.title}</span>
            </div>
            <div className={`${styles.body} ${isOpen ? styles.bodyOpen : ''}`}>
              <p className={styles.desc}>
                {isUnlocked ? a.description : a.hint}
              </p>
              {isUnlocked && (
                <p className={styles.date}>Отримано {formatDate(unlockedMap.get(a.id)!)}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default AchievementGrid
