import { describe, expect, it } from 'vitest'
import { buildMethodologyV2Candidate } from '../dataset/candidateMethodology'
import { compareCandidateRangeSets, applyStabilityGate } from '../dataset/stabilityAnalysis'
import { assertProductionReady } from '../engine/weights'
import { methodologyV1 } from '../config/methodologyV1'
import type { CandidateRangeEntry, DistributionStats } from '../engine/calibrationCandidates'

function candidateEntry(overrides: Partial<CandidateRangeEntry> = {}): CandidateRangeEntry {
  return {
    currentRange: [-1, 1], candidateRange: [-1.5, 1.5], distribution: null,
    teamCount: 5, driverCount: 10, roundCount: 8, outlierCount: 0,
    saturationBefore: 0.1, saturationAfter: 0.01, algorithm: 'test', confidence: 'high',
    recommendation: 'accept-candidate', note: 'test',
    ...overrides,
  }
}

function allKeysAs(recommendation: CandidateRangeEntry['recommendation']): Record<string, CandidateRangeEntry> {
  const result: Record<string, CandidateRangeEntry> = {}
  for (const key of Object.keys(methodologyV1.referenceRanges)) {
    result[key] = candidateEntry({ recommendation })
  }
  return result
}

describe('buildMethodologyV2Candidate — identity and safety', () => {
  it('uses a separate identifier from mimir-f1-v1', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(result.methodology!.id).toBe('mimir-f1-v2-candidate')
    expect(result.methodology!.id).not.toBe(methodologyV1.id)
  })

  it('always sets productionReady=false regardless of how good the candidate ranges look', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(result.methodology!.productionReady).toBe(false)
  })

  it('sets calibrationStatus to "candidate", not "calibrated"', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(result.methodology!.calibrationStatus).toBe('candidate')
  })

  it('records the source datasetId it was calibrated from', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'mimir-f1-2025-grid-abc123')
    expect(result.methodology!.calibrationDatasetId).toBe('mimir-f1-2025-grid-abc123')
  })

  it('NEVER mutates the active mimir-f1-v1 methodology object', () => {
    const before = JSON.parse(JSON.stringify(methodologyV1))
    buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(methodologyV1).toEqual(before)
  })

  it('a created candidate always FAILS assertProductionReady (structurally cannot pass)', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(() => assertProductionReady(result.methodology!)).toThrow()
  })
})

describe('buildMethodologyV2Candidate — additive, not a wholesale rewrite', () => {
  it('only replaces ranges with recommendation=accept-candidate; everything else is inherited unchanged', () => {
    const mixed: Record<string, CandidateRangeEntry> = {
      ...allKeysAs('reject'),
      teammateAdjustedQualifyingPace: candidateEntry({ recommendation: 'accept-candidate', candidateRange: [-2, 2] }),
    }
    const result = buildMethodologyV2Candidate(methodologyV1, mixed, 'dataset-1')
    expect(result.calibratedMetricKeys).toEqual(['teammateAdjustedQualifyingPace'])
    expect(result.methodology!.referenceRanges.teammateAdjustedQualifyingPace.min).toBe(-2)
    expect(result.methodology!.referenceRanges.teammateAdjustedQualifyingPace.max).toBe(2)
    // Untouched range inherited exactly from v1.
    expect(result.methodology!.referenceRanges.racecraftProxy).toEqual(methodologyV1.referenceRanges.racecraftProxy)
  })

  it('inherits weights and tunables unchanged from the base methodology', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(result.methodology!.speedWeights).toEqual(methodologyV1.speedWeights)
    expect(result.methodology!.tunables).toEqual(methodologyV1.tunables)
  })
})

