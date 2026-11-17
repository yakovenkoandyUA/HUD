import type { F1Race } from '../data/f1Season2026'

export function getDriverHeadshot(_driverId: string): string | null {
  return null
}

/** Prefer the original Formula 1 portrait for large cards and retain the thumbnail as a fallback. */
export function getDriverPortraitSources(thumbnail: string | undefined): string[] {
  if (!thumbnail) return []
  const sources = [thumbnail, `https://images.weserv.nl/?url=${encodeURIComponent(thumbnail)}`]
  try {
    const url = new URL(thumbnail)
    if (url.protocol === 'https:' && ['media.formula1.com', 'www.formula1.com'].includes(url.hostname)
      && /\.transform\/1col\/image\.png$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\.transform\/1col\/image\.png$/, '')
      sources.unshift(url.href)
    }
  } catch {
    // Relative and custom URLs can still be passed through unchanged.
  }
  return sources
}

// Keyed by Jolpica driverId (current 2026 grid — slugs occasionally change, e.g.
// verstappen → max_verstappen, lindblad → arvid_lindblad; keep in sync with /api/f1/standings).
export const DRIVER_TEAM_COLOR: Record<string, string> = {
  antonelli:      '#00D2BE', // Mercedes
  russell:        '#00D2BE', // Mercedes
  leclerc:        '#E8002D', // Ferrari
  hamilton:       '#E8002D', // Ferrari
  norris:         '#FF8000', // McLaren
  piastri:        '#FF8000', // McLaren
  max_verstappen: '#3671C6', // Red Bull
  hadjar:         '#3671C6', // Red Bull
  gasly:          '#FF87BC', // Alpine
  colapinto:      '#FF87BC', // Alpine
  albon:          '#64C4FF', // Williams
  sainz:          '#64C4FF', // Williams
  alonso:         '#229971', // Aston Martin
  stroll:         '#229971', // Aston Martin
  bearman:        '#B6BABD', // Haas
  ocon:           '#B6BABD', // Haas
  lawson:         '#6692FF', // RB
  arvid_lindblad: '#6692FF', // RB
  bortoleto:      '#BB0000', // Audi
  hulkenberg:     '#BB0000', // Audi
  bottas:         '#B08D57', // Cadillac
  perez:          '#B08D57', // Cadillac
}

export function getNextRace(races: F1Race[]): F1Race | null {
  const today = new Date().toISOString().slice(0, 10)
  return races.find((r) => r.date >= today) ?? null
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getRaceThisWeek(races: F1Race[]): F1Race | null {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dow = today.getDay()
  const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const sun = new Date(mon);   sun.setDate(mon.getDate() + 6)
  const monStr = localDateStr(mon)
  const sunStr = localDateStr(sun)
  return races.find(r => r.date >= monStr && r.date <= sunStr) ?? null
}

export function getDaysToRace(race: F1Race): number {
  const diff = new Date(race.date + 'T14:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function getNextRound(races: F1Race[]): number {
  const next = getNextRace(races)
  return next?.round ?? races.length + 1
}
