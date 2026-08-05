import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { F1_SEASON_2026 } from './data/f1Season2026'
import { getNextRound } from './utils/f1'
import { CIRCUIT_DATA, ROUND_TO_CIRCUIT_ID, type CircuitInfo } from './data/circuitData'
import { useRaceResults } from './hooks/useRaceResults'
import { useCircuitWinners } from './hooks/useCircuitWinners'
import { useSessionReminders } from './hooks/useSessionReminders'
import { useChampionshipStandings } from './hooks/useChampionshipStandings'
import TrackSVG from './components/f1/TrackSVG'
import DriverAvatar from './components/f1/DriverAvatar'
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
  key:       string
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

/** Лінійна SVG-іконка типу сесії (stroke=currentColor, узгоджена товщина 1.6) */
function SessionIcon({ type, className }: { type: SessionType; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (type === 'race') {
    return (
      <svg className={className} {...common} aria-hidden="true">
        <path d="M5 3v18" />
        <path d="M5 4c2-1 4-1 6 0s4 1 6 0v8c-2 1-4 1-6 0s-4-1-6 0V4z" />
        <path d="M8 4v8M14 4v8M5 8h12" />
      </svg>
    )
  }
  if (type === 'sprint') {
    return (
      <svg className={className} {...common} aria-hidden="true">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    )
  }
  if (type === 'sprint_quali' || type === 'qualifying') {
    return (
      <svg className={className} {...common} aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V9M12 13h3" />
        <path d="M9 2h6M12 2v3" />
      </svg>
    )
  }
  return (
    <svg className={className} {...common} aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

/** Тогл-дзвіночок для нагадування про сесію (заповнений = активне) */
function BellIcon({ active, className }: { active: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

type WeatherIconKind = 'temperature' | 'wind' | 'humidity'

/** Лінійна SVG-іконка погодної метрики (stroke=currentColor) */
function WeatherIcon({ kind, className }: { kind: WeatherIconKind; className?: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (kind === 'temperature') {
    return (
      <svg className={className} {...common} aria-hidden="true">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" />
      </svg>
    )
  }
  if (kind === 'wind') {
    return (
      <svg className={className} {...common} aria-hidden="true">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
        <path d="M12.59 11.59A2 2 0 1 1 14 15H2" />
        <path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" />
      </svg>
    )
  }
  return (
    <svg className={className} {...common} aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  )
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
        const addIf = (raceKey: string, key: string, label: string, extra?: Partial<SessionEntry>) => {
          const s = race[raceKey]
          if (s?.date && s?.time) return { label, key, date: s.date as string, time: s.time as string, ...extra }
          return null
        }

        const entries: (SessionEntry | null)[] = [
          addIf('FirstPractice',  'practice1',        'Practice 1'),
          addIf('SecondPractice', isSprintWeekend ? 'sprint_quali' : 'practice2', isSprintWeekend ? 'Sprint Qualifying' : 'Practice 2', isSprintWeekend ? { isSprint: true } : {}),
          addIf('ThirdPractice',  'practice3',        'Practice 3'),
          addIf('Sprint',         'sprint',           'Sprint Race', { isSprint: true }),
          addIf('Qualifying',     'qualifying',       'Qualifying'),
          race.date && race.time
            ? { label: 'Race', key: 'race', date: race.date as string, time: race.time as string, isRace: true }
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
interface WeatherDay { date: string; maxC: string; minC: string; desc: string; chanceOfRain: string }

function useRaceWeather(city: string, enabled: boolean) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [days, setDays]       = useState<WeatherDay[]>([])

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
        if (c) {
          setWeather({
            tempC:    c.temp_C ?? '?',
            windKmph: c.windspeedKmph ?? '?',
            desc:     c.weatherDesc?.[0]?.value ?? '',
            humidity: c.humidity ?? '?',
          })
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const forecast: any[] = json?.weather ?? []
        setDays(forecast.map(d => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const midday = d.hourly?.find((h: any) => h.time === '1200') ?? d.hourly?.[Math.floor((d.hourly?.length ?? 1) / 2)]
          return {
            date:         d.date as string,
            maxC:         d.maxtempC ?? '?',
            minC:         d.mintempC ?? '?',
            desc:         midday?.weatherDesc?.[0]?.value ?? '',
            chanceOfRain: midday?.chanceofrain ?? '0',
          }
        }))
      })
      .catch(() => { /* silent fail */ })
      .finally(() => clearTimeout(t))

    return () => { cancelled = true; ctrl.abort() }
  }, [city, enabled])

  return { weather, days }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CircuitStatsSection({ info, circuitId }: { info: CircuitInfo; circuitId: string }) {
  const { winners, loading: winnersLoading } = useCircuitWinners(circuitId)

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
              <span className={styles.recordLabel}>Пілот</span>
              <span className={styles.recordValue}>{info.lapRecord.driver}</span>
            </div>
            <div className={styles.recordRow}>
              <span className={styles.recordLabel}>Рік</span>
              <span className={styles.recordValue}>{info.lapRecord.year}</span>
            </div>
          </>
        )}
        {info.mostWins && (
          <div className={styles.recordRow}>
            <span className={styles.recordLabel}>Найбільше перемог</span>
            <span className={styles.recordValue}>{info.mostWins.driver} · {info.mostWins.count}</span>
          </div>
        )}
        <div className={styles.recordRow}>
          <span className={styles.recordLabel}>Перша гонка</span>
          <span className={styles.recordValue}>{info.firstRace}</span>
        </div>
      </div>

      {!winnersLoading && winners && winners.length > 0 && (
        <div className={styles.winnersRows}>
          <div className={styles.winnersTitle}>Переможці останніх років</div>
          {winners.map(w => (
            <div key={w.season} className={styles.winnersRow}>
              <span className={styles.winnersYear}>{w.season}</span>
              <span className={styles.winnersDriver}>{w.driver}</span>
              <span className={styles.winnersTeam}>{w.team}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionScheduleSection({ round }: { round: number }) {
  const { sessions, loading } = useRaceSchedule(round)
  const { active: activeReminders, toggle: toggleReminder } = useSessionReminders(round)

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
        {dayEntries.map(([day, daySessions]) => (
          <div key={day} className={styles.dayGroup}>
            <div className={styles.dayHeader}>{day}</div>
            {daySessions.map((s, i) => {
              const type = getSessionType(s)
              const isFuture = new Date(s.date + 'T' + s.time).getTime() > Date.now()
              return (
                <div key={i} className={styles.tlRow}>
                  <SessionIcon className={styles.tlIcon} type={type} />
                  <span className={`
                    ${styles.tlName}
                    ${type === 'race' ? styles.tlNameRace : ''}
                    ${type === 'qualifying' ? styles.tlNameQuali : ''}
                    ${type === 'sprint_quali' ? styles.tlNameQuali : ''}
                  `}>
                    {s.label}
                  </span>
                  <span className={`
                    ${styles.tlTime}
                    ${type === 'race' ? styles.tlTimeRace : ''}
                  `}>
                    {fmtTime(s.date, s.time)}
                  </span>
                  {isFuture && (
                    <button
                      type="button"
                      className={`${styles.tlBell} ${activeReminders.has(s.key) ? styles.tlBellActive : ''}`}
                      aria-label="Нагадати за 30 хв до сесії"
                      onClick={() => toggleReminder(s.key, s.label, `${s.date}T${s.time}`)}
                    >
                      <BellIcon active={activeReminders.has(s.key)} className={styles.tlBellIcon} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function RaceWeatherSection({ city, round }: { city: string; round: number }) {
  const { weather, days } = useRaceWeather(city, !!city)
  const { sessions } = useRaceSchedule(round)
  if (!weather) return null

  const weekendDates = Array.from(new Set((sessions ?? []).map(s => s.date)))
  const weekendForecast = days.filter(d => weekendDates.includes(d.date))

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>ПОГОДА</div>
      <div className={styles.weatherPanel}>
        <div className={styles.weatherMetric}>
          <WeatherIcon className={styles.wmIcon} kind="temperature" />
          <span className={styles.wmValue}>{weather.tempC}°</span>
          <span className={styles.wmLabel}>Температура</span>
        </div>
        <div className={styles.weatherDivider} />
        <div className={styles.weatherMetric}>
          <WeatherIcon className={styles.wmIcon} kind="wind" />
          <span className={styles.wmValue}>{weather.windKmph}</span>
          <span className={styles.wmLabel}>км/г вітер</span>
        </div>
        <div className={styles.weatherDivider} />
        <div className={styles.weatherMetric}>
          <WeatherIcon className={styles.wmIcon} kind="humidity" />
          <span className={styles.wmValue}>{weather.humidity}%</span>
          <span className={styles.wmLabel}>Вологість</span>
        </div>
      </div>

      {weekendForecast.length > 0 && (
        <div className={styles.forecastRows}>
          {weekendForecast.map(d => (
            <div key={d.date} className={styles.forecastRow}>
              <span className={styles.forecastDay}>{fmtDayHeader(d.date)}</span>
              <span className={styles.forecastDesc}>{d.desc}</span>
              <span className={styles.forecastRain}>Дощ {d.chanceOfRain}%</span>
              <span className={styles.forecastTemp}>{d.minC}° / {d.maxC}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RacePodiumSection({ round }: { round: number }) {
  const { result, loading } = useRaceResults(round)

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>РЕЗУЛЬТАТ</div>
        {[80, 60].map((w, i) => (
          <div key={i} className={styles.skLine} style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }
  if (!result) return null

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>РЕЗУЛЬТАТ</div>

      <div className={styles.podium}>
        {/* P2 */}
        <div className={`${styles.podiumEntry} ${styles.p2}`}>
          <DriverAvatar driverId={result.p2.driverId} code={result.p2.code} />
          <span className={styles.podCode}>{result.p2.code}</span>
          <span className={styles.podTeam}>{result.p2.team}</span>
          <span className={styles.podGap}>{result.p2.gap}</span>
          <div className={`${styles.step} ${styles.step2}`}>
            <span className={styles.podPos}>2</span>
          </div>
        </div>
        {/* P1 */}
        <div className={`${styles.podiumEntry} ${styles.p1}`}>
          <DriverAvatar driverId={result.p1.driverId} code={result.p1.code} gold />
          <span className={`${styles.podCode} ${styles.podCodeGold}`}>{result.p1.code}</span>
          <span className={styles.podTeam}>{result.p1.team}</span>
          <div className={`${styles.step} ${styles.step1}`}>
            <span className={styles.podPos}>1</span>
          </div>
        </div>
        {/* P3 */}
        <div className={`${styles.podiumEntry} ${styles.p3}`}>
          <DriverAvatar driverId={result.p3.driverId} code={result.p3.code} />
          <span className={styles.podCode}>{result.p3.code}</span>
          <span className={styles.podTeam}>{result.p3.team}</span>
          <span className={styles.podGap}>{result.p3.gap}</span>
          <div className={`${styles.step} ${styles.step3}`}>
            <span className={styles.podPos}>3</span>
          </div>
        </div>
      </div>

      {result.fastest.code && (
        <div className={styles.fastest}>
          <span className={styles.fastestDot} />
          <span className={styles.fastestLabel}>FASTEST</span>
          <span className={styles.fastestValue}>{result.fastest.code} {result.fastest.time}</span>
          <span className={styles.laps}>{result.laps} кл</span>
        </div>
      )}

      {result.top10.length > 0 && (
        <div className={styles.resultsTable}>
          {result.top10.map(r => (
            <div key={r.position} className={styles.resultsRow}>
              <span className={styles.resultsPos}>{r.position}</span>
              <span className={styles.resultsCode}>{r.code}</span>
              <span className={styles.resultsTeam}>{r.team}</span>
              <span className={styles.resultsPoints}>{r.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TOTAL_ROUNDS_2026     = 22
const MAX_POINTS_PER_ROUND  = 25

function ChampionshipStakesSection({ round }: { round: number }) {
  const { drivers, loading } = useChampionshipStandings()
  const roundsRemaining = TOTAL_ROUNDS_2026 - round
  if (loading || roundsRemaining < 0 || roundsRemaining > 8 || drivers.length < 2) return null

  const maxPoints = roundsRemaining * MAX_POINTS_PER_ROUND
  const leader = drivers[0]
  const chaser = drivers[1]
  const gap = leader.points - chaser.points
  const decided = gap > maxPoints && roundsRemaining > 0

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>ЩО НА КОНУ</div>

      <div className={styles.stakesRows}>
        {drivers.slice(0, 3).map((d, i) => (
          <div key={d.driverId ?? d.full_name} className={styles.stakesRow}>
            <span className={styles.stakesPos}>{i + 1}</span>
            <span className={styles.stakesName}>{d.full_name}</span>
            <span className={styles.stakesPoints}>{d.points}</span>
          </div>
        ))}
      </div>

      <p className={styles.stakesNote}>
        {roundsRemaining === 0
          ? 'Останній етап сезону'
          : decided
            ? `${leader.full_name} гарантовано чемпіон — залишилось ${roundsRemaining} ${roundsRemaining === 1 ? 'етап' : 'етапів'}`
            : `До кінця сезону ${roundsRemaining} ${roundsRemaining === 1 ? 'етап' : 'етапів'} · розіграно буде до ${maxPoints} очок · відрив лідера ${gap}`}
      </p>
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

      {/* ── Hero: track + info merged ── */}
      <div className={styles.hero}>
        <div className={styles.heroTrackWrap}>
          {race.trackSvg ? (
            <TrackSVG
              src={race.trackSvg}
              startOffset={race.trackStartOffset}
              color={trackColor}
              strokeWidth={1.5}
              animated
            />
          ) : (
            <span className={styles.heroEmptyFlag}>{race.flag}</span>
          )}
        </div>

        <div className={styles.heroContent}>
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
      </div>

      {/* ── Sections ── */}
      <div className={styles.content}>
        {circuitInfo && <CircuitStatsSection info={circuitInfo} circuitId={circuitId} />}
        <SessionScheduleSection round={race.round} />
        {!isPast && circuitInfo && <RaceWeatherSection city={circuitInfo.city} round={race.round} />}
        {isPast && <RacePodiumSection round={race.round} />}
        {!isPast && <ChampionshipStakesSection round={race.round} />}
      </div>

    </div>
  )
}

export default RaceDetailPage

// ── Export weather helper for NextRaceCard ────────────────────────────────────
export { weatherDesc2Icon }
