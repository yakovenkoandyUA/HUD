import React, { useState } from 'react'
import { F1_SEASON_2026 } from '../../../data/f1Season2026'
import { useF1PredictionsStore, toRaceId, type RacePrediction } from '@/features/f1/store/f1PredictionsStore'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import styles from './MySeasonStats.module.css'

/**
 * MySeasonStats
 * -------------
 * Таб "МІЙ СЕЗОН" в F1Screen.
 * Відображає streak, загальну статистику та список гонок із результатами прогнозів.
 * Всі дані — виключно з f1PredictionsStore (localStorage). Жодних API-запитів.
 */

function calcStreak(preds: RacePrediction[]): number {
  const sorted = [...preds]
    .filter(p => p.result)
    .sort((a, b) => b.raceRound - a.raceRound)
  let n = 0
  for (const p of sorted) {
    if (p.result!.points > 0) n++
    else break
  }
  return n
}

function hitCount(pred: RacePrediction): number {
  if (!pred.result) return 0
  return [pred.result.p1Match, pred.result.p2Match, pred.result.p3Match]
    .filter(m => m !== 'miss').length
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="20" x2="5" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="19" y1="20" x2="19" y2="4"/>
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 1 1-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function HourglassIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 22h14M5 2h14M6 2v4a6 6 0 0 0 12 0V2M6 22v-4a6 6 0 0 1 12 0v4"/>
    </svg>
  )
}

