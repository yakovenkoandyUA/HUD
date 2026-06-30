import type { PlanLocation } from '../store/plansStore'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface PlaceSuggestion {
  mapboxId: string
  name: string
  fullAddress: string
}

interface SearchBoxSuggestion {
  mapbox_id: string
  name: string
  full_address?: string
  place_formatted?: string
}

interface SearchBoxRetrieveFeature {
  geometry: { coordinates: [number, number] }
  properties: { name: string; full_address?: string; place_formatted?: string }
}

/**
 * searchPlaces
 * ------------
 * POI/address autocomplete через Mapbox Search Box API (`/suggest`) — на
 * відміну від звичайного Geocoding API, знаходить названі місця (кафе, зоопарки
 * тощо), не лише адреси. `sessionToken` — один UUID на всю серію запитів
 * одного пошуку (suggest...suggest...retrieve), для коректного білінгу.
 */
let _cachedProximity: string | null = null

function getProximity(): string {
  if (_cachedProximity) return _cachedProximity
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => { _cachedProximity = `${pos.coords.longitude},${pos.coords.latitude}` },
      () => { _cachedProximity = '30.5234,50.4501' }, // Kyiv fallback
      { maximumAge: 600_000, timeout: 5000 },
    )
  }
  return _cachedProximity ?? '30.5234,50.4501'
}

export async function searchPlaces(query: string, sessionToken: string): Promise<PlaceSuggestion[]> {
  if (!MAPBOX_TOKEN || query.trim().length < 3) return []
  const params = new URLSearchParams({
    q: query, access_token: MAPBOX_TOKEN, session_token: sessionToken,
    language: 'uk', limit: '5', country: 'ua',
    proximity: getProximity(),
  })
  const r = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`)
  if (!r.ok) return []
  const data: { suggestions?: SearchBoxSuggestion[] } = await r.json()
  return (data.suggestions ?? []).map(s => ({
    mapboxId: s.mapbox_id,
    name: s.name,
    fullAddress: s.full_address ?? s.place_formatted ?? s.name,
  }))
}

/**
 * retrievePlace
 * -------------
 * Друга половина Search Box флоу — підтягує координати обраної підказки.
 */
export async function retrievePlace(mapboxId: string, sessionToken: string): Promise<PlanLocation | null> {
  if (!MAPBOX_TOKEN) return null
  const params = new URLSearchParams({ access_token: MAPBOX_TOKEN, session_token: sessionToken, language: 'uk' })
  const r = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?${params}`)
  if (!r.ok) return null
  const data: { features?: SearchBoxRetrieveFeature[] } = await r.json()
  const f = data.features?.[0]
  if (!f) return null
  const [lng, lat] = f.geometry.coordinates
  return {
    name: f.properties.name,
    address: f.properties.full_address ?? f.properties.place_formatted ?? f.properties.name,
    lat, lng,
  }
}

/**
 * forwardGeocodeCenter
 * ---------------------
 * Швидкий "найкращий збіг координат" для тексту (центрування карти під час
 * вводу пошуку) — звичайний Geocoding API, без сесій, один запит.
 */
export async function forwardGeocodeCenter(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!MAPBOX_TOKEN || query.trim().length < 3) return null
  const params = new URLSearchParams({ q: query, access_token: MAPBOX_TOKEN, language: 'uk', limit: '1' })
  const r = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`)
  if (!r.ok) return null
  const data: { features?: SearchBoxRetrieveFeature[] } = await r.json()
  const f = data.features?.[0]
  if (!f) return null
  const [lng, lat] = f.geometry.coordinates
  return { lat, lng }
}

/**
 * reverseGeocodeAddress
 * -----------------------
 * Координати → текстова адреса (тап на карті). Geocoding API v6 reverse.
 */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null
  const params = new URLSearchParams({
    longitude: String(lng), latitude: String(lat), access_token: MAPBOX_TOKEN, language: 'uk',
  })
  const r = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`)
  if (!r.ok) return null
  const data: { features?: SearchBoxRetrieveFeature[] } = await r.json()
  return data.features?.[0]?.properties.full_address ?? null
}
