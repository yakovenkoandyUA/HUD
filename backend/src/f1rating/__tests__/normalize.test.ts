import { describe, expect, it } from 'vitest'
import { clamp, mapInternalToFinalScale, normalizeToReferenceRange } from '../engine/normalize'
import type { ReferenceRange } from '../types'

const higherBetter: ReferenceRange = { key: 'a', min: 0, max: 100, higherIsBetter: true, description: '' }
const lowerBetter: ReferenceRange = { key: 'b', min: -1, max: 1, higherIsBetter: false, description: '' }

describe('normalizeToReferenceRange', () => {
  it('maps the min of a higherIsBetter range to 0 and the max to 100', () => {
    expect(normalizeToReferenceRange(0, higherBetter)).toBe(0)
    expect(normalizeToReferenceRange(100, higherBetter)).toBe(100)
    expect(normalizeToReferenceRange(50, higherBetter)).toBe(50)
  })

  it('inverts a lowerIsBetter (higherIsBetter=false) range', () => {
    expect(normalizeToReferenceRange(-1, lowerBetter)).toBe(100)
    expect(normalizeToReferenceRange(1, lowerBetter)).toBe(0)
    expect(normalizeToReferenceRange(0, lowerBetter)).toBe(50)
  })

  it('clamps values outside the reference range instead of extrapolating', () => {
    expect(normalizeToReferenceRange(-50, higherBetter)).toBe(0)
    expect(normalizeToReferenceRange(500, higherBetter)).toBe(100)
  })

  it('is stable for a fixed input regardless of unrelated pool composition (no min-max over a driver set)', () => {
    // The whole point of a reference-range normalization is that it takes no "pool" argument at
    // all — calling it twice with the same raw value and range must always agree.
    const a = normalizeToReferenceRange(0.3, lowerBetter)
    const b = normalizeToReferenceRange(0.3, lowerBetter)
    expect(a).toBe(b)
  })
})

describe('mapInternalToFinalScale', () => {
  const scale = { min: 70, max: 99 }

  it('clamps the final UI scale to [70, 99]', () => {
    expect(mapInternalToFinalScale(0, scale)).toBe(70)
    expect(mapInternalToFinalScale(100, scale)).toBe(99)
  })

  it('never produces a value outside [70, 99] for any internal input, even out-of-range ones', () => {
    for (const internal of [-1000, -1, 0, 1, 50, 99, 100, 1000]) {
      const result = mapInternalToFinalScale(internal, scale)
      expect(result).toBeGreaterThanOrEqual(70)
      expect(result).toBeLessThanOrEqual(99)
    }
  })

  it('is monotonic: a higher internal score never maps to a lower final score', () => {
    const low = mapInternalToFinalScale(20, scale)
    const high = mapInternalToFinalScale(80, scale)
    expect(high).toBeGreaterThanOrEqual(low)
  })
})

describe('clamp', () => {
  it('clamps within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})
