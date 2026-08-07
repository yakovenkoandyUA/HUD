import { describe, expect, it } from 'vitest'
import {
  classifyStability, compareCandidateRangeSets, applyStabilityGate, DEFAULT_STABILITY_THRESHOLDS,
} from '../dataset/stabilityAnalysis'
import type { CandidateRangeEntry, DistributionStats } from '../engine/calibrationCandidates'

function distribution(overrides: Partial<DistributionStats> = {}): DistributionStats {
  return {
    sampleCount: 100, min: -3, max: 3, mean: 0, median: 0,
    p5: -2, p25: -1, p75: 1, p95: 2, p2_5: -2.5, p97_5: 2.5,
    mad: 0.5, iqr: 2, ...overrides,
  }
}

function entry(overrides: Partial<CandidateRangeEntry> = {}): CandidateRangeEntry {
  return {
    currentRange: [-5, 5],
    candidateRange: [-2, 2],
    distribution: distribution(),
    teamCount: 10, driverCount: 20, roundCount: 24,
    outlierCount: 3, saturationBefore: 0.1, saturationAfter: 0.02,
    algorithm: 'P5-P95 robust window', confidence: 'high',
    recommendation: 'accept-candidate', note: 'test fixture',
    ...overrides,
  }
}

describe('classifyStability', () => {
  it('classifies as stable when the candidate range barely moves between dataset sizes', () => {
    const a = entry({ candidateRange: [-2, 2] })
    const b = entry({ candidateRange: [-2.1, 2.1] })
    const result = classifyStability('teammateAdjustedCleanRacePace', a, b)
    expect(result.classification).toBe('stable')
    expect(result.recommendationFlipped).toBe(false)
  })

  it('classifies as moderately-shifted when the shift is above stable but at/below the moderate threshold', () => {
    // width = 4, stableMax = 0.15*4 = 0.6, moderateMax = 0.40*4 = 1.6
    // shift the center by 1.0 (25% of width) -> above stable, within moderate
    const a = entry({ candidateRange: [-2, 2] })
    const b = entry({ candidateRange: [-1, 3] })
    const result = classifyStability('metric', a, b)
    expect(result.classification).toBe('moderately-shifted')
  })

  it('classifies as unstable when the relative shift exceeds the moderate threshold', () => {
    const a = entry({ candidateRange: [-2, 2] })
    const b = entry({ candidateRange: [10, 20] })
    const result = classifyStability('metric', a, b)
    expect(result.classification).toBe('unstable')
  })

  it('treats a recommendation flip as unstable regardless of how small the numeric shift is', () => {
    const a = entry({ candidateRange: [-2, 2], recommendation: 'investigate' })
    const b = entry({ candidateRange: [-2, 2], recommendation: 'accept-candidate' })
    const result = classifyStability('metric', a, b)
    expect(result.classification).toBe('unstable')
    expect(result.recommendationFlipped).toBe(true)
    expect(result.note).toMatch(/recommendation changed/)
  })

  it('stays stable just inside the stable-threshold boundary, flips to moderate just outside it', () => {
    // width = 4 both sides, threshold 15% -> boundary shift = 0.6
    const justInside = entry({ candidateRange: [-1.41, 2.59] }) // shift 0.59 -> 14.75%
    const justOutside = entry({ candidateRange: [-1.39, 2.61] }) // shift 0.61 -> 15.25%
    const a = entry({ candidateRange: [-2, 2] })
    expect(classifyStability('metric', a, justInside).classification).toBe('stable')
    expect(classifyStability('metric', a, justOutside).classification).toBe('moderately-shifted')
  })

  it('reports insufficient-data when either side has no distribution, without crashing', () => {
    const a = entry({ distribution: null })
    const b = entry()
    const result = classifyStability('metric', a, b)
    expect(result.classification).toBe('insufficient-data')
    expect(result.relativeShift).toBeNull()
  })

  it('falls back to currentRange when candidateRange is null on either side', () => {
    const a = entry({ candidateRange: null, currentRange: [-2, 2] })
    const b = entry({ candidateRange: null, currentRange: [-2.1, 2.1] })
    const result = classifyStability('metric', a, b)
    expect(result.smallerRange).toEqual([-2, 2])
    expect(result.largerRange).toEqual([-2.1, 2.1])
    expect(result.classification).toBe('stable')
  })

  it('respects custom thresholds instead of the default 15%/40%', () => {
    const a = entry({ candidateRange: [-2, 2] })
    const b = entry({ candidateRange: [-1.5, 2.5] }) // 0.5/4 = 12.5% relative shift
    const strict = { stableMaxRelativeShift: 0.05, moderateMaxRelativeShift: 0.10 }
    const result = classifyStability('metric', a, b, strict)
    expect(result.classification).toBe('unstable')
  })
})

