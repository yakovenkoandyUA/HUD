import { STRUCTURAL_NO_SIGNAL_METRIC_KEYS } from '../engine/metricRegistry'

/**
 * Per-metric calibration-strategy eligibility — implements "не можна season-normalize метрику, для
 * якої малий n" from the multi-season validation brief. A metric is NEVER force-normalized just
 * because the module exists; eligibility is derived from how much real data it actually has, per
 * season and in total.
 */
export type NormalizationStrategy =
  | 'season-normalized' // enough per-season sample in >=2 seasons to trust season-relative normalization
  | 'pooled-only' // decent total sample, but no single season has enough to normalize against alone
  | 'insufficient-signal' // real metric, but too little data anywhere (yet) to calibrate any way
  | 'manual-source-required' // structurally no-signal in v1 (see engine/metricRegistry.ts) — no amount of collection helps until an incident/FIA source exists

export interface EligibilityThresholds {
  /** A season needs at least this many samples for its own median/MAD to be trusted as a
   * normalization reference (see `seasonNormalization.ts`'s `minSeasonSampleSize`). */
  minSeasonSampleForNormalization: number
  /** Below this TOTAL (pooled, all seasons) sample count, even a pooled-only candidate range is
   * not proposed — mirrors `calibrationCandidates.ts`'s `MIN_SAMPLE_FOR_CANDIDATE`, but stated
   * here explicitly since this module's decision does not go through `buildCandidateRange`. */
  minTotalSampleForPooled: number
  /** How many DIFFERENT seasons must individually clear `minSeasonSampleForNormalization` before
   * season-normalization is trusted — one season alone has nothing to be "cross-season stable"
   * against, so this is >=2 by construction. */
  minSeasonsForNormalization: number
}

export const DEFAULT_ELIGIBILITY_THRESHOLDS: EligibilityThresholds = {
  minSeasonSampleForNormalization: 15,
  minTotalSampleForPooled: 15,
  minSeasonsForNormalization: 2,
}

export interface EligibilityResult {
  metric: string
  strategy: NormalizationStrategy
  nTotal: number
  nBySeason: Record<number, number>
  seasonsWithSufficientSample: number
  note: string
}

export function classifyNormalizationEligibility(
  metric: string,
  nBySeason: Record<number, number>,
  thresholds: EligibilityThresholds = DEFAULT_ELIGIBILITY_THRESHOLDS,
): EligibilityResult {
  const nTotal = Object.values(nBySeason).reduce((a, b) => a + b, 0)

  if (STRUCTURAL_NO_SIGNAL_METRIC_KEYS.includes(metric)) {
    return {
      metric, strategy: 'manual-source-required', nTotal, nBySeason, seasonsWithSufficientSample: 0,
      note: 'structurally no-signal in v1 (no connected incident/manual-review source) — more data collection cannot change this classification',
    }
  }

  const seasonsWithSufficientSample = Object.values(nBySeason)
    .filter(n => n >= thresholds.minSeasonSampleForNormalization).length

  if (seasonsWithSufficientSample >= thresholds.minSeasonsForNormalization) {
    return {
      metric, strategy: 'season-normalized', nTotal, nBySeason, seasonsWithSufficientSample,
      note: `${seasonsWithSufficientSample} season(s) individually clear the ${thresholds.minSeasonSampleForNormalization}-sample threshold — season-relative robust-z/percentile-rank normalization is trustworthy`,
    }
  }

  if (nTotal >= thresholds.minTotalSampleForPooled) {
    return {
      metric, strategy: 'pooled-only', nTotal, nBySeason, seasonsWithSufficientSample,
      note: `total pooled sample (n=${nTotal}) is usable, but fewer than ${thresholds.minSeasonsForNormalization} seasons individually clear ${thresholds.minSeasonSampleForNormalization} samples — not enough to trust per-season medians/MADs independently`,
    }
  }

  return {
    metric, strategy: 'insufficient-signal', nTotal, nBySeason, seasonsWithSufficientSample,
    note: `total pooled sample (n=${nTotal}) is below the ${thresholds.minTotalSampleForPooled}-sample floor for even a pooled-only candidate`,
  }
}
