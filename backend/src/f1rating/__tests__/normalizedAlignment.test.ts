import { describe, expect, it } from 'vitest'
import {
  summarizeSeasonScores, assessPairwiseAlignment, assessAllPairwiseAlignments, DEFAULT_ALIGNMENT_THRESHOLDS,
} from '../dataset/normalizedAlignment'

describe('summarizeSeasonScores', () => {
  it('returns all-null summary for an empty score list, not a crash', () => {
    const summary = summarizeSeasonScores(2025, [])
    expect(summary.n).toBe(0)
    expect(summary.median).toBeNull()
  })

  it('computes median/percentiles/IQR from real normalized scores', () => {
    const scores = Array.from({ length: 20 }, (_, i) => i * 5) // 0..95
    const summary = summarizeSeasonScores(2025, scores)
    expect(summary.n).toBe(20)
    expect(summary.median).not.toBeNull()
    expect(summary.iqr).toBeGreaterThan(0)
  })
})

describe('assessPairwiseAlignment', () => {
  it('classifies as aligned when two seasons\' normalized-score distributions are similar (centered ~50, similar spread)', () => {
    const a = summarizeSeasonScores(2023, [40, 45, 50, 55, 60, 42, 48, 52, 58, 46])
    const b = summarizeSeasonScores(2024, [41, 46, 49, 54, 61, 43, 47, 53, 57, 45])
    const result = assessPairwiseAlignment(a, b)
    expect(result.aligned).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('classifies as NOT aligned when medians diverge beyond the threshold', () => {
    const a = summarizeSeasonScores(2023, [45, 48, 50, 52, 55])
    const b = summarizeSeasonScores(2024, [70, 72, 75, 78, 80])
    const result = assessPairwiseAlignment(a, b)
    expect(result.aligned).toBe(false)
    expect(result.reasons.some(r => r.includes('median'))).toBe(true)
  })

  it('classifies as NOT aligned when IQR ratio (spread) diverges beyond the threshold', () => {
    const a = summarizeSeasonScores(2023, [48, 49, 50, 51, 52]) // tight spread
    const b = summarizeSeasonScores(2024, [10, 30, 50, 70, 90]) // wide spread, same median
    const result = assessPairwiseAlignment(a, b)
    expect(result.aligned).toBe(false)
    expect(result.reasons.some(r => r.includes('IQR'))).toBe(true)
  })

  it('reports insufficient data rather than fabricating an "aligned" verdict when a season has no scores', () => {
    const a = summarizeSeasonScores(2023, [])
    const b = summarizeSeasonScores(2024, [40, 50, 60])
    const result = assessPairwiseAlignment(a, b)
    expect(result.aligned).toBe(false)
    expect(result.reasons[0]).toMatch(/no normalized scores/)
  })

  it('respects custom thresholds', () => {
    const a = summarizeSeasonScores(2023, [45, 48, 50, 52, 55])
    const b = summarizeSeasonScores(2024, [50, 53, 55, 57, 60])
    const strict = { ...DEFAULT_ALIGNMENT_THRESHOLDS, maxMedianDiff: 0.1 }
    const result = assessPairwiseAlignment(a, b, strict)
    expect(result.aligned).toBe(false)
  })
})

describe('assessAllPairwiseAlignments', () => {
  it('checks EVERY pair across 3 seasons, not just consecutive ones', () => {
    const summaries = [
      summarizeSeasonScores(2023, [45, 48, 50, 52, 55]),
      summarizeSeasonScores(2024, [46, 49, 51, 53, 56]),
      summarizeSeasonScores(2025, [44, 47, 50, 52, 54]),
    ]
    const results = assessAllPairwiseAlignments(summaries)
    expect(results).toHaveLength(3) // 2023-2024, 2023-2025, 2024-2025
    const pairs = results.map(r => `${r.seasonA}-${r.seasonB}`).sort()
    expect(pairs).toEqual(['2023-2024', '2023-2025', '2024-2025'])
  })
})
