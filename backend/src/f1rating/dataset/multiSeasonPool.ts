import type { EventSample, SampleBank } from './gridRatings'
import {
  buildCandidateRange, computeDistributionStats, type CandidateRangeEntry, type DistributionStats,
} from '../engine/calibrationCandidates'
import type { ReferenceRange } from '../types'

/**
 * Pooled (multi-season) calibration strategy — "strategy B" in the 2023-2025 multi-season
 * validation. Combines raw per-metric samples from several INDEPENDENTLY-computed
 * `computeGridRatings` runs (one per season — see the comment on `lastRound` in gridRatings.ts for
 * why seasons are never mixed inside a single `computeGridRatings` call) into one larger
 * population, then derives a single global candidate range from the combined distribution.
 *
 * This is a baseline to compare against "strategy C" (season-normalized scoring, see
 * `seasonNormalization.ts`) — pairwise cross-season stability analysis
 * (`dataset/stabilityAnalysis.ts`) already showed the intersection of stable fixed-range metrics
 * across 2023/2024/2025 is EMPTY, so pooling alone is not assumed to be sufficient; this module
 * exists to measure, per metric, whether pooling helps, and how much season-to-season bias
 * survives inside the pooled distribution.
 */

export interface SeasonBank {
  season: number
  bank: SampleBank
}

/** Concatenates one metric's samples across every season bank — order-independent (grouping by
 * season below re-derives per-season breakdowns regardless of input array order). */
export function poolSamplesForMetric(seasonBanks: SeasonBank[], metric: string): EventSample[] {
  const pooled: EventSample[] = []
  for (const { bank } of seasonBanks) pooled.push(...(bank[metric] ?? []))
  return pooled
}

export function groupSamplesBySeason(samples: EventSample[]): Record<number, EventSample[]> {
  const bySeason: Record<number, EventSample[]> = {}
  for (const s of samples) {
    if (!bySeason[s.season]) bySeason[s.season] = []
    bySeason[s.season].push(s)
  }
  return bySeason
}

export interface PooledMetricStats {
  metric: string
  nTotal: number
  nBySeason: Record<number, number>
  seasons: number[]
  teams: number
  drivers: number
  seasonDistributions: Record<number, DistributionStats | null>
  pooledDistribution: DistributionStats | null
  pooledCandidateRange: CandidateRangeEntry
}

/**
 * Computes pooled + per-season-breakdown statistics for one metric from already-pooled samples.
 * `teams`/`drivers` are counted as the UNION of distinct team/driver ids across all seasons in
 * the pooled sample (not summed per season — the same driver/team appearing in multiple seasons
 * must not be double-counted as "more drivers").
 */
export function computePooledMetricStats(
  metric: string,
  pooledSamples: EventSample[],
  referenceRange: ReferenceRange,
  roundCount: number,
): PooledMetricStats {
  const bySeason = groupSamplesBySeason(pooledSamples)
  const seasons = Object.keys(bySeason).map(Number).sort((a, b) => a - b)
  const nBySeason: Record<number, number> = {}
  const seasonDistributions: Record<number, DistributionStats | null> = {}
  for (const season of seasons) {
    nBySeason[season] = bySeason[season].length
    seasonDistributions[season] = computeDistributionStats(bySeason[season].map(s => s.value))
  }

  const teams = new Set(pooledSamples.map(s => s.teamId)).size
  const drivers = new Set(pooledSamples.map(s => s.driverId)).size
  const values = pooledSamples.map(s => s.value)
  const pooledDistribution = computeDistributionStats(values)

  const pooledCandidateRange = buildCandidateRange({
    values, range: referenceRange, teamCount: teams, driverCount: drivers, roundCount,
    forceInvestigate: false,
    note: `pooled sample across ${seasons.length} season(s) (${seasons.join(', ')}), ${teams} teams, ${drivers} drivers`,
  })

  return {
    metric, nTotal: values.length, nBySeason, seasons, teams, drivers,
    seasonDistributions, pooledDistribution, pooledCandidateRange,
  }
}
