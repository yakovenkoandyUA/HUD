import { useState } from 'react'

const NASA_KEY = import.meta.env.VITE_NASA_API_KEY

export interface ApodData {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  media_type: 'image' | 'video'
  thumbnail_url?: string
  copyright?: string
}

interface UseNasaApod {
  data: ApodData | null
  loading: boolean
  error: string
  fetchApod: () => Promise<void>
}

export function useNasaApod(): UseNasaApod {
  const [data, setData] = useState<ApodData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchApod = async () => {
    if (loading) return

    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `hud_nasa_apod_${today}`

    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setData(JSON.parse(cached)) } catch { /* ignore bad cache */ }
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&thumbs=true`
      )
      if (!res.ok) throw new Error(`${res.status}`)
      const json: ApodData = await res.json()
      localStorage.setItem(cacheKey, JSON.stringify(json))
      setData(json)
    } catch {
      setError('Cosmos is unreachable today 🌌')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, fetchApod }
}
