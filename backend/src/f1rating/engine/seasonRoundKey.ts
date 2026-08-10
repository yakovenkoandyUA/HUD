/**
 * Composite (season, round) identity key — the single source of truth for "which event is this",
 * used everywhere a round number is used as a Map/lookup key. A bare `round` number is NOT a
 * unique event identifier across multiple seasons (round 1 exists in 2023, 2024, and 2025) — using
 * it alone as a key silently collapses different seasons' events into one when data from more than
 * one season is ever loaded together (e.g. multi-season pooling/normalization). Every round-keyed
 * lookup in this engine/dataset layer MUST go through this key, never a bare `round.round`.
 */
export function seasonRoundKey(season: number, round: number): string {
  return `${season}-${round}`
}
