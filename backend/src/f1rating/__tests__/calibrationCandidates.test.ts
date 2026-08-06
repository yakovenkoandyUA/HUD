import { describe, expect, it } from 'vitest'
import {
  buildCandidateRange, clippedFraction, computeDistributionStats, countOutliers, percentile,
} from '../engine/calibrationCandidates'
import { methodologyV1 } from '../config/methodologyV1'
import { computeDriverRating } from '../engine'
import { norrisSeasonFixture, piastriSeasonFixture, FIXTURE_SEASON, FIXTURE_CALCULATED_AFTER_ROUND } from '../fixtures/norrisPiastriFixture'
import type { ReferenceRange } from '../types'

const range: ReferenceRange = { key: 'test', min: -1, max: 1, higherIsBetter: false, description: '' }

describe('percentile', () => {
  it('P50 of an odd-length array is the middle value', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3)
  })

  it('P0 is the min and P100 is the max', () => {
    const values = [5, 1, 9, 3, 7]
    expect(percentile(values, 0)).toBe(1)
    expect(percentile(values, 100)).toBe(9)
  })

  it('interpolates between two points for a percentile not landing exactly on an index', () => {
    // [1,2,3,4] — P25 index = 0.25*3 = 0.75 -> interpolate between values[0]=1 and values[1]=2
    expect(percentile([1, 2, 3, 4], 25)).toBeCloseTo(1.75, 6)
  })

  it('does not mutate the input array (sorts a copy)', () => {
    const values = [5, 1, 3]
    percentile(values, 50)
    expect(values).toEqual([5, 1, 3])
  })
})

describe('computeDistributionStats', () => {
  it('returns null for an empty sample', () => {
    expect(computeDistributionStats([])).toBeNull()
  })

  it('computes median/IQR/MAD/percentiles for a known distribution', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const stats = computeDistributionStats(values)!
    expect(stats.sampleCount).toBe(10)
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(10)
    expect(stats.median).toBeCloseTo(5.5, 6)
    expect(stats.iqr).toBeCloseTo(stats.p75 - stats.p25, 10)
    expect(stats.mad).toBeGreaterThan(0)
  })
})

describe('countOutliers — Tukey IQR rule', () => {
  it('flags a value far outside the IQR fence as an outlier', () => {
    const values = [10, 11, 12, 11, 10, 12, 13, 11, 100]
    const stats = computeDistributionStats(values)!
    expect(countOutliers(values, stats)).toBeGreaterThanOrEqual(1)
  })

  it('flags zero outliers for a tight, uniform distribution', () => {
    const values = [10, 10, 11, 10, 11, 10, 11, 10]
    const stats = computeDistributionStats(values)!
    expect(countOutliers(values, stats)).toBe(0)
  })
})

describe('clippedFraction — saturation detection', () => {
  it('is 0 when every value is within range', () => {
    expect(clippedFraction([-0.5, 0, 0.5], [-1, 1])).toBe(0)
  })

  it('detects values clipped below/above the range', () => {
    expect(clippedFraction([-2, 0, 5], [-1, 1])).toBeCloseTo(2 / 3, 6)
  })

  it('is 0 for an empty sample (not NaN)', () => {
    expect(clippedFraction([], [-1, 1])).toBe(0)
  })
})

function input(overrides: Partial<Parameters<typeof buildCandidateRange>[0]> = {}) {
  return {
    values: [] as number[], range, teamCount: 1, driverCount: 2, roundCount: 5,
    forceInvestigate: false, note: 'test',
    ...overrides,
  }
}

describe('buildCandidateRange — recommendation logic', () => {
  it('recommends "insufficient-data" below the minimum sample threshold', () => {
    const entry = buildCandidateRange(input({ values: [0.1, 0.2, 0.3] }))
    expect(entry.recommendation).toBe('insufficient-data')
    expect(entry.candidateRange).toBeNull()
  })

  it('recommends "reject" when the current range already covers the robust window (no clipping)', () => {
    const values = [-0.2, -0.1, 0, 0.1, 0.2, -0.15, 0.15, 0.05, -0.05, 0.1]
    const entry = buildCandidateRange(input({ values }))
    expect(entry.saturationBefore).toBe(0)
    expect(entry.recommendation).toBe('reject')
    expect(entry.candidateRange).toBeNull()
  })

  it('recommends "accept-candidate" when real values clip the range, the candidate fixes it, and confidence is not low', () => {
    const values = Array.from({ length: 12 }, (_, i) => -1.5 + i * 0.05) // spans well past ±1, n=12
    const entry = buildCandidateRange(input({ values, teamCount: 3, driverCount: 6 }))
    expect(entry.saturationBefore).toBeGreaterThan(0)
    expect(entry.saturationAfter).toBe(0)
    expect(entry.recommendation).toBe('accept-candidate')
    expect(entry.candidateRange).not.toBeNull()
  })

  it('recommends "investigate" (never auto "accept-candidate") when confidence is low, even if clipping fixed', () => {
    const values = [-2, -1.8, 1.9, 2, -1.5, 1.6] // n=6, only 1 team/2 drivers -> low confidence
    const entry = buildCandidateRange(input({ values }))
    expect(entry.recommendation).toBe('investigate')
  })

  it('forceInvestigate always recommends "investigate" even with zero clipping', () => {
    const values = [-0.1, 0, 0.1, -0.05, 0.05, 0.02, -0.02]
    const entry = buildCandidateRange(input({ values, forceInvestigate: true }))
    expect(entry.recommendation).toBe('investigate')
  })
})

