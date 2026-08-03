import { Request, Response } from 'express'
import Game from '../models/Game'

const RAWG_KEY = process.env.RAWG_API_KEY
const RAWG_BASE = 'https://api.rawg.io/api'

const PLATFORM_MAP: Record<number, string> = {
  187: 'PS5',
  18:  'PS4',
  4:   'PC',
  7:   'Switch',
  1:   'Xbox One',
  186: 'Xbox Series',
  3:   'iOS',
  21:  'Android',
}

interface RawgGame {
  id: number
  name: string
  background_image: string | null
  released: string | null
  metacritic: number | null
  platforms: Array<{ platform: { id: number; name: string } }> | null
  genres: Array<{ name: string }>
}

let upcomingCache: { data: unknown[]; expiresAt: number } | null = null

export async function upcoming(req: Request, res: Response): Promise<void> {
  if (!RAWG_KEY) { res.status(503).json({ error: 'Сервіс пошуку ігор тимчасово недоступний' }); return }

  if (upcomingCache && Date.now() < upcomingCache.expiresAt) {
    res.json(upcomingCache.data)
    return
  }

  try {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
    const dateFrom = `${y}-${m}-01`
    const dateTo   = `${y}-${m}-${lastDay}`

    const url = `${RAWG_BASE}/games?key=${RAWG_KEY}&dates=${dateFrom},${dateTo}&ordering=-added&page_size=20&platforms=187,18,4,7,186`
    const raw = await fetch(url)
    if (!raw.ok) { res.status(502).json({ error: 'Сервіс пошуку ігор тимчасово недоступний, спробуй пізніше' }); return }

    const data = await raw.json() as { results: RawgGame[] }
    const results = (data.results ?? [])
      .filter(r => r.background_image)
      .map(r => ({
        rawgId:      r.id,
        title:       r.name,
        coverUrl:    r.background_image ?? '',
        releaseDate: r.released ?? '',
        metacritic:  r.metacritic ?? null,
        platforms:   (r.platforms ?? [])
          .map(p => PLATFORM_MAP[p.platform.id] ?? null)
          .filter((v): v is string => v !== null)
          .filter((v, i, a) => a.indexOf(v) === i),
        genres:      (r.genres ?? []).map(g => g.name),
      }))

    upcomingCache = { data: results, expiresAt: Date.now() + 2 * 60 * 60 * 1000 }
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Сервіс пошуку ігор тимчасово недоступний, спробуй пізніше' })
  }
}

export async function search(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q) { res.status(400).json({ error: 'Query required' }); return }
  if (!RAWG_KEY) { res.status(503).json({ error: 'Сервіс пошуку ігор тимчасово недоступний' }); return }

  try {
    const url = `${RAWG_BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=12&ordering=-relevance`
    const raw = await fetch(url)
    if (!raw.ok) { res.status(502).json({ error: 'Сервіс пошуку ігор тимчасово недоступний, спробуй пізніше' }); return }
    const data = await raw.json() as {
      results: Array<{
        id: number
        name: string
        background_image: string | null
        released: string | null
        rating: number
        metacritic: number | null
        platforms: Array<{ platform: { id: number; name: string } }> | null
        genres: Array<{ name: string }>
      }>
    }

    const results = (data.results ?? []).map(r => ({
      rawgId:        r.id,
      title:         r.name,
      coverUrl:      r.background_image ?? '',
      backgroundUrl: r.background_image ?? '',
      releaseDate:   r.released ?? '',
      metacritic:    r.metacritic ?? null,
      platforms:     (r.platforms ?? [])
        .map(p => PLATFORM_MAP[p.platform.id] ?? p.platform.name)
        .filter((v, i, a) => a.indexOf(v) === i),
      genres:        (r.genres ?? []).map(g => g.name),
    }))

    res.json(results)
  } catch {
    res.status(500).json({ error: 'Сервіс пошуку ігор тимчасово недоступний, спробуй пізніше' })
  }
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const { status, platform } = req.query as { status?: string; platform?: string }
  try {
    const filter: Record<string, unknown> = { userId: req.userId }
    if (status)   filter.status   = status
    if (platform) filter.platforms = platform
    const games = await Game.find(filter).sort({ addedAt: -1 })
    res.json(games)
  } catch {
    res.status(500).json({ error: 'Failed to fetch games' })
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const { rawgId } = req.body as { rawgId?: number }
  if (rawgId && rawgId !== 0) {
    const existing = await Game.findOne({ rawgId, userId: req.userId })
    if (existing) {
      res.status(409).json({ error: 'Already in list', id: existing._id })
      return
    }
  }
  const game = await Game.create({ ...req.body, userId: req.userId })
  res.status(201).json(game)
}

export async function update(req: Request, res: Response): Promise<void> {
  const allowed = ['status', 'platinum', 'rating', 'notes', 'hoursPlayed', 'completedAt', 'coverUrl', 'platforms', 'currentPlatform']
  const patch: Record<string, unknown> = {}
  allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k] })

  const game = await Game.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    patch,
    { new: true }
  )
  if (!game) { res.status(404).json({ error: 'Not found' }); return }
  res.json(game)
}

export async function remove(req: Request, res: Response): Promise<void> {
  const game = await Game.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!game) { res.status(404).json({ error: 'Not found' }); return }
  res.status(204).end()
}
