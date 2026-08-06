import { describe, expect, it } from 'vitest'
import { areStintsTyreComparable, filterCleanRaceLaps, filterValidQualifyingLaps, groupByCondition } from '../engine/exclusions'
import type { QualifyingLapSample, RaceLapSample, StintMetrics } from '../types'

function lap(overrides: Partial<RaceLapSample> = {}): RaceLapSample {
  return {
    lapNumber: 5,
    lapTimeMs: 90_000,
    compound: 'medium',
    tyreAgeLaps: 5,
    trackCondition: 'dry',
    trackStatus: 'green',
    isInLap: false,
    isOutLap: false,
    isPitLap: false,
    isAccurate: true,
    isDamaged: false,
    position: 5,
    ...overrides,
  }
}

describe('filterCleanRaceLaps', () => {
  it('keeps a plain green-flag, accurate, non-pit lap', () => {
    const { kept, excluded } = filterCleanRaceLaps([lap()])
    expect(kept).toHaveLength(1)
    expect(excluded).toHaveLength(0)
  })

  it('excludes safety car laps', () => {
    const { kept, excluded } = filterCleanRaceLaps([lap({ trackStatus: 'sc' })])
    expect(kept).toHaveLength(0)
    expect(excluded[0].reason).toBe('safety_car')
  })

  it('excludes virtual safety car laps', () => {
    const { excluded } = filterCleanRaceLaps([lap({ trackStatus: 'vsc' })])
    expect(excluded[0].reason).toBe('virtual_safety_car')
  })

  it('excludes red flag laps', () => {
    const { excluded } = filterCleanRaceLaps([lap({ trackStatus: 'red' })])
    expect(excluded[0].reason).toBe('red_flag')
  })

  it('excludes in-laps and out-laps', () => {
    const { excluded: excludedIn } = filterCleanRaceLaps([lap({ isInLap: true })])
    const { excluded: excludedOut } = filterCleanRaceLaps([lap({ isOutLap: true })])
    expect(excludedIn[0].reason).toBe('in_lap')
    expect(excludedOut[0].reason).toBe('out_lap')
  })

  it('excludes inaccurate laps', () => {
    const { excluded } = filterCleanRaceLaps([lap({ isAccurate: false })])
    expect(excluded[0].reason).toBe('inaccurate')
  })

  it('excludes damaged-car laps', () => {
    const { excluded } = filterCleanRaceLaps([lap({ isDamaged: true })])
    expect(excluded[0].reason).toBe('damaged')
  })
})

describe('filterValidQualifyingLaps', () => {
  it('excludes inaccurate qualifying laps only', () => {
    const laps: QualifyingLapSample[] = [
      { segment: 'Q1', lapTimeMs: 90_000, compound: 'soft', trackCondition: 'dry', isAccurate: true },
      { segment: 'Q1', lapTimeMs: 92_000, compound: 'soft', trackCondition: 'dry', isAccurate: false },
    ]
    const { kept, excluded } = filterValidQualifyingLaps(laps)
    expect(kept).toHaveLength(1)
    expect(excluded).toHaveLength(1)
  })
})

describe('groupByCondition', () => {
  it('never mixes wet and dry samples into the same group', () => {
    const groups = groupByCondition([
      lap({ trackCondition: 'dry' }),
      lap({ trackCondition: 'wet' }),
      lap({ trackCondition: 'mixed' }),
    ])
    expect(groups.dry).toHaveLength(1)
    expect(groups.wet).toHaveLength(1)
    expect(groups.mixed).toHaveLength(1)
  })
})

function stint(overrides: Partial<StintMetrics> = {}): StintMetrics {
  return {
    stintNumber: 1,
    compound: 'medium',
    startLap: 1,
    endLap: 15,
    trackCondition: 'dry',
    avgCleanLapTimeMs: 90_000,
    degradationMsPerLap: 20,
    cleanLapCount: 14,
    ...overrides,
  }
}

describe('areStintsTyreComparable', () => {
  it('rejects stints on different compounds', () => {
    const a = stint({ compound: 'soft' })
    const b = stint({ compound: 'hard' })
    expect(areStintsTyreComparable(a, b, 3)).toBe(false)
  })

  it('accepts same-compound stints within the tyre-age threshold', () => {
    const a = stint({ startLap: 1, endLap: 15 }) // age 14
    const b = stint({ startLap: 1, endLap: 16 }) // age 15
    expect(areStintsTyreComparable(a, b, 3)).toBe(true)
  })

  it('rejects same-compound stints with a large tyre-age difference', () => {
    const a = stint({ startLap: 1, endLap: 5 })   // age 4
    const b = stint({ startLap: 1, endLap: 30 })  // age 29
    expect(areStintsTyreComparable(a, b, 3)).toBe(false)
  })
})
