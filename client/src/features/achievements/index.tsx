import React, { useState } from 'react'
import { useAchievementProgress, useAchievementScore } from './hooks/useAchievementProgress'
import { getLevel, getNextLevel, getLevelProgress } from './levels'
import type { AchievementCategory } from './types'
import AchievementMap from './components/AchievementMap'
import AchievementCard from './components/AchievementCard'
import styles from './index.module.css'

type CategoryTab = AchievementCategory

const TABS: { id: CategoryTab; label: string }[] = [
  { id: 'memory',    label: "ПАМ'ЯТЬ" },
  { id: 'spaces',    label: 'ПРОСТОРИ' },
  { id: 'finance',   label: 'ФІНАНСИ' },
  { id: 'sprint',    label: 'СПРИНТ' },
  { id: 'watchlist', label: 'WATCHLIST' },
]


/**
 * AchievementsTab
 * ---------------
 * "ГЛИБИНА" — екран досягнень з картою криниці (дерево рун) та списком карток.
 * Вкладка профілю доступна через ?tab=achievements.
 *
 * Props: none
 */
const AchievementsTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CategoryTab>('memory')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all   = useAchievementProgress()
  const score = useAchievementScore()
  const level    = getLevel(score.earned)
  const nextLvl  = getNextLevel(score.earned)
  const progress = getLevelProgress(score.earned)

  const filtered = all.filter(a => a.category === activeTab)

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.root}>
      {/* ── Hero card ── */}
      <div className={styles.heroCard}>
        <div className={styles.heroImgWrap}>
          <img src={`/achive/level-${level.level}.png`} alt="" className={styles.heroImg} draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).src = '/achive/achive-treaser.png' }}
          />
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroScore}>
            <span className={styles.heroScoreEarned}>РІВЕНЬ {level.level}</span>
          </div>
          <span className={styles.heroLabel}>{level.label}</span>
          <div className={styles.heroProgressWrap}>
            <div className={styles.heroProgressFill} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.heroSub}>
            {score.earned} рун
            {nextLvl ? ` · до рівня ${nextLvl.level}: ${nextLvl.minRunes - score.earned}` : ' · МАКСИМУМ'}
          </p>
        </div>
        <img src="/achive/achive-hero.png" alt="" className={styles.heroRune} draggable={false} />
      </div>

      {/* ── Category tabs ── */}
      <div className={styles.tabsWrap}>
        <div className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => { setActiveTab(tab.id); setSelectedId(null) }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Achievement map (tree) ── */}
      <AchievementMap
        achievements={all}
        category={activeTab}
        onNodeClick={handleNodeClick}
        selectedId={selectedId}
      />

      {/* ── Achievement list ── */}
      <div className={styles.list}>
        {filtered.map(ach => (
          <AchievementCard key={ach.id} achievement={ach} />
        ))}
      </div>
    </div>
  )
}

export default AchievementsTab
