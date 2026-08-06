import { useEffect, useState } from 'react'

export interface DriverStats {
  wins:            number
  poles:           number
  podiums:         number
  fastestLaps:     number
  dnf:             number
  nationality:     string
  number:          string
  familyName:      string
  givenName:       string
  constructorName: string
  constructorId:   string
}

export const NATIONALITY_UA: Record<string, { flag: string; ua: string; code: string }> = {
  'British':       { flag: '🇬🇧', ua: 'Велика Британія', code: 'GBR' },
  'German':        { flag: '🇩🇪', ua: 'Німеччина',       code: 'GER' },
  'Dutch':         { flag: '🇳🇱', ua: 'Нідерланди',      code: 'NED' },
  'Spanish':       { flag: '🇪🇸', ua: 'Іспанія',         code: 'ESP' },
  'Monegasque':    { flag: '🇲🇨', ua: 'Монако',          code: 'MON' },
  'Finnish':       { flag: '🇫🇮', ua: 'Фінляндія',       code: 'FIN' },
  'Australian':    { flag: '🇦🇺', ua: 'Австралія',       code: 'AUS' },
  'Canadian':      { flag: '🇨🇦', ua: 'Канада',          code: 'CAN' },
  'French':        { flag: '🇫🇷', ua: 'Франція',         code: 'FRA' },
  'Japanese':      { flag: '🇯🇵', ua: 'Японія',          code: 'JPN' },
  'Mexican':       { flag: '🇲🇽', ua: 'Мексика',         code: 'MEX' },
  'Italian':       { flag: '🇮🇹', ua: 'Італія',          code: 'ITA' },
  'Danish':        { flag: '🇩🇰', ua: 'Данія',           code: 'DEN' },
  'American':      { flag: '🇺🇸', ua: 'США',             code: 'USA' },
  'Thai':          { flag: '🇹🇭', ua: 'Таїланд',         code: 'THA' },
  'Chinese':       { flag: '🇨🇳', ua: 'Китай',           code: 'CHN' },
  'New Zealander': { flag: '🇳🇿', ua: 'Нова Зеландія',   code: 'NZL' },
  'Brazilian':     { flag: '🇧🇷', ua: 'Бразилія',        code: 'BRA' },
  'Austrian':      { flag: '🇦🇹', ua: 'Австрія',         code: 'AUT' },
  'Argentine':     { flag: '🇦🇷', ua: 'Аргентина',       code: 'ARG' },
}

/**
 * useDriverStats
 * ---------------
 * Фетчить сезонну статистику пілота (wins/poles/podiums/DNF/національність) з Jolpica.
 * cachedStats дозволяє батьківському компоненту тримати кеш між рендерами (Map по driverId).
 *
 * @param driverId    — Jolpica slug (hamilton, leclerc, …)
 * @param cachedStats — вже отримані дані, якщо є (пропускає фетч)
 * @param onStats     — колбек для збереження в батьківський кеш
 */
export function useDriverStats(
  driverId: string,
  cachedStats?: DriverStats,
  onStats?: (id: string, stats: DriverStats) => void
) {
  const [stats, setStats]     = useState<DriverStats | null>(cachedStats ?? null)
  const [loading, setLoading] = useState<boolean>(!cachedStats)

  useEffect(() => {
    if (cachedStats || !driverId) return
    let cancelled = false
    const base = `https://api.jolpi.ca/ergast/f1/current/drivers/${driverId}`

    Promise.all([
      fetch(`${base}/results.json?limit=100`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`${base}/qualifying.json?limit=100`).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    ])
      .then(([resJson, quaJson]) => {
        if (cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = (resJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.Results ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quali   = (quaJson?.MRData?.RaceTable?.Races ?? []).flatMap((r: any) => r.QualifyingResults ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d0      = results[0]?.Driver ?? {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c0      = results[0]?.Constructor ?? {}

        const parsed: DriverStats = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wins:            results.filter((r: any) => r.position === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          podiums:         results.filter((r: any) => Number(r.position) <= 3).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fastestLaps:     results.filter((r: any) => r.FastestLap?.rank === '1').length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dnf:             results.filter((r: any) => ['DNF','DNS','DSQ'].includes(r.status ?? '')).length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          poles:           quali.filter((r: any) => r.position === '1').length,
          nationality:     d0.nationality ?? '',
          number:          d0.permanentNumber ?? '',
          familyName:      d0.familyName ?? '',
          givenName:       d0.givenName ?? '',
          constructorName: c0.name ?? '',
          constructorId:   c0.constructorId ?? '',
        }
        setStats(parsed)
        onStats?.(driverId, parsed)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [driverId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading }
}
