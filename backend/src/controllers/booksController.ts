import { Request, Response } from 'express'

const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export const searchBooks = async (req: Request, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? '').trim()
  if (!q || q.length < 3) {
    res.status(400).json({ error: 'Query too short' })
    return
  }

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    res.json(cached.data)
    return
  }

  const key = process.env.GOOGLE_BOOKS_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10${key ? `&key=${key}` : ''}`

  const apiRes = await fetch(url)
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: 'Books API error' })
    return
  }

  const data = await apiRes.json() as { items?: unknown[] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data.items ?? []).map((b: any) => ({
    tmdbId:        0,
    title:         b.volumeInfo?.title ?? 'Невідома назва',
    originalTitle: b.volumeInfo?.title ?? '',
    posterPath:    null,
    backdropPath:  null,
    overview:      b.volumeInfo?.description ?? '',
    year:          b.volumeInfo?.publishedDate?.slice(0, 4) ?? '',
    genres:        b.volumeInfo?.categories ?? [],
    authors:       b.volumeInfo?.authors ?? [],
    pageCount:     b.volumeInfo?.pageCount ?? null,
    thumbnail:     b.volumeInfo?.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
  }))

  cache.set(cacheKey, { data: items, expires: Date.now() + CACHE_TTL })
  res.json(items)
}
