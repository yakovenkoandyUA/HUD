import type { ReferenceRange } from '../types'

/**
 * Pure helpers behind the calibration report's "candidate reference ranges" — kept here, not
 * inline in `cli/calibrationReport.ts`, so they're independently unit-testable and so it's
 * structurally obvious they never touch `config/methodologyV1.ts`: every function here takes a
 * `ReferenceRange` by value and returns a new proposal object, nothing is mutated in place.
 */

export interface CandidateRangeEntry {
  currentRange: [number, number]
  candidateRange: [number, number] | null
  observedMin: number
  observedMax: number
  sampleCount: number
  saturationBefore: number
  saturationAfter: number
  confidence: 'low' | 'medium' | 'high'
  recommendation: 'accept' | 'investigate' | 'reject'
  note: string
}

/** Fraction of `values` that fall outside `range` — i.e. would be clamped/clipped by it. */
export function clippedFraction(values: number[], range: [number, number]): number {
  if (values.length === 0) return 0
  const clipped = values.filter(v => v < range[0] || v > range[1]).length
  return clipped / values.length
}

/**
 * Proposes a candidate range from observed real values. NEVER mutates `range` or any config —
 * purely returns a proposal object. `forceInvestigate` is used for metrics whose formula itself
 * changed this iteration (e.g. tyreStintManagement) — those are never auto-recommended for
 * acceptance regardless of how clean the observed stats look, until validated on a second dataset.
 */
export function buildCandidateRange(
  values: number[],
  range: ReferenceRange,
  forceInvestigate: boolean,
  note: string,
): CandidateRangeEntry {
  const current: [number, number] = [range.min, range.max]
  if (values.length === 0) {
    return {
      currentRange: current, candidateRange: null, observedMin: NaN, observedMax: NaN,
      sampleCount: 0, saturationBefore: 0, saturationAfter: 0, confidence: 'low',
      recommendation: 'reject', note: 'no samples collected in this pass',
    }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const saturationBefore = clippedFraction(values, current)
  const margin = Math.max((max - min) * 0.15, 0.05)
  // Only a range whose CURRENT floor is exactly 0 (a percentage/rate, e.g. qualifyingHeadToHead
  // 0..100) is guarded against proposing a negative floor. A range like racecraftProxy (-3..3)
  // already spans negative territory by design (losing positions is a legitimate outcome) — it
  // must be free to propose a more-negative candidate, not clamped up to 0.
  const candidateMin = range.min === 0 && range.higherIsBetter
    ? Math.max(0, Math.min(range.min, min - margin))
    : Math.min(range.min, min - margin)
  const candidate: [number, number] = [candidateMin, Math.max(range.max, max + margin)]
  const saturationAfter = clippedFraction(values, candidate)
  const confidence: CandidateRangeEntry['confidence'] = values.length >= 15 ? 'medium' : 'low'

  let recommendation: CandidateRangeEntry['recommendation'] = 'reject'
  if (forceInvestigate) recommendation = 'investigate'
  else if (saturationBefore > 0) recommendation = 'investigate'

  return {
    currentRange: current,
    candidateRange: saturationBefore > 0 || forceInvestigate ? candidate : null,
    observedMin: min, observedMax: max, sampleCount: values.length,
    saturationBefore, saturationAfter, confidence, recommendation, note,
  }
}
