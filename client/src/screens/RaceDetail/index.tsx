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
 * Секції: SVG треку, базова інформація, характеристики траси,
 * рекорди, розклад сесій, погода (майбутні) / результати (завершені).
 */

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmtDay(date: string, time: string): string {
  return new Date(date + 'T' + time).toLocaleDateString('uk-UA', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtTime(date: string, time: string): string {
  return new Date(date + 'T' + time).toLocaleTimeString('uk-UA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function weatherIcon(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('thunder'))                            return '⛈'
  if (d.includes('rain') || d.includes('shower'))       return '🌧'
  if (d.includes('snow'))                               return '🌨'
  if (d.includes('fog') || d.includes('mist'))          return '🌫'
  if (d.includes('partly') || d.includes('overcast'))   return '⛅'
  if (d.includes('cloud'))                              return '☁️'
  if (d.includes('sun') || d.includes('clear'))         return '☀️'
  return '🌤'
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

interface SessionEntry {
  label: string
  icon:  string
  date:  string
  time:  string
  isRace?: boolean
  isSprint?: boolean
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
    const cached = fromCache()
    if (cached) { setSessions(cached); setLoading(false); return }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addIf = (key: string, label: string, icon: string, extra?: Partial<SessionEntry>) => {
          const s = race[key]
          if (s?.date && s?.time) return { label, icon, date: s.date as string, time: s.time as string, ...extra }
          return null
        }

        const entries: (SessionEntry | null)[] = [
          addIf('FirstPractice',  'Practice 1',            '🔧'),
          addIf('SecondPractice', isSprintWeekend ? 'Sprint Qualifying' : 'Practice 2', '🔧', isSprintWeekend ? { isSprint: true } : {}),
          addIf('ThirdPractice',  'Practice 3',            '🔧'),
          addIf('Sprint',         'Sprint Race',           '🔄', { isSprint: true }),
          addIf('Qualifying',     'Qualifying',            '⚡'),
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

interface WeatherData { tempC: string; windKmph: string; desc: string }

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
          tempC:   c.temp_C ?? '?',
          windKmph: c.windspeedKmph ?? '?',
          desc:    c.weatherDesc?.[0]?.value ?? '',
        })
      })
      .catch(() => { /* silent fail */ })
      .finally(() => clearTimeout(t))

    return () => { cancelled = true; ctrl.abort() }
  }, [city, enabled])

  return weather
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionTitle}>{children}</div>
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

function CircuitStatsSection({ info }: { info: CircuitInfo }) {
  return (
    <div className={styles.section}>
      <SectionTitle>ХАРАКТЕРИСТИКИ ТРАСИ</SectionTitle>
      <StatRow label="⬡ Довжина кола"    value={`${info.length} км`} />
      <StatRow label="↺ Кількість кіл"   value={String(info.laps)} />
      <StatRow label="📏 Дистанція"       value={`${info.distance} км`} />
      <StatRow label="↪ Поворотів"        value={String(info.turns)} />
      <StatRow label="📍 Місто"           value={info.city} />
      <StatRow label="🏁 Перша гонка"     value={String(info.firstRace)} />

      {(info.lapRecord || info.mostWins) && (
        <>
          <SectionTitle>РЕКОРДИ</SectionTitle>
          {info.lapRecord && (
            <>
              <StatRow label="⏱ Рекорд кола" value={info.lapRecord.time} />
              <StatRow label="👤 Пілот"       value={`${info.lapRecord.driver} (${info.lapRecord.year})`} />
            </>
          )}
          {info.mostWins && (
            <StatRow label="🏆 Найбільше перемог" value={`${info.mostWins.driver} (${info.mostWins.count})`} />
          )}
        </>
      )}
    </div>
  )
}

