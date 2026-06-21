import React, { useState } from 'react'
import { ACHIEVEMENTS } from '../../../data/achievements'
import styles from './AchievementPath.module.css'

const ROW_H     = 72
const NODE_SIZE = 48
// Snake pattern: center → right → center → left → repeat
const X_PATTERN = [50, 78, 50, 22]

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

// ── Small badge icons (16×16, same weight as MeTab's menu icons — NOT the
// big illustrated DoodleIllustration style, which goes blurry/illegible
// at 26px) ──────────────────────────────────────────────────────────────

const CoinIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4.8v6.4M6 6.2c0-.8.9-1.4 2-1.4s2 .5 2 1.2c0 1.8-4 .9-4 2.7 0 .7.9 1.3 2 1.3s2-.6 2-1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CupIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 5.5h8v3.5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M11.5 6.3h1a1.7 1.7 0 0 1 0 3.4h-1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5.5 2.8c.3.5.3.9 0 1.4M8 2.8c.3.5.3.9 0 1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const PlayIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6.5 5.5l4 2.5-4 2.5v-5Z" fill="currentColor"/>
  </svg>
)

const CameraIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1.8 5.8C1.8 5 2.5 4.3 3.3 4.3h1.4l.7-1.2h5.2l.7 1.2h1.4c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5H3.3c-.8 0-1.5-.7-1.5-1.5v-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="8.8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const PaletteIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13c.9 0 1.4-.6 1.4-1.3 0-.35-.14-.66-.36-.9-.2-.23-.32-.5-.32-.8 0-.66.55-1.2 1.25-1.2H11.5A3 3 0 0 0 14.5 7c0-3-3-5.5-6.5-5.5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="5" cy="6.5" r="0.9" fill="currentColor"/>
    <circle cx="8" cy="4.5" r="0.9" fill="currentColor"/>
    <circle cx="11" cy="6.5" r="0.9" fill="currentColor"/>
  </svg>
)

const FlagIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.5 1.5v13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3.5 2.3h9v6h-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M3.5 2.3h3v2h-3zM9.5 2.3h3v2h-3zM6.5 4.3h3v2h-3zM3.5 6.3h3v2h-3zM9.5 6.3h3v2h-3z" fill="currentColor" opacity="0.55"/>
  </svg>
)

const UsersIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

// ── Trail arrow (hand-drawn swoosh from the Figma doodle pack) ──────────
// Natural orientation points up-right (NE). Down-right segments: flip
// vertically (scaleY -1) → NE becomes SE. Down-left segments: rotate 180°
// (scale -1 -1) → NE becomes SW. Only 2 fixed transforms — the snake path
// has exactly 2 segment directions, so no per-segment angle math needed.
const ARROW_PATH = 'M0.377161 120C0.25404 118.782 -0.135848 117.503 0.0488322 116.326C0.787554 111.621 1.38259 106.833 2.63432 102.272C9.81634 76.144 22.3746 53.3388 40.1655 33.7326C48.2504 24.8169 56.951 16.7268 66.6159 9.81302C67.3546 9.27643 68.0318 8.65725 68.7295 8.03811C68.8731 7.91428 68.8526 7.60471 69.0373 6.94429C67.724 6.71727 66.4723 6.42834 65.2 6.30451C63.6405 6.16005 62.0399 6.24259 60.4804 6.09812C58.5515 5.91238 57.5871 4.96305 57.505 3.35328C57.4229 1.61967 58.4284 0.505193 60.5214 0.236897C61.8553 0.0717923 63.2096 0.00990808 64.5639 0.00990808C68.5038 0.00990808 72.4436 -0.0520114 76.3834 0.133732C80.5695 0.340113 82.2727 2.44516 81.9649 6.79981C81.6365 11.2164 81.2057 15.6123 80.6516 20.0083C80.3438 22.5468 79.2562 24.012 78.1482 23.7231C76.2808 23.2072 76.0551 21.3497 75.8499 19.7193C75.5626 17.3872 75.4806 15.0344 75.2548 12.0832C73.8595 12.8261 72.9566 13.177 72.1768 13.7343C50.2819 29.1303 32.7373 48.8604 19.8507 73.2546C13.3663 85.5343 8.56464 98.5364 4.64531 111.951C3.8245 114.737 3.39359 117.792 1.32107 119.979C1.01326 119.979 0.705439 119.979 0.397638 119.959L0.377161 120Z'

