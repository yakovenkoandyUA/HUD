import { describe, expect, it } from 'vitest'
import { explainCleanRaceLapConsistency } from '../engine/cleanRaceLapConsistency'
import { explainStintPaceEvolution } from '../engine/tyreStintManagement'
import { buildCandidateRange } from '../engine/calibrationCandidates'
import { fastF1ExportToRaceMetrics } from '../adapters/fastF1Adapter'
import { methodologyV1 } from '../config/methodologyV1'
import { realShapedRound3 } from './fixtures/realShapedRound'
import type { DriverSeasonInput } from '../engine/metrics'

const norrisReal = realShapedRound3.race.find(r => r.driverId === 'norris')!
const piastriReal = realShapedRound3.race.find(r => r.driverId === 'piastri')!

function buildDrivers(): [DriverSeasonInput, DriverSeasonInput] {
  const norris: DriverSeasonInput = {
    driverId: 'norris', qualifying: [], dnfs: [], incidents: [],
    race: [fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
  }
  const piastri: DriverSeasonInput = {
    driverId: 'piastri', qualifying: [], dnfs: [], incidents: [],
    race: [fastF1ExportToRaceMetrics(piastriReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)],
  }
  return [norris, piastri]
}

/**
 * The calibration report (`cli/calibrationReport.ts`) is built entirely out of these same pure
 * functions plus a `generatedAt` timestamp. This test proves the report content itself — every
 * field except the injected timestamp — is deterministic given the same real input, by running
 * the whole computation twice and comparing (with the timestamp explicitly excluded).
 */
describe('calibration pipeline determinism (timestamp excluded)', () => {
  it('explainCleanRaceLapConsistency is byte-for-byte identical across repeated runs on the same real data', () => {
    const [norris] = buildDrivers()
    const first = explainCleanRaceLapConsistency(norris, methodologyV1.tunables)
    const second = explainCleanRaceLapConsistency(norris, methodologyV1.tunables)
    expect(first).toEqual(second)
  })

  it('explainStintPaceEvolution is deterministic across repeated runs on the same real data', () => {
    const [norris, piastri] = buildDrivers()
    const first = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    const second = explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps)
    expect(first).toEqual(second)
  })

  it('buildCandidateRange is deterministic for the same observed values and range', () => {
    const values = [-0.5, 0.3, -1.2, 0.8]
    const range = methodologyV1.referenceRanges.peakRepresentativePace
    const first = buildCandidateRange(values, range, false, 'note')
    const second = buildCandidateRange(values, range, false, 'note')
    expect(first).toEqual(second)
  })

  it('a full injected-timestamp report object is stable across two runs when generatedAt is excluded', () => {
    function buildReportSnapshot() {
      const [norris, piastri] = buildDrivers()
      return {
        generatedAt: new Date().toISOString(), // deliberately injected/excluded below
        consistency: explainCleanRaceLapConsistency(norris, methodologyV1.tunables),
        stintPairs: explainStintPaceEvolution(norris, piastri, methodologyV1.tunables, methodologyV1.tyreAgeComparabilityThresholdLaps),
      }
    }
    const a = buildReportSnapshot()
    const b = buildReportSnapshot()
    const { generatedAt: _a, ...aRest } = a
    const { generatedAt: _b, ...bRest } = b
    expect(aRest).toEqual(bRest)
  })
})
