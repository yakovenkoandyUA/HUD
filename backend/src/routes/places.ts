import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()
const FSQ_BASE = 'https://api.foursquare.com/v3'

interface FsqCategory { id: number; name: string; short_name?: string }
interface FsqHours {
  open_now?: boolean
  display?: string
}
interface FsqPlaceDetails {
  hours?: FsqHours
  tel?: string
  website?: string
  categories?: FsqCategory[]
  rating?: number
  price?: number
}

/** GET /api/places/lookup?name=&lat=&lng= */
router.get('/lookup', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, lat, lng } = req.query as Record<string, string>
  const key = process.env.FOURSQUARE_API_KEY

  if (!key) { res.status(503).json({ error: 'Places API not configured' }); return }
  if (!name || !lat || !lng) { res.status(400).json({ error: 'name, lat, lng required' }); return }

  try {
    const searchUrl = `${FSQ_BASE}/places/search?query=${encodeURIComponent(name)}&ll=${lat},${lng}&limit=1&radius=300`
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: key, Accept: 'application/json' },
    })
    if (!searchRes.ok) { res.status(502).json({ error: 'Places search failed' }); return }

    const { results } = await searchRes.json() as { results: Array<{ fsq_id: string }> }
    if (!results.length) { res.status(404).json({ error: 'Place not found' }); return }

    const fsqId = results[0].fsq_id
    const fields = 'hours,tel,website,categories,rating,price'
    const detailRes = await fetch(`${FSQ_BASE}/places/${fsqId}?fields=${fields}`, {
      headers: { Authorization: key, Accept: 'application/json' },
    })
    if (!detailRes.ok) { res.status(502).json({ error: 'Place details failed' }); return }

    const d = await detailRes.json() as FsqPlaceDetails

    res.json({
      fsqId,
      openNow:      d.hours?.open_now      ?? null,
      hoursDisplay: d.hours?.display        ?? null,
      tel:          d.tel                   ?? null,
      website:      d.website               ?? null,
      category:     d.categories?.[0]?.short_name ?? d.categories?.[0]?.name ?? null,
      rating:       d.rating                ?? null,
      price:        d.price                 ?? null,
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch place details' })
  }
})

export default router
