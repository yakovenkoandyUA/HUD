import React from 'react'
import type { AchievementWithStatus } from '../../types'
import styles from './index.module.css'

const RUNE_SRC: Record<string, string> = {
  memory:    '/achive/mimir-runes-transparent/rune-memory.png',
  spaces:    '/achive/mimir-runes-transparent/rune-spaces.png',
  finance:   '/achive/mimir-runes-transparent/rune-finance.png',
  sprint:    '/achive/mimir-runes-transparent/rune-sprint.png',
  watchlist: '/achive/mimir-runes-transparent/rune-watchlist.png',
}

interface AchievementCardProps {
  achievement: AchievementWithStatus
}

/**
 * AchievementCard
 * ---------------
 * List card below the tree. Three visual variants driven by status:
 * - unlocked    → gold rune badge + checkmark
 * - in_progress → dimmed rune badge + progress bar + "N/M"
 * - locked/hidden → block/question badge
 *
 * Props:
 * @prop {AchievementWithStatus} achievement
 */
const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const { status, progress, target, title, description, reward } = achievement
  const isUnlocked   = status === 'unlocked'
  const isInProgress = status === 'in_progress'
  const isLocked     = status === 'locked'
  const isHidden     = status === 'hidden'

  const fraction = target > 0 ? Math.min(progress / target, 1) : 0

  const runeSrc     = RUNE_SRC[achievement.category]
  const blockSrc    = '/achive/achive-block-dark.png'
  const questionSrc = '/achive/achive-question-dark.png'

  return (
    <div className={`${styles.card} ${isUnlocked ? styles.cardUnlocked : ''}`}>
      {/* Badge */}
      <div className={styles.badge}>
        {isHidden ? (
          <div className={styles.badgeImgWrap}>
            <img src={questionSrc} alt="" className={styles.badgeImg} draggable={false} />
          </div>
        ) : isLocked ? (
          <div className={styles.badgeImgWrap}>
            <img src={blockSrc} alt="" className={styles.badgeImg} draggable={false} />
          </div>
        ) : (
          <div className={`${styles.badgeRuneWrap} ${isUnlocked ? styles.badgeRuneWrapUnlocked : ''}`}>
            <img
              src={runeSrc}
              alt=""
              className={`${styles.badgeRuneImg} ${!isUnlocked ? styles.badgeRuneImgDim : ''}`}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        <span className={`${styles.title} ${isUnlocked ? styles.titleUnlocked : ''}`}>
          {isHidden ? '???' : title}
        </span>
        <span className={styles.desc}>
          {isHidden
            ? 'Криниця мовчить.'
            : isUnlocked && achievement.flavor
              ? achievement.flavor
              : description}
        </span>

        {isInProgress && (
          <>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${fraction * 100}%` }} />
            </div>
            <span className={styles.progressLabel}>{progress} / {target}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className={styles.right}>
        {isUnlocked ? (
          <div className={styles.obtainedBadge}>
            <span>ОТРИМАНО</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3.5 6l1.8 1.8 3.2-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <>
            <div className={styles.reward}>
              <span>+{reward}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 0.5L9.5 5L5 9.5L0.5 5Z" fill="none" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div>
            {(!isLocked && !isHidden) && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron} aria-hidden="true">
                <path d="M5 3l4 4-4 4"/>
              </svg>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AchievementCard
