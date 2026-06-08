import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import { useF1PredictionsStore, toRaceId, isRaceLocked } from '../../../store/f1PredictionsStore'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import { useLastRace } from '../LastRaceCard'
import styles from './RacePredictionCard.module.css'

/**
 * RacePredictionCard
 * ------------------
 * Картка прогнозу на наступну гонку. Максимум 43 pts за гонку.
 * Секції: топ-3 (tab picker), конструктор (10 команд), DOTD, Safety Car.
 * Persist у backend. Auto-check p1/p2/p3 через useLastRace.
 *
 * Props:
 * @prop {F1Race} race — наступна гонка (nextRace з F1_SEASON_2026)
 */

interface Driver {
  driverId: string
  code:     string
  photoUrl?: string
}

const TEAMS = [
  { id: 'mercedes', name: 'Mercedes', color: '#00D2BE' },
  { id: 'ferrari',  name: 'Ferrari',  color: '#DC0000' },
  { id: 'redbull',  name: 'Red Bull', color: '#0600EF' },
  { id: 'mclaren',  name: 'McLaren',  color: '#FF8000' },
  { id: 'aston',    name: 'Aston',    color: '#006F62' },
  { id: 'alpine',   name: 'Alpine',   color: '#0090FF' },
  { id: 'williams', name: 'Williams', color: '#005AFF' },
  { id: 'haas',     name: 'Haas',     color: '#B6BABD' },
  { id: 'rb',       name: 'RB',       color: '#1434CB' },
  { id: 'sauber',   name: 'Sauber',   color: '#00CF46' },
]

const POSITIONS = ['p1', 'p2', 'p3'] as const

