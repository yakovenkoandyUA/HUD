import type { MethodologyVersion, ReferenceRange, WeightsMap } from '../types'
import type { CandidateRangeEntry } from '../engine/calibrationCandidates'

/** A reference range whose metric carries at least this weight in ANY component is "key" —
 * driverAttributableReliability(.20)/tyreStintManagement(.20)/startAndOpeningLapExecution(.20)
 * and above. Below this, a metric having insufficient data is a minor gap, not a reason to
 * refuse the whole candidate. */
const KEY_METRIC_MIN_WEIGHT = 0.20
/** Refuse to build a candidate if more than half of the KEY metrics are insufficient-data. */
const MAX_INSUFFICIENT_KEY_METRIC_FRACTION = 0.5

export interface CandidateMethodologyResult {
  methodology: MethodologyVersion | null
  calibratedMetricKeys: string[]
  inheritedUnverifiedKeys: string[]
  keyMetricKeys: string[]
  insufficientKeyMetricKeys: string[]
  reasonNotCreated: string | null
}

function isKeyMetric(key: string, weightMaps: WeightsMap[]): boolean {
  return weightMaps.some(w => (w[key] ?? 0) >= KEY_METRIC_MIN_WEIGHT)
}

/**
 * Builds an experimental `mimir-f1-v2-candidate` methodology from grid-calibration candidate
 * ranges — NEVER mutates `base` (returns a new object), NEVER sets `productionReady: true`, and
 * refuses to build a candidate at all if too many high-weight ("key") metrics have
 * insufficient-data (returns `methodology: null` with `reasonNotCreated` explaining why).
 *
 * Only reference ranges with `recommendation: 'accept-candidate'` are replaced; everything else
 * (weights, tunables, and any range whose recommendation was 'investigate'/'reject'/
 * 'insufficient-data') is inherited UNCHANGED from `base` — a candidate is additive evidence,
 * not a wholesale rewrite. `calibratedMetricKeys`/`inheritedUnverifiedKeys` record exactly which
 * is which, so nobody has to diff the two configs to find out.
 */
export function buildMethodologyV2Candidate(
  base: MethodologyVersion,
  candidateRanges: Record<string, CandidateRangeEntry>,
  datasetId: string,
): CandidateMethodologyResult {
  const weightMaps = [base.speedWeights, base.precisionWeights, base.raceIqWeights]
  const allKeys = Object.keys(base.referenceRanges)
  const keyMetricKeys = allKeys.filter(k => isKeyMetric(k, weightMaps))
  const insufficientKeyMetricKeys = keyMetricKeys.filter(k => candidateRanges[k]?.recommendation === 'insufficient-data')

  if (keyMetricKeys.length > 0 && insufficientKeyMetricKeys.length / keyMetricKeys.length > MAX_INSUFFICIENT_KEY_METRIC_FRACTION) {
    return {
      methodology: null, calibratedMetricKeys: [], inheritedUnverifiedKeys: [],
      keyMetricKeys, insufficientKeyMetricKeys,
      reasonNotCreated:
        `${insufficientKeyMetricKeys.length}/${keyMetricKeys.length} key (weight >= ${KEY_METRIC_MIN_WEIGHT}) ` +
        `reference ranges have insufficient-data: ${insufficientKeyMetricKeys.join(', ')} — refusing to create ` +
        `mimir-f1-v2-candidate until more data closes these gaps (see reasonsNotReady in the grid calibration report)`,
    }
  }

  const referenceRanges: Record<string, ReferenceRange> = {}
  const calibratedMetricKeys: string[] = []
  const inheritedUnverifiedKeys: string[] = []

  for (const key of allKeys) {
    const candidate = candidateRanges[key]
    if (candidate?.recommendation === 'accept-candidate' && candidate.candidateRange) {
      const [min, max] = candidate.candidateRange
      referenceRanges[key] = {
        ...base.referenceRanges[key],
        min, max,
        description: `${base.referenceRanges[key].description} [v2-candidate: calibrated from dataset ` +
          `${datasetId}, algorithm: ${candidate.algorithm}]`,
      }
      calibratedMetricKeys.push(key)
    } else {
      referenceRanges[key] = { ...base.referenceRanges[key] }
      inheritedUnverifiedKeys.push(key)
    }
  }

  const methodology: MethodologyVersion = {
    ...base,
    id: 'mimir-f1-v2-candidate',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    description:
      `Experimental candidate methodology — reference ranges calibrated against grid-wide ` +
      `dataset ${datasetId} where sufficient data existed (${calibratedMetricKeys.length} of ` +
      `${allKeys.length} ranges); everything else (weights, tunables, remaining ranges) ` +
      `inherited unchanged from ${base.id}. NOT for production use — see productionReady.`,
    calibrationStatus: 'candidate',
    calibrationDatasetId: datasetId,
    productionReady: false,
    referenceRanges,
  }

  return { methodology, calibratedMetricKeys, inheritedUnverifiedKeys, keyMetricKeys, insufficientKeyMetricKeys, reasonNotCreated: null }
}
