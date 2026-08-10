import { describe, expect, it } from 'vitest'
import {
  computeSeasonMedianMad, robustZ, clipZ, mapZToScore0to100, seasonRobustZScore,
  percentileRank, percentileRankScore0to100, DEFAULT_SEASON_NORM_PARAMS,
} from '../dataset/seasonNormalization'
import type { EventSample } from '../dataset/gridRatings'

function sample(value: number): EventSample {
  return { season: 2025, round: 1, driverId: 'a', teamId: 't', value }
}

describe('computeSeasonMedianMad', () => {
  it('returns null for an empty sample set', () => {
    expect(computeSeasonMedianMad(2025, [])).toBeNull()
  })

  it('computes median and MAD from real samples', () => {
    const samples = [1, 2, 3, 4, 5].map(sample)
    const result = computeSeasonMedianMad(2025, samples)
    expect(result!.median).toBe(3)
    expect(result!.n).toBe(5)
  })
})

describe('robustZ', () => {
  it('returns 0 when rawValue equals the season median', () => {
    expect(robustZ(5, 5, 1)).toBe(0)
  })

  it('returns a positive z when rawValue is above the median', () => {
    expect(robustZ(10, 5, 1)).toBeGreaterThan(0)
  })

  it('returns a negative z when rawValue is below the median', () => {
    expect(robustZ(0, 5, 1)).toBeLessThan(0)
  })

  it('SAFELY returns null (not Infinity/NaN) when MAD is ~0', () => {
    expect(robustZ(10, 5, 0)).toBeNull()
    expect(robustZ(10, 5, 1e-12)).toBeNull()
  })
})

describe('clipZ', () => {
  it('leaves values inside the clip range untouched', () => {
    expect(clipZ(1.5, 3)).toBe(1.5)
  })

  it('clips values above the range', () => {
    expect(clipZ(10, 3)).toBe(3)
  })

  it('clips values below the negative range', () => {
    expect(clipZ(-10, 3)).toBe(-3)
  })
})

describe('mapZToScore0to100', () => {
  it('maps z=0 to exactly 50, regardless of higherIsBetter', () => {
    expect(mapZToScore0to100(0, DEFAULT_SEASON_NORM_PARAMS, true)).toBe(50)
    expect(mapZToScore0to100(0, DEFAULT_SEASON_NORM_PARAMS, false)).toBe(50)
  })

  it('maps a positive z above 50 when higherIsBetter=true', () => {
    expect(mapZToScore0to100(1, DEFAULT_SEASON_NORM_PARAMS, true)).toBeGreaterThan(50)
  })

  it('INVERTS: the SAME positive z maps BELOW 50 when higherIsBetter=false', () => {
    // e.g. a lap-time-gap delta where a positive raw value means SLOWER than the season median —
    // that must score below 50, the opposite of a metric where higher raw is better.
    const scoreHigherBetter = mapZToScore0to100(1, DEFAULT_SEASON_NORM_PARAMS, true)
    const scoreLowerBetter = mapZToScore0to100(1, DEFAULT_SEASON_NORM_PARAMS, false)
    expect(scoreLowerBetter).toBeLessThan(50)
    expect(scoreHigherBetter).toBeGreaterThan(50)
    expect(scoreLowerBetter).toBeCloseTo(100 - scoreHigherBetter, 9)
  })

  it('clips before mapping — an extreme z never produces a score outside [0, 100]', () => {
    expect(mapZToScore0to100(999, DEFAULT_SEASON_NORM_PARAMS, true)).toBe(100)
    expect(mapZToScore0to100(-999, DEFAULT_SEASON_NORM_PARAMS, true)).toBe(0)
  })
})

describe('seasonRobustZScore — end-to-end, with the sample-size gate', () => {
  const bigSeason = { season: 2025, median: 0, mad: 1, n: 20 }
  const smallSeason = { season: 2025, median: 0, mad: 1, n: 3 }

  it('returns a real score when the season sample size clears the threshold', () => {
    const score = seasonRobustZScore(1, bigSeason, true)
    expect(score).not.toBeNull()
  })

  it('returns null (insufficient signal) when the season sample size is below the threshold — never force-normalizes a thin season', () => {
    const score = seasonRobustZScore(1, smallSeason, true)
    expect(score).toBeNull()
  })

  it('is deterministic — same inputs always produce the same score', () => {
    const a = seasonRobustZScore(2.3, bigSeason, false)
    const b = seasonRobustZScore(2.3, bigSeason, false)
    expect(a).toBe(b)
  })
})

describe('percentileRank / percentileRankScore0to100 — control normalization strategy', () => {
  const seasonValues = [1, 2, 3, 4, 5]

  it('returns null for an empty season', () => {
    expect(percentileRank(3, [])).toBeNull()
  })

  it('rawValue at the season median lands near the 50th percentile', () => {
    const rank = percentileRank(3, seasonValues)
    expect(rank).toBeCloseTo(60, 0) // 3 of 5 values <= 3
  })

  it('rawValue below every season value ranks near 0', () => {
    expect(percentileRank(0, seasonValues)).toBe(0)
  })

  it('rawValue above every season value ranks 100', () => {
    expect(percentileRank(10, seasonValues)).toBe(100)
  })

  it('INVERTS for higherIsBetter=false, same contract as mapZToScore0to100', () => {
    const higher = percentileRankScore0to100(10, seasonValues, true, 5)
    const lower = percentileRankScore0to100(10, seasonValues, false, 5)
    expect(higher).toBe(100)
    expect(lower).toBe(0)
  })

  it('respects the minSeasonSampleSize gate — returns null for a too-small season', () => {
    expect(percentileRankScore0to100(3, [1, 2], true, 5)).toBeNull()
  })
})
