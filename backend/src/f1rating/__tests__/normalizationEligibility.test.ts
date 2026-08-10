import { describe, expect, it } from 'vitest'
import { classifyNormalizationEligibility, DEFAULT_ELIGIBILITY_THRESHOLDS } from '../dataset/normalizationEligibility'

describe('classifyNormalizationEligibility', () => {
  it('classifies structural no-signal metrics as manual-source-required, regardless of any n', () => {
    const result = classifyNormalizationEligibility('cleanWeekendRate', { 2023: 500, 2024: 500, 2025: 500 })
    expect(result.strategy).toBe('manual-source-required')
  })

  it('classifies documentedStrategicExecution as manual-source-required specifically', () => {
    const result = classifyNormalizationEligibility('documentedStrategicExecution', {})
    expect(result.strategy).toBe('manual-source-required')
  })

  it('classifies as season-normalized when >=2 seasons each individually clear the per-season threshold', () => {
    const result = classifyNormalizationEligibility('peakRepresentativePace', { 2023: 386, 2024: 410, 2025: 416 })
    expect(result.strategy).toBe('season-normalized')
    expect(result.seasonsWithSufficientSample).toBe(3)
  })

  it('classifies as pooled-only when total sample is usable but fewer than 2 seasons individually clear the threshold', () => {
    // e.g. changingConditionAdaptability — small per-season n but decent when pooled
    const result = classifyNormalizationEligibility('changingConditionAdaptability', { 2023: 8, 2024: 10, 2025: 8 })
    expect(result.strategy).toBe('pooled-only')
    expect(result.nTotal).toBe(26)
  })

  it('classifies as insufficient-signal when even the pooled total is below the floor', () => {
    const result = classifyNormalizationEligibility('rareMetric', { 2023: 1, 2024: 0, 2025: 2 })
    expect(result.strategy).toBe('insufficient-signal')
  })

  it('classifies resultRelativeToExpectedPace as insufficient-signal — real formula, but v1 never populates its one required input', () => {
    const result = classifyNormalizationEligibility('resultRelativeToExpectedPace', { 2023: 0, 2024: 0, 2025: 0 })
    expect(result.strategy).toBe('insufficient-signal')
  })

  it('respects custom thresholds instead of the hardcoded defaults', () => {
    const strict = { ...DEFAULT_ELIGIBILITY_THRESHOLDS, minSeasonSampleForNormalization: 1000 }
    const result = classifyNormalizationEligibility('peakRepresentativePace', { 2023: 386, 2024: 410, 2025: 416 }, strict)
    expect(result.strategy).not.toBe('season-normalized')
  })

  it('never force-normalizes a metric just because a module exists to do so — one season with huge n is not enough on its own', () => {
    const result = classifyNormalizationEligibility('oneSeasonOnly', { 2025: 1000 })
    expect(result.strategy).not.toBe('season-normalized')
    expect(result.strategy).toBe('pooled-only')
  })
})
