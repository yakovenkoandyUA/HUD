import { Request, Response } from 'express'

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'

const ALLOWED_COMPETITIONS = new Set(['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'])

const STANDINGS_TTL_MS = 60 * 60 * 1000       // 1h — таблиця не змінюється щохвилини
const NEXT_MATCH_TTL_MS = 10 * 60 * 1000      // 10хв

interface FootballTeam {
  id: number
  name: string
  shortName: string
  crest: string
}

interface FootballStanding {
  position: number
  team: FootballTeam
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
}

interface FootballMatch {
  id: number
  utcDate: string
  status: string
  homeTeam: FootballTeam
  awayTeam: FootballTeam
  competition: { code: string; name: string }
}

interface StandingsCacheEntry { data: FootballStanding[]; fetchedAt: number }
interface MatchCacheEntry { data: FootballMatch | null; fetchedAt: number }

const standingsCache = new Map<string, StandingsCacheEntry>()
const nextMatchCache = new Map<string, MatchCacheEntry>()

function authHeaders(): Record<string, string> {
  return { Accept: 'application/json', 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTeam(t: any): FootballTeam {
  return {
    id:        Number(t?.id) || 0,
    name:      t?.name ?? '',
    shortName: t?.shortName ?? t?.name ?? '',
    crest:     t?.crest ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStandings(json: any): FootballStanding[] {
  const table = json?.standings?.find((s: { type: string }) => s.type === 'TOTAL')?.table ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return table.map((row: any) => ({
    position:    Number(row.position),
    team:        parseTeam(row.team),
    playedGames: Number(row.playedGames),
    won:         Number(row.won),
    draw:        Number(row.draw),
    lost:        Number(row.lost),
    points:      Number(row.points),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMatch(json: any): FootballMatch | null {
  const m = json?.matches?.[0]
  if (!m) return null
  return {
    id:          Number(m.id),
    utcDate:     m.utcDate,
    status:      m.status,
    homeTeam:    parseTeam(m.homeTeam),
    awayTeam:    parseTeam(m.awayTeam),
    competition: { code: m.competition?.code ?? '', name: m.competition?.name ?? '' },
  }
}

/** GET /api/football/standings?competition=PL — проксі + кеш турнірної таблиці */
export async function getFootballStandings(req: Request, res: Response): Promise<void> {
  const competition = String(req.query.competition ?? '')
  if (!ALLOWED_COMPETITIONS.has(competition)) {
    res.status(400).json({ error: `Unknown competition code: ${competition}` })
    return
  }

  const now = Date.now()
  const cached = standingsCache.get(competition)
  if (cached && now - cached.fetchedAt < STANDINGS_TTL_MS) {
    res.json({ standings: cached.data, cached: true })
    return
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000))
      const upstream = await fetch(`${FOOTBALL_DATA_BASE}/competitions/${competition}/standings`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(15000),
      })
      if (!upstream.ok) throw new Error(`football-data standings: ${upstream.status}`)
      const json = await upstream.json()
      const data = parseStandings(json)
      standingsCache.set(competition, { data, fetchedAt: now })
      res.json({ standings: data, cached: false })
      return
    } catch (err) {
      lastErr = err
      console.error(`[football/standings/${competition}] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }

  if (cached) {
    res.json({ standings: cached.data, cached: true, stale: true })
    return
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr)
  res.status(502).json({ error: `Football standings unavailable: ${message}` })
}

/** GET /api/football/matches?competition=PL — найближчий запланований матч */
export async function getFootballMatches(req: Request, res: Response): Promise<void> {
  const competition = String(req.query.competition ?? '')
  if (!ALLOWED_COMPETITIONS.has(competition)) {
    res.status(400).json({ error: `Unknown competition code: ${competition}` })
    return
  }

  const now = Date.now()
  const cached = nextMatchCache.get(competition)
  if (cached && now - cached.fetchedAt < NEXT_MATCH_TTL_MS) {
    res.json({ match: cached.data, cached: true })
    return
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000))
      const upstream = await fetch(`${FOOTBALL_DATA_BASE}/competitions/${competition}/matches?status=SCHEDULED&limit=1`, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(15000),
      })
      if (!upstream.ok) throw new Error(`football-data matches: ${upstream.status}`)
      const json = await upstream.json()
      const data = parseMatch(json)
      nextMatchCache.set(competition, { data, fetchedAt: now })
      res.json({ match: data, cached: false })
      return
    } catch (err) {
      lastErr = err
      console.error(`[football/matches/${competition}] attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
    }
  }

  if (cached) {
    res.json({ match: cached.data, cached: true, stale: true })
    return
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr)
  res.status(502).json({ error: `Football matches unavailable: ${message}` })
}
