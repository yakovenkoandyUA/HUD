import { describe, expect, it } from 'vitest'
import { assertWeightsSumToOne, sumWeights } from '../engine/weights'
import { methodologyV1 } from '../config/methodologyV1'

describe('weights', () => {
  it('methodologyV1 speed/precision/raceIq weights each sum to 1', () => {
    expect(sumWeights(methodologyV1.speedWeights)).toBeCloseTo(1, 6)
    expect(sumWeights(methodologyV1.precisionWeights)).toBeCloseTo(1, 6)
    expect(sumWeights(methodologyV1.raceIqWeights)).toBeCloseTo(1, 6)
  })

  it('accepts a weight map that sums to exactly 1', () => {
    expect(() => assertWeightsSumToOne({ a: 0.5, b: 0.5 }, 'test')).not.toThrow()
  })

  it('accepts a weight map within floating-point tolerance of 1', () => {
    expect(() => assertWeightsSumToOne({ a: 0.1, b: 0.2, c: 0.7 }, 'test')).not.toThrow()
  })

  it('throws when a weight map does not sum to 1', () => {
    expect(() => assertWeightsSumToOne({ a: 0.5, b: 0.4 }, 'test')).toThrow(/sums to/)
  })

  it('throws when a weight map sums to more than 1', () => {
    expect(() => assertWeightsSumToOne({ a: 0.7, b: 0.7 }, 'test')).toThrow(/sums to/)
  })
})
