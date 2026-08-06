import type { Confidence, ConfidenceLevel, MethodologyVersion } from '../types'

export type ConfidenceTunables = MethodologyVersion['tunables']

/**
 * Confidence reflects how much to trust a component score — it never changes the score itself.
 * A missing or thin-sample metric lowers confidence and gets reweighted away (see `reweight.ts`);
 * it is never silently treated as a zero or average value.
 *
 * All thresholds/penalties come from `tunables` (methodology config) — nothing here is a local
 * magic number, so changing how confidence is graded is a methodology-version change like any
 * weight, not a silent code edit.
 */
export function computeConfidence(
  sampleSize: number,
  minSampleSize: number,
  missingComponents: string[],
  tunables: ConfidenceTunables,
): Confidence {
  const sampleRatio = minSampleSize <= 0 ? (sampleSize > 0 ? 1 : 0) : clamp01(sampleSize / minSampleSize)
  const missingPenalty = missingComponents.length === 0
    ? 0
    : Math.min(tunables.confidenceMissingPenaltyCap, missingComponents.length * tunables.confidenceMissingPenaltyPerItem)
  const score = clamp01(sampleRatio - missingPenalty)

  let level: ConfidenceLevel = 'low'
  if (score >= tunables.confidenceHighThreshold) level = 'high'
  else if (score >= tunables.confidenceMediumThreshold) level = 'medium'

  return { level, score, sampleSize, missingComponents }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}
