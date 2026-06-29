import React, { useState } from 'react'
import { ACHIEVEMENTS } from '../../../data/achievements'
import DoodleIllustration from '../../ui/DoodleIllustration'
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

const ChevronIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6"/>
  </svg>
)

/**
 * AchievementGrid
 * ----------------
 * Грід бейджів досягнень БЕЗ примусового порядку — кожна ачівка це окрема
 * картка з великою doodle-ілюстрацією (та сама система що в empty-states
 * Sprint/Recipes — `illustration` поле вже було в даних, просто не
 * рендерилось), не дрібною лінійною іконкою. Юзер сам обирає що тапнути й
 * дослідити, нічого не заблоковано "до попереднього кроку". Шеврон у
 * заголовку явно показує що картка розгортається (max-height акордеон) —
 * показує опис/підказку прямо під назвою.
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
            <span className={styles.illoWrap}>
              <DoodleIllustration variant={a.illustration} size={56} opacity={isUnlocked ? 0.9 : 0.32} />
            </span>
            <div className={styles.titleRow}>
              <span className={styles.title}>{a.title}</span>
              <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}><ChevronIcon /></span>
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
