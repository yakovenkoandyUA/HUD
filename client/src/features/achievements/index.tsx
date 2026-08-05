import React, { useState } from 'react'
import { useAchievementProgress } from './hooks/useAchievementProgress'
import type { AchievementCategory } from './types'
import WellHome from './components/WellHome'
import AchievementMap from './components/AchievementMap'
import AchievementCard from './components/AchievementCard'
import CategoryStats from './components/CategoryStats'
import styles from './index.module.css'

const DIVE_MS = 320

/**
 * AchievementsTab
 * ---------------
 * "ГЛИБИНА" — криниця досягнень. Стартовий екран показує 5 категорій-кружечків
 * навколо well.png; тап занурює у відповідну категорію (category-well/[cat].png
 * + вузли досягнень), "Винирнути" повертає до вибору категорій.
 * Вкладка профілю доступна через ?tab=achievements.
 *
 * Props:
 * @prop {(active: boolean) => void} [onBranchActiveChange] — викликається при вході/виході з гілки
 * (щоб батьківський екран міг синхронно згорнути hero-картку та сховати кнопку "назад")
 */
interface AchievementsTabProps {
  onBranchActiveChange?: (active: boolean) => void
}

const AchievementsTab: React.FC<AchievementsTabProps> = ({ onBranchActiveChange }) => {
  const [category, setCategory]         = useState<AchievementCategory | null>(null)
  const [origin, setOrigin]             = useState<{ x: number; y: number } | undefined>(undefined)
  const [transitioning, setTransitioning] = useState<'diving' | 'surfacing' | null>(null)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const all      = useAchievementProgress()
  const filtered = category ? all.filter(a => a.category === category) : []

  const handleSelectCategory = (cat: AchievementCategory, pos: { x: number; y: number }) => {
    setOrigin(pos)
    setTransitioning('diving')
    onBranchActiveChange?.(true)
    setTimeout(() => {
      setCategory(cat)
      setTransitioning(null)
    }, DIVE_MS)
  }

  const handleBack = () => {
    setTransitioning('surfacing')
    setSelectedId(null)
    onBranchActiveChange?.(false)
    setTimeout(() => {
      setCategory(null)
      setTransitioning(null)
    }, DIVE_MS)
  }

  const handleNodeClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.root}>
      {category ? (
        <>
          <AchievementMap
            achievements={all}
            category={category}
            onNodeClick={handleNodeClick}
            onClose={() => setSelectedId(null)}
            selectedId={selectedId}
            onBack={handleBack}
            exiting={transitioning === 'surfacing'}
            origin={origin}
          />
          <div className={styles.list}>
            {filtered.map(ach => (
              <AchievementCard key={ach.id} achievement={ach} />
            ))}
          </div>
        </>
      ) : (
        <>
          <WellHome onSelect={handleSelectCategory} exiting={transitioning === 'diving'} />
          <CategoryStats achievements={all} />
        </>
      )}
    </div>
  )
}

export default AchievementsTab
