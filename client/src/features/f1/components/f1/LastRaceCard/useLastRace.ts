import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PodiumEntry {
  pos:      number
  code:     string
  driverId: string
  lastName: string
  team:     string
  gap:      string
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
  if ((race.date as string) >= today) return null

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
    if (data) return
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
