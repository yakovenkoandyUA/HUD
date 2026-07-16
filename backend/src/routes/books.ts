import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

const cache = new Map<string, { data: unknown; at: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 min

router.get('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const BOOKS_KEY = process.env.GOOGLE_BOOKS_KEY
  const q = (req.query.q as string | undefined)?.trim()
  if (!q) { res.status(400).json({ error: 'Query required' }); return }
  if (!BOOKS_KEY) { res.status(503).json({ error: 'Books API not configured' }); return }

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    res.json(cached.data)
    return
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&langRestrict=&key=${BOOKS_KEY}`
    const resp = await fetch(url)
    if (!resp.ok) { res.status(resp.status).json({ error: 'Books API error' }); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await resp.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (raw.items ?? []).map((item: any) => {
      const v = item.volumeInfo ?? {}
      const isbn = (v.industryIdentifiers ?? [])
        .find((id: { type: string }) => id.type === 'ISBN_13')?.identifier
        ?? (v.industryIdentifiers ?? [])[0]?.identifier
        ?? null
      const cover = v.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null
      return {
        googleId:    item.id,
        title:       v.title ?? 'Unknown',
        authors:     v.authors ?? [],
        description: v.description ?? '',
        year:        (v.publishedDate ?? '').slice(0, 4),
        pageCount:   v.pageCount ?? null,
        genres:      v.categories ?? [],
        cover,
        isbn,
        language:    v.language ?? null,
        avgRating:   v.averageRating ?? null,
      }
    })

    cache.set(cacheKey, { data: items, at: Date.now() })
    res.json(items)
  } catch {
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

export default router
