import { useEffect, useRef, useState } from 'react'

export interface PodiumDriver {
  code:     string
  team:     string
  driverId: string
  gap?:     string
}

export interface ResultRow {
  position: string
  code:     string
  name:     string
  team:     string
  points:   string
  status:   string
}

export interface RaceResult {
  p1:      PodiumDriver
  p2:      PodiumDriver
  p3:      PodiumDriver
  fastest: { code: string; time: string }
  laps:    string
  top10:   ResultRow[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDriver(r: any): PodiumDriver {
  return {
    code:     r.Driver?.code ?? '???',
    team:     r.Constructor?.name ?? '',
    driverId: r.Driver?.driverId ?? '',
    gap:      r.Time?.time ?? r.status ?? '',
  }
}

/**
 * useRaceResults
 * --------------
 * Завантажує топ-3 подіум + найшвидше коло для конкретного раунду сезону
 * (не обов'язково останньої гонки — на відміну від useLastRace).
 */
export function useRaceResults(round: number) {
  const [result, setResult]   = useState<RaceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false

    const load = async () => {
      if (!cancelRef.current) { setResult(null); setLoading(true) }

      try {
        const r = await fetch(`https://api.jolpi.ca/ergast/f1/2026/${round}/results.json`)
        const data = await r.json()
        if (cancelRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = data?.MRData?.RaceTable?.Races?.[0]?.Results ?? []
        if (results.length < 3) { setResult(null); return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flResult = results.find((r: any) => r.FastestLap?.rank === '1')

        setResult({
          p1: extractDriver(results[0]),
          p2: extractDriver(results[1]),
          p3: extractDriver(results[2]),
          fastest: {
            code: flResult?.Driver?.code ?? '',
            time: flResult?.FastestLap?.Time?.time ?? '',
          },
          laps: results[0]?.laps ?? '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          top10: results.slice(0, 10).map((r: any) => ({
            position: r.position ?? '',
            code:     r.Driver?.code ?? '???',
            name:     `${r.Driver?.givenName ?? ''} ${r.Driver?.familyName ?? ''}`.trim(),
            team:     r.Constructor?.name ?? '',
            points:   r.points ?? '0',
            status:   r.status ?? '',
          })),
        })
      } catch {
        if (!cancelRef.current) setResult(null)
      } finally {
        if (!cancelRef.current) setLoading(false)
      }
    }

    load()
    return () => { cancelRef.current = true }
  }, [round])

  return { result, loading }
}
