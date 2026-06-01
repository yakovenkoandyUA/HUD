import { useState, useEffect, useCallback } from 'react'

export interface DriverStanding {
  position: number
  driver_number: number
  full_name: string
  broadcast_name: string
  team_name: string
  points: number
  headshot_url?: string
  driverId?: string
}

export interface ConstructorStanding {
  position:      number
  team_name:     string
  points:        number
  constructorId?: string
}

interface StandingsState {
  drivers: DriverStanding[]
  constructors: ConstructorStanding[]
  loading: boolean
  error: string | null
}

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()

// v7: routes through backend proxy (no CORS, server-side cache 6h)
const STANDINGS_URL = `${BASE_URL}/api/f1/standings`

const CACHE_KEY = `hud-champ-v7-${new Date().toISOString().split('T')[0]}`

function readCache(): { drivers: DriverStanding[]; constructors: ConstructorStanding[] } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.drivers?.length) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(data: { drivers: DriverStanding[]; constructors: ConstructorStanding[] }) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* noop */ }
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
      const url = force ? `${STANDINGS_URL}?refresh=1` : STANDINGS_URL
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`standings fetch failed: ${res.status}`)
      const data = await res.json() as { drivers: DriverStanding[]; constructors: ConstructorStanding[] }
      writeCache(data)
      setState({ drivers: data.drivers, constructors: data.constructors, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[useChampionshipStandings]', message)
      setState((s) => ({ ...s, loading: false, error: message }))
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const refetch = () => {
    try { sessionStorage.removeItem(CACHE_KEY) } catch { /* noop */ }
    fetch_(true)
  }

  return { ...state, refetch }
}
