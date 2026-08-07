import { describe, expect, it } from 'vitest'
import {
  driverAttributableReliability, teammateAdjustedQualifyingPace, qualifyingHeadToHead,
  cleanWeekendRate, unforcedErrorControl,
} from '../engine/metrics'
import { buildDnfRecord } from '../adapters/manualIncidentAdapter'
import { aggregateComponent } from '../engine/aggregate'
import { methodologyV1 } from '../config/methodologyV1'
import type { DriverSeasonInput } from '../engine/metrics'
import type { RawQualifyingMetrics, RawRaceMetrics } from '../types'

function emptyRace(round: number): RawRaceMetrics {
  return {
    driverId: 'd', constructorId: 'c', season: 2026, round,
    laps: [], stints: [],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true,
  }
}

function driverInput(overrides: Partial<DriverSeasonInput> = {}): DriverSeasonInput {
  return { driverId: 'driver_a', qualifying: [], race: [], dnfs: [], incidents: [], ...overrides }
}

describe('driver-attributable reliability invariants', () => {
  // The DnfRecord-construction invariant (technical/contact_not_at_fault are NEVER attributable;
  // driver_error/contact_at_fault ALWAYS are) is real and enforced at `buildDnfRecord` — see
  // manualIncidentAdapter.ts. This is independent of the metric's current no-signal state below.
  it('a technical DNF is constructed as NOT driver-attributable', () => {
    const dnf = buildDnfRecord({ id: 'x', season: 2026, round: 1, driverId: 'driver_a', cause: 'technical', lapNumber: 10 })
    expect(dnf.driverAttributable).toBe(false)
  })

  it('a driver-error DNF is constructed as driver-attributable', () => {
    const dnf = buildDnfRecord({ id: 'x', season: 2026, round: 1, driverId: 'driver_a', cause: 'driver_error', lapNumber: 10 })
    expect(dnf.driverAttributable).toBe(true)
  })

  it('contact_at_fault is attributable; contact_not_at_fault is not', () => {
    const atFault = buildDnfRecord({ id: 'a', season: 2026, round: 1, driverId: 'd', cause: 'contact_at_fault', lapNumber: 1 })
    const notAtFault = buildDnfRecord({ id: 'b', season: 2026, round: 1, driverId: 'd', cause: 'contact_not_at_fault', lapNumber: 1 })
    expect(atFault.driverAttributable).toBe(true)
    expect(notAtFault.driverAttributable).toBe(false)
  })

  // NO-SIGNAL METRIC (v1): `driverAttributableReliability` always reports missing data — see the
  // doc comment on the function itself for why (v1's automated DNF classifier can never produce
  // a driver_error/contact_at_fault record without human review, so a computed percentage from
  // real v1 data would always read a false 100% for every driver, misrepresenting "our
  // classifier never blames the driver" as "reliability is genuinely uniform").
  it('always reports no data — even with a real driver-attributable DNF present — because no incident source is wired up in v1', () => {
    const dnf = buildDnfRecord({ id: 'x', season: 2026, round: 1, driverId: 'driver_a', cause: 'driver_error', lapNumber: 10 })
    const input = driverInput({ race: [emptyRace(1), emptyRace(2), emptyRace(3)], dnfs: [dnf] })
    const result = driverAttributableReliability()
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
    // The input driver data is deliberately unused by the no-signal metric — the point of this
    // test is documenting that fact, not exercising `input`.
    expect(input.dnfs).toHaveLength(1)
  })

  it('reports no data (not a hidden 100 or 0) when the driver has no race entries either', () => {
    const result = driverAttributableReliability()
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
  })
})

describe('teammate-relative comparison', () => {
  function qSession(round: number, driverId: string, bestMs: number, headToHead: RawQualifyingMetrics['headToHead']): RawQualifyingMetrics {
    return {
      driverId, constructorId: 'c', season: 2026, round,
      laps: [{ segment: 'Q3', lapTimeMs: bestMs, compound: 'soft', trackCondition: 'dry', isAccurate: true }],
      headToHead,
    }
  }

  it('produces a negative gap when the driver is faster than the teammate', () => {
    const driver = driverInput({ qualifying: [qSession(1, 'driver_a', 90_000, 'ahead')] })
    const teammate = driverInput({ driverId: 'driver_b', qualifying: [qSession(1, 'driver_b', 90_900, 'behind')] })
    const result = teammateAdjustedQualifyingPace(driver, teammate)
    expect(result.rawValue).not.toBeNull()
    expect(result.rawValue as number).toBeLessThan(0)
  })

  it('produces a positive gap when the driver is slower than the teammate', () => {
    const driver = driverInput({ qualifying: [qSession(1, 'driver_a', 91_000, 'behind')] })
    const teammate = driverInput({ driverId: 'driver_b', qualifying: [qSession(1, 'driver_b', 90_000, 'ahead')] })
    const result = teammateAdjustedQualifyingPace(driver, teammate)
    expect(result.rawValue as number).toBeGreaterThan(0)
  })

  it('only compares rounds present for both driver and teammate', () => {
    const driver = driverInput({ qualifying: [qSession(1, 'driver_a', 90_000, 'ahead'), qSession(2, 'driver_a', 90_500, 'ahead')] })
    const teammate = driverInput({ driverId: 'driver_b', qualifying: [qSession(1, 'driver_b', 90_800, 'behind')] })
    const result = teammateAdjustedQualifyingPace(driver, teammate)
    expect(result.sampleSize).toBe(1)
  })

  it('qualifyingHeadToHead ignores not_comparable sessions entirely', () => {
    const driver = driverInput({
      qualifying: [
        qSession(1, 'driver_a', 90_000, 'ahead'),
        qSession(2, 'driver_a', 90_000, 'not_comparable'),
        qSession(3, 'driver_a', 90_000, 'behind'),
      ],
    })
    const result = qualifyingHeadToHead(driver)
    expect(result.sampleSize).toBe(2)
    expect(result.rawValue).toBeCloseTo(50, 6)
  })
})