const MySeasonStats: React.FC = () => {
  const { predictions } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()
  const [showAllPast, setShowAllPast] = useState(false)

  const today      = new Date().toISOString().slice(0, 10)
  const completed  = predictions.filter(p => p.result)
  const streak     = calcStreak(predictions)

  const totalPoints   = completed.reduce((s, p) => s + (p.result?.points ?? 0), 0)
  const exactCount    = completed.flatMap(p => [p.result!.p1Match, p.result!.p2Match, p.result!.p3Match])
                          .filter(m => m === 'exact').length
  const totalSlots    = completed.length * 3
  const racesHappened = F1_SEASON_2026.filter(r => r.date < today).length

  // Best race (highest score)
  const bestRace = completed.length > 0
    ? [...completed].sort((a, b) => (b.result?.points ?? 0) - (a.result?.points ?? 0))[0]
    : null

  // Favourite driver (most predicted across all submissions)
  const freqMap = new Map<string, number>()
  predictions.forEach(p => {
    [p.p1, p.p2, p.p3].filter(Boolean).forEach(id => {
      freqMap.set(id, (freqMap.get(id) ?? 0) + 1)
    })
  })
  const freqEntries = [...freqMap.entries()].sort((a, b) => b[1] - a[1])
  const favId    = freqEntries[0]?.[0] ?? ''
  const favCount = freqEntries[0]?.[1] ?? 0
  const favName  = (() => {
    const d = drivers.find(d => d.driverId === favId)
    if (!d) return favId
    return d.full_name.trim().split(' ').pop() ?? favId
  })()

  // Race list: past newest-first, then next 3 future
  const pastRaces     = F1_SEASON_2026.filter(r => r.date < today).sort((a, b) => b.round - a.round)
  const futureRacesAll = F1_SEASON_2026.filter(r => r.date >= today).sort((a, b) => a.round - b.round)
  const futureRaces   = futureRacesAll.slice(0, 3)
  const nextRound      = futureRacesAll[0]?.round
  const displayedPast  = showAllPast ? pastRaces : pastRaces.slice(0, 3)

  const streakPulse = streak >= 5
  const streakLabel = streak > 0
    ? 'поспіль вгаданих гонок'
    : completed.length > 0
      ? 'серію перервано'
      : 'очікує на перший результат'

  if (predictions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}><TargetIcon /></div>
        <h3 className={styles.emptyTitle}>Ще немає прогнозів</h3>
        <p className={styles.emptyText}>
          Зроби прогноз перед наступною гонкою —{'\n'}
          хто фінішує в топ-3?
        </p>
        <div className={styles.emptyScore}>
          <span className={styles.emptyScoreNum}>43</span>
          <span className={styles.emptyScoreLabel}>макс очок за гонку</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>

      {/* ── Streak ── */}
      <div className={styles.streakBlock}>
        <span className={`${styles.streakNum} ${streakPulse ? styles.streakPulse : ''}`}>
          {streak > 0 ? streak : '—'}
        </span>
        {streak >= 3 ? (
          <span className={styles.streakIcon}><FlameIcon /></span>
        ) : streak >= 1 ? (
          <span className={styles.streakIcon}><BoltIcon /></span>
        ) : null}
        <span className={styles.streakLabel}>{streakLabel}</span>
      </div>

      {/* ── Stats grid ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statIcon}><TrophyIcon /></span>
          <span className={styles.statVal}>{totalPoints}</span>
          <span className={styles.statUnit}>pts</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statIcon}><TargetIcon /></span>
          <span className={styles.statVal}>{totalSlots > 0 ? `${exactCount}/${totalSlots}` : '—'}</span>
          <span className={styles.statUnit}>точних</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statIcon}><ChartIcon /></span>
          <span className={styles.statVal}>{racesHappened > 0 ? `${completed.length}/${racesHappened}` : '—'}</span>
          <span className={styles.statUnit}>гонок</span>
        </div>
      </div>

      {/* ── Race-by-race list ── */}
      <div className={styles.listSection}>
        <div className={styles.listTitle}>Завершені</div>

        {displayedPast.map(race => {
          const pred   = predictions.find(p => p.raceId === toRaceId(race))
          const hits   = pred ? hitCount(pred) : 0
          const isPerfect = !!pred?.result && pred.result.points === 30

          return (
            <div key={race.round} className={`${styles.raceRow} ${isPerfect ? styles.perfectRow : ''}`}>
              <span className={styles.raceFlag}>{race.flag}</span>
              <span className={styles.raceName}>
                {race.name.replace(/ Grand Prix$/, ' GP')}
              </span>

              {pred?.result ? (
                <span className={styles.raceResult}>
                  <span className={hits >= 2 ? styles.raceIconHit : styles.raceIconMiss}>
                    {hits >= 2 ? <CheckCircleIcon /> : <XCircleIcon />}
                  </span>
                  <span className={styles.raceHits}>{hits}/3</span>
                  <span className={isPerfect ? styles.perfectPts : styles.racePts}>
                    +{pred.result.points} pts
                  </span>
                  {isPerfect && <span className={styles.perfectStar}><StarIcon /></span>}
                </span>
              ) : (
                <span className={styles.statusBadge}>
                  {pred ? <><HourglassIcon /> Очікується</> : 'Не прогнозував'}
                </span>
              )}
            </div>
          )
        })}

        {pastRaces.length > 3 && (
          <button
            type="button"
            className={styles.showAllBtn}
            onClick={() => setShowAllPast(v => !v)}
          >
            {showAllPast ? 'Згорнути' : `Показати всі (${pastRaces.length})`}
          </button>
        )}

        <div className={styles.listTitle}>Майбутні</div>

        {futureRaces.map(race => {
          const pred = predictions.find(p => p.raceId === toRaceId(race))
          const isNext = race.round === nextRound

          return (
            <div key={race.round} className={`${styles.raceRow} ${isNext ? styles.nextRow : ''}`}>
              <span className={styles.raceFlag}>{race.flag}</span>
              <span className={styles.raceName}>
                {race.name.replace(/ Grand Prix$/, ' GP')}
              </span>
              <span className={styles.statusBadge}>
                {pred ? <><HourglassIcon /> Очікується</> : 'Не прогнозував'}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Footer insights ── */}
      {(bestRace || favId) && (
        <div className={styles.insights}>
          {bestRace && (
            <div className={styles.insightRow}>
              <span className={styles.insightLabel}>Найкращий результат:</span>
              <span className={styles.insightVal}>
                {bestRace.raceName}
                {bestRace.result?.points === 30 && <StarIcon />}
              </span>
            </div>
          )}
          {favId && favCount > 0 && (
            <div className={styles.insightRow}>
              <span className={styles.insightLabel}>Улюблений у прогнозах:</span>
              <span className={styles.insightVal}>{favName} ({favCount}×)</span>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default MySeasonStats
