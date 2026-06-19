import { Router, Request, Response } from 'express'

const router = Router()

// GET /api/weather?city=Київ — proxy to wttr.in (avoids CORS)
router.get('/', async (req: Request, res: Response) => {
  const city = (req.query.city as string)?.trim()
  if (!city) return res.status(400).json({ error: 'city required' })

  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'mimir-hud/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream error' })
    const data = await upstream.json()
    res.setHeader('Cache-Control', 'public, max-age=1800') // 30 min
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: 'weather fetch failed' })
  }
})

export default router
