import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { F1Race } from '../../../data/f1Season2026'
import TrackSVG from '../TrackSVG'
import styles from './RaceCalendarList.module.css'

/**
 * RaceCalendarList
 * ----------------
 * Повний список Гран Прі сезону.
 * Пройдені — згорнута секція, клік → сторінка деталей гонки (з подіумом).
 * Майбутні — list або grid режим (toggle + localStorage persist).
 *
 * Props:
 * @prop {F1Race[]} races     — повний список гонок
 * @prop {number}   nextRound — номер наступної гонки
 */

interface RaceCalendarListProps {
  races:     F1Race[]
  nextRound: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
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

  const [pastExpanded, setPastExpanded] = useState(false)

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
                {viewMode === 'grid' ? (
                  <div className={styles.grid}>
                    {pastRaces.map(race => (
                      <div
                        key={race.round}
                        className={`${styles.gridCell} ${styles.gridCellPast}`}
                        onClick={() => navigate(`/f1/${race.round}`)}
                      >
                        <svg className={styles.gridCheckIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 13l4 4L19 7"/>
                        </svg>
                        <div className={styles.gridTrackWrap}>
                          {race.trackSvg ? (
                            <TrackSVG
                              src={race.trackSvg}
                              startOffset={race.trackStartOffset}
                              color="var(--text3)"
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
                    ))}
                  </div>
                ) : (
                  <div className={styles.rows}>
                    {pastRaces.map(race => (
                      <div
                        key={race.round}
                        className={`${styles.row} ${styles.rowPast}`}
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
                              startOffset={race.trackStartOffset}
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
                )}
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
                              startOffset={race.trackStartOffset}
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
                              startOffset={race.trackStartOffset}
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
    </>
  )
}

export default RaceCalendarList
