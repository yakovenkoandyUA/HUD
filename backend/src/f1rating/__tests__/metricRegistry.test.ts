import { describe, expect, it } from 'vitest'
import {
  getCanonicalMetricKeys, classifyMetricState, buildMetricStateReport, summarizeMetricStates,
  assertMetricStateInvariant, STRUCTURAL_NO_SIGNAL_METRIC_KEYS,
} from '../engine/metricRegistry'
import { methodologyV1 } from '../config/methodologyV1'
import type { MetricStateEntry } from '../engine/metricRegistry'

describe('getCanonicalMetricKeys — registry cardinality', () => {
  it('contains EXACTLY 15 unique metric keys for mimir-f1-v1 (4 Speed + 5 Precision + 6 RaceIQ)', () => {
    const keys = getCanonicalMetricKeys(methodologyV1)
    expect(keys).toHaveLength(15)
    expect(new Set(keys).size).toBe(15)
  })

  it('derives from referenceRanges — matches the union of speed/precision/raceIq weight keys exactly', () => {
    const keys = new Set(getCanonicalMetricKeys(methodologyV1))
    const weightKeys = new Set([
      ...Object.keys(methodologyV1.speedWeights),
      ...Object.keys(methodologyV1.precisionWeights),
      ...Object.keys(methodologyV1.raceIqWeights),
    ])
    expect(keys).toEqual(weightKeys)
  })

  it('includes documentedStrategicExecution — the metric previously missing from the grid-wide pipeline', () => {
    const keys = getCanonicalMetricKeys(methodologyV1)
    expect(keys).toContain('documentedStrategicExecution')
  })
})

describe('classifyMetricState', () => {
  it('classifies documentedStrategicExecution as no-signal regardless of sample size, since no verified manual/FIA source is wired up', () => {
    expect(classifyMetricState('documentedStrategicExecution', 0)).toBe('no-signal')
    // Even if some caller accidentally passed a nonzero n, the STRUCTURAL no-signal
    // classification wins — a hand-computed sample count can never smuggle a fabricated signal
    // past this gate for a metric with no real data source.
    expect(classifyMetricState('documentedStrategicExecution', 24)).toBe('no-signal')
  })

  it('classifies all four structural no-signal metrics as no-signal', () => {
    for (const key of STRUCTURAL_NO_SIGNAL_METRIC_KEYS) {
      expect(classifyMetricState(key, 0)).toBe('no-signal')
    }
    expect(STRUCTURAL_NO_SIGNAL_METRIC_KEYS).toEqual([
      'cleanWeekendRate', 'driverAttributableReliability', 'unforcedErrorControl', 'documentedStrategicExecution',
    ])
  })

  it('classifies a non-structural metric with zero real samples as insufficient-data, not no-signal', () => {
    // e.g. resultRelativeToExpectedPace — the formula is real, but v1's adapter never populates
    // expectedFinishPosition, so every real dataset run currently produces n=0 for it. That is a
    // DATA gap, not a structural absence of the metric's definition — a different state on purpose.
    expect(classifyMetricState('resultRelativeToExpectedPace', 0)).toBe('insufficient-data')
  })

  it('classifies any metric with n>0 real samples as observed', () => {
    expect(classifyMetricState('teammateAdjustedCleanRacePace', 440)).toBe('observed')
  })
})

describe('buildMetricStateReport + summarizeMetricStates — full-season fixture reconciliation', () => {
  // Mirrors the REAL full-season 2025 (24-round) sample counts recorded during this calibration
  // iteration: 10 metrics observed, 4 structurally no-signal, 1 insufficient-data
  // (resultRelativeToExpectedPace — see classifyMetricState test above), 0 excluded.
  function fullSeasonFixtureSampleSizes(): Record<string, number> {
    return {
      teammateAdjustedQualifyingPace: 444, teammateAdjustedCleanRacePace: 440, peakRepresentativePace: 416,
      qualifyingHeadToHead: 21, cleanRaceLapConsistency: 428, cleanWeekendRate: 0,
      driverAttributableReliability: 0, qualifyingConsistency: 336, unforcedErrorControl: 0,
      resultRelativeToExpectedPace: 0, tyreStintManagement: 246, startAndOpeningLapExecution: 479,
      racecraftProxy: 460, changingConditionAdaptability: 20, documentedStrategicExecution: 0,
    }
  }

  it('produces exactly 15 entries, one per canonical metric, matching states of the real full-season run', () => {
    const entries = buildMetricStateReport(methodologyV1, fullSeasonFixtureSampleSizes())
    expect(entries).toHaveLength(15)
    const totals = summarizeMetricStates(entries)
    expect(totals).toEqual({
      totalMetrics: 15, observedMetrics: 10, noSignalMetrics: 4, insufficientDataMetrics: 1, excludedMetrics: 0,
    })
    expect(totals.observedMetrics + totals.noSignalMetrics + totals.insufficientDataMetrics + totals.excludedMetrics)
      .toBe(totals.totalMetrics)
  })

  it('documentedStrategicExecution is reported no-signal, not silently dropped from the totals', () => {
    const entries = buildMetricStateReport(methodologyV1, fullSeasonFixtureSampleSizes())
    const entry = entries.find(e => e.key === 'documentedStrategicExecution')!
    expect(entry.state).toBe('no-signal')
    expect(entry.sampleSize).toBe(0)
  })
})

describe('assertMetricStateInvariant — fails loudly on drift', () => {
  function entry(key: string, state: MetricStateEntry['state'] = 'observed'): MetricStateEntry {
    return { key, state, sampleSize: 1, note: 'x' }
  }

  it('passes silently when there are exactly 15 unique entries', () => {
    const entries = getCanonicalMetricKeys(methodologyV1).map(k => entry(k))
    expect(() => assertMetricStateInvariant(entries, 15)).not.toThrow()
  })

  it('throws when a metric is missing (14 entries instead of 15)', () => {
    const entries = getCanonicalMetricKeys(methodologyV1).filter(k => k !== 'documentedStrategicExecution').map(k => entry(k))
    expect(() => assertMetricStateInvariant(entries, 15)).toThrow(/expected exactly 15/)
  })

  it('throws when a metric key is duplicated', () => {
    const keys = getCanonicalMetricKeys(methodologyV1)
    const entries = [...keys.map(k => entry(k)), entry(keys[0])] // 16 entries, one key twice
    expect(() => assertMetricStateInvariant(entries, 15)).toThrow(/duplicate key/)
  })
})
