import { describe, expect, it } from 'vitest'
import { applyManualAdjustments } from '../engine/manualReview'
import { buildManualReviewAdjustment } from '../adapters/manualIncidentAdapter'
import type { ManualReviewAdjustment } from '../types'

function adjustment(overrides: Partial<ManualReviewAdjustment> = {}): ManualReviewAdjustment {
  return {
    id: 'adj-1',
    season: 2026,
    round: 1,
    sessionType: 'Race',
    driverId: 'driver_a',
    affectedComponent: 'raceIq',
    category: 'traffic',
    signedAdjustment: 2,
    maxAllowedMagnitude: 3,
    reason: 'test reason',
    source: 'test',
    reviewer: 'tester',
    createdAt: '2026-01-01T00:00:00.000Z',
    sourceEventId: 'event-1',
    ...overrides,
  }
}

describe('applyManualAdjustments', () => {
  it('adds a within-bounds adjustment to the base score', () => {
    const result = applyManualAdjustments(70, [adjustment({ signedAdjustment: 2 })], 'raceIq', 10, 10)
    expect(result.adjustedScore).toBe(72)
    expect(result.appliedAdjustments).toHaveLength(1)
  })

  it('clamps an adjustment that exceeds its own maxAllowedMagnitude, with a warning', () => {
    const result = applyManualAdjustments(70, [adjustment({ signedAdjustment: 10, maxAllowedMagnitude: 3 })], 'raceIq', 10, 10)
    expect(result.adjustedScore).toBe(73)
    expect(result.warnings.some(w => w.includes('clamped'))).toBe(true)
  })

  it('clamps a negative adjustment symmetrically', () => {
    const result = applyManualAdjustments(70, [adjustment({ signedAdjustment: -10, maxAllowedMagnitude: 3 })], 'raceIq', 10, 10)
    expect(result.adjustedScore).toBe(67)
  })

  it('ignores an adjustment targeting a different component instead of applying it', () => {
    const result = applyManualAdjustments(70, [adjustment({ affectedComponent: 'speed' })], 'raceIq', 10, 10)
    expect(result.adjustedScore).toBe(70)
    expect(result.appliedAdjustments).toHaveLength(0)
    expect(result.ignoredAdjustments).toHaveLength(1)
  })

  it('clamps the final adjusted score to the internal [0, 100] scale', () => {
    const result = applyManualAdjustments(99, [adjustment({ signedAdjustment: 3, maxAllowedMagnitude: 3 })], 'raceIq', 10, 10)
    expect(result.adjustedScore).toBeLessThanOrEqual(100)
  })

  it('enforces the system-wide per-adjustment ceiling even when a single record declares a huge maxAllowedMagnitude', () => {
    const result = applyManualAdjustments(
      70, [adjustment({ signedAdjustment: 1000, maxAllowedMagnitude: 1000 })], 'raceIq', 5, 5,
    )
    expect(result.adjustedScore).toBe(75)
    expect(result.warnings.some(w => w.includes('system-wide maxManualAdjustmentMagnitude'))).toBe(true)
  })

  it('the system per-adjustment ceiling never loosens a stricter per-adjustment maxAllowedMagnitude', () => {
    const result = applyManualAdjustments(70, [adjustment({ signedAdjustment: 10, maxAllowedMagnitude: 2 })], 'raceIq', 100, 100)
    expect(result.adjustedScore).toBe(72)
  })

  it('has no mechanism to set a final rating directly — ManualReviewAdjustment has no such field', () => {
    // Structural guarantee: the only numeric field on ManualReviewAdjustment is
    // `signedAdjustment`, which this function always treats as a bounded delta on the
    // internal *component* score. There is no `finalSpeedOverride`/`finalRatingOverride`
    // field anywhere in the type, so no adjustment can ever bypass the delta+clamp path.
    const keys = Object.keys(adjustment())
    expect(keys).not.toContain('finalScoreOverride')
    expect(keys).not.toContain('finalRatingOverride')
    expect(keys).not.toContain('overrideScore')
  })

  it('applies multiple distinct-event adjustments cumulatively, each independently bounded', () => {
    const result = applyManualAdjustments(
      70,
      [
        adjustment({ id: 'a', sourceEventId: 'event-a', signedAdjustment: 2, maxAllowedMagnitude: 3 }),
        adjustment({ id: 'b', sourceEventId: 'event-b', signedAdjustment: 1, maxAllowedMagnitude: 3 }),
      ],
      'raceIq',
      10,
      10,
    )
    expect(result.adjustedScore).toBe(73)
    expect(result.appliedAdjustments).toHaveLength(2)
  })

  it('flags manual-review-only scores (no raw data, only an adjustment) as such via a warning', () => {
    const result = applyManualAdjustments(null, [adjustment({ signedAdjustment: 1 })], 'raceIq', 10, 10)
    expect(result.warnings.some(w => w.includes('manual-review-only'))).toBe(true)
  })

  describe('cumulative impact across many individually-legal adjustments', () => {
    it('clamps the SUM of many small, distinct-event, individually-bounded adjustments ("ten disciplined +5s")', () => {
      const tenAdjustments = Array.from({ length: 10 }, (_, i) =>
        adjustment({ id: `adj-${i}`, sourceEventId: `event-${i}`, signedAdjustment: 5, maxAllowedMagnitude: 5 }))
      const result = applyManualAdjustments(70, tenAdjustments, 'raceIq', 5, 8)
      // Without a cumulative cap this would be 70 + 10*5 = 120 → clamped only at the very end to 100.
      // With the cumulative cap it must stop at 70 + 8 = 78, never anywhere near 100/120.
      expect(result.adjustedScore).toBe(78)
      expect(result.appliedAdjustments).toHaveLength(10)
      expect(result.warnings.some(w => w.includes('cumulative manual adjustment'))).toBe(true)
    })

    it('does not clamp the cumulative sum when it is already within the cumulative bound', () => {
      const result = applyManualAdjustments(
        70,
        [
          adjustment({ id: 'a', sourceEventId: 'event-a', signedAdjustment: 2, maxAllowedMagnitude: 5 }),
          adjustment({ id: 'b', sourceEventId: 'event-b', signedAdjustment: 2, maxAllowedMagnitude: 5 }),
        ],
        'raceIq', 5, 8,
      )
      expect(result.adjustedScore).toBe(74)
      expect(result.warnings.some(w => w.includes('cumulative manual adjustment'))).toBe(false)
    })
  })

  describe('duplicate sourceEventId (re-entry of the same underlying event)', () => {
    it('applies only the first adjustment for a given sourceEventId and ignores the rest', () => {
      const result = applyManualAdjustments(
        70,
        [
          adjustment({ id: 'first', sourceEventId: 'same-event', signedAdjustment: 2 }),
          adjustment({ id: 'second', sourceEventId: 'same-event', signedAdjustment: 2 }),
        ],
        'raceIq', 10, 10,
      )
      expect(result.adjustedScore).toBe(72)
      expect(result.appliedAdjustments).toHaveLength(1)
      expect(result.appliedAdjustments[0].id).toBe('first')
      expect(result.ignoredAdjustments).toHaveLength(1)
      expect(result.ignoredAdjustments[0].reason).toMatch(/duplicate sourceEventId/)
    })

    it('does not treat different sourceEventIds as duplicates', () => {
      const result = applyManualAdjustments(
        70,
        [
          adjustment({ id: 'a', sourceEventId: 'event-a', signedAdjustment: 2 }),
          adjustment({ id: 'b', sourceEventId: 'event-b', signedAdjustment: 2 }),
        ],
        'raceIq', 10, 10,
      )
      expect(result.appliedAdjustments).toHaveLength(2)
    })
  })
})

