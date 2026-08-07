import type { CandidateRangeEntry } from '../engine/calibrationCandidates'

/**
 * Compares a metric's candidate range/recommendation across two dataset sizes (e.g. a 9-round
 * sample vs the full 24-round season) to decide whether the candidate range is trustworthy or
 * still moving as more data arrives. This is what makes "не приймай candidate range, якщо він
 * materially unstable" enforceable in code rather than a manual eyeball check.
 */

export interface StabilityThresholds {
  /** At/below this relative shift (0-1), a metric's range is classified 'stable'. */
  stableMaxRelativeShift: number
  /** At/below this relative shift, 'moderately-shifted'; above it, 'unstable'. */
  moderateMaxRelativeShift: number
}

/**
 * Not magic numbers scattered in comparison code — one documented, named config object.
 * 15%/40% are deliberately conservative for a rating methodology: a candidate range that moves
 * by more than 40% of its own width when the sample roughly doubles or triples has not converged.
 */
export const DEFAULT_STABILITY_THRESHOLDS: StabilityThresholds = {
  stableMaxRelativeShift: 0.15,
  moderateMaxRelativeShift: 0.40,
}

export type StabilityClassification = 'stable' | 'moderately-shifted' | 'unstable' | 'insufficient-data'

export interface StabilityComparison {
  metric: string
  classification: StabilityClassification
  smallerRange: [number, number] | null
  largerRange: [number, number] | null
  absoluteCenterShift: number | null
  relativeShift: number | null
  saturationChangeSmallerToLarger: number | null
  percentileShift: { p5: number | null; p50: number | null; p95: number | null }
  recommendationSmaller: CandidateRangeEntry['recommendation'] | null
  recommendationLarger: CandidateRangeEntry['recommendation'] | null
  recommendationFlipped: boolean
  note: string
}

function rangeCenter(range: [number, number]): number {
  return (range[0] + range[1]) / 2
}

function rangeWidth(range: [number, number]): number {
  return range[1] - range[0]
}

/**
 * Compares one metric's candidate-range entry between a smaller (`a`, e.g. 9-round) and a
 * larger (`b`, e.g. 24-round full-season) dataset run. Pure function — never mutates either
 * input, never touches active methodology config.
 */
export function classifyStability(
  metric: string,
  a: CandidateRangeEntry,
  b: CandidateRangeEntry,
  thresholds: StabilityThresholds = DEFAULT_STABILITY_THRESHOLDS,
): StabilityComparison {
  const base = {
    metric,
    recommendationSmaller: a.recommendation, recommendationLarger: b.recommendation,
    recommendationFlipped: a.recommendation !== b.recommendation,
  }

  if (!a.distribution || !b.distribution) {
    return {
      ...base, classification: 'insufficient-data', smallerRange: null, largerRange: null,
      absoluteCenterShift: null, relativeShift: null, saturationChangeSmallerToLarger: null,
      percentileShift: { p5: null, p50: null, p95: null },
      note: 'one or both datasets have no distribution for this metric — cannot assess stability',
    }
  }

  // Compare the CURRENT range (candidate if proposed, else the range each run actually observed
  // against) — using candidateRange when present, falling back to currentRange so a metric with
  // no proposed change on either side still gets a real comparison instead of "insufficient-data".
  const rangeA = a.candidateRange ?? a.currentRange
  const rangeB = b.candidateRange ?? b.currentRange

  const centerA = rangeCenter(rangeA)
  const centerB = rangeCenter(rangeB)
  const widthA = rangeWidth(rangeA)
  const widthB = rangeWidth(rangeB)
  const referenceWidth = Math.max(widthA, widthB, 1e-9)

  const absoluteCenterShift = Math.abs(centerB - centerA)
  const relativeCenterShift = absoluteCenterShift / referenceWidth
  const relativeWidthChange = Math.abs(widthB - widthA) / referenceWidth
  const relativeShift = Math.max(relativeCenterShift, relativeWidthChange)

  const percentileShift = {
    p5: b.distribution.p5 - a.distribution.p5,
    p50: b.distribution.median - a.distribution.median,
    p95: b.distribution.p95 - a.distribution.p95,
  }

  let classification: StabilityClassification
  if (base.recommendationFlipped) {
    classification = 'unstable'
  } else if (relativeShift <= thresholds.stableMaxRelativeShift) {
    classification = 'stable'
  } else if (relativeShift <= thresholds.moderateMaxRelativeShift) {
    classification = 'moderately-shifted'
  } else {
    classification = 'unstable'
  }

  const note = base.recommendationFlipped
    ? `recommendation changed from "${a.recommendation}" to "${b.recommendation}" between datasets — treated as unstable regardless of numeric shift`
    : `relative shift ${(relativeShift * 100).toFixed(1)}% (stable<=${(thresholds.stableMaxRelativeShift * 100).toFixed(0)}%, moderate<=${(thresholds.moderateMaxRelativeShift * 100).toFixed(0)}%)`

  return {
    ...base, classification, smallerRange: rangeA, largerRange: rangeB,
    absoluteCenterShift, relativeShift, saturationChangeSmallerToLarger: b.saturationBefore - a.saturationBefore,
    percentileShift, note,
  }
}

export function compareCandidateRangeSets(
  smaller: Record<string, CandidateRangeEntry>,
  larger: Record<string, CandidateRangeEntry>,
  thresholds: StabilityThresholds = DEFAULT_STABILITY_THRESHOLDS,
): Record<string, StabilityComparison> {
  const result: Record<string, StabilityComparison> = {}
  const keys = new Set([...Object.keys(smaller), ...Object.keys(larger)])
  for (const key of keys) {
    if (!smaller[key] || !larger[key]) continue
    result[key] = classifyStability(key, smaller[key], larger[key], thresholds)
  }
  return result
}

/**
 * Downgrades any 'accept-candidate' recommendation to 'investigate' when the stability
 * comparison says the metric is NOT 'stable' between the two dataset sizes — this is the
 * enforcement point for "не приймай candidate range, якщо він materially unstable". Returns a
 * NEW candidate-range map; never mutates the input.
 */
export function applyStabilityGate(
  candidateRanges: Record<string, CandidateRangeEntry>,
  stability: Record<string, StabilityComparison>,
): Record<string, CandidateRangeEntry> {
  const gated: Record<string, CandidateRangeEntry> = {}
  for (const [key, entry] of Object.entries(candidateRanges)) {
    const comparison = stability[key]
    if (entry.recommendation === 'accept-candidate' && comparison && comparison.classification !== 'stable') {
      gated[key] = {
        ...entry,
        recommendation: 'investigate',
        note: `${entry.note} [downgraded from accept-candidate: ${comparison.classification} vs prior sample — ${comparison.note}]`,
      }
    } else {
      gated[key] = entry
    }
  }
  return gated
}
