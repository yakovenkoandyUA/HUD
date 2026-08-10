import type { NormalizationStrategy } from './normalizationEligibility'

/**
 * Final per-metric calibration-strategy recommendation — the decision rule tying together
 * strategy A (fixed-range cross-season stability), B (pooled), and C (season-normalized
 * alignment) results from `cli/multiSeasonStrategyReport.ts`. Extracted as a pure function so the
 * recommendation logic itself is unit-testable without running the full CLI against real data.
 */
export type FinalRecommendation = 'fixed' | 'pooled' | 'season-normalized' | 'insufficient-data' | 'manual-only' | 'investigate'

export interface RecommendationResult {
  finalRecommendation: FinalRecommendation
  reasoning: string
}

export function recommendStrategy(
  eligibilityStrategy: NormalizationStrategy,
  strategyAAllPairsStable: boolean,
  strategyCAllAligned: boolean | null,
): RecommendationResult {
  if (eligibilityStrategy === 'manual-source-required') {
    return {
      finalRecommendation: 'manual-only',
      reasoning: 'structurally no-signal in v1 — no amount of collection/normalization changes this until an incident/FIA source exists',
    }
  }
  if (eligibilityStrategy === 'insufficient-signal') {
    return {
      finalRecommendation: 'insufficient-data',
      reasoning: 'total pooled sample across all seasons is still below the usable floor',
    }
  }
  if (strategyAAllPairsStable) {
    return {
      finalRecommendation: 'fixed',
      reasoning: 'fixed reference range is ALREADY stable across every pairwise season comparison — no need for a more complex strategy',
    }
  }
  if (eligibilityStrategy === 'season-normalized' && strategyCAllAligned === true) {
    return {
      finalRecommendation: 'season-normalized',
      reasoning: 'fixed range is unstable across seasons, but season-normalized scores align well across seasons (comparable spread/tails after normalization)',
    }
  }
  if (eligibilityStrategy === 'season-normalized' && strategyCAllAligned === false) {
    return {
      finalRecommendation: 'investigate',
      reasoning: 'fixed range is unstable AND season-normalized scores still do not align across seasons — the drift may not be a simple scale issue; needs manual investigation before any strategy is trusted',
    }
  }
  return {
    finalRecommendation: 'pooled',
    reasoning: 'fixed range is unstable and season-normalization is not eligible (insufficient per-season sample), but pooled sample is usable — pooled range is the least-bad available option, though NOT validated as bias-free',
  }
}