describe('buildCandidateRange — symmetric vs asymmetric signed-delta ranges', () => {
  it('proposes a SYMMETRIC candidate for a signed delta whose median sits close to 0', () => {
    const values = [-1.4, -1.2, -0.8, -0.3, 0, 0.1, 0.3, 0.9, 1.3, 1.45, -1.1, 1.1]
    const entry = buildCandidateRange(input({ values, teamCount: 3, driverCount: 6 }))
    expect(entry.candidateRange).not.toBeNull()
    const [lo, hi] = entry.candidateRange!
    expect(Math.abs(lo)).toBeCloseTo(hi, 6) // symmetric around 0
    expect(entry.algorithm).toMatch(/symmetric/)
  })

  it('proposes an ASYMMETRIC candidate for a signed delta whose distribution is clearly skewed away from 0', () => {
    // Heavily skewed positive: median far from 0 relative to the spread.
    const values = [3, 3.2, 3.5, 3.1, 3.3, 3.4, 3.6, 3.2, -0.5, 3.1, 3.3, 3.0]
    const entry = buildCandidateRange(input({ values, teamCount: 3, driverCount: 6 }))
    expect(entry.candidateRange).not.toBeNull()
    const [lo, hi] = entry.candidateRange!
    expect(Math.abs(lo)).not.toBeCloseTo(hi, 1)
    expect(entry.algorithm).toMatch(/asymmetric/)
  })

  it('never proposes a negative floor for a range that is not a signed delta (e.g. a 0-100 percentage)', () => {
    const pctRange: ReferenceRange = { key: 'pct', min: 0, max: 100, higherIsBetter: true, description: '' }
    const values = [-5, 5, 50, 95, 105, 110]
    const entry = buildCandidateRange(input({ values, range: pctRange, teamCount: 3, driverCount: 6 }))
    if (entry.candidateRange) expect(entry.candidateRange[0]).toBeLessThanOrEqual(entry.candidateRange[1])
    // Not a signed-delta range (min=0, not <0<max), so the symmetric-around-0 branch must not fire.
    expect(entry.algorithm).not.toMatch(/symmetric around 0/)
  })
})

describe('buildCandidateRange — reports grid diversity and outliers', () => {
  it('carries through teamCount/driverCount/roundCount for confidence grading', () => {
    const entry = buildCandidateRange(input({ values: Array.from({ length: 12 }, (_, i) => i * 0.1), teamCount: 4, driverCount: 9, roundCount: 7 }))
    expect(entry.teamCount).toBe(4)
    expect(entry.driverCount).toBe(9)
    expect(entry.roundCount).toBe(7)
  })

  it('reports an outlier count independent of saturation', () => {
    const values = [1, 1.1, 0.9, 1.05, 0.95, 1, 1.1, 50]
    const entry = buildCandidateRange(input({ values, range: { ...range, min: -100, max: 100 } }))
    expect(entry.outlierCount).toBeGreaterThanOrEqual(1)
  })
})

describe('buildCandidateRange — never mutates config', () => {
  it('does not mutate the ReferenceRange object passed in', () => {
    const original: ReferenceRange = { key: 'immutable', min: -1, max: 1, higherIsBetter: false, description: 'd' }
    const snapshot = { ...original }
    buildCandidateRange(input({ values: [-5, 0, 5], range: original }))
    expect(original).toEqual(snapshot)
  })

  it('does not mutate the live methodologyV1 config object', () => {
    const before = JSON.parse(JSON.stringify(methodologyV1.referenceRanges))
    for (const [, r] of Object.entries(methodologyV1.referenceRanges)) {
      buildCandidateRange(input({ values: [r.min - 10, r.max + 10, 0, 1, 2, 3, 4, 5], range: r, forceInvestigate: true }))
    }
    expect(methodologyV1.referenceRanges).toEqual(before)
  })
})

describe('pipelineValidated does not imply productionReady', () => {
  it('computing a full rating (proving the pipeline runs end-to-end) never flips productionReady/calibrationStatus', () => {
    computeDriverRating({
      driver: norrisSeasonFixture, teammate: piastriSeasonFixture,
      season: FIXTURE_SEASON, calculatedAfterRound: FIXTURE_CALCULATED_AFTER_ROUND,
      methodology: methodologyV1, manualAdjustments: [],
    })
    expect(methodologyV1.productionReady).toBe(false)
    expect(methodologyV1.calibrationStatus).toBe('unverified')
  })
})
