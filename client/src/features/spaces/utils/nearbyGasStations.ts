interface OverpassElement {
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

/**
 * Знаходить назви/бренди АЗС поруч через Overpass API (OpenStreetMap), без ключа.
 */
export async function fetchNearbyGasStations(lat: number, lon: number, radiusMeters = 5000): Promise<string[]> {
  const query = `[out:json][timeout:10];node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});out body 15;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })
  if (!res.ok) throw new Error('overpass request failed')
  const data = await res.json() as OverpassResponse
  const names = data.elements
    .map(el => el.tags?.brand || el.tags?.name)
    .filter((n): n is string => !!n)
  return [...new Set(names)]
}