describe('no-signal metrics reweight the Precision component correctly, not silently zeroed out', () => {
  // cleanWeekendRate/driverAttributableReliability/unforcedErrorControl are permanently NO_DATA
  // in v1 (0.25+0.20+0.10 = 0.55 of precisionWeights). This confirms `aggregateComponent`
  // correctly EXCLUDES them (not "counts them as 0") and reweights their combined 0.55 onto the
  // two metrics that DO have real v1 signal (cleanRaceLapConsistency 0.30, qualifyingConsistency
  // 0.15) rather than the component silently returning a score built from fabricated data.
  it('excludes all three no-signal metrics from the breakdown and reweights the remaining two', () => {
    const metricResults = {
      cleanRaceLapConsistency: { rawValue: 0.6, sampleSize: 5 },
      cleanWeekendRate: cleanWeekendRate(),
      driverAttributableReliability: driverAttributableReliability(),
      qualifyingConsistency: { rawValue: 0.4, sampleSize: 5 },
      unforcedErrorControl: unforcedErrorControl(),
    }
    const precision = aggregateComponent({
      component: 'precision', metricResults,
      weights: methodologyV1.precisionWeights, referenceRanges: methodologyV1.referenceRanges,
      minSampleSize: methodologyV1.minSampleSize, manualAdjustments: [],
      finalScale: methodologyV1.finalScale, tunables: methodologyV1.tunables,
    })

    const noSignalItems = precision.breakdown.filter(
      b => ['cleanWeekendRate', 'driverAttributableReliability', 'unforcedErrorControl'].includes(b.key),
    )
    expect(noSignalItems.every(b => b.excluded)).toBe(true)
    expect(noSignalItems.every(b => b.effectiveWeight === 0)).toBe(true)

    // The 0.55 combined weight of the three excluded metrics is redistributed proportionally
    // onto the two available metrics (0.30 and 0.15 -> 2:1 ratio preserved).
    const consistency = precision.breakdown.find(b => b.key === 'cleanRaceLapConsistency')!
    const qualConsistency = precision.breakdown.find(b => b.key === 'qualifyingConsistency')!
    expect(consistency.effectiveWeight).toBeCloseTo(0.30 / 0.45, 6)
    expect(qualConsistency.effectiveWeight).toBeCloseTo(0.15 / 0.45, 6)
    expect(precision.score).not.toBeNull()
  })

  it('reports insufficientData for the whole rating when ALL of a component\'s metrics are no-signal (nothing left to reweight onto)', () => {
    const metricResults = {
      cleanRaceLapConsistency: { rawValue: null, sampleSize: 0 },
      cleanWeekendRate: cleanWeekendRate(),
      driverAttributableReliability: driverAttributableReliability(),
      qualifyingConsistency: { rawValue: null, sampleSize: 0 },
      unforcedErrorControl: unforcedErrorControl(),
    }
    const precision = aggregateComponent({
      component: 'precision', metricResults,
      weights: methodologyV1.precisionWeights, referenceRanges: methodologyV1.referenceRanges,
      minSampleSize: methodologyV1.minSampleSize, manualAdjustments: [],
      finalScale: methodologyV1.finalScale, tunables: methodologyV1.tunables,
    })
    expect(precision.score).toBeNull()
  })
})

describe('insufficient sample handling', () => {
  it('teammateAdjustedQualifyingPace reports zero sample size (not a fabricated average) with no overlapping rounds', () => {
    const driver = driverInput({ qualifying: [{ driverId: 'a', constructorId: 'c', season: 2026, round: 1, laps: [], headToHead: 'not_comparable' }] })
    const teammate = driverInput({ driverId: 'b', qualifying: [] })
    const result = teammateAdjustedQualifyingPace(driver, teammate)
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
  })
})
