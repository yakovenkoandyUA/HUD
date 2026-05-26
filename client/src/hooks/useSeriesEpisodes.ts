import { useEffect, useState } from 'react'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface TmdbEpisode {
  episode_number: number
  name: string
  air_date: string | null
  overview: string
}

interface SeasonData {
  season_number: number
  episodes: TmdbEpisode[]
}

interface TmdbTvDetails {
  number_of_seasons: number
  last_episode_to_air: { season_number: number } | null
}

interface CacheEntry {
  data: SeasonData
  ts: number
}

function cacheKey(tmdbId: number, season: number) {
  return `episodes_cache_${tmdbId}_s${season}`
}

function readCache(tmdbId: number, season: number): SeasonData | null {
  try {
    const raw = localStorage.getItem(cacheKey(tmdbId, season))
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(tmdbId, season))
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function writeCache(tmdbId: number, season: number, data: SeasonData) {
  try {
    const entry: CacheEntry = { data, ts: Date.now() }
    localStorage.setItem(cacheKey(tmdbId, season), JSON.stringify(entry))
  } catch {
    // storage quota exceeded — skip cache
  }
}

export function useSeriesEpisodes(tmdbId: number | null) {
  const [totalSeasons, setTotalSeasons] = useState<number>(0)
  const [activeSeason, setActiveSeason] = useState<number>(1)
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // fetch TV details to know number_of_seasons + current season
  useEffect(() => {
    if (!tmdbId || !TMDB_KEY) return
    fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=uk-UA`
    )
      .then(r => r.json())
      .then((d: TmdbTvDetails) => {
        const n = d.number_of_seasons ?? 1
        setTotalSeasons(n)
        const current = d.last_episode_to_air?.season_number ?? n
        setActiveSeason(current)
      })
      .catch(() => {})
  }, [tmdbId])

  // fetch episodes for activeSeason
  useEffect(() => {
    if (!tmdbId || !TMDB_KEY || !activeSeason) return
    const cached = readCache(tmdbId, activeSeason)
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEpisodes(cached.episodes)
      return
    }
    setLoading(true)
    setError(false)
    fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${activeSeason}?api_key=${TMDB_KEY}&language=uk-UA`
    )
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d: SeasonData) => {
        writeCache(tmdbId, activeSeason, d)
        setEpisodes(d.episodes ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [tmdbId, activeSeason])

  return { totalSeasons, activeSeason, setActiveSeason, episodes, loading, error }
}
