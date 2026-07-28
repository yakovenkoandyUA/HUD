import { useEffect, useState } from 'react'
import { fetchUkraineHolidays, type HolidayMap } from '../utils/holidays'

/**
 * useUkraineHolidays
 * ------------------
 * Завантажує (з кешем у localStorage, назавжди — свята за рік не змінюються)
 * державні свята УА для переданих років і повертає iso-дата → назва.
 */
export function useUkraineHolidays(years: number[]): HolidayMap {
  const [map, setMap] = useState<HolidayMap>({})
  const yearsKey = Array.from(new Set(years)).sort().join(',')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await fetchUkraineHolidays(yearsKey.split(',').filter(Boolean).map(Number))
      if (!cancelled) setMap(result)
    }
    load()
    return () => { cancelled = true }
  }, [yearsKey])

  return map
}
