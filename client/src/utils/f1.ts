import type { F1Race } from '../data/f1Season2026'

export function getNextRace(races: F1Race[]): F1Race | null {
  const today = new Date().toISOString().slice(0, 10)
  return races.find((r) => r.date >= today) ?? null
}

export function getDaysToRace(race: F1Race): number {
  const diff = new Date(race.date + 'T14:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function getNextRound(races: F1Race[]): number {
  const next = getNextRace(races)
  return next?.round ?? races.length + 1
}
