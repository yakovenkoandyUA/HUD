import React, { useState } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { ACHIEVEMENTS, type Achievement } from '../../data/achievements'
import styles from './ProfilePage.module.css'

const MONTHS_UA_SHORT = [
  'Січ', 'Лют', 'Бер', 'Квіт', 'Трав', 'Черв',
  'Лип', 'Серп', 'Вер', 'Жовт', 'Лист', 'Груд',
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_UA_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * MeAchievements
 * --------------
 * Підекран "Досягнення" вкладки "Я" — грід бейджів (косметичний прогрес,
 * не керує доступом до фіч). Невиконані — контурні, виконані — кольорові
 * з датою отримання. Тап → міні-картка з описом.
 */
const MeAchievements: React.FC = () => {
  const unlocked = useProfileStore(s => s.activeProfile?.unlockedAchievements ?? [])
  const [selected, setSelected] = useState<Achievement | null>(null)

  const unlockedMap = new Map(unlocked.map(a => [a.id, a.unlockedAt]))

  return (
    <>
      <div className={styles.cardPadded}>
        <div className={styles.cardSubTitle}>
          ПРОГРЕС · {unlocked.length}/{ACHIEVEMENTS.length}
        </div>
        <div className={styles.achGrid}>
          {ACHIEVEMENTS.map(a => {
            const isUnlocked = unlockedMap.has(a.id)
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.achBadge} ${isUnlocked ? styles.achBadgeUnlocked : styles.achBadgeLocked}`}
                style={isUnlocked ? { '--ach-color': a.color } as React.CSSProperties : undefined}
                onClick={() => setSelected(a)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="currentColor"
                  />
                </svg>
                <span className={styles.achBadgeLabel}>{a.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardPadded}>
            <div className={styles.cardSubTitle}>{selected.title}</div>
            <p className={styles.sectionHint}>{selected.description}</p>
            {unlockedMap.has(selected.id) && (
              <p className={styles.sectionHint} style={{ marginTop: 4 }}>
                Отримано {formatDate(unlockedMap.get(selected.id)!)}
              </p>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default MeAchievements
