import { Request, Response } from 'express'

const OPENF1_BASE = 'https://api.openf1.org/v1'

// Simple in-memory cache per path+query, TTL varies by endpoint
const cache = new Map<string, { data: unknown; at: number }>()

const TTL: Record<string, number> = {
  sessions:  60_000,   // 1 min
  laps:       5_000,   // 5 sec
  position:   3_000,   // 3 sec
  intervals:  5_000,   // 5 sec
  drivers:  300_000,   // 5 min
  stints:    30_000,   // 30 sec
  location:   2_000,   // 2 sec
  car_data:   1_000,   // 1 sec
}

function getTtl(endpoint: string): number {
  return TTL[endpoint] ?? 10_000
}

export async function proxyOpenF1(req: Request, res: Response): Promise<void> {
  const endpoint = req.params.endpoint
  const query    = new URLSearchParams(req.query as Record<string, string>).toString()
  const cacheKey = `${endpoint}?${query}`
  const ttl      = getTtl(endpoint)

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < ttl) {
    res.json(cached.data)
    return
  }

  const url = `${OPENF1_BASE}/${endpoint}${query ? `?${query}` : ''}`
  try {
    const upstream = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'OpenF1 error', status: upstream.status })
      return
    }
    const data = await upstream.json()
    cache.set(cacheKey, { data, at: Date.now() })
    res.json(data)
  } catch (err) {
    console.error('[f1live]', err)
    res.status(502).json({ error: 'OpenF1 unavailable' })
  }
}