function SessionScheduleSection({ round }: { round: number }) {
  const { sessions, loading } = useRaceSchedule(round)

  if (loading) {
    return (
      <div className={styles.section}>
        <SectionTitle>РОЗКЛАД СЕСІЙ</SectionTitle>
        <div className={styles.skLine} style={{ width: '80%' }} />
        <div className={styles.skLine} style={{ width: '60%' }} />
        <div className={styles.skLine} style={{ width: '70%' }} />
      </div>
    )
  }
  if (!sessions || sessions.length === 0) return null

  return (
    <div className={styles.section}>
      <SectionTitle>РОЗКЛАД СЕСІЙ</SectionTitle>
      {sessions.map((s, i) => (
        <div
          key={i}
          className={`${styles.sessionRow} ${s.isRace ? styles.sessionRace : ''} ${s.isSprint ? styles.sessionSprint : ''}`}
        >
          <span className={styles.sessionDay}>{fmtDay(s.date, s.time)}</span>
          <span className={styles.sessionIcon}>{s.icon}</span>
          <span className={styles.sessionLabel}>{s.label}</span>
          <span className={styles.sessionTime}>{fmtTime(s.date, s.time)}</span>
        </div>
      ))}
    </div>
  )
}

function RaceWeatherSection({ city }: { city: string }) {
  const weather = useRaceWeather(city, !!city)
  if (!weather) return null

  return (
    <div className={styles.section}>
      <SectionTitle>ПОГОДА</SectionTitle>
      <div className={styles.weatherRow}>
        <span className={styles.weatherIcon}>{weatherIcon(weather.desc)}</span>
        <span className={styles.weatherTemp}>{weather.tempC}°C</span>
        <span className={styles.weatherSep}>·</span>
        <span className={styles.weatherDetail}>Вітер {weather.windKmph} км/г</span>
        <span className={styles.weatherSep}>·</span>
        <span className={styles.weatherDetail}>{weather.desc}</span>
      </div>
    </div>
  )
}

function RacePodiumSection({ round }: { round: number }) {
  const { data } = useLastRace()

  if (!data || data.round !== round || data.podium.length < 3) return null

  const [p1, p2, p3] = data.podium
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div className={styles.section}>
      <SectionTitle>РЕЗУЛЬТАТИ</SectionTitle>
      {[p1, p2, p3].map((entry, i) => (
        <div key={entry.code} className={styles.podiumRow}>
          <span className={styles.podiumMedal}>{MEDALS[i]}</span>
          <span className={styles.podiumName}>{entry.lastName}</span>
          <span className={styles.podiumTeam}>{entry.team}</span>
          <span className={styles.podiumGap}>{entry.gap}</span>
        </div>
      ))}
      {data.fastestLap && (
        <div className={styles.fastestLap}>
          <span className={styles.flIcon}>⚡</span>
          <span className={styles.flDriver}>{data.fastestLap.code}</span>
          <span className={styles.flTime}>{data.fastestLap.time}</span>
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

  const isPast    = race.round < nextRound
  const isNext    = race.round === nextRound
  const trackColor = isPast ? 'var(--text2)' : 'var(--accent)'

  const circuitId   = ROUND_TO_CIRCUIT_ID[race.round] ?? ''
  const circuitInfo = CIRCUIT_DATA[circuitId] ?? null

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate('/f1')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          F1
        </button>
        <span className={styles.roundLabel}>Раунд {String(race.round).padStart(2, '0')}</span>
      </header>

      <div className={styles.content}>

        {/* Track SVG */}
        {race.trackSvg ? (
          <div className={styles.trackWrap}>
            <TrackSVG src={race.trackSvg} color={trackColor} strokeWidth={1.5} animated />
          </div>
        ) : (
          <div className={styles.trackPlaceholder}>
            <span>Карта треку недоступна</span>
          </div>
        )}

        {/* Race header info */}
        <div className={styles.info}>
          <div className={styles.flagRow}>
            <span className={styles.flag}>{race.flag}</span>
            {isNext && <span className={styles.nextBadge}>НАСТУПНА</span>}
            {isPast && <span className={styles.pastBadge}>ПРОЙДЕНО</span>}
            {race.sprint && <span className={styles.sprintBadge}>SPRINT</span>}
          </div>
          <h1 className={styles.name}>{race.name}</h1>
          <div className={styles.circuit}>{race.circuit}</div>
          <div className={styles.date}>
            {new Date(race.date + 'T12:00:00').toLocaleDateString('uk-UA', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>
        </div>

        {/* Extended sections */}
        {circuitInfo && <CircuitStatsSection info={circuitInfo} />}

        <SessionScheduleSection round={race.round} />

        {!isPast && circuitInfo && <RaceWeatherSection city={circuitInfo.city} />}

        {isPast && <RacePodiumSection round={race.round} />}

      </div>
    </div>
  )
}

export default RaceDetailPage
