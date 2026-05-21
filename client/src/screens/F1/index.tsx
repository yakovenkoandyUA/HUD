import React, { useEffect, useRef, useState } from 'react'
import TopBar from '../../components/layout/TopBar'
import NextRaceCard from '../../components/f1/NextRaceCard'
import RaceCalendarList from '../../components/f1/RaceCalendarList'
import ChampionshipTable from '../../components/f1/ChampionshipTable'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getNextRound } from '../../utils/f1'
import { useUiStore } from '../../store/uiStore'
import styles from './F1.module.css'

type F1Tab = 'calendar' | 'drivers' | 'constructors'

const TABS: { id: F1Tab; label: string }[] = [
  { id: 'calendar',     label: 'Календар' },
  { id: 'drivers',      label: 'Пілоти'   },
  { id: 'constructors', label: 'Команди'  },
]

const F1Screen: React.FC = () => {
  const [tab, setTab] = useState<F1Tab>('calendar')
  const { theme } = useUiStore()
  const nextRace = getNextRace(F1_SEASON_2026)
  const nextRound = getNextRound(F1_SEASON_2026)
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const showBg = theme !== 'japan'

  useEffect(() => {
    const content = contentRef.current
    const bg = bgRef.current
    if (!content || !bg) return
    const onScroll = () => {
      bg.style.transform = `translateY(${-content.scrollTop * 0.3}px)`
    }
    content.addEventListener('scroll', onScroll, { passive: true })
    return () => content.removeEventListener('scroll', onScroll)
  }, [showBg])

  return (
    <div className={styles.screen}>
      {showBg && <div ref={bgRef} className={styles.bg} />}
      <TopBar title="F1 2026" />
      <div ref={contentRef} className={styles.content}>
        {nextRace ? (
          <NextRaceCard race={nextRace} />
        ) : (
          <p className={styles.done}>Сезон 2026 завершено</p>
        )}

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calendar' && (
          <RaceCalendarList races={F1_SEASON_2026} nextRound={nextRound} />
        )}

        {(tab === 'drivers' || tab === 'constructors') && (
          <ChampionshipTable tab={tab} />
        )}
      </div>
    </div>
  )
}

export default F1Screen