function hoursToRace(date: string): number {
  const ms = new Date(date + 'T13:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.floor(ms / 3_600_000))
}

interface Props { race: F1Race }

const RacePredictionCard: React.FC<Props> = ({ race }) => {
  const { predictions, savePrediction, checkResult } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()
  const { data: lastRace } = useLastRace()

  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [p3, setP3] = useState('')
  const [constructorPick, setConstructorPick] = useState<string | null>(null)
  const [driverOfTheDay,  setDriverOfTheDay]  = useState<string | null>(null)
  const [safetyCarPick,   setSafetyCarPick]   = useState<boolean | null>(null)
  const [editing,   setEditing]   = useState(false)
  const [activePos, setActivePos] = useState<'p1' | 'p2' | 'p3'>('p1')

  // Auto-check top-3 when last race data arrives
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

  const latestResult = [...predictions]
    .filter(p => p.result && p.raceRound < race.round)
    .sort((a, b) => b.raceRound - a.raceRound)[0]

  const showResultFor    = currentPred?.result ? currentPred : (latestResult ?? null)
  const resultForCurrent = showResultFor === currentPred
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
  const teamOf  = (id: string) => driverById(id)?.team_name ?? ''
  const getCode = (id: string) => driverById(id)?.broadcast_name ?? id

  const driverList: Driver[] = validDrivers.map(d => ({
    driverId: d.driverId!,
    code:     d.broadcast_name,
    photoUrl: d.headshot_url
      ? `https://images.weserv.nl/?url=${encodeURIComponent(d.headshot_url)}&w=72&h=72&fit=cover&a=top`
      : undefined,
  }))

  const [hoursLeft] = useState(() => hoursToRace(race.date))
  const lockText = locked
    ? '🔒 Прогноз закрито'
    : hoursLeft <= 24
    ? `⏱ Закривається через ${hoursLeft} год`
    : null

  const preds   = { p1, p2, p3 }
  const setters = { p1: setP1, p2: setP2, p3: setP3 }

  const handleSelect = (driverId: string) => {
    setters[activePos](driverId)
    const nextEmpty = POSITIONS.find(p => p !== activePos && !preds[p])
    if (nextEmpty) setActivePos(nextEmpty)
  }

  const handleSave = () => {
    if (!p1 || !p2 || !p3 || new Set([p1, p2, p3]).size < 3) return
    savePrediction(race, p1, p2, p3, constructorPick, driverOfTheDay, safetyCarPick)
    setEditing(false)
  }

  const handleEdit = () => {
    if (currentPred) {
      setP1(currentPred.p1); setP2(currentPred.p2); setP3(currentPred.p3)
      setConstructorPick(currentPred.constructorPick)
      setDriverOfTheDay(currentPred.driverOfTheDay)
      setSafetyCarPick(currentPred.safetyCarPick)
    }
    setActivePos('p1')
    setEditing(true)
  }

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
          {showResultFor.result!.constructorMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>КОН</span>
              <span className={styles.resultDriver}>{showResultFor.constructorPick}</span>
              <span className={showResultFor.result!.constructorMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.constructorMatch ? '✅ +5 pts' : '❌'}
              </span>
            </div>
          )}
          {showResultFor.result!.dotdMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>DOTD</span>
              <span className={styles.resultDriver}>{getCode(showResultFor.driverOfTheDay ?? '')}</span>
              <span className={showResultFor.result!.dotdMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.dotdMatch ? '✅ +5 pts' : '❌'}
              </span>
            </div>
          )}
          {showResultFor.result!.scMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>SC</span>
              <span className={styles.resultDriver}>{showResultFor.safetyCarPick ? 'ТАК' : 'НІ'}</span>
              <span className={showResultFor.result!.scMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.scMatch ? '✅ +3 pts' : '❌'}
              </span>
            </div>
          )}
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

      {/* ── Divider ── */}
      {showResultFor && showPredForm && <div className={styles.divider} />}

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
          {currentPred.constructorPick && (
            <div className={styles.savedRow}>
              <span className={styles.posLabel}>КОН</span>
              <span className={styles.savedDriver}>{TEAMS.find(t => t.id === currentPred.constructorPick)?.name ?? currentPred.constructorPick}</span>
            </div>
          )}
          {currentPred.driverOfTheDay && (
            <div className={styles.savedRow}>
              <span className={styles.posLabel}>DOTD</span>
              <span className={styles.savedDriver}>{getCode(currentPred.driverOfTheDay)}</span>
            </div>
          )}
          {currentPred.safetyCarPick !== null && (
            <div className={styles.savedRow}>
              <span className={styles.posLabel}>SC</span>
              <span className={styles.savedDriver}>{currentPred.safetyCarPick ? 'ТАК' : 'НІ'}</span>
            </div>
          )}
          {locked
            ? <p className={styles.lockNote}>🔒 Прогноз закрито</p>
            : <button className={styles.changeBtn} onClick={handleEdit}>Змінити</button>
          }
        </>
      )}

      {/* ── Input mode ── */}
      {showPredForm && (!currentPred || editing) && (
        <>
          {/* Top-3 */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              ТОП-3 ФІНІШУ
              <span className={styles.pts}>до +30 pts</span>
            </p>
            <div className={styles.posTabs}>
              {POSITIONS.map((pos, i) => (
                <button
                  key={pos}
                  type="button"
                  className={`${styles.posTab} ${activePos === pos ? styles.posTabActive : ''}`}
                  onClick={() => setActivePos(pos)}
                >
                  <span className={styles.posTabLabel}>P{i + 1}</span>
                  {preds[pos]
                    ? <span className={styles.posSelected}>{getCode(preds[pos])}</span>
                    : <span className={styles.posEmpty}>—</span>
                  }
                </button>
              ))}
            </div>
            <div className={styles.driversRow}>
              {driverList.map(d => {
                const isSelected = preds[activePos] === d.driverId
                const isUsed     = Object.values(preds).includes(d.driverId) && !isSelected
                return (
                  <button
                    key={d.driverId}
                    type="button"
                    disabled={locked}
                    className={`${styles.driverChip} ${isSelected ? styles.driverChipSelected : ''} ${isUsed ? styles.driverChipUsed : ''}`}
                    onClick={() => handleSelect(d.driverId)}
                  >
                    <div className={styles.chipAvatar}>
                      {d.photoUrl && (
                        <img src={d.photoUrl} alt={d.code} onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                    </div>
                    <span className={styles.chipCode}>{d.code}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Constructor */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              КОНСТРУКТОР ГОНКИ
              <span className={styles.pts}>+5 pts</span>
            </p>
            <div className={styles.teamsRow}>
              {TEAMS.map(team => (
                <button
                  key={team.id}
                  type="button"
                  disabled={locked}
                  className={`${styles.teamChip} ${constructorPick === team.id ? styles.teamChipActive : ''}`}
                  onClick={() => setConstructorPick(constructorPick === team.id ? null : team.id)}
                >
                  <div className={styles.teamColor} style={{ background: team.color }} />
                  <span className={styles.teamName}>{team.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Driver of the Day */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              DRIVER OF THE DAY
              <span className={styles.pts}>+5 pts</span>
            </p>
            <div className={styles.driversRow}>
              {driverList.map(d => (
                <button
                  key={d.driverId}
                  type="button"
                  disabled={locked}
                  className={`${styles.driverChip} ${driverOfTheDay === d.driverId ? styles.driverChipSelected : ''}`}
                  onClick={() => setDriverOfTheDay(driverOfTheDay === d.driverId ? null : d.driverId)}
                >
                  <div className={styles.chipAvatar}>
                    {d.photoUrl && (
                      <img src={d.photoUrl} alt={d.code} onError={e => { e.currentTarget.style.display = 'none' }} />
                    )}
                  </div>
                  <span className={styles.chipCode}>{d.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Safety Car */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              SAFETY CAR?
              <span className={styles.pts}>+3 pts</span>
            </p>
            <div className={styles.boolPicker}>
              <button
                type="button"
                disabled={locked}
                className={`${styles.boolBtn} ${safetyCarPick === true ? styles.boolBtnActive : ''}`}
                onClick={() => setSafetyCarPick(safetyCarPick === true ? null : true)}
              >
                ТАК
              </button>
              <button
                type="button"
                disabled={locked}
                className={`${styles.boolBtn} ${safetyCarPick === false ? styles.boolBtnActive : ''}`}
                onClick={() => setSafetyCarPick(safetyCarPick === false ? null : false)}
              >
                НІ
              </button>
            </div>
          </div>

          {/* Max pts */}
          <div className={styles.maxPts}>
            <span className={styles.maxPtsLabel}>МАКС ЗА ГОНКУ</span>
            <span className={styles.maxPtsNum}>43 pts</span>
          </div>

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
