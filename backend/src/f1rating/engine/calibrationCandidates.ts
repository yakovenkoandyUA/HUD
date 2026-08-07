import type { ReferenceRange } from '../types'
import { median, medianAbsoluteDeviation } from './teammateRelative'

/**
 * Statistically robust candidate reference ranges — replaces the earlier naive
 * observed-min/observed-max(+margin) approach, which a single outlier could stretch arbitrarily
 * (exactly the failure mode flagged in review: "один outlier розтягне шкалу"). Used by BOTH the
 * 2-driver McLaren smoke check (`cli/calibrationReport.ts`) and the grid-wide dataset tooling —
 * single implementation, no duplicated calibration math.
 */

const MIN_SAMPLE_FOR_CANDIDATE = 5
const MIN_SAMPLE_FOR_EXTREME_PERCENTILE = 30
const PERCENTILE_PADDING_FRACTION = 0.10
/** How close the distribution's median must be to 0 (relative to the robust half-width) before
 * a signed delta metric is proposed as a SYMMETRIC range instead of following the raw skew. */
const SYMMETRY_SKEW_TOLERANCE = 0.15
/** A percentile-based candidate is EXPECTED to still exclude a small residual of genuine extreme
 * outliers (that's the entire point of using P5-P95/P2.5-P97.5 instead of raw min/max) — requiring
 * `saturationAfter === 0` would mean "accept-candidate" could almost never fire. Accept when the
 * candidate reduces clipping to at most this fraction AND meaningfully improves on the current range. */
const MAX_RESIDUAL_SATURATION_FOR_ACCEPT = 0.03

export interface DistributionStats {
  sampleCount: number
  min: number
  max: number
  mean: number
  median: number
  p5: number
  p25: number
  p75: number
  p95: number
  p2_5: number
  p97_5: number
  mad: number
  iqr: number
}

export type CandidateRecommendation = 'accept-candidate' | 'investigate' | 'insufficient-data' | 'reject'

export interface CandidateRangeEntry {
  currentRange: [number, number]
  candidateRange: [number, number] | null
  distribution: DistributionStats | null
  teamCount: number
  driverCount: number
  roundCount: number
  outlierCount: number
  saturationBefore: number
  saturationAfter: number
  algorithm: string
  confidence: 'low' | 'medium' | 'high'
  recommendation: CandidateRecommendation
  note: string
}

/** Linear-interpolation percentile (values need not be pre-sorted). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

export function computeDistributionStats(values: number[]): DistributionStats | null {
  if (values.length === 0) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return {
    sampleCount: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    median: median(values) as number,
    p5: percentile(values, 5),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    p95: percentile(values, 95),
    p2_5: percentile(values, 2.5),
    p97_5: percentile(values, 97.5),
    mad: medianAbsoluteDeviation(values) as number,
    iqr: percentile(values, 75) - percentile(values, 25),
  }
}

/** Tukey's rule: values outside [P25 - 1.5*IQR, P75 + 1.5*IQR]. */
export function countOutliers(values: number[], stats: DistributionStats): number {
  const lower = stats.p25 - 1.5 * stats.iqr
  const upper = stats.p75 + 1.5 * stats.iqr
  return values.filter(v => v < lower || v > upper).length
}

export function clippedFraction(values: number[], range: [number, number]): number {
  if (values.length === 0) return 0
  const clipped = values.filter(v => v < range[0] || v > range[1]).length
  return clipped / values.length
}

export interface CandidateRangeInput {
  values: number[]
  range: ReferenceRange
  teamCount: number
  driverCount: number
  roundCount: number
  forceInvestigate: boolean
  note: string
}

/**
 * Proposes a candidate reference range from a robust percentile window (P5–P95, or P2.5–P97.5
 * once the sample is large enough for the more extreme percentiles to be meaningful), padded
 * documented-ly, with a zero-centered SYMMETRIC range for signed teammate-relative deltas whose
 * distribution isn't meaningfully skewed — an asymmetric range is only proposed when the
 * distribution's median sits far enough from 0 to justify it (see `SYMMETRY_SKEW_TOLERANCE`).
 * Never touches `range` or any config — purely returns a proposal object.
 */
export function buildCandidateRange(input: CandidateRangeInput): CandidateRangeEntry {
  const { values, range, teamCount, driverCount, roundCount, forceInvestigate, note } = input
  const current: [number, number] = [range.min, range.max]
  const stats = computeDistributionStats(values)

  if (!stats || stats.sampleCount < MIN_SAMPLE_FOR_CANDIDATE) {
    return {
      currentRange: current, candidateRange: null, distribution: stats,
      teamCount, driverCount, roundCount, outlierCount: 0,
      saturationBefore: clippedFraction(values, current), saturationAfter: 0,
      algorithm: `insufficient sample (n=${values.length} < ${MIN_SAMPLE_FOR_CANDIDATE})`,
      confidence: 'low', recommendation: 'insufficient-data',
      note: 'not enough samples to propose a statistically meaningful range',
    }
  }

  const useExtreme = stats.sampleCount >= MIN_SAMPLE_FOR_EXTREME_PERCENTILE
  const [robustLow, robustHigh] = useExtreme ? [stats.p2_5, stats.p97_5] : [stats.p5, stats.p95]
  const percentileLabel = useExtreme ? 'P2.5-P97.5' : 'P5-P95'

  const width = robustHigh - robustLow
  const padding = Math.max(width * PERCENTILE_PADDING_FRACTION, 0.01)

  const isSignedDelta = range.min < 0 && range.max > 0
  const halfWidthForSymmetry = Math.max(Math.abs(robustLow), Math.abs(robustHigh)) + padding
  const skewRatio = width > 0 ? Math.abs(stats.median) / (width / 2) : 0
  const useSymmetric = isSignedDelta && skewRatio < SYMMETRY_SKEW_TOLERANCE

  const candidate: [number, number] = useSymmetric
    ? [-halfWidthForSymmetry, halfWidthForSymmetry]
    : [robustLow - padding, robustHigh + padding]

  const saturationBefore = clippedFraction(values, current)
  const saturationAfter = clippedFraction(values, candidate)
  const outlierCount = countOutliers(values, stats)

  const confidence: CandidateRangeEntry['confidence'] =
    stats.sampleCount >= 30 && teamCount >= 5 && driverCount >= 8 ? 'high' :
    stats.sampleCount >= 10 && teamCount >= 3 ? 'medium' : 'low'

  let recommendation: CandidateRecommendation
  if (forceInvestigate) {
    recommendation = 'investigate'
  } else if (saturationBefore === 0) {
    recommendation = 'reject' // current range already covers the robust window — no change warranted
  } else if (saturationAfter <= MAX_RESIDUAL_SATURATION_FOR_ACCEPT && saturationAfter < saturationBefore && confidence !== 'low') {
    recommendation = 'accept-candidate'
  } else {
    recommendation = 'investigate'
  }

  const algorithm = `${percentileLabel} robust window, +${(PERCENTILE_PADDING_FRACTION * 100).toFixed(0)}% padding` +
    (isSignedDelta ? (useSymmetric ? ', symmetric around 0 (signed delta, median close to 0)' : ', asymmetric (signed delta but distribution skewed away from 0)') : '')

  return {
    currentRange: current,
    candidateRange: (saturationBefore > 0 || forceInvestigate) ? candidate : null,
    distribution: stats, teamCount, driverCount, roundCount, outlierCount,
    saturationBefore, saturationAfter, algorithm, confidence, recommendation, note,
  }
}
