import type { EventSample } from './gridRatings'
import { median, medianAbsoluteDeviation } from '../engine/teammateRelative'

/**
 * Season-normalized (robust z-score) calibration strategy — "strategy C" in the 2023-2025
 * multi-season validation, proposed as an alternative to BOTH the current fixed-window approach
 * (strategy A, whose cross-season stability failed — see stabilityAnalysis.ts pairwise results)
 * and the pooled-global-range approach (strategy B, multiSeasonPool.ts).
 *
 * Instead of asking "does this driver's raw metric value fall inside a fixed absolute window",
 * this asks "how far is this driver from THIS SEASON's own grid distribution" — the season itself
 * supplies the reference frame, so a season with different tyres/regs/track-evolution/weather mix
 * does not need its own hand-tuned fixed range; it normalizes itself.
 *
 * EXPERIMENTAL — not wired into any active methodology. Standalone module, never imported by
 * `engine/normalize.ts` (the active v1 normalization) or `computeDriverRating`.
 */

export interface SeasonNormParams {
  /** Minimum number of samples within a single season required before that season's median/MAD
   * are trusted enough to normalize against — below this, `robustZ` intentionally returns `null`
   * rather than dividing by a MAD estimated from too few points. */
  minSeasonSampleSize: number
  /** z-scores are clipped to [-clipZ, +clipZ] before being mapped to the 0-100 scale, so a single
   * extreme outlier cannot single-handedly blow out the mapped score the way it could with a raw
   * min/max normalization. */
  clipZ: number
}

export const DEFAULT_SEASON_NORM_PARAMS: SeasonNormParams = {
  minSeasonSampleSize: 15,
  clipZ: 3,
}

/** Below this, a season's MAD is treated as "effectively zero" (every sample nearly identical) —
 * dividing by it would produce a meaningless, numerically unstable z-score rather than a real
 * signal, so `robustZ` returns `null` instead of `Infinity`/`NaN`. */
const MAD_EPSILON = 1e-9

/** MAD -> approximately-normal-consistent scale factor (standard robust-statistics convention:
 * multiplying MAD by ~1.4826 makes it comparable to a standard deviation for normally-distributed
 * data), so `robustZ` output is on a roughly comparable scale to a classic z-score. */
const MAD_CONSISTENCY_FACTOR = 1.4826

export interface SeasonMedianMad {
  season: number
  median: number
  mad: number
  n: number
}

/** Computes one season's robust center (median) and spread (MAD) for a metric, or `null` if the
 * season has zero samples for it. Does NOT apply `minSeasonSampleSize` — that gate is applied at
 * the `robustZ`/`percentileRankScore` call site, since "do we have a center/spread at all" and "is
 * the sample big enough to trust normalizing against it" are different questions. */
export function computeSeasonMedianMad(season: number, samples: EventSample[]): SeasonMedianMad | null {
  if (samples.length === 0) return null
  const values = samples.map(s => s.value)
  const med = median(values)
  const mad = medianAbsoluteDeviation(values)
  if (med === null || mad === null) return null
  return { season, median: med, mad, n: values.length }
}

/**
 * Robust z-score of `rawValue` against a season's own median/MAD. Returns `null` (never
 * `Infinity`/`NaN`) when the season's MAD is ~0 (a genuinely degenerate season distribution, not a
 * real signal) — safe-handling for the "MAD≈0" edge case the brief explicitly calls out.
 */
export function robustZ(rawValue: number, seasonMedian: number, seasonMad: number): number | null {
  if (seasonMad < MAD_EPSILON) return null
  return (rawValue - seasonMedian) / (seasonMad * MAD_CONSISTENCY_FACTOR)
}

export function clipZ(z: number, clip: number): number {
  return Math.max(-clip, Math.min(clip, z))
}

/**
 * Deterministic, bounded mapping from a (clipped) z-score to a 0-100 internal scale, preserving
 * `higherIsBetter` sign semantics: z=0 (exactly at the season median) always maps to 50, regardless
 * of direction. A `higherIsBetter:false` metric (e.g. a lap-time-gap delta, where more negative is
 * faster/better) is inverted BEFORE clipping+mapping, so "better than the season median" always
 * maps above 50 and "worse" always maps below 50, for every metric, regardless of its raw sign
 * convention — the same contract `engine/normalize.ts` provides for the fixed-range strategy.
 */
export function mapZToScore0to100(z: number, params: SeasonNormParams, higherIsBetter: boolean): number {
  const goodness = higherIsBetter ? z : -z
  const clipped = clipZ(goodness, params.clipZ)
  return ((clipped + params.clipZ) / (2 * params.clipZ)) * 100
}

/**
 * Full season-normalized robust-z score for one sample: `null` if the season doesn't meet
 * `minSeasonSampleSize` (insufficient signal to normalize against) or if the season's MAD is ~0.
 * Never fabricates a score from an untrustworthy season distribution.
 */
export function seasonRobustZScore(
  rawValue: number,
  seasonStats: SeasonMedianMad,
  higherIsBetter: boolean,
  params: SeasonNormParams = DEFAULT_SEASON_NORM_PARAMS,
): number | null {
  if (seasonStats.n < params.minSeasonSampleSize) return null
  const z = robustZ(rawValue, seasonStats.median, seasonStats.mad)
  if (z === null) return null
  return mapZToScore0to100(z, params, higherIsBetter)
}

/**
 * Percentile-rank normalization — a CONTROL/alternative to `seasonRobustZScore`, using the
 * season's empirical rank instead of a parametric (median/MAD) model. Less sensitive to the exact
 * shape of the season distribution, more sensitive to sample size (rank is noisy with few points).
 * `rawValue` need not be a member of `seasonValues` (works for held-out/out-of-sample scoring too).
 */
export function percentileRank(rawValue: number, seasonValues: number[]): number | null {
  if (seasonValues.length === 0) return null
  const belowOrEqual = seasonValues.filter(v => v <= rawValue).length
  return (belowOrEqual / seasonValues.length) * 100
}

export function percentileRankScore0to100(
  rawValue: number,
  seasonValues: number[],
  higherIsBetter: boolean,
  minSeasonSampleSize: number = DEFAULT_SEASON_NORM_PARAMS.minSeasonSampleSize,
): number | null {
  if (seasonValues.length < minSeasonSampleSize) return null
  const rank = percentileRank(rawValue, seasonValues)
  if (rank === null) return null
  return higherIsBetter ? rank : 100 - rank
}