describe('buildMethodologyV2Candidate — refuses creation with insufficient key data', () => {
  it('does not create a candidate when most key (high-weight) metrics are insufficient-data', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('insufficient-data'), 'dataset-1')
    expect(result.methodology).toBeNull()
    expect(result.reasonNotCreated).toMatch(/insufficient-data/)
  })

  it('DOES create a candidate when only a minority of key metrics are insufficient-data', () => {
    const mostlyGood: Record<string, CandidateRangeEntry> = allKeysAs('reject')
    // Only one key metric (resultRelativeToExpectedPace, weight .25) marked insufficient — well
    // under half of the ~7 key metrics.
    mostlyGood.resultRelativeToExpectedPace = candidateEntry({ recommendation: 'insufficient-data', candidateRange: null })
    const result = buildMethodologyV2Candidate(methodologyV1, mostlyGood, 'dataset-1')
    expect(result.methodology).not.toBeNull()
  })

  it('is not the default active methodology even after being created', () => {
    const result = buildMethodologyV2Candidate(methodologyV1, allKeysAs('accept-candidate'), 'dataset-1')
    expect(result.methodology!.id).not.toBe('mimir-f1-v1')
    // methodologyV1 remains importable/unaffected as its own export.
    expect(methodologyV1.id).toBe('mimir-f1-v1')
  })
})

