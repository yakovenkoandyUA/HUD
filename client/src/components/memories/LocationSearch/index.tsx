import React, { useEffect, useState } from 'react'
import type { PlanLocation } from '../../../store/plansStore'
import styles from './LocationSearch.module.css'

/**
 * LocationSearch
 * --------------
 * Autocomplete field backed by OpenStreetMap Nominatim (free, no key needed).
 * Debounces 500ms. Calls onSelect with structured location on pick.
 *
 * Props:
 * @prop {(loc: PlanLocation) => void} onSelect — called when user picks a result
 * @prop {string}                      [initial] — pre-fill display value
 */
interface LocationSearchProps {
  onSelect: (loc: PlanLocation) => void
  initial?: string
}

interface NominatimResult {
  place_id:     number
  display_name: string
  name:         string
  lat:          string
  lon:          string
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onSelect, initial = '' }) => {
  const [query,   setQuery]   = useState(initial)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 3) { setResults([]); return }
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=uk`,
          { headers: { 'User-Agent': 'MIMIR-App/1.0' } }
        )
        if (r.ok && !cancelled) setResults(await r.json())
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }, 500)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const handlePick = (r: NominatimResult) => {
    onSelect({
      name:    r.name || query,
      address: r.display_name,
      lat:     parseFloat(r.lat),
      lng:     parseFloat(r.lon),
    })
    setQuery(r.display_name)
    setResults([])
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inputWrap}>
        <svg className={styles.inputIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1a4 4 0 0 1 4 4c0 3-4 8-4 8S3 8 3 5a4 4 0 0 1 4-4Z"
            stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="7" cy="5" r="1.5" fill="currentColor"/>
        </svg>
        <input
          className={styles.input}
          placeholder="Пошук місця..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => { setQuery(''); setResults([]) }}
            aria-label="Очистити"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      {loading && <p className={styles.loading}>Пошук...</p>}
      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              className={styles.result}
              onClick={() => handlePick(r)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.pinIcon}>
                <path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 0 1 3-3Z"
                  stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
              </svg>
              <span className={styles.resultText}>{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LocationSearch
