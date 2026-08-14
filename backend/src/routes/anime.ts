import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

const cache = new Map<string, { data: unknown; at: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 min

const ANILIST_URL = 'https://graphql.anilist.co'

const SEARCH_QUERY = `
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: ANIME, sort: SEARCHMATCH) {
      id
      title { romaji english native }
      coverImage { large }
      startDate { year }
      episodes
      genres
      averageScore
      description(asHtml: false)
      studios(isMain: true) { nodes { name } }
      nextAiringEpisode { airingAt }
      characters(sort: [ROLE], perPage: 8) {
        edges {
          role
          node { name { full } image { medium } }
          voiceActors(language: JAPANESE) { name { full } }
        }
      }
    }
  }
}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMedia(m: any) {
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Без назви'
  const originalTitle = m.title?.romaji && m.title.romaji !== title ? m.title.romaji : (m.title?.native ?? '')

  return {
    anilistId:       m.id,
    title,
    originalTitle,
    posterUrl:       m.coverImage?.large ?? null,
    overview:        (m.description ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
    year:            m.startDate?.year ? String(m.startDate.year) : '',
    genres:          m.genres ?? [],
    episodes:        m.episodes ?? null,
    studio:          m.studios?.nodes?.[0]?.name ?? null,
    score:           m.averageScore != null ? m.averageScore / 10 : null,
    nextEpisodeDate: m.nextAiringEpisode?.airingAt
      ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString().slice(0, 10)
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cast: (m.characters?.edges ?? []).map((e: any) => ({
      name:      e.node?.name?.full ?? '',
      character: e.voiceActors?.[0]?.name?.full ?? '',
      image:     e.node?.image?.medium ?? null,
    })),
  }
}

router.get('/search', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q) { res.status(400).json({ error: 'Query required' }); return }

  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    res.json(cached.data)
    return
  }

  try {
    const resp = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: q } }),
    })
    if (!resp.ok) { res.status(502).json({ error: 'AniList API error' }); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await resp.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const media: any[] = raw?.data?.Page?.media ?? []
    const result = media.map(mapMedia)

    cache.set(cacheKey, { data: result, at: Date.now() })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch anime' })
  }
})

export default router
