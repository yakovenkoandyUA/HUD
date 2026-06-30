import React, { useEffect, useRef, useState } from 'react'
import type { PlanLocation } from '../../../store/plansStore'
import { searchPlaces, retrievePlace, type PlaceSuggestion } from '../../../utils/mapboxGeocode'
import LocationMapPicker from '../LocationMapPicker'
import styles from './LocationSearch.module.css'

/**
 * LocationSearch
 * --------------
 * Autocomplete field backed by Mapbox Search Box API — POI-aware (знаходить
 * названі місця як зоопарки/кафе, не лише адреси). Debounces 500ms.
 * Calls onSelect with structured location on pick.
 *
 * Props:
 * @prop {(loc: PlanLocation) => void} onSelect — called when user picks a result
 * @prop {string}                      [initial] — pre-fill display value
 */
interface LocationSearchProps {
  onSelect: (loc: PlanLocation) => void
  initial?: string
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onSelect, initial = '' }) => {
  const [query,         setQuery]         = useState(initial)
  const [results,       setResults]       = useState<PlaceSuggestion[]>([])
  const [loading,       setLoading]       = useState(false)
  const [pickerOpen,    setPickerOpen]    = useState(false)
  const [lastLocation,  setLastLocation]  = useState<PlanLocation | null>(null)
  // true лише якщо юзер сам вводив текст; програматичні зміни query (handlePick,
  // handleMapPick, clear) скидають в false, тому ефект не запускає пошук при mount
  // або після вибору результату (надійно працює і в React StrictMode)
  const userTyped    = useRef(false)
  const sessionToken = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!userTyped.current) return
    userTyped.current = false
    if (query.length < 3) { setResults([]); return }
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const suggestions = await searchPlaces(query, sessionToken.current)
        if (!cancelled) setResults(suggestions)
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }, 500)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const handlePick = async (s: PlaceSuggestion) => {
    const loc = await retrievePlace(s.mapboxId, sessionToken.current)
    sessionToken.current = crypto.randomUUID()
    if (!loc) return
    onSelect(loc)
    setLastLocation(loc)
    userTyped.current = false
    setQuery(s.fullAddress)
    setResults([])
  }

  const handleMapPick = (loc: PlanLocation) => {
    onSelect(loc)
    setLastLocation(loc)
    userTyped.current = false
    setQuery(loc.address || loc.name || '')
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
          onChange={e => { userTyped.current = true; setQuery(e.target.value) }}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => { userTyped.current = false; setQuery(''); setResults([]); setLastLocation(null) }}
            aria-label="Очистити"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      <button
        type="button"
        className={styles.mapPickBtn}
        onClick={() => setPickerOpen(true)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 0 1 3-3Z"
            stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
        </svg>
        Обрати на карті
      </button>

      <LocationMapPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleMapPick}
        searchHint={query}
        initialLocation={lastLocation}
      />

      {loading && <p className={styles.loading}>Пошук...</p>}
      {results.length > 0 && (
        <div
          className={styles.results}
          // Список має власний overflow-y:auto — без stopPropagation свайп тут
          // підхоплює useSwipeToDismiss батьківського bottom sheet (якщо sheet.scrollTop
          // ще 0, бо поле МІСЦЕ зазвичай вгорі форми) замість натурального скролу списку.
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {results.map((s) => (
            <button
              key={s.mapboxId}
              type="button"
              className={styles.result}
              onClick={() => handlePick(s)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.pinIcon}>
                <path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 0 1 3-3Z"
                  stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
              </svg>
              <div>
                <div className={styles.resultName}>{s.name}</div>
                {s.fullAddress !== s.name && (
                  <div className={styles.resultAddr}>{s.fullAddress}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LocationSearch
