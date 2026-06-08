import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { F1_SEASON_2026 } from '../../data/f1Season2026'
import { getNextRound } from '../../utils/f1'
import { CIRCUIT_DATA, ROUND_TO_CIRCUIT_ID, type CircuitInfo } from '../../data/circuitData'
import { useLastRace } from '../../components/f1/LastRaceCard'
import TrackSVG from '../../components/f1/TrackSVG'
import styles from './RaceDetail.module.css'

/**
 * RaceDetailPage
 * --------------
 * Повна сторінка деталей гонки.
 * Секції: hero-трек, інфо-бар, характеристики траси,
 * таймлайн сесій, погода (майбутні) / результати (завершені).
 */

// ── Utils ─────────────────────────────────────────────────────────────────────

function formatFullDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(date: string, time: string): string {
  return new Date(date + 'T' + time).toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function fmtDayHeader(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('uk-UA', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).toUpperCase()
}

function weatherDesc2Icon(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('thunder'))                           return '⛈'
  if (d.includes('rain') || d.includes('shower'))      return '🌧'
  if (d.includes('snow'))                              return '🌨'
  if (d.includes('fog') || d.includes('mist'))         return '🌫'
  if (d.includes('partly') || d.includes('overcast'))  return '⛅'
  if (d.includes('cloud'))                             return '☁️'
  if (d.includes('sun') || d.includes('clear'))        return '☀️'
  return '🌤'
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

interface SessionEntry {
  label:     string
  icon:      string
  date:      string
  time:      string
  isRace?:   boolean
  isSprint?: boolean
}

type SessionType = 'race' | 'sprint' | 'sprint_quali' | 'qualifying' | 'practice'

function getSessionType(s: SessionEntry): SessionType {
  if (s.isRace) return 'race'
  if (s.isSprint) return s.label.toLowerCase().includes('qualifying') ? 'sprint_quali' : 'sprint'
  if (s.label.toLowerCase().includes('qualifying')) return 'qualifying'
  return 'practice'
}

function getSessionIcon(type: SessionType): string {
  if (type === 'race')                                  return '🏁'
  if (type === 'sprint')                                return '🔄'
  if (type === 'sprint_quali' || type === 'qualifying') return '⏱'
  return '🔧'
}

function useRaceSchedule(round: number) {
  const cacheKey = `hud-schedule-2026-r${round}`
  const fromCache = (): SessionEntry[] | null => {
    try {
      const raw = sessionStorage.getItem(cacheKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const [sessions, setSessions] = useState<SessionEntry[] | null>(fromCache)
  const [loading, setLoading]   = useState(!fromCache())

  useEffect(() => {
    if (fromCache()) return
    let cancelled = false

    fetch(`https://api.jolpi.ca/ergast/f1/2026/${round}.json`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((json: any) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const race: any = json?.MRData?.RaceTable?.Races?.[0]
        if (!race) { setLoading(false); return }

        const isSprintWeekend = !!race.Sprint
        const addIf = (key: string, label: string, icon: string, extra?: Partial<SessionEntry>) => {
          const s = race[key]
          if (s?.date && s?.time) return { label, icon, date: s.date as string, time: s.time as string, ...extra }
          return null
        }

        const entries: (SessionEntry | null)[] = [
          addIf('FirstPractice',  'Practice 1',                     '🔧'),
          addIf('SecondPractice', isSprintWeekend ? 'Sprint Qualifying' : 'Practice 2', '🔧', isSprintWeekend ? { isSprint: true } : {}),
          addIf('ThirdPractice',  'Practice 3',                     '🔧'),
          addIf('Sprint',         'Sprint Race',                    '🔄', { isSprint: true }),
          addIf('Qualifying',     'Qualifying',                     '⏱'),
          race.date && race.time
            ? { label: 'Race', icon: '🏁', date: race.date as string, time: race.time as string, isRace: true }
            : null,
        ]

        const result = (entries.filter(Boolean) as SessionEntry[]).sort(
          (a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
        )

        setSessions(result)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(result)) } catch { /* noop */ }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [round]) // eslint-disable-line react-hooks/exhaustive-deps

  return { sessions, loading }
}

interface WeatherData { tempC: string; windKmph: string; desc: string; humidity: string }

function useRaceWeather(city: string, enabled: boolean) {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    if (!enabled || !city) return
    let cancelled = false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)

    fetch(`https://wttr.in/${encodeURIComponent(city.split(',')[0].trim())}?format=j1`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((json: any) => {
        if (cancelled) return
        const c = json?.current_condition?.[0]
        if (!c) return
        setWeather({
          tempC:    c.temp_C ?? '?',
          windKmph: c.windspeedKmph ?? '?',
          desc:     c.weatherDesc?.[0]?.value ?? '',
          humidity: c.humidity ?? '?',
        })
      })
      .catch(() => { /* silent fail */ })
      .finally(() => clearTimeout(t))

    return () => { cancelled = true; ctrl.abort() }
  }, [city, enabled])

  return weather
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CircuitStatsSection({ info }: { info: CircuitInfo }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>ХАРАКТЕРИСТИКИ ТРАСИ</div>

      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{info.length} км</span>
          <span className={styles.statLabel}>Довжина кола</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{info.laps}</span>
          <span className={styles.statLabel}>Кількість кіл</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{info.distance} км</span>
          <span className={styles.statLabel}>Дистанція</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{info.turns}</span>
          <span className={styles.statLabel}>Поворотів</span>
        </div>
      </div>

      <div className={styles.recordRows}>
        {info.lapRecord && (
          <>
            <div className={styles.recordRow}>
              <span className={styles.recordLabel}>Рекорд кола</span>
              <span className={styles.recordValue}>{info.lapRecord.time}</span>
            </div>
            <div className={styles.recordRow}>
              <span className={styles.recordMeta}>{info.lapRecord.driver}</span>
              <span className={styles.recordMeta}>{info.lapRecord.year}</span>
            </div>
          </>
        )}
        {info.mostWins && (
          <div className={styles.recordRow}>
            <span className={styles.recordLabel}>Найбільше перемог</span>
            <span className={styles.recordValue}>{info.mostWins.driver} ({info.mostWins.count})</span>
          </div>
        )}
        <div className={styles.recordRow}>
          <span className={styles.recordLabel}>Перша гонка</span>
          <span className={styles.recordValue}>{info.firstRace}</span>
        </div>
      </div>
    </div>
  )
}

function SessionScheduleSection({ round }: { round: number }) {
  const { sessions, loading } = useRaceSchedule(round)

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>РОЗКЛАД СЕСІЙ</div>
        {[80, 60, 70].map((w, i) => (
          <div key={i} className={styles.skLine} style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }
  if (!sessions || sessions.length === 0) return null

  // Group sessions by day
  const sessionsByDay: Record<string, SessionEntry[]> = {}
  for (const s of sessions) {
    const key = fmtDayHeader(s.date)
    if (!sessionsByDay[key]) sessionsByDay[key] = []
    sessionsByDay[key].push(s)
  }
  const dayEntries = Object.entries(sessionsByDay)

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>РОЗКЛАД СЕСІЙ</div>
      <div className={styles.timeline}>
        {dayEntries.map(([day, daySessions], dayIdx) => (
          <div key={day} className={styles.dayGroup}>
            <div className={styles.dayHeader}>{day}</div>
            {daySessions.map((s, i) => {
              const type = getSessionType(s)
              const isLast = dayIdx === dayEntries.length - 1 && i === daySessions.length - 1
              return (
                <div key={i} className={styles.tlRow}>
                  <div className={styles.tlLineCol}>
                    <div className={`
                      ${styles.tlDot}
                      ${type === 'race' ? styles.tlDotRace : ''}
                      ${type === 'qualifying' || type === 'sprint_quali' ? styles.tlDotQuali : ''}
                      ${type === 'sprint' ? styles.tlDotSprint : ''}
                    `} />
                    {!isLast && <div className={styles.tlConnector} />}
                  </div>
                  <div className={styles.tlContent}>
                    <span className={`
                      ${styles.tlName}
                      ${type === 'race' ? styles.tlNameRace : ''}
                      ${type === 'qualifying' ? styles.tlNameQuali : ''}
                      ${type === 'sprint_quali' ? styles.tlNameQuali : ''}
                    `}>
                      {getSessionIcon(type)} {s.label}
                    </span>
                    <span className={`
                      ${styles.tlTime}
                      ${type === 'race' ? styles.tlTimeRace : ''}
                    `}>
                      {fmtTime(s.date, s.time)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function RaceWeatherSection({ city }: { city: string }) {
  const weather = useRaceWeather(city, !!city)
  if (!weather) return null

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>ПОГОДА</div>
      <div className={styles.weatherGrid}>
        <div className={styles.weatherMetric}>
          <span className={styles.wmIcon}>🌡</span>
          <span className={styles.wmValue}>{weather.tempC}°</span>
          <span className={styles.wmLabel}>Температура</span>
        </div>
        <div className={styles.weatherMetric}>
          <span className={styles.wmIcon}>💨</span>
          <span className={styles.wmValue}>{weather.windKmph}</span>
          <span className={styles.wmLabel}>км/г вітер</span>
        </div>
        <div className={styles.weatherMetric}>
          <span className={styles.wmIcon}>💧</span>
          <span className={styles.wmValue}>{weather.humidity}%</span>
          <span className={styles.wmLabel}>Вологість</span>
        </div>
      </div>
    </div>
  )
}

function RacePodiumSection({ round }: { round: number }) {
  const { data } = useLastRace()

  if (!data || data.round !== round || data.podium.length < 3) return null

  const [p1, p2, p3] = data.podium

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>РЕЗУЛЬТАТ</div>
      {[p1, p2, p3].map((entry, i) => (
        <div key={entry.code} className={styles.podiumRow}>
          <span className={styles.podiumPos}>{i + 1}</span>
          <span className={styles.podiumName}>{entry.lastName}</span>
          <span className={styles.podiumTeam}>{entry.team}</span>
          <span className={styles.podiumGap}>{entry.gap}</span>
        </div>
      ))}
      {data.fastestLap && (
        <div className={styles.fastestRow}>
          <span className={styles.fastestDot} />
          <span className={styles.fastestDriver}>{data.fastestLap.code}</span>
          <span className={styles.fastestTime}>{data.fastestLap.time}</span>
        </div>
      )}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const RaceDetailPage: React.FC = () => {
  const { round } = useParams<{ round: string }>()
  const navigate  = useNavigate()

  const roundNum  = Number(round)
  const race      = F1_SEASON_2026.find(r => r.round === roundNum)
  const nextRound = getNextRound(F1_SEASON_2026)

  if (!race) {
    return (
      <div className={styles.screen}>
        <button className={styles.back} onClick={() => navigate('/f1')}>← Назад</button>
        <p className={styles.notFound}>Гонку не знайдено</p>
      </div>
    )
  }

  const isPast     = race.round < nextRound
  const trackColor = isPast ? 'var(--text2)' : 'var(--accent)'

  const circuitId   = ROUND_TO_CIRCUIT_ID[race.round] ?? ''
  const circuitInfo = CIRCUIT_DATA[circuitId] ?? null

  return (
    <div className={styles.screen}>

      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/f1')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          F1
        </button>
        <span className={styles.roundLabel}>Раунд {String(race.round).padStart(2, '0')}</span>
      </header>

      {/* ── Track hero ── */}
      <div className={styles.hero}>
        {race.trackSvg ? (
          <TrackSVG
            src={race.trackSvg}
            color={trackColor}
            strokeWidth={1.5}
            animated={!isPast}
          />
        ) : (
          <div className={styles.heroEmpty}>
            <span className={styles.heroEmptyFlag}>{race.flag}</span>
          </div>
        )}
      </div>

      {/* ── Info bar ── */}
      <div className={styles.infoBar}>
        <div className={styles.metaRow}>
          <span className={styles.metaRound}>РАУНД {String(race.round).padStart(2, '0')}</span>
          {isPast
            ? <span className={styles.badgeDone}>ПРОЙДЕНО</span>
            : <span className={styles.badgeNext}>НАСТУПНА</span>
          }
          {race.sprint && <span className={styles.badgeSprint}>SPRINT</span>}
        </div>
        <div className={styles.nameRow}>
          <span className={styles.infoFlag}>{race.flag}</span>
          <h1 className={styles.infoName}>{race.name.toUpperCase()}</h1>
        </div>
        <p className={styles.infoSub}>{race.circuit} · {race.country}</p>
        <p className={styles.infoDate}>{formatFullDate(race.date)}</p>
      </div>

      {/* ── Sections ── */}
      <div className={styles.content}>
        {circuitInfo && <CircuitStatsSection info={circuitInfo} />}
        <SessionScheduleSection round={race.round} />
        {!isPast && circuitInfo && <RaceWeatherSection city={circuitInfo.city} />}
        {isPast && <RacePodiumSection round={race.round} />}
      </div>

    </div>
  )
}

export default RaceDetailPage

// ── Export weather helper for NextRaceCard ────────────────────────────────────
export { weatherDesc2Icon }
