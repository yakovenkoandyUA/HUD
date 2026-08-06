import { describe, expect, it } from 'vitest'
import { reweightComponents } from '../engine/reweight'
import { computeConfidence } from '../engine/confidence'
import { methodologyV1 } from '../config/methodologyV1'

const tunables = methodologyV1.tunables

describe('reweightComponents', () => {
  it('leaves weights untouched when everything is available', () => {
    const result = reweightComponents([
      { key: 'a', weight: 0.6, available: true },
      { key: 'b', weight: 0.4, available: true },
    ])
    expect(result.a).toBeCloseTo(0.6, 6)
    expect(result.b).toBeCloseTo(0.4, 6)
  })

  it('redistributes a missing component\'s weight proportionally across available ones', () => {
    const result = reweightComponents([
      { key: 'a', weight: 0.5, available: true },
      { key: 'b', weight: 0.3, available: true },
      { key: 'c', weight: 0.2, available: false },
    ])
    expect(result.c).toBe(0)
    expect(result.a + result.b).toBeCloseTo(1, 6)
    // proportional: a:b should stay 0.5:0.3 after redistribution
    expect(result.a / result.b).toBeCloseTo(0.5 / 0.3, 6)
  })

  it('returns all-zero effective weights when nothing is available', () => {
    const result = reweightComponents([
      { key: 'a', weight: 0.5, available: false },
      { key: 'b', weight: 0.5, available: false },
    ])
    expect(result.a).toBe(0)
    expect(result.b).toBe(0)
  })
})

describe('computeConfidence', () => {
  it('is high when sample size meets the minimum and nothing is missing', () => {
    const confidence = computeConfidence(5, 3, [], tunables)
    expect(confidence.level).toBe('high')
    expect(confidence.missingComponents).toEqual([])
  })

  it('is low when sample size is far below the minimum', () => {
    const confidence = computeConfidence(1, 10, [], tunables)
    expect(confidence.level).toBe('low')
  })

  it('is reduced by missing components even with an otherwise sufficient sample', () => {
    const withMissing = computeConfidence(10, 3, ['metricX', 'metricY', 'metricZ'], tunables)
    const withoutMissing = computeConfidence(10, 3, [], tunables)
    expect(withMissing.score).toBeLessThan(withoutMissing.score)
  })

  it('never produces a confidence score outside [0, 1]', () => {
    const c1 = computeConfidence(0, 10, ['a', 'b', 'c', 'd', 'e'], tunables)
    const c2 = computeConfidence(1000, 1, [], tunables)
    expect(c1.score).toBeGreaterThanOrEqual(0)
    expect(c1.score).toBeLessThanOrEqual(1)
    expect(c2.score).toBeGreaterThanOrEqual(0)
    expect(c2.score).toBeLessThanOrEqual(1)
  })
})
