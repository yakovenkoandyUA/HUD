import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import NextRaceCard from '../../components/f1/NextRaceCard'
import RaceCalendarList from '../../components/f1/RaceCalendarList'
import ChampionshipTable from '../../components/f1/ChampionshipTable'
import LastRaceCard from '../../components/f1/LastRaceCard'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRace, getNextRound } from '../../utils/f1'
import { useUiStore } from '../../store/uiStore'
import { useF1PredictionsStore } from '../../store/f1PredictionsStore'
import styles from './F1.module.css'

type F1Tab = 'calendar' | 'drivers' | 'constructors'

const TABS: { id: F1Tab; label: string }[] = [
  { id: 'calendar',     label: 'Календар' },
  { id: 'drivers',      label: 'Пілоти'   },
  { id: 'constructors', label: 'Команди'  },
]

const F1Screen: React.FC = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<F1Tab>('calendar')
  const { theme } = useUiStore()
  const { fetchPredictions, predictions } = useF1PredictionsStore()

  const completed     = predictions.filter(p => p.result)
  const totalPts      = completed.reduce((sum, p) => sum + (p.result?.points ?? 0), 0)
  const totalRaces    = completed.length
  const correctPicks  = completed.filter(p =>
    [p.result!.p1Match, p.result!.p2Match, p.result!.p3Match].some(m => m !== 'miss')
  ).length
  const nextRace = getNextRace(F1_SEASON_2026)
  const nextRound = getNextRound(F1_SEASON_2026)
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const showBg = theme !== 'japan'

  useEffect(() => {
    fetchPredictions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      <AppHeader />
      <div ref={contentRef} className={styles.content}>
        {nextRace ? (
          <NextRaceCard race={nextRace} />
        ) : (
          <p className={styles.done}>Сезон 2026 завершено</p>
        )}

        <LastRaceCard />

        <button
          className={styles.mySeasonCard}
          onClick={() => navigate('/f1/my-season')}
        >
          <div className={styles.mySeasonCardLeft}>
            <div className={styles.mySeasonCardTitle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
              </svg>
              ПРОГНОЗИ
            </div>
            <span className={styles.mySeasonCardSub}>
              {totalPts} pts · {correctPicks}/{totalRaces} влучань
            </span>
          </div>
          <span className={styles.mySeasonCardArrow}>→</span>
        </button>

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