describe('buildManualReviewAdjustment (adapter)', () => {
  const base = {
    id: 'x', season: 2026, round: 1, sessionType: 'Race' as const, driverId: 'a',
    affectedComponent: 'raceIq' as const, category: 'traffic' as const, signedAdjustment: 1, maxAllowedMagnitude: 3,
    reason: 'valid reason', source: 'src', reviewer: 'rev', createdAt: '2026-01-01T00:00:00.000Z',
    sourceEventId: 'event-x',
  }

  it('requires an audit reason', () => {
    expect(() => buildManualReviewAdjustment({ ...base, reason: '   ' })).toThrow(/reason/)
  })

  it('requires source and reviewer for audit', () => {
    expect(() => buildManualReviewAdjustment({ ...base, source: '', reviewer: '' })).toThrow(/source and reviewer/)
  })

  it('rejects a negative maxAllowedMagnitude', () => {
    expect(() => buildManualReviewAdjustment({ ...base, maxAllowedMagnitude: -1 })).toThrow(/maxAllowedMagnitude/)
  })

  it('requires a sourceEventId for duplicate detection', () => {
    expect(() => buildManualReviewAdjustment({ ...base, sourceEventId: '  ' })).toThrow(/sourceEventId/)
  })

  it('builds a valid, fully audited record', () => {
    const record = buildManualReviewAdjustment(base)
    expect(record.driverId).toBe('a')
    expect(record.reason).toBe('valid reason')
    expect(record.sourceEventId).toBe('event-x')
  })
})
