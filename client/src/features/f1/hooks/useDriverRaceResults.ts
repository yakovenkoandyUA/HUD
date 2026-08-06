import { useEffect, useState } from 'react'

export interface DriverRaceResult {
  round:          number
  raceName:       string
  circuitName:    string
  date:           string
  gridPosition:   number | null
  finishPosition: number | null
  points:         number
  status:         'finished' | 'dnf' | 'dns' | 'dsq'
}

function parseStatus(status: string): DriverRaceResult['status'] {
  if (status === 'Finished' || status.startsWith('+')) return 'finished'
  if (status === 'Did not start') return 'dns'
  if (status === 'Disqualified') return 'dsq'
  return 'dnf'
}

const CACHE_PREFIX = 'hud-driver-results-v1'

function cacheKey(driverId: string): string {
  return `${CACHE_PREFIX}-${driverId}-${new Date().toISOString().split('T')[0]}`
}

/**
 * useDriverRaceResults
 * ---------------------
 * Фетчить список гонок пілота поточного сезону (Jolpica) для блоку "Останні гонки".
 * Найновіша гонка перша. Денне кешування у sessionStorage.
 *
 * @param driverId — Jolpica slug (verstappen, norris, …)
 */
export function useDriverRaceResults(driverId: string) {
  const key = cacheKey(driverId)
  const fromCache = (): DriverRaceResult[] | null => {
    try {
      const raw = sessionStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const [results, setResults] = useState<DriverRaceResult[] | null>(fromCache)
  const [loading, setLoading] = useState<boolean>(!fromCache())

  useEffect(() => {
    if (!driverId || fromCache()) return
    let cancelled = false

    fetch(`https://api.jolpi.ca/ergast/f1/current/drivers/${driverId}/results.json?limit=100`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((json: any) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const races: any[] = json?.MRData?.RaceTable?.Races ?? []
        const parsed: DriverRaceResult[] = races.map(r => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = r.Results?.[0] ?? {}
          return {
            round:          Number(r.round),
            raceName:       r.raceName ?? '',
            circuitName:    r.Circuit?.circuitName ?? '',
            date:           r.date ?? '',
            gridPosition:   res.grid != null ? Number(res.grid) : null,
            finishPosition: res.position != null ? Number(res.position) : null,
            points:         res.points != null ? Number(res.points) : 0,
            status:         parseStatus(res.status ?? ''),
          }
        }).sort((a, b) => b.round - a.round)

        setResults(parsed)
        try { sessionStorage.setItem(key, JSON.stringify(parsed)) } catch { /* noop */ }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [driverId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { results: results ?? [], loading }
}
