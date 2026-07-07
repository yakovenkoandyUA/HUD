import React from 'react'
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

const MySeasonStats: React.FC = () => {
  const { predictions } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()

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
  const pastRaces   = F1_SEASON_2026.filter(r => r.date < today).sort((a, b) => b.round - a.round)
  const futureRaces = F1_SEASON_2026.filter(r => r.date >= today).slice(0, 3)
  const raceList    = [...pastRaces, ...futureRaces]

  const streakIcon  = streak >= 3 ? '🔥' : streak >= 1 ? '⚡' : ''
  const streakPulse = streak >= 5

  if (predictions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🎯</div>
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
        {streakIcon && <span className={styles.streakIcon}>{streakIcon}</span>}
        <span className={styles.streakLabel}>
          {streak > 0 ? 'поспіль вгаданих гонок' : 'почни прогнозувати!'}
        </span>
      </div>

      {/* ── Stats grid ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statIcon}>🏆</span>
          <span className={styles.statVal}>{totalPoints}</span>
          <span className={styles.statUnit}>pts</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statIcon}>🎯</span>
          <span className={styles.statVal}>{totalSlots > 0 ? `${exactCount}/${totalSlots}` : '—'}</span>
          <span className={styles.statUnit}>точних</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statIcon}>📊</span>
          <span className={styles.statVal}>{racesHappened > 0 ? `${completed.length}/${racesHappened}` : '—'}</span>
          <span className={styles.statUnit}>гонок</span>
        </div>
      </div>

      {/* ── Race-by-race list ── */}
      <div className={styles.listSection}>
        <div className={styles.listTitle}>ГОНКА ЗА ГОНКОЮ</div>

        {raceList.map(race => {
          const pred   = predictions.find(p => p.raceId === toRaceId(race))
          const isPast = race.date < today
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
                  <span className={styles.raceIcon}>{hits >= 2 ? '✅' : '❌'}</span>
                  <span className={styles.raceHits}>{hits}/3</span>
                  <span className={isPerfect ? styles.perfectPts : styles.racePts}>
                    +{pred.result.points} pts
                  </span>
                  {isPerfect && <span className={styles.perfectStar}>🌟</span>}
                </span>
              ) : pred && isPast ? (
                <span className={styles.racePending}>⏳ очікуємо</span>
              ) : !pred && isPast ? (
                <span className={styles.raceSkipped}>— не передбачено</span>
              ) : pred ? (
                <span className={styles.racePending}>⏳ збережено</span>
              ) : (
                <span className={styles.raceFuture}>— очікується —</span>
              )}
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
                {bestRace.result?.points === 30 ? ' 🌟' : ''}
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