/**
 * AchievementPath
 * ----------------
 * Винаджуюча "стежка" досягнень замість плоского гріда — кожен бейдж це
 * вузол на SVG-шляху зі своєю іконкою (не загальний трофей), з'єднаний з
 * сусідами лінією зі стрілкою (та сама ручна swoosh-стрілка що в FabHint).
 * Сегмент між двома вузлами підсвічується кольором тільки якщо ОБИДВА
 * суміжні вузли розблоковано — чесний індикатор, не симулює послідовний
 * прогрес для незалежних дій. Тап на вузол → попап з описом прямо біля
 * нього (не окрема панель знизу).
 *
 * Props:
 * @prop {UnlockedEntry[]} unlocked — розблоковані ачівки юзера
 */
interface AchievementPathProps {
  unlocked: UnlockedEntry[]
}

const AchievementPath: React.FC<AchievementPathProps> = ({ unlocked }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const unlockedMap = new Map(unlocked.map(u => [u.id, u.unlockedAt]))
  const totalHeight = (ACHIEVEMENTS.length - 1) * ROW_H + NODE_SIZE

  const points = ACHIEVEMENTS.map((a, i) => ({
    achievement: a,
    x: X_PATTERN[i % X_PATTERN.length],
    y: i * ROW_H + NODE_SIZE / 2,
    unlocked: unlockedMap.has(a.id),
  }))

  const selected = points.find(p => p.achievement.id === selectedId) ?? null

  return (
    <div className={styles.wrap} style={{ height: totalHeight }}>
      <svg
        className={styles.lines}
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1]
          const lit = p.unlocked && next.unlocked
          const color = lit ? 'var(--accent)' : 'var(--border2)'
          return (
            <line
              key={p.achievement.id}
              x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke={color}
              strokeWidth={lit ? 2.4 : 1.6}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1]
        const lit = p.unlocked && next.unlocked
        const goesRight = next.x > p.x
        const mx = (p.x + next.x) / 2
        const my = (p.y + next.y) / 2
        return (
          <svg
            key={`arrow-${p.achievement.id}`}
            className={styles.arrow}
            style={{
              left: `${mx}%`,
              top: my,
              color: lit ? 'var(--accent)' : 'var(--border2)',
              transform: `translate(-50%, -50%) ${goesRight ? 'scaleY(-1)' : 'scale(-1, -1)'}`,
            }}
            width="14" height="20" viewBox="0 0 82 120"
            aria-hidden="true"
          >
            <path d={ARROW_PATH} fill="currentColor"/>
          </svg>
        )
      })}

      {points.map(p => {
        const Icon = BADGE_ICONS[p.achievement.id]
        return (
          <button
            key={p.achievement.id}
            type="button"
            className={`${styles.node} ${p.unlocked ? styles.nodeUnlocked : styles.nodeLocked}`}
            style={{
              left: `${p.x}%`,
              top: p.y,
              ...(p.unlocked ? { '--node-color': p.achievement.color } : {}),
            } as React.CSSProperties}
            onClick={() => setSelectedId(prev => prev === p.achievement.id ? null : p.achievement.id)}
            aria-label={p.achievement.title}
          >
            {Icon && <Icon />}
          </button>
        )
      })}

      {selected && (
        <>
          <div className={styles.popoverBackdrop} onClick={() => setSelectedId(null)} />
          <div
            className={styles.popover}
            style={{
              left: `${selected.x}%`,
              top: selected.y,
            }}
            data-side={selected.x >= 60 ? 'left' : selected.x <= 40 ? 'right' : 'center'}
            onClick={e => e.stopPropagation()}
          >
            <p className={styles.popoverTitle}>{selected.achievement.title}</p>
            <p className={styles.popoverDesc}>{selected.achievement.description}</p>
            {unlockedMap.has(selected.achievement.id) && (
              <p className={styles.popoverDate}>Отримано {formatDate(unlockedMap.get(selected.achievement.id)!)}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AchievementPath
