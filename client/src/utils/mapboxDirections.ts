const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export interface RouteLineFeature {
  type: 'Feature'
  properties: Record<string, never>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

export interface RouteResult {
  geojson: RouteLineFeature
  distanceKm: number
  durationMin: number
}

/**
 * fetchRoute
 * ----------
 * Маршрут авто (Mapbox Directions API) між двома точками.
 */
export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult | null> {
  if (!MAPBOX_TOKEN) return null
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = new URLSearchParams({ geometries: 'geojson', overview: 'full', access_token: MAPBOX_TOKEN })
  const r = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`)
  if (!r.ok) return null
  const data: { routes?: Array<{ geometry: RouteLineFeature['geometry']; distance: number; duration: number }> } = await r.json()
  const route = data.routes?.[0]
  if (!route) return null
  return {
    geojson: { type: 'Feature', properties: {}, geometry: route.geometry },
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  }
}
