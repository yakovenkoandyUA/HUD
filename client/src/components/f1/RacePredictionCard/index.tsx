import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import { useF1PredictionsStore, toRaceId, isRaceLocked } from '../../../store/f1PredictionsStore'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import { useLastRace } from '../LastRaceCard'
import styles from './RacePredictionCard.module.css'

/**
 * RacePredictionCard
 * ------------------
 * Картка прогнозу на наступну гонку.
 * Три стани: введення (до збереження), збережено (до гонки), результат (після).
 * Дані пілотів з useChampionshipStandings. Auto-check через useLastRace.
 * Persist у localStorage (f1-predictions-storage).
 *
 * Props:
 * @prop {F1Race} race — наступна гонка (nextRace з F1_SEASON_2026)
 */

interface Props {
  race: F1Race
}

const POSITIONS = ['p1', 'p2', 'p3'] as const

const RacePredictionCard: React.FC<Props> = ({ race }) => {
  const { predictions, savePrediction, checkResult } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()
  const { data: lastRace } = useLastRace()

  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [p3, setP3] = useState('')
  const [editing, setEditing] = useState(false)

  // Auto-check: когда последние данные гонки загружены
  useEffect(() => {
    if (!lastRace || lastRace.podium.length < 3) return
    const id0 = lastRace.podium[0].driverId
    const id1 = lastRace.podium[1].driverId
    const id2 = lastRace.podium[2].driverId
    if (!id0 || !id1 || !id2) return
    const raceId = `${lastRace.date.slice(0, 4)}-r${lastRace.round}`
    checkResult(raceId, id0, id1, id2)
  }, [lastRace]) // eslint-disable-line react-hooks/exhaustive-deps

  const raceId      = toRaceId(race)
  const locked      = isRaceLocked(race)
  const currentPred = predictions.find(p => p.raceId === raceId)

  // Most recently scored prediction from a past race
  const latestResult = [...predictions]
    .filter(p => p.result && p.raceRound < race.round)
    .sort((a, b) => b.raceRound - a.raceRound)[0]

  // What to display: result for current race (race-day edge case) or last scored
  const showResultFor    = currentPred?.result ? currentPred : (latestResult ?? null)
  const resultForCurrent = showResultFor === currentPred
  // Don't show prediction form when current race result is just in
  const showPredForm     = !currentPred?.result

  // Helpers
  const validDrivers = drivers.filter(d => d.driverId)
  const driverById   = (id: string) => validDrivers.find(d => d.driverId === id)
  const lastName     = (id: string) => {
    const d = driverById(id)
    if (!d) return id
    const parts = d.full_name.trim().split(' ')
    return parts[parts.length - 1]
  }
  const teamOf = (id: string) => driverById(id)?.team_name ?? ''

  const msToRace  = new Date(race.date + 'T13:00:00Z').getTime() - Date.now()
  const hoursLeft = Math.max(0, Math.floor(msToRace / 3_600_000))
  const lockText  = locked
    ? '🔒 Прогноз закрито'
    : hoursLeft <= 24
    ? `⏱ Закривається через ${hoursLeft} год`
    : null

  const handleSave = () => {
    if (!p1 || !p2 || !p3 || new Set([p1, p2, p3]).size < 3) return
    savePrediction(race, p1, p2, p3)
    setEditing(false)
  }

  const handleEdit = () => {
    if (currentPred) { setP1(currentPred.p1); setP2(currentPred.p2); setP3(currentPred.p3) }
    setEditing(true)
  }

  const pValues  = [p1, p2, p3]
  const pSetters = [setP1, setP2, setP3]

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.icon}>🎯</span>
        <span className={styles.title}>МІЙ ПРОГНОЗ</span>
        <span className={styles.dot}>·</span>
        <span className={styles.gpName}>{race.name.toUpperCase()}</span>
        {currentPred && !editing && <span className={styles.savedMark}>✓</span>}
      </div>

      {/* ── Result section ── */}
      {showResultFor && (
        <div className={styles.resultBlock}>
          {!resultForCurrent && (
            <div className={styles.resultRaceLabel}>{showResultFor.raceName}</div>
          )}
          {POSITIONS.map((pos, i) => {
            const driverId  = showResultFor[pos]
            const matchKey  = `${pos}Match` as 'p1Match'
            const actualKey = `actual${pos.charAt(0).toUpperCase()}${pos.slice(1)}` as 'actualP1'
            const match     = showResultFor.result![matchKey]
            const actualId  = showResultFor.result![actualKey]
            return (
              <div key={pos} className={styles.resultRow}>
                <span className={styles.posLabel}>P{i + 1}</span>
                <span className={styles.resultDriver}>{lastName(driverId)}</span>
                <span className={
                  match === 'exact'   ? styles.matchExact :
                  match === 'partial' ? styles.matchPartial :
                                        styles.matchMiss
                }>
                  {match === 'exact'   ? '✅ +10 pts'              :
                   match === 'partial' ? '🔄 +5 pts'               :
                                        `❌ (був ${lastName(actualId)})`}
                </span>
              </div>
            )
          })}
          <div className={styles.resultTotal}>
            Результат:&nbsp;
            <span className={styles.resultScore}>
              {[showResultFor.result!.p1Match, showResultFor.result!.p2Match, showResultFor.result!.p3Match]
                .filter(m => m !== 'miss').length}/3
            </span>
            &nbsp;·&nbsp;
            <span className={styles.resultPts}>+{showResultFor.result!.points} pts 🏆</span>
          </div>
        </div>
      )}

      {/* ── Divider when showing result + prediction form ── */}
      {showResultFor && showPredForm && (
        <div className={styles.divider} />
      )}

      {/* ── Saved mode ── */}
      {showPredForm && currentPred && !editing && (
        <>
          {POSITIONS.map((pos, i) => (
            <div key={pos} className={styles.savedRow}>
              <span className={styles.posLabel}>P{i + 1}</span>
              <span className={styles.savedDriver}>{lastName(currentPred[pos])}</span>
              <span className={styles.savedTeam}>· {teamOf(currentPred[pos])}</span>
            </div>
          ))}
          {locked
            ? <p className={styles.lockNote}>🔒 Прогноз закрито</p>
            : <button className={styles.changeBtn} onClick={handleEdit}>Змінити</button>
          }
        </>
      )}

      {/* ── Input mode ── */}
      {showPredForm && (!currentPred || editing) && (
        <>
          {POSITIONS.map((pos, i) => {
            const value  = pValues[i]
            const setter = pSetters[i]
            const others = pValues.filter((_, j) => j !== i)
            return (
              <div key={pos} className={styles.selectRow}>
                <span className={styles.posLabel}>P{i + 1}</span>
                <select
                  className={styles.select}
                  value={value}
                  disabled={locked}
                  onChange={e => setter(e.target.value)}
                >
                  <option value=''>Оберіть пілота</option>
                  {validDrivers.map(d => (
                    <option
                      key={d.driverId}
                      value={d.driverId!}
                      disabled={others.includes(d.driverId!)}
                    >
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}

          {lockText && <p className={styles.lockNote}>{lockText}</p>}

          {!locked && (
            <button
              className={styles.saveBtn}
              disabled={!p1 || !p2 || !p3 || new Set([p1, p2, p3]).size < 3}
              onClick={handleSave}
            >
              {editing ? 'Оновити прогноз' : 'Зберегти прогноз'}
            </button>
          )}
        </>
      )}

    </div>
  )
}

export default RacePredictionCard
