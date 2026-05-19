import { useState, useEffect, useCallback } from 'react'

export interface DriverStanding {
  position: number
  driver_number: number
  full_name: string
  broadcast_name: string
  team_name: string
  points: number
  headshot_url?: string
}

export interface ConstructorStanding {
  position: number
  team_name: string
  points: number
}

interface StandingsState {
  drivers: DriverStanding[]
  constructors: ConstructorStanding[]
  loading: boolean
  error: string | null
}

const IS_PROD = import.meta.env.PROD
const PROXY_URL = '/api/f1standings'
const JOLPICA_DRIVERS_URL = 'https://api.jolpi.ca/ergast/f1/2026/driverstandings/'
const JOLPICA_CONSTRUCTORS_URL = 'https://api.jolpi.ca/ergast/f1/current/constructorstandings/'
const OPENF1_HEADSHOTS_URL = 'https://api.openf1.org/v1/drivers?session_key=latest'

function getCacheKey(): string {
  return `hud-champ-v4-${new Date().toISOString().split('T')[0]}`
}

function readCache(): { drivers: DriverStanding[]; constructors: ConstructorStanding[] } | null {
  try {
    const raw = sessionStorage.getItem(getCacheKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Discard cache if drivers array is empty (stale from a failed fetch)
    if (!parsed?.drivers?.length) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(data: { drivers: DriverStanding[]; constructors: ConstructorStanding[] }) {
  try { sessionStorage.setItem(getCacheKey(), JSON.stringify(data)) } catch { /* noop */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDrivers(json: any, headshotMap: Record<string, { url: string; number: number }>): DriverStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((s: any) => {
    const drv = s.Driver
    const code: string = drv.code ?? ''
    const headshot = headshotMap[code]
    return {
      position:      Number(s.position),
      driver_number: headshot?.number ?? Number(drv.permanentNumber) ?? 0,
      full_name:     `${drv.givenName} ${drv.familyName}`,
      broadcast_name: code,
      team_name:     s.Constructors?.[0]?.name ?? '',
      points:        Number(s.points),
      headshot_url:  headshot?.url,
    } satisfies DriverStanding
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseConstructors(json: any): ConstructorStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((c: any) => ({
    position:  Number(c.position),
    team_name: c.Constructor?.name ?? '',
    points:    Number(c.points),
  }))
}

async function fetchViaProxy(): Promise<{ drivers: DriverStanding[]; constructors: ConstructorStanding[] }> {
  const res = await fetch(PROXY_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`proxy ${res.status}: ${body.detail ?? body.error ?? res.statusText}`)
  }
  return res.json()
}

async function fetchDirect(): Promise<{ drivers: DriverStanding[]; constructors: ConstructorStanding[] }> {
  const [drRes, coRes, f1Res] = await Promise.all([
    fetch(JOLPICA_DRIVERS_URL,      { headers: { Accept: 'application/json' } }),
    fetch(JOLPICA_CONSTRUCTORS_URL, { headers: { Accept: 'application/json' } }),
    fetch(OPENF1_HEADSHOTS_URL,     { headers: { Accept: 'application/json' } }).catch(() => null),
  ])

  if (!drRes.ok) throw new Error(`driver standings fetch failed: ${drRes.status}`)
  if (!coRes.ok) throw new Error(`constructor standings fetch failed: ${coRes.status}`)

  const [drJson, coJson] = await Promise.all([drRes.json(), coRes.json()])

  // Build acronym → {headshot_url, driver_number} map from OpenF1 (best effort)
  const headshotMap: Record<string, { url: string; number: number }> = {}
  if (f1Res?.ok) {
    const f1Json = await f1Res.json()
    if (Array.isArray(f1Json)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const d of f1Json as any[]) {
        if (d.name_acronym && d.headshot_url) {
          headshotMap[d.name_acronym] = { url: d.headshot_url, number: d.driver_number }
        }
      }
    }
  }

  return {
    drivers:      parseDrivers(drJson, headshotMap),
    constructors: parseConstructors(coJson),
  }
}

export function useChampionshipStandings() {
  const cached = readCache()

  const [state, setState] = useState<StandingsState>({
    drivers:      cached?.drivers ?? [],
    constructors: cached?.constructors ?? [],
    loading:      !cached,
    error:        null,
  })

  const fetch_ = useCallback(async (force = false) => {
    if (!force && readCache()) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = IS_PROD ? await fetchViaProxy() : await fetchDirect()
      writeCache(data)
      setState({ ...data, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[useChampionshipStandings]', message)
      setState((s) => ({ ...s, loading: false, error: message }))
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const refetch = () => {
    try { sessionStorage.removeItem(getCacheKey()) } catch { /* noop */ }
    fetch_(true)
  }

  return { ...state, refetch }
}
