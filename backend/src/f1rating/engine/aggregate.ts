import type {
  ComponentBreakdownItem, ComponentScore, ManualReviewAdjustment, MethodologyVersion,
  RatingComponent, ReferenceRange, WeightsMap,
} from '../types'
import { computeConfidence } from './confidence'
import { applyManualAdjustments } from './manualReview'
import { normalizeToReferenceRange, mapInternalToFinalScale } from './normalize'
import { reweightComponents } from './reweight'
import type { MetricResult } from './metrics'

export interface AggregateComponentInput {
  component: RatingComponent
  metricResults: Record<string, MetricResult>
  weights: WeightsMap
  referenceRanges: Record<string, ReferenceRange>
  minSampleSize: Record<string, number>
  manualAdjustments: ManualReviewAdjustment[]
  finalScale: { min: number; max: number }
  tunables: MethodologyVersion['tunables']
}

/**
 * Combines a component's weighted sub-metrics into a single explainable `ComponentScore`.
 * Every step here is deterministic and pure — same inputs always produce the same output.
 */
export function aggregateComponent(input: AggregateComponentInput): ComponentScore {
  const { component, metricResults, weights, referenceRanges, minSampleSize, manualAdjustments, finalScale, tunables } = input
  const keys = Object.keys(weights)

  const availability: { key: string; available: boolean; exclusionReason?: string }[] = keys.map(key => {
    const result = metricResults[key]
    if (!result) {
      throw new Error(`[f1rating] no metric result computed for configured weight key "${key}"`)
    }
    if (result.rawValue === null) {
      return { key, available: false, exclusionReason: 'missing data' }
    }
    const required = minSampleSize[key] ?? 0
    if (result.sampleSize < required) {
      return {
        key, available: false,
        exclusionReason: `insufficient sample size (n=${result.sampleSize} < required ${required})`,
      }
    }
    return { key, available: true }
  })

  const effectiveWeights = reweightComponents(
    keys.map(key => ({ key, weight: weights[key], available: availability.find(a => a.key === key)!.available })),
  )

  const breakdown: ComponentBreakdownItem[] = []
  let internalScoreRaw: number | null = null
  let anyAvailable = false
  const missingKeys: string[] = []
  let totalSampleSize = 0

  for (const key of keys) {
    const result = metricResults[key]
    const avail = availability.find(a => a.key === key)!
    const effectiveWeight = effectiveWeights[key]
    const range = referenceRanges[key]
    totalSampleSize += result.sampleSize

    const normalizedValue = avail.available ? normalizeToReferenceRange(result.rawValue as number, range) : null
    const contribution = normalizedValue !== null ? normalizedValue * effectiveWeight : 0

    if (avail.available) {
      anyAvailable = true
      internalScoreRaw = (internalScoreRaw ?? 0) + contribution
    } else {
      missingKeys.push(key)
    }

    breakdown.push({
      key,
      rawValue: result.rawValue,
      normalizedValue,
      weight: weights[key],
      effectiveWeight,
      contribution,
      sampleSize: result.sampleSize,
      confidence: computeConfidence(result.sampleSize, minSampleSize[key] ?? 0, avail.available ? [] : [avail.exclusionReason ?? 'missing'], tunables),
      excluded: !avail.available,
      exclusionReason: avail.exclusionReason,
    })
  }

  if (!anyAvailable) internalScoreRaw = null

  const componentAdjustments = manualAdjustments.filter(a => a.affectedComponent === component)
  const manualResult = applyManualAdjustments(
    internalScoreRaw, componentAdjustments, component,
    tunables.maxManualAdjustmentMagnitude, tunables.maxCumulativeManualAdjustmentPerComponent,
  )

  const hasUsableScore = internalScoreRaw !== null || manualResult.appliedAdjustments.length > 0
  const internalScoreAdjusted = hasUsableScore ? manualResult.adjustedScore : null
  const score = internalScoreAdjusted !== null ? mapInternalToFinalScale(internalScoreAdjusted, finalScale) : null

  const confidence = computeConfidence(totalSampleSize, sumMinSamples(keys, minSampleSize), missingKeys, tunables)

  const warnings = [...manualResult.warnings]
  if (score === null) warnings.push(`component "${component}" has insufficient data to compute a score`)
  for (const ignored of manualResult.ignoredAdjustments) {
    warnings.push(`manual adjustment ${ignored.adjustment.id} ignored: ${ignored.reason}`)
  }

  return {
    component,
    internalScoreRaw,
    internalScoreAdjusted,
    score,
    confidence,
    breakdown,
    appliedManualAdjustments: manualResult.appliedAdjustments,
    warnings,
  }
}

function sumMinSamples(keys: string[], minSampleSize: Record<string, number>): number {
  return keys.reduce((acc, key) => acc + (minSampleSize[key] ?? 0), 0)
}
