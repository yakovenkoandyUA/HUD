export const config = { runtime: 'edge' }

const JOLPICA_DRIVERS_URL      = 'https://api.jolpi.ca/ergast/f1/2026/driverstandings/'
const JOLPICA_CONSTRUCTORS_URL = 'https://api.jolpi.ca/ergast/f1/current/constructorstandings/'
const OPENF1_HEADSHOTS_URL     = 'https://api.openf1.org/v1/drivers?session_key=latest'
const HEADERS = { Accept: 'application/json' }

interface DriverStanding {
  position: number
  driver_number: number
  full_name: string
  broadcast_name: string
  team_name: string
  points: number
  headshot_url?: string
}

interface ConstructorStanding {
  position: number
  team_name: string
  points: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDrivers(json: any, headshotMap: Record<string, { url: string; number: number }>): DriverStanding[] {
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((s: any) => {
    const drv = s.Driver
    const code: string = drv.code ?? ''
    const headshot = headshotMap[code]
    const permanentNumber = Number(drv.permanentNumber)
    return {
      position:       Number(s.position),
      driver_number:  headshot?.number ?? (Number.isFinite(permanentNumber) ? permanentNumber : 0),
      full_name:      `${drv.givenName} ${drv.familyName}`,
      broadcast_name: code,
      team_name:      s.Constructors?.[0]?.name ?? '',
      points:         Number(s.points),
      headshot_url:   headshot?.url,
    }
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

export default async function handler() {
  try {
    const [drRes, coRes, f1Res] = await Promise.all([
      fetch(JOLPICA_DRIVERS_URL,      { headers: HEADERS }),
      fetch(JOLPICA_CONSTRUCTORS_URL, { headers: HEADERS }),
      fetch(OPENF1_HEADSHOTS_URL,     { headers: HEADERS }).catch(() => null),
    ])

    if (!drRes.ok) {
      return new Response(
        JSON.stringify({ error: 'upstream_error', detail: `drivers=${drRes.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (!coRes.ok) {
      return new Response(
        JSON.stringify({ error: 'upstream_error', detail: `constructors=${coRes.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const [drJson, coJson] = await Promise.all([drRes.json(), coRes.json()])

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

    const drivers      = parseDrivers(drJson, headshotMap)
    const constructors = parseConstructors(coJson)

    return new Response(JSON.stringify({ drivers, constructors }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'handler_exception', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
