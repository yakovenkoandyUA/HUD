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
  error: boolean
}

// OpenF1 has headshot_url; Jolpica is reliable for constructors
const DRIVERS_URL = 'https://api.openf1.org/v1/championship_drivers?year=2026'
const CONSTRUCTORS_URL = 'https://api.jolpi.ca/ergast/f1/current/constructorstandings/'

function getCacheKey(): string {
  return `hud-champ-${new Date().toISOString().split('T')[0]}`
}

function readCache(): { drivers: DriverStanding[]; constructors: ConstructorStanding[] } | null {
  try {
    const raw = sessionStorage.getItem(getCacheKey())
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(data: { drivers: DriverStanding[]; constructors: ConstructorStanding[] }) {
  try {
    sessionStorage.setItem(getCacheKey(), JSON.stringify(data))
  } catch {
    // sessionStorage unavailable — skip caching
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseConstructors(json: any): ConstructorStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((c: any) => ({
    position: Number(c.position),
    team_name: c.Constructor?.name ?? '',
    points: Number(c.points),
  }))
}

export function useChampionshipStandings() {
  const cached = readCache()

  const [state, setState] = useState<StandingsState>({
    drivers: cached?.drivers ?? [],
    constructors: cached?.constructors ?? [],
    loading: !cached,
    error: false,
  })

  const fetch_ = useCallback(async (force = false) => {
    if (!force && readCache()) return

    setState((s) => ({ ...s, loading: true, error: false }))
    try {
      const [drRes, coRes] = await Promise.all([
        fetch(DRIVERS_URL),
        fetch(CONSTRUCTORS_URL),
      ])

      if (!drRes.ok || !coRes.ok) throw new Error('API error')

      const [drJson, coJson] = await Promise.all([drRes.json(), coRes.json()])

      // OpenF1 returns an array of objects directly matching our interface
      const drivers: DriverStanding[] = [...(drJson as DriverStanding[])]
        .sort((a, b) => a.position - b.position)

      const constructors = parseConstructors(coJson)

      writeCache({ drivers, constructors })
      setState({ drivers, constructors, loading: false, error: false })
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }))
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const refetch = () => {
    try { sessionStorage.removeItem(getCacheKey()) } catch { /* noop */ }
    fetch_(true)
  }

  return { ...state, refetch }
}
