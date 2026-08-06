import { describe, expect, it } from 'vitest'
import { computeDriverRating } from '../engine'
import { methodologyV1 } from '../config/methodologyV1'
import {
  FIXTURE_CALCULATED_AFTER_ROUND, FIXTURE_SEASON, fixtureManualAdjustments,
  norrisSeasonFixture, piastriSeasonFixture,
} from '../fixtures/norrisPiastriFixture'
import type { DriverRating } from '../types'

function stripTimestamp(rating: DriverRating): Omit<DriverRating, 'generatedAt'> {
  const { generatedAt: _generatedAt, ...rest } = rating
  return rest
}

describe('determinism', () => {
  it('produces identical output (aside from the generatedAt timestamp) for identical inputs', () => {
    const input = {
      driver: norrisSeasonFixture,
      teammate: piastriSeasonFixture,
      season: FIXTURE_SEASON,
      calculatedAfterRound: FIXTURE_CALCULATED_AFTER_ROUND,
      methodology: methodologyV1,
      manualAdjustments: fixtureManualAdjustments,
    }
    const first = computeDriverRating(input)
    const second = computeDriverRating(input)
    expect(stripTimestamp(first)).toEqual(stripTimestamp(second))
  })

  it('is not affected by object identity — a structurally identical but distinct input produces the same result', () => {
    const base = {
      driver: norrisSeasonFixture,
      teammate: piastriSeasonFixture,
      season: FIXTURE_SEASON,
      calculatedAfterRound: FIXTURE_CALCULATED_AFTER_ROUND,
      methodology: methodologyV1,
      manualAdjustments: [...fixtureManualAdjustments],
    }
    const a = computeDriverRating(base)
    const b = computeDriverRating({ ...base, manualAdjustments: [...fixtureManualAdjustments] })
    expect(stripTimestamp(a)).toEqual(stripTimestamp(b))
  })
})
