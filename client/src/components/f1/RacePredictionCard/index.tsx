import React, { useEffect, useState } from 'react'
import type { F1Race } from '../../../data/f1Season2026'
import { useF1PredictionsStore, toRaceId, isRaceLocked } from '../../../store/f1PredictionsStore'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import { useLastRace } from '../LastRaceCard'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './RacePredictionCard.module.css'

/**
 * RacePredictionCard
 * ------------------
 * Картка прогнозу на наступну гонку. Максимум 43 pts за гонку.
 * Секції: топ-3 (positionSlots + driverScroll), конструктор (chipScroll),
 * DOTD (driverScroll), Safety Car (toggleRow).
 * Collapsed summary після збереження; form якщо немає прогнозу.
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

const CONSTRUCTORS = [
  { id: 'mercedes',     short: 'MER', color: '#00D2BE' },
  { id: 'ferrari',      short: 'FER', color: '#E8002D' },
  { id: 'red_bull',     short: 'RBR', color: '#3671C6' },
  { id: 'mclaren',      short: 'MCL', color: '#FF8000' },
  { id: 'aston_martin', short: 'AMR', color: '#229971' },
  { id: 'alpine',       short: 'ALP', color: '#FF87BC' },
  { id: 'williams',     short: 'WIL', color: '#64C4FF' },
  { id: 'haas',         short: 'HAA', color: '#B6BABD' },
  { id: 'racing_bulls', short: 'RBU', color: '#6692FF' },
  { id: 'audi',         short: 'AUD', color: '#BB0000' },
]

const POSITIONS = ['p1', 'p2', 'p3'] as const
type Pos = typeof POSITIONS[number]

function hoursToRace(date: string): number {
  const ms = new Date(date + 'T13:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.floor(ms / 3_600_000))
}

interface Props { race: F1Race }

const RacePredictionCard: React.FC<Props> = ({ race }) => {
  const { predictions, savePrediction, checkResult } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()
  const { data: lastRace } = useLastRace()

  const raceId      = toRaceId(race)
  const locked      = isRaceLocked(race)
  const currentPred = predictions.find(p => p.raceId === raceId)

  const [isEditing, setIsEditing] = useState(() => !predictions.find(p => p.raceId === raceId))
  const [p1, setP1] = useState(currentPred?.p1 ?? '')
  const [p2, setP2] = useState(currentPred?.p2 ?? '')
  const [p3, setP3] = useState(currentPred?.p3 ?? '')
  const [constructorPick, setConstructorPick] = useState<string | null>(currentPred?.constructorPick ?? null)
  const [driverOfTheDay,  setDriverOfTheDay]  = useState<string | null>(currentPred?.driverOfTheDay ?? null)
  const [safetyCarPick,   setSafetyCarPick]   = useState<boolean | null>(currentPred?.safetyCarPick ?? null)
  const [activePos, setActivePos] = useState<Pos>('p1')
  const [hoursLeft] = useState(() => hoursToRace(race.date))

  useEffect(() => {
    if (!lastRace || lastRace.podium.length < 3) return
    const id0 = lastRace.podium[0].driverId
    const id1 = lastRace.podium[1].driverId
    const id2 = lastRace.podium[2].driverId
    if (!id0 || !id1 || !id2) return
    const rId = `${lastRace.date.slice(0, 4)}-r${lastRace.round}`
    checkResult(rId, id0, id1, id2)
  }, [lastRace]) // eslint-disable-line react-hooks/exhaustive-deps

  const validDrivers = drivers.filter(d => d.driverId)
  const driverById   = (id: string) => validDrivers.find(d => d.driverId === id)
  const lastName     = (id: string) => {
    const d = driverById(id)
    if (!d) return id
    const parts = d.full_name.trim().split(' ')
    return parts[parts.length - 1]
  }
  const getCode = (id: string) => driverById(id)?.broadcast_name ?? id

  const driverList: Driver[] = validDrivers.map(d => {
    const f1Url = getDriverHeadshot(d.driverId!)
    const rawUrl = f1Url ?? d.headshot_url
    return {
      driverId: d.driverId!,
      code:     d.broadcast_name,
      photoUrl: rawUrl
        ? `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}&w=72&h=72&fit=cover&a=top`
        : undefined,
    }
  })

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
    setIsEditing(false)
  }

  const handleEdit = () => {
    if (currentPred) {
      setP1(currentPred.p1); setP2(currentPred.p2); setP3(currentPred.p3)
      setConstructorPick(currentPred.constructorPick)
      setDriverOfTheDay(currentPred.driverOfTheDay)
      setSafetyCarPick(currentPred.safetyCarPick)
    }
    setActivePos('p1')
    setIsEditing(true)
  }

  const lockText = locked
    ? '🔒 Прогноз закрито'
    : hoursLeft <= 24 ? `⏱ Закривається через ${hoursLeft} год` : null

  const latestResult = [...predictions]
    .filter(p => p.result && p.raceRound < race.round)
    .sort((a, b) => b.raceRound - a.raceRound)[0]

  const showResultFor    = currentPred?.result ? currentPred : (latestResult ?? null)
  const resultForCurrent = showResultFor === currentPred
  const showPredForm     = !currentPred?.result

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.icon}>🎯</span>
        <span className={styles.title}>МІЙ ПРОГНОЗ</span>
        <span className={styles.dot}>·</span>
        <span className={styles.gpName}>{race.name.toUpperCase()}</span>
        {currentPred && !isEditing && <span className={styles.savedMark}>✓</span>}
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
                  match === 'exact'   ? styles.matchExact   :
                  match === 'partial' ? styles.matchPartial :
                                        styles.matchMiss
                }>
                  {match === 'exact'   ? '✅ +10 pts'                :
                   match === 'partial' ? '🔄 +5 pts'                 :
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

      {showResultFor && showPredForm && <div className={styles.divider} />}

      {/* ── Summary (collapsed saved prediction) ── */}
      {showPredForm && currentPred && !isEditing && (
        <div className={styles.summary}>
          <div className={styles.summaryPodium}>
            {POSITIONS.map((pos, i) => (
              <div key={pos} className={styles.summarySlot}>
                <span className={styles.summaryPos}>P{i + 1}</span>
                <span className={styles.summaryName}>{getCode(currentPred[pos])}</span>
              </div>
            ))}
          </div>
          {(currentPred.constructorPick || currentPred.driverOfTheDay || currentPred.safetyCarPick !== null) && (
            <div className={styles.summaryMeta}>
              {currentPred.constructorPick && (() => {
                const con = CONSTRUCTORS.find(c => c.id === currentPred.constructorPick)
                return (
                  <span className={styles.metaChip}>
                    <span className={styles.metaDot} style={{ background: con?.color }} />
                    {con?.short ?? currentPred.constructorPick}
                  </span>
                )
              })()}
              {currentPred.driverOfTheDay && (
                <span className={styles.metaChip}>⭐ {getCode(currentPred.driverOfTheDay)}</span>
              )}
              {currentPred.safetyCarPick !== null && (
                <span className={styles.metaChip}>
                  🚗 {currentPred.safetyCarPick ? 'SC: ТАК' : 'SC: НІ'}
                </span>
              )}
            </div>
          )}
          {locked
            ? <p className={styles.lockNote}>🔒 Прогноз закрито</p>
            : <button className={styles.changeBtn} onClick={handleEdit}>Редагувати</button>
          }
        </div>
      )}

      {/* ── Form (input mode) ── */}
      {showPredForm && (!currentPred || isEditing) && (
        <>
          {/* Top-3 */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              ТОП-3 ФІНІШУ
              <span className={styles.pts}>до +30 pts</span>
            </p>
            <div className={styles.positionSlots}>
              {POSITIONS.map((pos, i) => {
                const selId     = preds[pos]
                const selDriver = selId ? driverList.find(d => d.driverId === selId) : null
                return (
                  <button
                    key={pos}
                    type="button"
                    className={`${styles.posSlot} ${activePos === pos ? styles.posSlotActive : ''}`}
                    onClick={() => setActivePos(pos)}
                  >
                    <span className={styles.posSlotLabel}>P{i + 1}</span>
                    {selDriver ? (
                      <>
                        <div className={styles.posSlotAvatar}>
                          {selDriver.photoUrl && (
                            <img
                              src={selDriver.photoUrl}
                              alt={selDriver.code}
                              onError={e => { e.currentTarget.style.display = 'none' }}
                            />
                          )}
                        </div>
                        <span className={styles.posSlotCode}>{selDriver.code}</span>
                      </>
                    ) : (
                      <span className={styles.posSlotEmpty}>—</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className={styles.driverScroll}>
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
              КОНСТРУКТОР
              <span className={styles.pts}>+5 pts</span>
            </p>
            <div className={styles.chipScroll}>
              {CONSTRUCTORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  disabled={locked}
                  className={`${styles.teamChip} ${constructorPick === c.id ? styles.teamChipActive : ''}`}
                  style={{ '--tc': c.color } as React.CSSProperties}
                  onClick={() => setConstructorPick(constructorPick === c.id ? null : c.id)}
                >
                  <span className={styles.teamChipDot} />
                  <span className={styles.teamChipCode}>{c.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DOTD */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              DRIVER OF THE DAY
              <span className={styles.pts}>+5 pts</span>
            </p>
            <div className={styles.driverScroll}>
              {driverList.map(d => {
                const isSelected = driverOfTheDay === d.driverId
                return (
                  <button
                    key={d.driverId}
                    type="button"
                    disabled={locked}
                    className={`${styles.driverChip} ${isSelected ? styles.driverChipSelected : ''}`}
                    onClick={() => setDriverOfTheDay(isSelected ? null : d.driverId)}
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

          {/* Safety Car */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>
              SAFETY CAR?
              <span className={styles.pts}>+3 pts</span>
            </p>
            <div className={styles.toggleRow}>
              <button
                type="button"
                disabled={locked}
                className={`${styles.toggleChip} ${safetyCarPick === true ? styles.toggleChipActive : ''}`}
                onClick={() => setSafetyCarPick(safetyCarPick === true ? null : true)}
              >
                ТАК
              </button>
              <button
                type="button"
                disabled={locked}
                className={`${styles.toggleChip} ${safetyCarPick === false ? styles.toggleChipActive : ''}`}
                onClick={() => setSafetyCarPick(safetyCarPick === false ? null : false)}
              >
                НІ
              </button>
            </div>
          </div>

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
              {isEditing && currentPred ? 'Оновити прогноз' : 'Зберегти прогноз'}
            </button>
          )}
        </>
      )}

    </div>
  )
}

export default RacePredictionCard
