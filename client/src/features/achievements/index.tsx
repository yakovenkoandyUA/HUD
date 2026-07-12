import React, { useState } from 'react'
import { useAchievementProgress, useAchievementScore } from './hooks/useAchievementProgress'
import { ACHIEVEMENT_DEFS } from './data'
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

const MAX_SCORE = ACHIEVEMENT_DEFS.reduce((s, a) => s + a.reward, 0)

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

  const filtered = all.filter(a => a.category === activeTab)

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.root}>
      {/* ── Hero card ── */}
      <div className={styles.heroCard}>
        <div className={styles.heroImgWrap}>
          <img src="/achive/achive-treaser.png" alt="" className={styles.heroImg} draggable={false} />
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroScore}>
            <span className={styles.heroScoreEarned}>{score.earned}</span>
            <span className={styles.heroScoreSep}>/</span>
            <span className={styles.heroScoreMax}>{MAX_SCORE}</span>
          </div>
          <span className={styles.heroLabel}>ПРОБУДЖЕНИХ РУН</span>
          <p className={styles.heroSub}>
            Кожна руна — крок у глибину.{'\n'}Знання живе, коли ти згадуєш.
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

      {/* ── Selected node detail ── */}
      {selectedId && (() => {
        const ach = all.find(a => a.id === selectedId)
        if (!ach || ach.status === 'hidden') return null
        return (
          <div className={styles.nodeDetail}>
            <span className={styles.nodeDetailTitle}>{ach.title}</span>
            <p className={styles.nodeDetailDesc}>{ach.description}</p>
            {ach.status === 'in_progress' && (
              <div className={styles.nodeDetailProgress}>
                <div className={styles.nodeDetailTrack}>
                  <div className={styles.nodeDetailFill} style={{ width: `${(ach.progress / ach.target) * 100}%` }} />
                </div>
                <span className={styles.nodeDetailLabel}>{ach.progress} / {ach.target}</span>
              </div>
            )}
          </div>
        )
      })()}

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
