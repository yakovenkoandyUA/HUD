import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { F1Race } from '../../../data/f1Season2026'
import { useF1PredictionsStore, toRaceId, isRaceLocked } from '@/features/f1/store/f1PredictionsStore'
import { useChampionshipStandings } from '../../../hooks/useChampionshipStandings'
import { useLastRace } from '../LastRaceCard'
import { getDriverHeadshot } from '../../../utils/f1'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import styles from './RacePredictionCard.module.css'

/**
 * RacePredictionCard
 * ------------------
 * Форма прогнозу на наступну гонку (максимум 43 pts).
 * Секції: топ-3 (slot picker sheet), конструктор (chip scroll),
 * DOTD (driver scroll), Safety Car (segmented toggle).
 * Sticky CTA footer через portal.
 * Collapsed summary після збереження; form якщо немає прогнозу.
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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  )
}

interface Props { race: F1Race }

const RacePredictionCard: React.FC<Props> = ({ race }) => {
  const { predictions, savePrediction, checkResult } = useF1PredictionsStore()
  const { drivers } = useChampionshipStandings()
  const { data: lastRace } = useLastRace()

  const raceId      = toRaceId(race)
  const locked      = isRaceLocked(race)
  const currentPred = predictions.find(p => p.raceId === raceId)

  const [isEditing, setIsEditing]         = useState(() => !predictions.find(p => p.raceId === raceId))
  const [p1, setP1]                       = useState(currentPred?.p1 ?? '')
  const [p2, setP2]                       = useState(currentPred?.p2 ?? '')
  const [p3, setP3]                       = useState(currentPred?.p3 ?? '')
  const [constructorPick, setConstructorPick] = useState<string | null>(currentPred?.constructorPick ?? null)
  const [driverOfTheDay,  setDriverOfTheDay]  = useState<string | null>(currentPred?.driverOfTheDay ?? null)
  const [safetyCarPick,   setSafetyCarPick]   = useState<boolean | null>(currentPred?.safetyCarPick ?? null)
  const [pickerPos, setPickerPos]         = useState<Pos | null>(null)
  const [hoursLeft] = useState(() => hoursToRace(race.date))

  const pickerOverlayRef = useRef<HTMLDivElement>(null)
  const pickerSheetRef   = useSwipeToDismiss(() => setPickerPos(null), {
    enabled: pickerPos !== null,
    overlayRef: pickerOverlayRef,
  })

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

  const handlePickerSelect = (driverId: string) => {
    if (!pickerPos) return
    setters[pickerPos](driverId)
    const updated = { ...preds, [pickerPos]: driverId }
    const nextEmpty = POSITIONS.find(p => !updated[p])
    setPickerPos(nextEmpty ?? null)
  }

  const handleSave = () => {
    if (!p1 || !p2 || !p3 || new Set([p1, p2, p3]).size < 3) return
    savePrediction(race, p1, p2, p3, constructorPick, driverOfTheDay, safetyCarPick)
    useAchievementsStore.getState().unlock('first-prediction')
    setIsEditing(false)
  }

  const handleEdit = () => {
    if (currentPred) {
      setP1(currentPred.p1); setP2(currentPred.p2); setP3(currentPred.p3)
      setConstructorPick(currentPred.constructorPick)
      setDriverOfTheDay(currentPred.driverOfTheDay)
      setSafetyCarPick(currentPred.safetyCarPick)
    }
    setPickerPos(null)
    setIsEditing(true)
  }

  const latestResult = [...predictions]
    .filter(p => p.result && p.raceRound < race.round)
    .sort((a, b) => b.raceRound - a.raceRound)[0]

  const showResultFor    = currentPred?.result ? currentPred : (latestResult ?? null)
  const resultForCurrent = showResultFor === currentPred
  const showPredForm     = !currentPred?.result
  const showForm         = showPredForm && (!currentPred || isEditing)
  const canSave          = !locked && showForm && !!p1 && !!p2 && !!p3 && new Set([p1, p2, p3]).size === 3

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.headerIcon}>
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
        </svg>
        <span className={styles.title}>МІЙ ПРОГНОЗ</span>
        <span className={styles.dot}>·</span>
        <span className={styles.gpName}>{race.name.toUpperCase()}</span>
        {currentPred && !isEditing && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.savedMark} aria-label="збережено">
            <path d="M2 6l2.8 3L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
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
                  {match === 'exact'   ? '+10 pts'                    :
                   match === 'partial' ? '+5 pts'                     :
                                        `× ${lastName(actualId)}`}
                </span>
              </div>
            )
          })}
          {showResultFor.result!.constructorMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>КОН</span>
              <span className={styles.resultDriver}>{showResultFor.constructorPick}</span>
              <span className={showResultFor.result!.constructorMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.constructorMatch ? '+5 pts' : '×'}
              </span>
            </div>
          )}
          {showResultFor.result!.dotdMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>DOTD</span>
              <span className={styles.resultDriver}>{getCode(showResultFor.driverOfTheDay ?? '')}</span>
              <span className={showResultFor.result!.dotdMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.dotdMatch ? '+5 pts' : '×'}
              </span>
            </div>
          )}
          {showResultFor.result!.scMatch !== undefined && (
            <div className={styles.resultRow}>
              <span className={styles.posLabel}>SC</span>
              <span className={styles.resultDriver}>{showResultFor.safetyCarPick ? 'ТАК' : 'НІ'}</span>
              <span className={showResultFor.result!.scMatch ? styles.matchExact : styles.matchMiss}>
                {showResultFor.result!.scMatch ? '+3 pts' : '×'}
              </span>
            </div>
          )}
          <div className={styles.resultTotal}>
            <span className={styles.resultScore}>
              {[showResultFor.result!.p1Match, showResultFor.result!.p2Match, showResultFor.result!.p3Match]
                .filter(m => m !== 'miss').length}/3 влучань
            </span>
            <span className={styles.resultSep}>·</span>
            <span className={styles.resultPts}>+{showResultFor.result!.points} pts</span>
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
                <span className={styles.metaChip}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={styles.metaStarIcon}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {getCode(currentPred.driverOfTheDay)}
                </span>
              )}
              {currentPred.safetyCarPick !== null && (
                <span className={styles.metaChip}>
                  SC {currentPred.safetyCarPick ? 'ТАК' : 'НІ'}
                </span>
              )}
            </div>
          )}
          {locked ? (
            <p className={styles.lockNote}>
              <LockIcon /> Прогноз закрито
            </p>
          ) : (
            <button className={styles.changeBtn} onClick={handleEdit}>Редагувати</button>
          )}
        </div>
      )}

      {/* ── Form (input mode) ── */}
      {showForm && (
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
                    disabled={locked}
                    className={`${styles.posSlot} ${pickerPos === pos ? styles.posSlotActive : ''} ${selDriver ? styles.posSlotFilled : ''}`}
                    onClick={() => setPickerPos(pos)}
                  >
                    <span className={styles.posSlotLabel}>P{i + 1}</span>
                    {selDriver ? (
                      <>
                        <div className={styles.posSlotAvatar}>
                          {selDriver.photoUrl && (
                            <img src={selDriver.photoUrl} alt={selDriver.code}
                              onError={e => { e.currentTarget.style.display = 'none' }} />
                          )}
                        </div>
                        <span className={styles.posSlotCode}>{selDriver.code}</span>
                      </>
                    ) : (
                      <span className={styles.posSlotEmpty}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      </span>
                    )}
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

          {/* Safety Car — segmented toggle */}
          <div className={styles.section}>
            <div className={styles.scRow}>
              <p className={styles.sectionLabel} style={{ margin: 0 }}>
                SAFETY CAR?
                <span className={styles.pts}>+3 pts</span>
              </p>
              <div className={styles.scToggle}>
                <button
                  type="button"
                  disabled={locked}
                  className={`${styles.scSegment} ${safetyCarPick === false ? styles.scSegmentActive : ''}`}
                  onClick={() => setSafetyCarPick(safetyCarPick === false ? null : false)}
                >
                  НІ
                </button>
                <button
                  type="button"
                  disabled={locked}
                  className={`${styles.scSegment} ${safetyCarPick === true ? styles.scSegmentActiveYes : ''}`}
                  onClick={() => setSafetyCarPick(safetyCarPick === true ? null : true)}
                >
                  ТАК
                </button>
              </div>
            </div>
          </div>

          {/* Deadline / lock note */}
          {locked ? (
            <p className={styles.lockNote}><LockIcon /> Прогноз закрито</p>
          ) : hoursLeft <= 24 ? (
            <p className={styles.lockNote}><ClockIcon /> Закривається через {hoursLeft} год</p>
          ) : null}
        </>
      )}

      {/* ── Driver picker sheet ── */}
      {pickerPos !== null && createPortal(
        <div className={styles.pickerOverlay} ref={pickerOverlayRef} onClick={() => setPickerPos(null)}>
          <div className={styles.pickerSheet} ref={pickerSheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.pickerHandle} />
            <div className={styles.pickerHeader}>
              <span className={styles.pickerPos}>P{POSITIONS.indexOf(pickerPos) + 1}</span>
              <span className={styles.pickerTitle}>Виберіть пілота</span>
              {preds[pickerPos] && (
                <button type="button" className={styles.pickerClear} onClick={() => { setters[pickerPos]('') }}>
                  Очистити
                </button>
              )}
            </div>
            <div className={styles.pickerGrid}>
              {driverList.map(d => {
                const isSelected = preds[pickerPos] === d.driverId
                const isUsed     = Object.values(preds).includes(d.driverId) && !isSelected
                return (
                  <button
                    key={d.driverId}
                    type="button"
                    className={`${styles.pickerChip} ${isSelected ? styles.pickerChipSelected : ''} ${isUsed ? styles.pickerChipUsed : ''}`}
                    onClick={() => handlePickerSelect(d.driverId)}
                  >
                    <div className={styles.pickerChipAvatar}>
                      {d.photoUrl && (
                        <img src={d.photoUrl} alt={d.code} onError={e => { e.currentTarget.style.display = 'none' }} />
                      )}
                    </div>
                    <span className={styles.pickerChipCode}>{d.code}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Sticky save footer ── */}
      {showForm && !locked && createPortal(
        <div className={styles.stickyFooter}>
          <div className={styles.stickyMeta}>
            <span className={styles.stickyMetaLabel}>МАКСИМУМ</span>
            <span className={styles.stickyMetaVal}>43 pts</span>
          </div>
          <button
            className={styles.saveBtn}
            disabled={!canSave}
            onClick={handleSave}
          >
            {isEditing && currentPred ? 'Оновити прогноз' : 'Зберегти прогноз'}
          </button>
        </div>,
        document.body
      )}

    </div>
  )
}

export default RacePredictionCard
