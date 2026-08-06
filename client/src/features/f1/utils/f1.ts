import type { F1Race } from '../data/f1Season2026'

export function getDriverHeadshot(_driverId: string): string | null {
  return null
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