describe('compareCandidateRangeSets', () => {
  it('only compares metrics present in BOTH sets, silently skipping the rest', () => {
    const smaller: Record<string, CandidateRangeEntry> = { onlyInSmaller: entry(), both: entry() }
    const larger: Record<string, CandidateRangeEntry> = { onlyInLarger: entry(), both: entry() }
    const result = compareCandidateRangeSets(smaller, larger)
    expect(Object.keys(result)).toEqual(['both'])
  })

  it('is a pure function — never mutates either input map', () => {
    const smaller: Record<string, CandidateRangeEntry> = { metric: entry({ candidateRange: [-2, 2] }) }
    const larger: Record<string, CandidateRangeEntry> = { metric: entry({ candidateRange: [-5, 5] }) }
    const smallerSnapshot = JSON.parse(JSON.stringify(smaller))
    const largerSnapshot = JSON.parse(JSON.stringify(larger))
    compareCandidateRangeSets(smaller, larger)
    expect(smaller).toEqual(smallerSnapshot)
    expect(larger).toEqual(largerSnapshot)
  })
})

describe('applyStabilityGate', () => {
  it('downgrades accept-candidate to investigate when the stability comparison says NOT stable', () => {
    const ranges: Record<string, CandidateRangeEntry> = { metric: entry({ recommendation: 'accept-candidate' }) }
    const stability = compareCandidateRangeSets(
      { metric: entry({ candidateRange: [-2, 2] }) },
      { metric: entry({ candidateRange: [50, 60] }) },
    )
    const gated = applyStabilityGate(ranges, stability)
    expect(gated.metric.recommendation).toBe('investigate')
    expect(gated.metric.note).toMatch(/downgraded from accept-candidate/)
  })

  it('leaves an accept-candidate metric untouched when stability says stable', () => {
    const ranges: Record<string, CandidateRangeEntry> = { metric: entry({ recommendation: 'accept-candidate', note: 'original' }) }
    const stability = compareCandidateRangeSets(
      { metric: entry({ candidateRange: [-2, 2] }) },
      { metric: entry({ candidateRange: [-2.05, 2.05] }) },
    )
    const gated = applyStabilityGate(ranges, stability)
    expect(gated.metric.recommendation).toBe('accept-candidate')
    expect(gated.metric.note).toBe('original')
  })

  it('never downgrades recommendations that were not accept-candidate to begin with', () => {
    const ranges: Record<string, CandidateRangeEntry> = { metric: entry({ recommendation: 'investigate' }) }
    const stability = compareCandidateRangeSets(
      { metric: entry({ candidateRange: [-2, 2] }) },
      { metric: entry({ candidateRange: [50, 60] }) },
    )
    const gated = applyStabilityGate(ranges, stability)
    expect(gated.metric.recommendation).toBe('investigate')
  })

  it('is a pure function — never mutates the input candidateRanges map', () => {
    const ranges: Record<string, CandidateRangeEntry> = { metric: entry({ recommendation: 'accept-candidate' }) }
    const snapshot = JSON.parse(JSON.stringify(ranges))
    const stability = compareCandidateRangeSets(
      { metric: entry({ candidateRange: [-2, 2] }) },
      { metric: entry({ candidateRange: [50, 60] }) },
    )
    applyStabilityGate(ranges, stability)
    expect(ranges).toEqual(snapshot)
  })

  it('passes a metric through unchanged when there is no stability comparison for it', () => {
    const ranges: Record<string, CandidateRangeEntry> = { untested: entry({ recommendation: 'accept-candidate', note: 'x' }) }
    const gated = applyStabilityGate(ranges, {})
    expect(gated.untested).toEqual(ranges.untested)
  })
})

describe('DEFAULT_STABILITY_THRESHOLDS', () => {
  it('is a named, documented config object rather than magic numbers inline', () => {
    expect(DEFAULT_STABILITY_THRESHOLDS.stableMaxRelativeShift).toBe(0.15)
    expect(DEFAULT_STABILITY_THRESHOLDS.moderateMaxRelativeShift).toBe(0.40)
  })
})
