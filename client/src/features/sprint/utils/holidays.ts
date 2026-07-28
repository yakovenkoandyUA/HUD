export type HolidayMap = Record<string, string>

const CACHE_PREFIX = 'ua-holidays-'
const API_URL = (year: number) => `https://date.nager.at/api/v3/PublicHolidays/${year}/UA`

interface NagerHoliday {
  date: string
  localName: string
}

async function fetchYear(year: number): Promise<HolidayMap> {
  const cacheKey = `${CACHE_PREFIX}${year}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch {
      // corrupted cache entry — refetch below
    }
  }

  const res = await fetch(API_URL(year))
  if (!res.ok) throw new Error(`holidays fetch failed: ${res.status}`)
  const data: NagerHoliday[] = await res.json()

  const map: HolidayMap = {}
  data.forEach(h => { map[h.date] = h.localName })
  localStorage.setItem(cacheKey, JSON.stringify(map))
  return map
}

/** Свята УА за перелік років, змерджені в один iso→назва map. Мовчки пропускає роки що не вдалось завантажити (офлайн). */
export async function fetchUkraineHolidays(years: number[]): Promise<HolidayMap> {
  const merged: HolidayMap = {}
  const uniqueYears = Array.from(new Set(years))
  await Promise.all(uniqueYears.map(async year => {
    try {
      Object.assign(merged, await fetchYear(year))
    } catch {
      // offline or API down — this year's holidays just won't be marked
    }
  }))
  return merged
}
