import React, { useState } from 'react'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { ACHIEVEMENTS_BY_ID } from '@/shared/data/achievements'
import { useAchievementProgress } from './hooks/useAchievementProgress'
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

  const all      = useAchievementProgress()
  const filtered = all.filter(a => a.category === activeTab)

  const setPending = () => {
    const ach = ACHIEVEMENTS_BY_ID[Object.keys(ACHIEVEMENTS_BY_ID)[0]]
    if (ach) useAchievementsStore.setState({ pending: ach })
  }

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.root}>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={setPending}
          style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, padding: '8px 12px', background: 'var(--accent)', color: 'var(--bg)', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          TEST АЧІВКА
        </button>
      )}

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
        onClose={() => setSelectedId(null)}
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
