import { describe, expect, it } from 'vitest'
import {
  driverAttributableReliability, teammateAdjustedQualifyingPace, qualifyingHeadToHead,
} from '../engine/metrics'
import { buildDnfRecord } from '../adapters/manualIncidentAdapter'
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
  it('a technical DNF does NOT reduce driver-attributable reliability', () => {
    const dnf = buildDnfRecord({ id: 'x', season: 2026, round: 1, driverId: 'driver_a', cause: 'technical', lapNumber: 10 })
    expect(dnf.driverAttributable).toBe(false)

    const input = driverInput({ race: [emptyRace(1), emptyRace(2), emptyRace(3)], dnfs: [dnf] })
    const result = driverAttributableReliability(input)
    expect(result.rawValue).toBe(100)
  })

  it('a driver-error DNF DOES reduce driver-attributable reliability', () => {
    const dnf = buildDnfRecord({ id: 'x', season: 2026, round: 1, driverId: 'driver_a', cause: 'driver_error', lapNumber: 10 })
    expect(dnf.driverAttributable).toBe(true)

    const input = driverInput({ race: [emptyRace(1), emptyRace(2), emptyRace(3)], dnfs: [dnf] })
    const result = driverAttributableReliability(input)
    expect(result.rawValue).toBeCloseTo((1 - 1 / 3) * 100, 6)
  })

  it('contact_at_fault is attributable; contact_not_at_fault is not', () => {
    const atFault = buildDnfRecord({ id: 'a', season: 2026, round: 1, driverId: 'd', cause: 'contact_at_fault', lapNumber: 1 })
    const notAtFault = buildDnfRecord({ id: 'b', season: 2026, round: 1, driverId: 'd', cause: 'contact_not_at_fault', lapNumber: 1 })
    expect(atFault.driverAttributable).toBe(true)
    expect(notAtFault.driverAttributable).toBe(false)
  })

  it('reports no data (not a hidden 100 or 0) when the driver has no race entries', () => {
    const result = driverAttributableReliability(driverInput())
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

describe('insufficient sample handling', () => {
  it('teammateAdjustedQualifyingPace reports zero sample size (not a fabricated average) with no overlapping rounds', () => {
    const driver = driverInput({ qualifying: [{ driverId: 'a', constructorId: 'c', season: 2026, round: 1, laps: [], headToHead: 'not_comparable' }] })
    const teammate = driverInput({ driverId: 'b', qualifying: [] })
    const result = teammateAdjustedQualifyingPace(driver, teammate)
    expect(result.rawValue).toBeNull()
    expect(result.sampleSize).toBe(0)
  })
})
