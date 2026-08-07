import type {
  LapExclusionReason, QualifyingLapSample, RaceLapSample, StintMetrics, TrackCondition,
} from '../types'

export interface ExclusionResult<T> {
  kept: T[]
  excluded: { sample: T; reason: LapExclusionReason }[]
}

/**
 * Filters race laps down to "clean" laps only: no SC/VSC/red flag, no in/out lap, no pit lap,
 * FastF1-accurate, not on a documented-damaged car. This is the single source of truth for
 * "clean race pace" everywhere in the engine — nothing computes race pace from raw laps directly.
 */
export function filterCleanRaceLaps(laps: RaceLapSample[]): ExclusionResult<RaceLapSample> {
  const kept: RaceLapSample[] = []
  const excluded: { sample: RaceLapSample; reason: LapExclusionReason }[] = []

  for (const lap of laps) {
    const reason = cleanLapExclusionReason(lap)
    if (reason) excluded.push({ sample: lap, reason })
    else kept.push(lap)
  }
  return { kept, excluded }
}

function cleanLapExclusionReason(lap: RaceLapSample): LapExclusionReason | null {
  if (lap.trackStatus === 'sc') return 'safety_car'
  if (lap.trackStatus === 'vsc') return 'virtual_safety_car'
  if (lap.trackStatus === 'red') return 'red_flag'
  if (lap.isInLap) return 'in_lap'
  if (lap.isOutLap) return 'out_lap'
  if (lap.isPitLap) return 'in_lap'
  if (!lap.isAccurate) return 'inaccurate'
  if (lap.isDamaged) return 'damaged'
  return null
}

/** Filters valid, accurate qualifying laps only (per-lap `isAccurate` flag). */
export function filterValidQualifyingLaps(laps: QualifyingLapSample[]): ExclusionResult<QualifyingLapSample> {
  const kept: QualifyingLapSample[] = []
  const excluded: { sample: QualifyingLapSample; reason: LapExclusionReason }[] = []
  for (const lap of laps) {
    if (!lap.isAccurate) excluded.push({ sample: lap, reason: 'inaccurate' })
    else kept.push(lap)
  }
  return { kept, excluded }
}

/**
 * Splits a set of same-typed samples by track condition. Wet and dry samples must never be
 * averaged together — each condition group is normalized independently by the caller.
 */
export function groupByCondition<T extends { trackCondition: TrackCondition }>(
  samples: T[],
): Record<TrackCondition, T[]> {
  const groups: Record<TrackCondition, T[]> = { dry: [], wet: [], mixed: [], uncertain: [] }
  for (const sample of samples) groups[sample.trackCondition].push(sample)
  return groups
}

/**
 * Two stints are tyre-comparable only if they ran the same compound, the SAME classified track
 * condition (both dry or both wet — a dry stint is never compared against a wet one even if
 * compounds happen to match), and their tyre age (laps on the tyre) differs by no more than
 * `thresholdLaps`. Different compounds, mismatched conditions, or a fresh-tyre stint vs a
 * heavily-worn one, are never compared directly.
 */
export function areStintsTyreComparable(
  a: StintMetrics,
  b: StintMetrics,
  thresholdLaps: number,
): boolean {
  if (a.compound !== b.compound) return false
  if (a.trackCondition !== b.trackCondition) return false
  const ageA = a.endLap - a.startLap
  const ageB = b.endLap - b.startLap
  return Math.abs(ageA - ageB) <= thresholdLaps
}
