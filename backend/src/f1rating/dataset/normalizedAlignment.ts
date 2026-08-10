import { percentile } from '../engine/calibrationCandidates'
import { median } from '../engine/teammateRelative'

/**
 * "Cross-season stability, redefined for strategy C." Comparing raw fixed-range candidate ranges
 * across seasons (`stabilityAnalysis.ts`) is the right test for strategy A (fixed global ranges).
 * It is NOT the right test for strategy C (season-normalized scores) — season-normalization
 * FORCES each season's own median to map to 50 by construction, so "did the center shift" is not
 * an interesting question anymore. What matters instead is whether the SHAPE of the normalized
 * score distribution (spread, tails) stays comparable across seasons — if it does, a score of 65
 * in 2023 and a score of 65 in 2025 mean roughly the same "how much better/worse than the grid"
 * even though the underlying raw metric's own scale drifted between the two seasons.
 */

export interface AlignmentThresholds {
  /** Max acceptable |median difference| between two seasons' normalized-score distributions, on
   * the 0-100 scale (median should sit near 50 by construction; this catches normalization bugs
   * or genuinely bimodal/skewed within-season distributions more than "drift"). */
  maxMedianDiff: number
  /** Max acceptable ratio (larger/smaller) between two seasons' IQR of normalized scores — how
   * much MORE spread out one season's grid is than another's, after normalization. */
  maxIqrRatio: number
  /** Max acceptable |P10 difference| and |P90 difference| between seasons, 0-100 scale — checks
   * tail alignment specifically, not just central tendency/spread. */
  maxTailDiff: number
}

export const DEFAULT_ALIGNMENT_THRESHOLDS: AlignmentThresholds = {
  maxMedianDiff: 10,
  maxIqrRatio: 1.5,
  maxTailDiff: 15,
}

export interface SeasonScoreSummary {
  season: number
  n: number
  median: number | null
  p10: number | null
  p25: number | null
  p75: number | null
  p90: number | null
  iqr: number | null
}

export function summarizeSeasonScores(season: number, scores: number[]): SeasonScoreSummary {
  if (scores.length === 0) {
    return { season, n: 0, median: null, p10: null, p25: null, p75: null, p90: null, iqr: null }
  }
  const p25 = percentile(scores, 25)
  const p75 = percentile(scores, 75)
  return {
    season, n: scores.length, median: median(scores),
    p10: percentile(scores, 10), p25, p75, p90: percentile(scores, 90), iqr: p75 - p25,
  }
}

export interface PairwiseAlignment {
  seasonA: number
  seasonB: number
  medianDiff: number | null
  iqrRatio: number | null
  p10Diff: number | null
  p90Diff: number | null
  aligned: boolean
  reasons: string[]
}

export function assessPairwiseAlignment(
  a: SeasonScoreSummary, b: SeasonScoreSummary, thresholds: AlignmentThresholds = DEFAULT_ALIGNMENT_THRESHOLDS,
): PairwiseAlignment {
  if (a.median === null || b.median === null || a.iqr === null || b.iqr === null) {
    return {
      seasonA: a.season, seasonB: b.season, medianDiff: null, iqrRatio: null, p10Diff: null, p90Diff: null,
      aligned: false, reasons: ['one or both seasons have no normalized scores to compare'],
    }
  }
  const medianDiff = Math.abs(a.median - b.median)
  const iqrRatio = a.iqr > 0 && b.iqr > 0 ? Math.max(a.iqr, b.iqr) / Math.min(a.iqr, b.iqr) : null
  const p10Diff = a.p10 !== null && b.p10 !== null ? Math.abs(a.p10 - b.p10) : null
  const p90Diff = a.p90 !== null && b.p90 !== null ? Math.abs(a.p90 - b.p90) : null

  const reasons: string[] = []
  if (medianDiff > thresholds.maxMedianDiff) reasons.push(`median diff ${medianDiff.toFixed(1)} > ${thresholds.maxMedianDiff}`)
  if (iqrRatio !== null && iqrRatio > thresholds.maxIqrRatio) reasons.push(`IQR ratio ${iqrRatio.toFixed(2)} > ${thresholds.maxIqrRatio}`)
  if (p10Diff !== null && p10Diff > thresholds.maxTailDiff) reasons.push(`P10 diff ${p10Diff.toFixed(1)} > ${thresholds.maxTailDiff}`)
  if (p90Diff !== null && p90Diff > thresholds.maxTailDiff) reasons.push(`P90 diff ${p90Diff.toFixed(1)} > ${thresholds.maxTailDiff}`)

  return {
    seasonA: a.season, seasonB: b.season, medianDiff, iqrRatio, p10Diff, p90Diff,
    aligned: reasons.length === 0, reasons,
  }
}

/** All pairwise alignments across 3+ seasons' score summaries — same "every pair, not just
 * consecutive" approach as the fixed-range stability comparison, so a metric can't look aligned
 * just because it was only ever checked against its most similar neighbor. */
export function assessAllPairwiseAlignments(
  summaries: SeasonScoreSummary[], thresholds: AlignmentThresholds = DEFAULT_ALIGNMENT_THRESHOLDS,
): PairwiseAlignment[] {
  const results: PairwiseAlignment[] = []
  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      results.push(assessPairwiseAlignment(summaries[i], summaries[j], thresholds))
    }
  }
  return results
}
