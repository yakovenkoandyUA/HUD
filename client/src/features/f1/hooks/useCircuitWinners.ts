import { useEffect, useState } from 'react'

export interface CircuitWinner {
  season: string
  driver: string
  team:   string
}

/**
 * useCircuitWinners
 * ------------------
 * Переможці останніх 5 гонок на цій трасі (усі сезони, Ergast/jolpi.ca).
 */
export function useCircuitWinners(circuitId: string) {
  const [winners, setWinners] = useState<CircuitWinner[] | null>(null)
  const [loading, setLoading] = useState(!!circuitId)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!circuitId) { if (!cancelled) setLoading(false); return }

      const cacheKey = `hud-circuit-winners-${circuitId}`
      try {
        const raw = sessionStorage.getItem(cacheKey)
        if (raw) { if (!cancelled) { setWinners(JSON.parse(raw)); setLoading(false) }; return }
      } catch { /* noop */ }

      if (!cancelled) setLoading(true)

      try {
        const r = await fetch(`https://api.jolpi.ca/ergast/f1/circuits/${circuitId}/results/1.json?limit=100`)
        if (!r.ok) throw new Error()
        const json = await r.json()
        if (cancelled) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const races: any[] = json?.MRData?.RaceTable?.Races ?? []
        const result: CircuitWinner[] = races
          .slice(-5)
          .reverse()
          .map(race => ({
            season: race.season as string,
            driver: `${race.Results[0].Driver.givenName} ${race.Results[0].Driver.familyName}`,
            team:   race.Results[0].Constructor.name as string,
          }))
        setWinners(result)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(result)) } catch { /* noop */ }
      } catch {
        if (!cancelled) setWinners(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [circuitId])

  return { winners, loading }
}