describe('mimir-f1-v2-candidate — recorded full-season 2025 (9-round vs 24-round) stability-gated fixture', () => {
  function dist(sampleCount: number, overrides: Partial<DistributionStats> = {}): DistributionStats {
    return {
      sampleCount, min: -3, max: 3, mean: 0, median: 0,
      p5: -2, p25: -1, p75: 1, p95: 2, p2_5: -2.5, p97_5: 2.5, mad: 0.5, iqr: 2, ...overrides,
    }
  }

  function noData(): CandidateRangeEntry {
    return {
      currentRange: [0, 1], candidateRange: null, distribution: null,
      teamCount: 10, driverCount: 21, roundCount: 24, outlierCount: 0,
      saturationBefore: 0, saturationAfter: 0, algorithm: 'insufficient sample', confidence: 'low',
      recommendation: 'insufficient-data', note: 'n=0',
    }
  }

  function withRec(sampleCount: number, recommendation: CandidateRangeEntry['recommendation'], candidateRange: [number, number] | null = [-2, 2]): CandidateRangeEntry {
    return {
      currentRange: [-1.5, 1.5], candidateRange, distribution: dist(sampleCount),
      teamCount: 10, driverCount: 21, roundCount: 24, outlierCount: 5,
      saturationBefore: 0.1, saturationAfter: 0.02, algorithm: 'P5-P95 robust window', confidence: 'high',
      recommendation, note: 'grid-wide sample',
    }
  }

  // Reconstructs the ACTUAL recorded outcome of running `cli/gridCalibrationReport.ts` on both
  // the 9-round subset and the full 24-round dataset from this iteration, then
  // `cli/stabilityReport.ts` on the two — see this session's report. Four structural no-signal
  // metrics + resultRelativeToExpectedPace (insufficient-data, no expected-pace model wired up)
  // are `insufficient-data` on both sides; the remaining 10 have real recommendations, 4 of which
  // flip between the two dataset sizes.
  const smaller: Record<string, CandidateRangeEntry> = {
    teammateAdjustedQualifyingPace: withRec(174, 'investigate'),
    teammateAdjustedCleanRacePace: withRec(166, 'accept-candidate'),
    peakRepresentativePace: withRec(160, 'accept-candidate'),
    qualifyingHeadToHead: withRec(21, 'reject'),
    cleanRaceLapConsistency: withRec(157, 'investigate'),
    cleanWeekendRate: noData(),
    driverAttributableReliability: noData(),
    qualifyingConsistency: withRec(132, 'accept-candidate'),
    unforcedErrorControl: noData(),
    resultRelativeToExpectedPace: noData(),
    tyreStintManagement: withRec(86, 'investigate'),
    startAndOpeningLapExecution: withRec(180, 'accept-candidate'),
    racecraftProxy: withRec(174, 'accept-candidate'),
    changingConditionAdaptability: withRec(14, 'investigate'),
    documentedStrategicExecution: noData(),
  }
  const larger: Record<string, CandidateRangeEntry> = {
    teammateAdjustedQualifyingPace: withRec(444, 'investigate'),
    teammateAdjustedCleanRacePace: withRec(440, 'accept-candidate', [-2.1, 2.1]), // ~1% shift -> stable
    peakRepresentativePace: withRec(416, 'accept-candidate', [-2.01, 2.01]), // ~0.5% shift -> stable
    qualifyingHeadToHead: withRec(21, 'reject'),
    cleanRaceLapConsistency: withRec(428, 'accept-candidate'), // FLIPPED investigate -> accept
    cleanWeekendRate: noData(),
    driverAttributableReliability: noData(),
    qualifyingConsistency: withRec(336, 'investigate'), // FLIPPED accept -> investigate
    unforcedErrorControl: noData(),
    resultRelativeToExpectedPace: noData(),
    tyreStintManagement: withRec(246, 'investigate'),
    startAndOpeningLapExecution: withRec(479, 'investigate'), // FLIPPED accept -> investigate
    racecraftProxy: withRec(460, 'accept-candidate', [-3.6, 3.6]), // ~19% shift -> moderately-shifted
    changingConditionAdaptability: withRec(20, 'accept-candidate'), // FLIPPED investigate -> accept
    documentedStrategicExecution: noData(),
  }

  it('gates down to EXACTLY 2 accepted candidate metrics: teammateAdjustedCleanRacePace and peakRepresentativePace', () => {
    const stability = compareCandidateRangeSets(smaller, larger)
    const gated = applyStabilityGate(larger, stability)
    const acceptedKeys = Object.entries(gated)
      .filter(([, e]) => e.recommendation === 'accept-candidate')
      .map(([k]) => k)
      .sort()
    expect(acceptedKeys).toEqual(['peakRepresentativePace', 'teammateAdjustedCleanRacePace'])
  })

  it('the stability-gated v2-candidate accepts exactly those 2/15 ranges and stays productionReady=false', () => {
    const stability = compareCandidateRangeSets(smaller, larger)
    const gated = applyStabilityGate(larger, stability)
    const result = buildMethodologyV2Candidate(methodologyV1, gated, 'mimir-f1-2025-grid-fixture')
    expect(result.methodology).not.toBeNull()
    expect(result.calibratedMetricKeys.sort()).toEqual(['peakRepresentativePace', 'teammateAdjustedCleanRacePace'])
    expect(result.methodology!.productionReady).toBe(false)
    expect(result.methodology!.calibrationStatus).toBe('candidate')
    expect(() => assertProductionReady(result.methodology!)).toThrow()
  })

  it('NEVER mutates methodologyV1 while building the gated candidate from the full-season fixture', () => {
    const before = JSON.parse(JSON.stringify(methodologyV1))
    const stability = compareCandidateRangeSets(smaller, larger)
    const gated = applyStabilityGate(larger, stability)
    buildMethodologyV2Candidate(methodologyV1, gated, 'mimir-f1-2025-grid-fixture')
    expect(methodologyV1).toEqual(before)
  })

  it('an UNGATED build from the larger dataset alone (no stability check) would wrongly accept racecraftProxy and 2 flipped metrics — this is exactly why the ungated proposal is exploratory, not authoritative', () => {
    const ungated = buildMethodologyV2Candidate(methodologyV1, larger, 'mimir-f1-2025-grid-fixture')
    // 5 accept-candidate in `larger` alone: teammateAdjustedCleanRacePace, peakRepresentativePace,
    // cleanRaceLapConsistency, racecraftProxy, changingConditionAdaptability.
    expect(ungated.calibratedMetricKeys.length).toBe(5)
    expect(ungated.calibratedMetricKeys.length).toBeGreaterThan(2) // more permissive than the gated, authoritative result
  })
})
