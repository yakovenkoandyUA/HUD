import React, { useState } from 'react'
import { ACHIEVEMENTS } from '@/shared/data/achievements'
import styles from './AchievementGrid.module.css'

const NODE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 52,  y: 24  }, // first-transaction
  { x: 168, y: 16  }, // first-quest
  { x: 272, y: 40  }, // first-recipe-cooked
  { x: 108, y: 78  }, // first-watchlist
  { x: 228, y: 72  }, // first-memory
  { x: 40,  y: 128 }, // theme-changed
  { x: 156, y: 118 }, // first-prediction
  { x: 296, y: 112 }, // family-linked
  { x: 96,  y: 174 }, // first-note
  { x: 212, y: 160 }, // first-goal
  { x: 56,  y: 218 }, // first-mood
  { x: 268, y: 202 }, // streak-7
]

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2],
  [0, 3], [1, 4], [2, 4],
  [3, 6], [4, 6],
  [3, 5], [4, 7],
  [5, 8], [6, 8], [6, 9], [7, 9],
  [8, 10], [9, 11],
]

const MONTHS_UA_SHORT = ['Січ','Лют','Бер','Квіт','Трав','Черв','Лип','Серп','Вер','Жовт','Лист','Груд']

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_UA_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

interface UnlockedEntry {
  id: string
  unlockedAt: string
}

/**
 * AchievementGrid
 * ----------------
 * Constellation view — кожне досягнення це зірка в SVG-сузір'ї.
 * Розблоковані зірки яскраві (колір з achievement.color), заблоковані — тьмяні.
 * Тап на зірку показує деталі нижче SVG.
 *
 * Props:
 * @prop {UnlockedEntry[]} unlocked — розблоковані ачівки юзера
 */
interface AchievementGridProps {
  unlocked: UnlockedEntry[]
}

const AchievementGrid: React.FC<AchievementGridProps> = ({ unlocked }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const unlockedMap = new Map(unlocked.map(u => [u.id, u.unlockedAt]))

  const selected = selectedIdx !== null ? ACHIEVEMENTS[selectedIdx] : null
  const isSelectedUnlocked = selected ? unlockedMap.has(selected.id) : false

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 320 248" className={styles.svg} aria-label="Сузір'я досягнень">
        {CONNECTIONS.map(([a, b], i) => {
          const pa = NODE_POSITIONS[a]
          const pb = NODE_POSITIONS[b]
          const lit = unlockedMap.has(ACHIEVEMENTS[a].id) && unlockedMap.has(ACHIEVEMENTS[b].id)
          return (
            <line
              key={i}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              style={{
                stroke: lit ? 'var(--text3)' : 'var(--border)',
                strokeWidth: lit ? 1 : 0.6,
                opacity: lit ? 0.7 : 0.3,
              }}
            />
          )
        })}

        {ACHIEVEMENTS.map((a, i) => {
          const pos = NODE_POSITIONS[i]
          const isUnlocked = unlockedMap.has(a.id)
          const isSelected = selectedIdx === i
          return (
            <g
              key={a.id}
              onClick={() => setSelectedIdx(prev => prev === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              {isUnlocked && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isSelected ? 18 : 12}
                  style={{ fill: a.color, opacity: isSelected ? 0.25 : 0.1 }}
                />
              )}
              <circle
                cx={pos.x} cy={pos.y}
                r={isSelected ? 9 : isUnlocked ? 7 : 4}
                style={{
                  fill: isUnlocked ? a.color : 'var(--surface)',
                  stroke: isUnlocked ? 'none' : 'var(--border2)',
                  strokeWidth: 1,
                  opacity: isUnlocked ? (isSelected ? 1 : 0.85) : 0.35,
                }}
              />
              {/* expanded touch target */}
              <circle cx={pos.x} cy={pos.y} r={20} style={{ fill: 'transparent' }} />
            </g>
          )
        })}
      </svg>

      <div className={`${styles.detail} ${selected ? styles.detailOpen : ''}`}>
        {selected && (
          <>
            <div className={styles.detailHeader}>
              <span
                className={styles.detailDot}
                style={{ background: isSelectedUnlocked ? selected.color : 'var(--text3)' }}
              />
              <span className={styles.detailTitle}>{selected.title}</span>
            </div>
            <p className={styles.detailDesc}>
              {isSelectedUnlocked ? selected.description : selected.hint}
            </p>
            {isSelectedUnlocked && (
              <p className={styles.detailDate}>
                Отримано {formatDate(unlockedMap.get(selected.id)!)}
              </p>
            )}
          </>
        )}
      </div>

      {!selected && (
        <p className={styles.emptyHint}>Торкніться зірки</p>
      )}
    </div>
  )
}

export default AchievementGrid
