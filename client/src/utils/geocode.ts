/**
 * reverseGeocodeCity
 * -------------------
 * Реверс-геокодинг координат у назву міста через Nominatim (OpenStreetMap).
 * Повертає null якщо API не дав назви міста/містечка/села/району.
 */
export async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lon}&format=json&accept-language=uk`,
    { headers: { 'User-Agent': 'MIMIR-App/1.0' } }
  )
  const data = await r.json()
  return data.address?.city || data.address?.town || data.address?.village || data.address?.county || null
}
