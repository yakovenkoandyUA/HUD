import type { F1Race } from '../data/f1Season2026'

export function getDriverHeadshot(_driverId: string): string | null {
  return null
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
