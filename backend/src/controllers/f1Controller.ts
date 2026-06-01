import { Request, Response } from 'express'

const JOLPICA_DRIVERS      = 'https://api.jolpi.ca/ergast/f1/current/driverstandings/'
const JOLPICA_CONSTRUCTORS = 'https://api.jolpi.ca/ergast/f1/current/constructorstandings/'
const OPENF1_HEADSHOTS     = 'https://api.openf1.org/v1/drivers?session_key=latest'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h

interface DriverStanding {
  position: number
  driver_number: number
  full_name: string
  broadcast_name: string
  team_name: string
  points: number
  headshot_url?: string
  driverId?: string
}

interface ConstructorStanding {
  position: number
  team_name: string
  points: number
  constructorId?: string
}

interface StandingsCache {
  drivers: DriverStanding[]
  constructors: ConstructorStanding[]
  fetchedAt: number
}

let cache: StandingsCache | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDrivers(json: any, headshotMap: Record<string, { url: string; number: number }>): DriverStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((s: any) => {
    const drv = s.Driver
    const code: string = drv.code ?? ''
    const headshot = headshotMap[code]
    return {
      position:       Number(s.position),
      driver_number:  headshot?.number ?? (Number(drv.permanentNumber) || 0),
      full_name:      `${drv.givenName} ${drv.familyName}`,
      broadcast_name: code,
      team_name:      s.Constructors?.[0]?.name ?? '',
      points:         Number(s.points),
      headshot_url:   headshot?.url,
      driverId:       drv.driverId as string | undefined,
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseConstructors(json: any): ConstructorStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((c: any) => ({
    position:      Number(c.position),
    team_name:     c.Constructor?.name ?? '',
    points:        Number(c.points),
    constructorId: c.Constructor?.constructorId as string | undefined,
  }))
}

async function fetchStandings(): Promise<{ drivers: DriverStanding[]; constructors: ConstructorStanding[] }> {
  const [drRes, coRes, f1Res] = await Promise.all([
    fetch(JOLPICA_DRIVERS,      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }),
    fetch(JOLPICA_CONSTRUCTORS, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }),
    fetch(OPENF1_HEADSHOTS,     { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }).catch(() => null),
  ])

  if (!drRes.ok) throw new Error(`Jolpica driver standings: ${drRes.status}`)
  if (!coRes.ok) throw new Error(`Jolpica constructor standings: ${coRes.status}`)

  const [drJson, coJson] = await Promise.all([drRes.json(), coRes.json()])

  const headshotMap: Record<string, { url: string; number: number }> = {}
  if (f1Res?.ok) {
    const f1Json = await f1Res.json().catch(() => null)
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

/** GET /api/f1/standings — proxied + cached standings (drivers + constructors + headshots) */
export async function getF1Standings(req: Request, res: Response): Promise<void> {
  const now = Date.now()
  const forceRefresh = req.query.refresh === '1'

  // Return valid cache immediately
  if (!forceRefresh && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    res.json({ drivers: cache.drivers, constructors: cache.constructors, cached: true })
    return
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000))
      const data = await fetchStandings()
      cache = { ...data, fetchedAt: now }
      res.json({ ...data, cached: false })
      return
    } catch (err) {
      lastErr = err
      console.error(`[f1/standings] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }

  // Return stale cache rather than an error if available
  if (cache) {
    res.json({ drivers: cache.drivers, constructors: cache.constructors, cached: true, stale: true })
    return
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr)
  res.status(502).json({ error: `F1 standings unavailable: ${message}` })
}
