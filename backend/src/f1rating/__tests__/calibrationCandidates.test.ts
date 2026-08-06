import { describe, expect, it } from 'vitest'
import { buildCandidateRange, clippedFraction } from '../engine/calibrationCandidates'
import { methodologyV1 } from '../config/methodologyV1'
import { computeDriverRating } from '../engine'
import { norrisSeasonFixture, piastriSeasonFixture, FIXTURE_SEASON, FIXTURE_CALCULATED_AFTER_ROUND } from '../fixtures/norrisPiastriFixture'
import type { ReferenceRange } from '../types'

const range: ReferenceRange = { key: 'test', min: -1, max: 1, higherIsBetter: false, description: '' }

describe('clippedFraction — saturation detection', () => {
  it('is 0 when every value is within range', () => {
    expect(clippedFraction([-0.5, 0, 0.5], [-1, 1])).toBe(0)
  })

  it('detects values clipped below the minimum', () => {
    expect(clippedFraction([-2, 0, 0.5], [-1, 1])).toBeCloseTo(1 / 3, 6)
  })

  it('detects values clipped above the maximum', () => {
    expect(clippedFraction([0, 0.5, 5], [-1, 1])).toBeCloseTo(1 / 3, 6)
  })

  it('is 0 for an empty sample (not NaN, not falsely saturated)', () => {
    expect(clippedFraction([], [-1, 1])).toBe(0)
  })
})

describe('buildCandidateRange — distribution stats + recommendation logic', () => {
  it('reports the exact observed min/max/sampleCount', () => {
    const entry = buildCandidateRange([-0.9, 0.2, 0.95], range, false, 'test')
    expect(entry.observedMin).toBe(-0.9)
    expect(entry.observedMax).toBe(0.95)
    expect(entry.sampleCount).toBe(3)
  })

  it('recommends "reject" (no candidate) when nothing clips the current range', () => {
    const entry = buildCandidateRange([-0.5, 0, 0.5], range, false, 'test')
    expect(entry.recommendation).toBe('reject')
    expect(entry.candidateRange).toBeNull()
    expect(entry.saturationBefore).toBe(0)
  })

  it('recommends "investigate" (never auto "accept") when real values clip the current range', () => {
    const entry = buildCandidateRange([-1.5, 0, 0.5], range, false, 'test')
    expect(entry.recommendation).toBe('investigate')
    expect(entry.candidateRange).not.toBeNull()
    expect(entry.saturationBefore).toBeGreaterThan(0)
  })

  it('forceInvestigate always recommends "investigate" even with zero clipping', () => {
    const entry = buildCandidateRange([-0.1, 0, 0.1], range, true, 'formula redesigned')
    expect(entry.recommendation).toBe('investigate')
  })

  it('a proposed candidate range does not clip the same observed values that produced it', () => {
    const values = [-1.8, -0.2, 0.3, 1.9]
    const entry = buildCandidateRange(values, range, false, 'test')
    expect(entry.candidateRange).not.toBeNull()
    expect(entry.saturationAfter).toBe(0)
  })

  it('reports "reject" with null candidate and 0 samples when given no data', () => {
    const entry = buildCandidateRange([], range, false, 'test')
    expect(entry.sampleCount).toBe(0)
    expect(entry.candidateRange).toBeNull()
    expect(entry.recommendation).toBe('reject')
  })

  it('never produces a negative floor for a 0-floored higherIsBetter (percentage) range', () => {
    const pctRange: ReferenceRange = { key: 'pct', min: 0, max: 100, higherIsBetter: true, description: '' }
    const entry = buildCandidateRange([5, 50, 95], pctRange, false, 'test')
    if (entry.candidateRange) expect(entry.candidateRange[0]).toBeGreaterThanOrEqual(0)
  })

  it('NEVER mutates the ReferenceRange object passed in', () => {
    const original: ReferenceRange = { key: 'immutable', min: -1, max: 1, higherIsBetter: false, description: 'd' }
    const snapshot = { ...original }
    buildCandidateRange([-5, 0, 5], original, false, 'test')
    expect(original).toEqual(snapshot)
  })

  it('NEVER mutates the live methodologyV1 config object', () => {
    const before = JSON.parse(JSON.stringify(methodologyV1.referenceRanges))
    for (const [key, r] of Object.entries(methodologyV1.referenceRanges)) {
      buildCandidateRange([r.min - 10, r.max + 10], r, true, 'stress test')
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
