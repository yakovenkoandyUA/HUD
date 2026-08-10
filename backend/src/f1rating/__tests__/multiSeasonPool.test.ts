import { describe, expect, it } from 'vitest'
import { poolSamplesForMetric, groupSamplesBySeason, computePooledMetricStats, type SeasonBank } from '../dataset/multiSeasonPool'
import { methodologyV1 } from '../config/methodologyV1'
import type { EventSample, SampleBank } from '../dataset/gridRatings'

function sample(season: number, round: number, driverId: string, teamId: string, value: number): EventSample {
  return { season, round, driverId, teamId, value }
}

function bankWith(metric: string, samples: EventSample[]): SampleBank {
  return { [metric]: samples }
}

describe('poolSamplesForMetric + groupSamplesBySeason', () => {
  it('concatenates samples from multiple season banks for one metric', () => {
    const banks: SeasonBank[] = [
      { season: 2023, bank: bankWith('peakRepresentativePace', [sample(2023, 1, 'a', 't1', 0.5)]) },
      { season: 2024, bank: bankWith('peakRepresentativePace', [sample(2024, 1, 'a', 't1', 0.3), sample(2024, 2, 'a', 't1', 0.4)]) },
    ]
    const pooled = poolSamplesForMetric(banks, 'peakRepresentativePace')
    expect(pooled).toHaveLength(3)
  })

  it('is order-independent — pooling banks in a different order produces the same grouped result', () => {
    const banks: SeasonBank[] = [
      { season: 2023, bank: bankWith('x', [sample(2023, 1, 'a', 't1', 1)]) },
      { season: 2024, bank: bankWith('x', [sample(2024, 1, 'a', 't1', 2)]) },
      { season: 2025, bank: bankWith('x', [sample(2025, 1, 'a', 't1', 3)]) },
    ]
    const forward = groupSamplesBySeason(poolSamplesForMetric(banks, 'x'))
    const reversed = groupSamplesBySeason(poolSamplesForMetric([...banks].reverse(), 'x'))
    expect(forward).toEqual(reversed)
  })

  it('a metric absent from a season\'s bank contributes zero samples from that season, not a crash', () => {
    const banks: SeasonBank[] = [
      { season: 2023, bank: {} },
      { season: 2024, bank: bankWith('x', [sample(2024, 1, 'a', 't1', 1)]) },
    ]
    const pooled = poolSamplesForMetric(banks, 'x')
    expect(pooled).toHaveLength(1)
  })
})

describe('computePooledMetricStats', () => {
  const range = methodologyV1.referenceRanges.peakRepresentativePace

  it('reports nTotal, nBySeason, and per-season + pooled distributions', () => {
    const samples = [
      sample(2023, 1, 'a', 't1', -0.5), sample(2023, 2, 'a', 't1', -0.3),
      sample(2024, 1, 'a', 't1', 0.1), sample(2024, 2, 'a', 't1', 0.2), sample(2024, 3, 'a', 't1', 0.3),
    ]
    const stats = computePooledMetricStats('peakRepresentativePace', samples, range, 24)
    expect(stats.nTotal).toBe(5)
    expect(stats.nBySeason).toEqual({ 2023: 2, 2024: 3 })
    expect(stats.seasons).toEqual([2023, 2024])
    expect(stats.pooledDistribution!.sampleCount).toBe(5)
    expect(stats.seasonDistributions[2023]!.sampleCount).toBe(2)
    expect(stats.seasonDistributions[2024]!.sampleCount).toBe(3)
  })

  it('counts teams/drivers as a UNION across seasons, not a per-season sum (same driver in 2 seasons counts once)', () => {
    const samples = [
      sample(2023, 1, 'verstappen', 'red_bull', 0.1),
      sample(2024, 1, 'verstappen', 'red_bull', 0.2),
      sample(2025, 1, 'verstappen', 'red_bull', 0.3),
    ]
    const stats = computePooledMetricStats('m', samples, range, 24)
    expect(stats.drivers).toBe(1)
    expect(stats.teams).toBe(1)
  })

  it('produces a pooled candidate range using the robust percentile algorithm, not raw min/max', () => {
    const samples = Array.from({ length: 40 }, (_, i) => sample(2023, i + 1, 'a', 't1', (i - 20) * 0.05))
    const stats = computePooledMetricStats('m', samples, range, 24)
    expect(stats.pooledCandidateRange.algorithm).toMatch(/robust window/)
  })

  it('is deterministic — same input samples produce the same stats regardless of array order', () => {
    const samples = [sample(2023, 1, 'a', 't1', 0.5), sample(2024, 1, 'b', 't2', -0.2), sample(2024, 2, 'a', 't1', 0.1)]
    const forward = computePooledMetricStats('m', samples, range, 24)
    const shuffled = computePooledMetricStats('m', [...samples].reverse(), range, 24)
    expect(forward.pooledDistribution).toEqual(shuffled.pooledDistribution)
    expect(forward.nBySeason).toEqual(shuffled.nBySeason)
  })
})
