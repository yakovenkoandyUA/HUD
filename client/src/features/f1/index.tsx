import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { authFetch } from '@/shared/services/api'
import NextRaceCard from './components/f1/NextRaceCard'
import RaceCalendarList from './components/f1/RaceCalendarList'
import ChampionshipTable from './components/f1/ChampionshipTable'
import LastRaceCard from './components/f1/LastRaceCard'
import { F1_SEASON_2026 } from './data/f1Season2026'
import { getNextRace, getNextRound } from './utils/f1'
import { useUiStore } from '@/shared/store/uiStore'
import { useF1PredictionsStore, toRaceId, isRaceLocked } from '@/features/f1/store/f1PredictionsStore'
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
  const [liveActive, setLiveActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await authFetch('/api/f1/live/sessions?meeting_key=latest')
        if (!res.ok) return
        const sessions: { date_start: string; date_end: string }[] = await res.json()
        const now = Date.now()
        const active = sessions.some(s => {
          const start = new Date(s.date_start).getTime() - 4 * 60 * 60 * 1000
          const end   = new Date(s.date_end).getTime()   + 60 * 60 * 1000
          return now >= start && now <= end
        })
        if (!cancelled) setLiveActive(active)
      } catch { /* silent */ }
    }
    check()
    const timer = setInterval(check, 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const nextRace  = getNextRace(F1_SEASON_2026)
  const nextRound = getNextRound(F1_SEASON_2026)

  const nextPred  = nextRace ? predictions.find(p => p.raceId === toRaceId(nextRace)) : null
  const raceLocked = nextRace ? isRaceLocked(nextRace) : false

  const deadlineText = (() => {
    if (!nextRace || raceLocked) return null
    const ms = new Date(nextRace.date + 'T11:00:00Z').getTime() - Date.now()
    if (ms <= 0) return null
    const totalHours = Math.floor(ms / 3_600_000)
    if (totalHours >= 48) return `${Math.floor(totalHours / 24)}д ${totalHours % 24}г`
    if (totalHours >= 1)  return `${totalHours}г`
    return `${Math.floor(ms / 60_000)}хв`
  })()
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

        {liveActive && (
          <button className={styles.liveBtn} onClick={() => navigate('/f1/live')}>
            <span className={styles.liveDot} />
            LIVE
          </button>
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
              {nextRace && (
                <span className={styles.mySeasonCardGP}>
                  · {nextRace.flag} {nextRace.name.split(' ')[0].toUpperCase()}
                </span>
              )}
            </div>
            {nextPred ? (
              <span className={`${styles.mySeasonCardSub} ${styles.mySeasonCardSaved}`}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.8 3L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Збережено
                {totalPts > 0 && <span className={styles.mySeasonPts}> · {totalPts} pts</span>}
              </span>
            ) : raceLocked ? (
              <span className={styles.mySeasonCardSub}>🔒 Прогноз закрито</span>
            ) : (
              <span className={styles.mySeasonCardSub}>Прогноз не збережено</span>
            )}
            {deadlineText && (
              <span className={styles.mySeasonDeadline}>До дедлайну: {deadlineText}</span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.mySeasonCardArrow}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
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
