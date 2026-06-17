import { Request, Response } from 'express'

const cache = new Map<string, { data: unknown; expires: number }>()
const SEARCH_TTL = 10 * 60 * 1000
const DESC_TTL   = 30 * 60 * 1000

export const searchBooks = async (req: Request, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? '').trim()
  if (!q || q.length < 3) {
    res.status(400).json({ error: 'Query too short' })
    return
  }

  const cacheKey = `search-${q.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    res.json(cached.data)
    return
  }

  const fields = 'key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject'
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12&fields=${fields}`

  const apiRes = await fetch(url)
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: 'Books API error' })
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiRes.json() as { docs?: any[] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data.docs ?? []).map((b: any) => ({
    tmdbId:        0,
    workKey:       b.key ?? null,
    title:         b.title ?? 'Невідома назва',
    originalTitle: b.title ?? '',
    posterPath:    null,
    backdropPath:  null,
    overview:      '',
    year:          b.first_publish_year ? String(b.first_publish_year) : '',
    genres:        (b.subject ?? []).slice(0, 4),
    authors:       b.author_name ?? [],
    pageCount:     b.number_of_pages_median ?? null,
    thumbnail:     b.cover_i
      ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
      : null,
  }))

  cache.set(cacheKey, { data: items, expires: Date.now() + SEARCH_TTL })
  res.json(items)
}

export const getBookDescription = async (req: Request, res: Response): Promise<void> => {
  const key = ((req.query.key as string) ?? '').trim()
  if (!key || !key.startsWith('/works/')) {
    res.status(400).json({ error: 'Invalid key' })
    return
  }

  const cacheKey = `desc-${key}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    res.json(cached.data)
    return
  }

  const apiRes = await fetch(`https://openlibrary.org${key}.json`)
  if (!apiRes.ok) {
    res.json({ description: '' })
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiRes.json() as { description?: string | { value: string } }
  const description = typeof data.description === 'string'
    ? data.description
    : (data.description?.value ?? '')

  const result = { description }
  cache.set(cacheKey, { data: result, expires: Date.now() + DESC_TTL })
  res.json(result)
}
