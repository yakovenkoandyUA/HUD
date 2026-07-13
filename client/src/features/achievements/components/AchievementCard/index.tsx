import React from 'react'
import { useUiStore } from '@/shared/store/uiStore'
import type { AchievementWithStatus } from '../../types'
import styles from './index.module.css'

const RUNE_SRC: Record<string, string> = {
  memory:    '/achive/mimir-runes-transparent/rune-memory.png',
  spaces:    '/achive/mimir-runes-transparent/rune-spaces.png',
  finance:   '/achive/mimir-runes-transparent/rune-finance.png',
  sprint:    '/achive/mimir-runes-transparent/rune-sprint.png',
  watchlist: '/achive/mimir-runes-transparent/rune-watchlist.png',
}

const RING_R_CARD = 22
const CIRC        = 2 * Math.PI * RING_R_CARD

interface AchievementCardProps {
  achievement: AchievementWithStatus
}

/**
 * AchievementCard
 * ---------------
 * List card below the tree. Three visual variants driven by status:
 * - unlocked  → dark gold badge + checkmark
 * - in_progress → stone badge + progress bar + "N/M"
 * - locked/hidden → dim badge + lock icon + chevron
 *
 * Props:
 * @prop {AchievementWithStatus} achievement
 */
const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const { status, progress, target, title, description, reward } = achievement
  const isUnlocked    = status === 'unlocked'
  const isInProgress  = status === 'in_progress'
  const isLocked      = status === 'locked'
  const isHidden      = status === 'hidden'

  const fraction  = target > 0 ? progress / target : 0
  const arcFill   = fraction * CIRC
  const RING_W    = 3
  const svgSize   = (RING_R_CARD + RING_W) * 2 + 4
  const cx        = svgSize / 2
  const cy        = svgSize / 2

  const runeSrc  = RUNE_SRC[achievement.category]
  const isDark   = useUiStore(s => ['velvet','cyber','noir','arctic'].includes(s.theme))
  const blockSrc = isDark ? '/achive/achive-block-light.png' : '/achive/achive-block-dark.png'

  return (
    <div className={`${styles.card} ${isUnlocked ? styles.cardUnlocked : ''}`}>
      {/* Badge */}
      <div className={styles.badge}>
        {isHidden ? (
          <div className={styles.badgeImgWrap}>
            <img src="/achive/achive-question.png" alt="" className={styles.badgeImg} draggable={false} />
          </div>
        ) : isLocked ? (
          <div className={styles.badgeImgWrap}>
            <img src={blockSrc} alt="" className={styles.badgeImg} draggable={false} />
          </div>
        ) : isUnlocked ? (
          <div className={`${styles.badgeRuneWrap} ${styles.badgeRuneWrapUnlocked}`}>
            <img src={runeSrc} alt="" className={styles.badgeRuneImg} draggable={false} />
          </div>
        ) : (
          <div className={styles.badgeRuneWrap}>
            <img src={runeSrc} alt="" className={`${styles.badgeRuneImg} ${styles.badgeRuneImgDim}`} draggable={false} />
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} className={styles.badgeArcOverlay} aria-hidden="true">
              <circle cx={cx} cy={cy} r={RING_R_CARD} fill="none" className={styles.ringTrack} strokeWidth={RING_W} />
              <circle cx={cx} cy={cy} r={RING_R_CARD} fill="none" className={styles.ringArc}
                strokeWidth={RING_W}
                strokeDasharray={`${arcFill} ${CIRC}`}
                transform={`rotate(-90 ${cx} ${cy})`}
                strokeLinecap="round"
              />
            </svg>
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
          <span className={styles.progressLabel}>{progress} / {target}</span>
        )}
      </div>

      {/* Right side */}
      <div className={styles.right}>
        <div className={`${styles.reward} ${isUnlocked ? styles.rewardUnlocked : ''}`}>
          <span>+{reward}</span>
          {/* rune diamond icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 0.5L9.5 5L5 9.5L0.5 5Z"
              fill={isUnlocked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </div>

        {isUnlocked ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.check} aria-hidden="true">
            <path d="M4 9l4 4 6-7"/>
          </svg>
        ) : (isLocked || isHidden) ? null : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron} aria-hidden="true">
            <path d="M5 3l4 4-4 4"/>
          </svg>
        )}
      </div>
    </div>
  )
}

export default AchievementCard
