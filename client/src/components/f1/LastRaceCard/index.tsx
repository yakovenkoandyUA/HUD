import React, { useEffect, useState } from 'react'
import styles from './LastRaceCard.module.css'

/**
 * LastRaceCard
 * ------------
 * Картка результатів останньої завершеної гонки Ф1.
 * Показує подіум (P1-P3), быстрий круг та кількість кіл.
 * Дані з Jolpica (Ergast). Кешується в sessionStorage на день.
 *
 * Не рендерується: поки дані завантажуються з помилкою або якщо
 * остання гонка ще не відбулась.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PodiumEntry {
  pos:      number
  code:     string    // e.g. "HAM"
  driverId: string    // e.g. "hamilton"
  lastName: string
  team:     string
  gap:      string    // "+4.234s" | "—" | "DNF" | "+1 Lap"
}

interface FastestLapInfo {
  code: string
  time: string
}

export interface LastRaceData {
  raceName:   string
  round:      number
  date:       string
  country:    string
  laps:       number
  podium:     PodiumEntry[]
  fastestLap: FastestLapInfo | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const JOLPICA_LAST = 'https://api.jolpi.ca/ergast/f1/current/last/results.json'

const TEAM_COLORS: Record<string, string> = {
  'Mercedes':     '#00D2BE',
  'Ferrari':      '#E8002D',
  'McLaren':      '#FF8000',
  'Red Bull':     '#3671C6',
  'Alpine':       '#FF87BC',
  'Aston Martin': '#229971',
  'Williams':     '#64C4FF',
  'Haas':         '#B6BABD',
  'Kick Sauber':  '#52E252',
  'RB':           '#6692FF',
}

const COUNTRY_FLAG: Record<string, string> = {
  'Australia': '🇦🇺', 'China': '🇨🇳', 'Japan': '🇯🇵',
  'USA': '🇺🇸', 'United States': '🇺🇸',
  'Canada': '🇨🇦', 'Monaco': '🇲🇨', 'Spain': '🇪🇸',
  'Austria': '🇦🇹', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Belgium': '🇧🇪', 'Hungary': '🇭🇺', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬',
  'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'UAE': '🇦🇪',
  'Abu Dhabi': '🇦🇪', 'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦',
  'Qatar': '🇶🇦', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Portugal': '🇵🇹',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cacheKey() {
  return `hud-last-race-v2-${new Date().toISOString().split('T')[0]}`
}

function readCache(): LastRaceData | null {
  try {
    const raw = sessionStorage.getItem(cacheKey())
    return raw ? (JSON.parse(raw) as LastRaceData) : null
  } catch { return null }
}

function writeCache(d: LastRaceData) {
  try { sessionStorage.setItem(cacheKey(), JSON.stringify(d)) } catch { /* noop */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatGap(r: any, pos: number): string {
  if (pos === 1) return '—'
  const t: string | undefined = r.Time?.time
  if (t) {
    if (/^\+[\d.]+$/.test(t)) return t + 's'
    return t
  }
  const s: string = r.status ?? ''
  if (s.startsWith('+')) return s
  return s.slice(0, 8)
}

function gpShortName(name: string): string {
  return name.replace(' Grand Prix', ' GP').toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRace(json: any): LastRaceData | null {
  const race = json?.MRData?.RaceTable?.Races?.[0]
  if (!race) return null

  const today = new Date().toISOString().split('T')[0]
  if ((race.date as string) >= today) return null   // race not yet completed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = race.Results ?? []
  if (results.length < 3) return null

  const podium: PodiumEntry[] = results.slice(0, 3).map(r => ({
    pos:      Number(r.position),
    code:     r.Driver?.code ?? '???',
    driverId: r.Driver?.driverId ?? '',
    lastName: r.Driver?.familyName ?? '',
    team:     r.Constructor?.name ?? '',
    gap:      formatGap(r, Number(r.position)),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flResult = results.find((r: any) => r.FastestLap?.rank === '1')
  const fastestLap: FastestLapInfo | null = flResult
    ? { code: flResult.Driver?.code ?? '', time: flResult.FastestLap.Time?.time ?? '' }
    : null

  return {
    raceName:   gpShortName(race.raceName ?? ''),
    round:      Number(race.round),
    date:       race.date,
    country:    race.Circuit?.Location?.country ?? '',
    laps:       Number(results[0]?.laps ?? 0),
    podium,
    fastestLap,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLastRace() {
  const [data, setData]         = useState<LastRaceData | null>(readCache)
  const [isLoading, setLoading] = useState<boolean>(!readCache())
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (data) { setLoading(false); return }
    let cancelled = false
    fetch(JOLPICA_LAST, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(json => {
        if (cancelled) return
        const parsed = parseRace(json)
        if (parsed) writeCache(parsed)
        setData(parsed)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉']

function PodiumAvatar({ code, team }: { code: string; team: string }) {
  const bg = TEAM_COLORS[team] ?? '#444'
  return (
    <div className={styles.avatar} style={{ background: bg }}>
      {code}
    </div>
  )
}

function PodiumEntryView({ entry, isFirst }: { entry: PodiumEntry; isFirst: boolean }) {
  return (
    <div className={`${styles.entry} ${isFirst ? styles.entryFirst : ''}`}>
      <span className={styles.medal}>{MEDALS[entry.pos - 1]}</span>
      <PodiumAvatar code={entry.code} team={entry.team} />
      <span className={styles.driverName}>{entry.lastName}</span>
      <span className={styles.teamName}>{entry.team}</span>
      <span className={`${styles.gap} ${entry.pos === 1 ? styles.gapWinner : ''}`}>
        {entry.gap}
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.skHeader}>
        <div className={styles.skBar} style={{ width: 120 }} />
      </div>
      <div className={styles.podium}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`${styles.entry} ${i === 1 ? styles.entryFirst : ''}`}>
            <div className={`${styles.skCircle} ${styles.skBar}`} />
            <div className={styles.skBar} style={{ width: 52, marginTop: 4 }} />
            <div className={styles.skBar} style={{ width: 36, marginTop: 2, opacity: 0.6 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const LastRaceCard: React.FC = () => {
  const { data, isLoading, error } = useLastRace()

  if (isLoading) return <Skeleton />
  if (error || !data) return null

  // Podium display order: P2 (left), P1 (center), P3 (right)
  const [p1, p2, p3] = data.podium
  const displayOrder = [p2, p1, p3]
  const flag = COUNTRY_FLAG[data.country] ?? ''

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.tick}>✓</span>
        <span className={styles.roundLabel}>РАУНД {data.round}</span>
        <span className={styles.dot}>·</span>
        <span className={styles.raceName}>{data.raceName}</span>
        {flag && <span className={styles.flag}>{flag}</span>}
      </div>

      {/* ── Podium ── */}
      <div className={styles.podium}>
        {displayOrder.map((entry, i) => (
          <PodiumEntryView
            key={entry.code}
            entry={entry}
            isFirst={i === 1}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        {data.fastestLap && (
          <div className={styles.fastestLap}>
            <span className={styles.flIcon}>⚡</span>
            <span className={styles.flText}>{data.fastestLap.code}</span>
            <span className={styles.flTime}>{data.fastestLap.time}</span>
          </div>
        )}
        <span className={styles.laps}>{data.laps} кіл</span>
      </div>

    </div>
  )
}

export default LastRaceCard
