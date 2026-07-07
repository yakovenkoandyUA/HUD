import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { F1Race } from '../../../data/f1Season2026'
import TrackSVG from '../TrackSVG'
import { getDriverHeadshot } from '../../../utils/f1'
import styles from './RaceCalendarList.module.css'

/**
 * RaceCalendarList
 * ----------------
 * Повний список Гран Прі сезону.
 * Пройдені — згорнута секція, клік → bottom sheet з результатами.
 * Майбутні — list або grid режим (toggle + localStorage persist).
 *
 * Props:
 * @prop {F1Race[]} races     — повний список гонок
 * @prop {number}   nextRound — номер наступної гонки
 */

interface PodiumDriver {
  code:     string
  team:     string
  driverId: string
  gap?:     string
}

interface RaceResult {
  p1:      PodiumDriver
  p2:      PodiumDriver
  p3:      PodiumDriver
  fastest: { code: string; time: string }
  laps:    string
}

interface RaceCalendarListProps {
  races:     F1Race[]
  nextRound: number
}

// ── SheetAvatar ───────────────────────────────────────────────────────────────

type ImgStage = 'direct' | 'proxy' | 'initials'

const SheetAvatar: React.FC<{ driverId: string; code: string; gold?: boolean }> = ({
  driverId, code, gold,
}) => {
  const url = getDriverHeadshot(driverId)
  const [stage, setStage] = useState<ImgStage>(url ? 'direct' : 'initials')
  const size = gold ? 64 : 52

  if (stage === 'initials' || !url) {
    return (
      <div
        className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`}
        style={{ width: size, height: size }}
      >
        <span className={styles.avatarInitials}>{code}</span>
      </div>
    )
  }

  const src = stage === 'proxy'
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}`
    : url

  return (
    <div
      className={`${styles.avatar} ${gold ? styles.avatarGold : ''}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={code}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => { if (stage === 'direct') setStage('proxy'); else setStage('initials') }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDriver(r: any): PodiumDriver {
  return {
    code:     r.Driver?.code ?? '???',
    team:     r.Constructor?.name ?? '',
    driverId: r.Driver?.driverId ?? '',
    gap:      r.Time?.time ?? r.status ?? '',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

const RaceCalendarList: React.FC<RaceCalendarListProps> = ({ races, nextRound }) => {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  const pastRaces   = races.filter(r => r.date < today)
  const futureRaces = races.filter(r => r.date >= today)

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('f1-calendar-view') as 'list' | 'grid') ?? 'list'
  )
  const handleViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    localStorage.setItem('f1-calendar-view', mode)
  }

  const [pastExpanded,   setPastExpanded]   = useState(false)
  const [selectedRace,   setSelectedRace]   = useState<F1Race | null>(null)
  const [raceResult,     setRaceResult]     = useState<RaceResult | null>(null)
  const [loadingResult,  setLoadingResult]  = useState(false)
  const cancelRef = useRef(false)

  const handleClose = () => {
    cancelRef.current = true
    setSelectedRace(null)
    setRaceResult(null)
    setLoadingResult(false)
  }

  const handlePastRaceClick = async (race: F1Race) => {
    cancelRef.current = false
    setSelectedRace(race)
    setRaceResult(null)
    setLoadingResult(true)

    try {
      const res = await fetch(
        `https://api.jolpi.ca/ergast/f1/2026/${race.round}/results.json`
      )
      if (cancelRef.current) return
      const data = await res.json()
      if (cancelRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = data?.MRData?.RaceTable?.Races?.[0]?.Results ?? []
      if (results.length < 3) {
        if (!cancelRef.current) setRaceResult(null)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flResult = results.find((r: any) => r.FastestLap?.rank === '1')

      setRaceResult({
        p1: extractDriver(results[0]),
        p2: extractDriver(results[1]),
        p3: extractDriver(results[2]),
        fastest: {
          code: flResult?.Driver?.code ?? '',
          time: flResult?.FastestLap?.Time?.time ?? '',
        },
        laps: results[0]?.laps ?? '',
      })
    } catch {
      if (!cancelRef.current) setRaceResult(null)
    } finally {
      if (!cancelRef.current) setLoadingResult(false)
    }
  }

  return (
    <>
      <div className={styles.calendar}>

        {/* ── ПРОЙДЕНІ — collapsed ── */}
        {pastRaces.length > 0 && (
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => setPastExpanded(p => !p)}
            >
              <span className={styles.sectionTitle}>ПРОЙДЕНІ</span>
              <span className={styles.sectionCount}>{pastRaces.length}</span>
              <svg
                className={`${styles.chevron} ${pastExpanded ? styles.chevronOpen : ''}`}
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <div className={`${styles.accordionWrap} ${pastExpanded ? styles.accordionOpen : ''}`}>
              <div className={styles.accordionInner}>
                <div className={styles.rows}>
                  {pastRaces.map(race => (
                    <div
                      key={race.round}
                      className={`${styles.row} ${styles.rowPast}`}
                      onClick={() => handlePastRaceClick(race)}
                    >
                      <span className={styles.roundNum}>
                        {String(race.round).padStart(2, '0')}
                      </span>
                      <span className={styles.flag}>{race.flag}</span>
                      <div className={styles.info}>
                        <span className={styles.name}>{race.name}</span>
                        <span className={styles.circuit}>{race.circuit}</span>
                      </div>
                      <span className={styles.date}>{fmtDate(race.date)}</span>
                      {race.trackSvg && (
                        <div className={styles.trackWrap}>
                          <TrackSVG
                            src={race.trackSvg}
                            color="var(--text3)"
                            strokeWidth={1}
                            animated={false}
                            preserveAspectRatio="xMidYMid meet"
                            className={styles.trackSvg}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── МАЙБУТНІ — list or grid ── */}
        <div className={styles.section}>
          <div className={styles.futureHeader}>
            <span className={styles.sectionTitle}>МАЙБУТНІ</span>
            <span className={styles.sectionCount}>{futureRaces.length}</span>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.toggleBtnActive : ''}`}
                onClick={() => handleViewMode('list')}
                aria-label="Список"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
              </button>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleBtnActive : ''}`}
                onClick={() => handleViewMode('grid')}
                aria-label="Сітка"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div key="grid" className={`${styles.grid} ${styles.viewContent}`}>
              {futureRaces.map(race => {
                const isNext = race.round === nextRound
                return (
                  <div
                    key={race.round}
                    className={`${styles.gridCell} ${isNext ? styles.gridCellNext : ''}`}
                    onClick={() => navigate(`/f1/${race.round}`)}
                  >
                    {/* {isNext && (
                      <span className={styles.gridNextBadge}>НАСТУПНА</span>
                    )} */}
                    <div className={styles.gridTrackWrap}>
                      {race.trackSvg ? (
                        <TrackSVG
                          src={race.trackSvg}
                          color="var(--accent)"
                          strokeWidth={1}
                          animated={false}
                          preserveAspectRatio="xMidYMid meet"
                          className={styles.gridTrackSvg}
                        />
                      ) : (
                        <div className={styles.gridTrackEmpty} />
                      )}
                    </div>
                    <span className={styles.gridName}>{race.shortName}</span>
                    <span className={styles.gridDate}>{fmtDate(race.date)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div key="list" className={`${styles.rows} ${styles.viewContent}`}>
              {futureRaces.map(race => {
                const isNext = race.round === nextRound
                return (
                  <div
                    key={race.round}
                    className={`${styles.row} ${isNext ? styles.rowNext : ''}`}
                    onClick={() => navigate(`/f1/${race.round}`)}
                  >
                    <span className={styles.roundNum}>
                      {String(race.round).padStart(2, '0')}
                    </span>
                    <span className={styles.flag}>{race.flag}</span>
                    <div className={styles.info}>
                      <span className={styles.name}>{race.name}</span>
                      <span className={styles.circuit}>{race.circuit}</span>
                    </div>
                    <span className={styles.date}>{fmtDate(race.date)}</span>
                    {race.trackSvg && (
                      <div className={styles.trackWrap}>
                        <TrackSVG
                          src={race.trackSvg}
                          color={isNext ? 'var(--accent)' : 'var(--text2)'}
                          strokeWidth={1}
                          animated={false}
                          preserveAspectRatio="xMidYMid meet"
                          className={styles.trackSvg}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Bottom sheet — результати пройденої гонки ── */}
      {selectedRace && (
        <div className={styles.overlay} onClick={handleClose}>
          <div
            className={styles.bottomSheet}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.sheetHandle} />

            {loadingResult ? (
              <div className={styles.sheetLoading}>Завантаження...</div>
            ) : raceResult ? (
              <>
                <div className={styles.sheetHeader}>
                  <span className={styles.sheetFlag}>{selectedRace.flag}</span>
                  <h3 className={styles.sheetTitle}>{selectedRace.name.toUpperCase()}</h3>
                  <span className={styles.sheetDate}>{fmtDate(selectedRace.date)}</span>
                </div>

                {/* Podium */}
                <div className={styles.podium}>
                  {/* P2 */}
                  <div className={`${styles.podiumEntry} ${styles.p2}`}>
                    <SheetAvatar driverId={raceResult.p2.driverId} code={raceResult.p2.code} />
                    <span className={styles.podCode}>{raceResult.p2.code}</span>
                    <span className={styles.podTeam}>{raceResult.p2.team}</span>
                    <span className={styles.podGap}>{raceResult.p2.gap}</span>
                    <div className={`${styles.step} ${styles.step2}`}>
                      <span className={styles.podPos}>2</span>
                    </div>
                  </div>
                  {/* P1 */}
                  <div className={`${styles.podiumEntry} ${styles.p1}`}>
                    <SheetAvatar driverId={raceResult.p1.driverId} code={raceResult.p1.code} gold />
                    <span className={`${styles.podCode} ${styles.podCodeGold}`}>{raceResult.p1.code}</span>
                    <span className={styles.podTeam}>{raceResult.p1.team}</span>
                    <div className={`${styles.step} ${styles.step1}`}>
                      <span className={styles.podPos}>1</span>
                    </div>
                  </div>
                  {/* P3 */}
                  <div className={`${styles.podiumEntry} ${styles.p3}`}>
                    <SheetAvatar driverId={raceResult.p3.driverId} code={raceResult.p3.code} />
                    <span className={styles.podCode}>{raceResult.p3.code}</span>
                    <span className={styles.podTeam}>{raceResult.p3.team}</span>
                    <span className={styles.podGap}>{raceResult.p3.gap}</span>
                    <div className={`${styles.step} ${styles.step3}`}>
                      <span className={styles.podPos}>3</span>
                    </div>
                  </div>
                </div>

                {/* Fastest */}
                {raceResult.fastest.code && (
                  <div className={styles.fastest}>
                    <span className={styles.fastestDot} />
                    <span className={styles.fastestLabel}>FASTEST</span>
                    <span className={styles.fastestValue}>
                      {raceResult.fastest.code} {raceResult.fastest.time}
                    </span>
                    <span className={styles.laps}>{raceResult.laps} кл</span>
                  </div>
                )}

                <button
                  className={styles.detailBtn}
                  onClick={() => navigate(`/f1/${selectedRace.round}`)}
                >
                  Детальніше →
                </button>
              </>
            ) : (
              <div className={styles.sheetLoading}>Результати недоступні</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default RaceCalendarList
