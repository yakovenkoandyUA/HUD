import React from 'react'
import { useAchievementScore } from '@/features/achievements/hooks/useAchievementProgress'
import { getLevel, getLevelProgress, LEVELS } from '@/features/achievements/levels'
import styles from './MeLevels.module.css'

/**
 * Y-позиції рун-слотів на monolite.png (% висоти зображення), виміряні
 * по пікселях самого асета. Камінь має лише 9 вирізьблених слотів (кожні 9%,
 * перший центр 10.5% від верху) — рівень 10 (МІМІР) не має свого слоту і
 * рендериться окремим сяйвом на вершині каменя (легендарний ранг "поза" рунами).
 */
const NODE_Y: Record<number, number> = {
  10: 4,
  9: 10.5, 8: 19.5, 7: 28.5, 6: 37.5, 5: 46.5,
  4: 55.5, 3: 64.5, 2: 73.5, 1: 82.5,
}

const LockIcon: React.FC = () => (
  <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="3" y="6.5" width="8" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

/**
 * MeLevels
 * --------
 * "ШЛЯХ РІВНІВ" — deep-dive екран монолітом: фонове фото каменя на всю
 * висоту сторінки, зверху — оверлей поточного рангу й прогресу (єдина
 * атмосферна сцена, а не окрема картка над окремим фото).
 * Відкривається тапом на моноліт у hero-картці MeTab.
 */
const MeLevels: React.FC = () => {
  const score    = useAchievementScore()
  const level    = getLevel(score.earned)
  const progress = getLevelProgress(score.earned)

  return (
    <div className={styles.stage}>
      <img
        src="/achivement/monolite.png"
        alt=""
        className={styles.stageImg}
        draggable={false}
      />
      <div className={styles.scrim} />

      <div className={styles.topBar}>
        <div className={styles.topProgressWrap}>
          <div className={styles.topProgressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.topRunes}>{score.earned} рун</span>
      </div>

      {LEVELS.slice().reverse().map(lvl => {
        const unlocked = lvl.level <= level.level
        const isCurrent = lvl.level === level.level
        const y = NODE_Y[lvl.level]
        return (
          <div
            key={lvl.level}
            className={`${styles.node} ${unlocked ? styles.nodeUnlocked : styles.nodeLocked} ${isCurrent ? styles.nodeCurrent : ''}`}
            style={{ top: `${y}%`, '--node-color': lvl.color } as React.CSSProperties}
          >
            <img
              src={`/achivement/monolite-levels/level-${lvl.level}.png`}
              alt=""
              className={styles.nodeRune}
              draggable={false}
            />
            <span className={styles.nodeLine} />
            <div className={styles.nodeLabel}>
              <span className={styles.nodeTitle}>
                {unlocked
                  ? <>{lvl.level}. {lvl.label}</>
                  : <><LockIcon /> {lvl.level}. {lvl.label}</>}
              </span>
              <span className={styles.nodeHint}>{lvl.hint}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MeLevels
