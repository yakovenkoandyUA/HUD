import { describe, expect, it } from 'vitest'
import { fastF1ExportToRaceMetrics, validateFastF1Export, type FastF1SessionExport } from '../adapters/fastF1Adapter'
import { jolpicaQualifyingToRawMetrics } from '../adapters/jolpicaAdapter'
import { methodologyV1 } from '../config/methodologyV1'
import { realShapedRound3 } from './fixtures/realShapedRound'

const norrisReal = realShapedRound3.race.find(r => r.driverId === 'norris')!
const piastriReal = realShapedRound3.race.find(r => r.driverId === 'piastri')!

describe('fastF1ExportToRaceMetrics — real-shaped fixture ingestion', () => {
  it('parses a valid real-shaped fastf1-export-v1 payload without throwing', () => {
    const metrics = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.driverId).toBe('norris')
    expect(metrics.constructorId).toBe('mclaren')
    expect(metrics.season).toBe(2025)
    expect(metrics.round).toBe(3)
  })

  it('produces two real stints (medium then hard) from the real pit-stop transition', () => {
    const metrics = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.stints).toHaveLength(2)
    expect(metrics.stints[0].compound).toBe('medium')
    expect(metrics.stints[1].compound).toBe('hard')
  })

  it('excludes the real in-lap/out-lap around the pit stop from clean laps', () => {
    const metrics = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    const lap21 = metrics.laps.find(l => l.lapNumber === 21)
    const lap22 = metrics.laps.find(l => l.lapNumber === 22)
    expect(lap21!.isInLap).toBe(true)
    expect(lap22!.isOutLap).toBe(true)
  })

  it('preserves the real inaccurate opening lap as isAccurate=false, not silently dropped or fixed', () => {
    const metrics = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    const lap1 = metrics.laps.find(l => l.lapNumber === 1)
    expect(lap1!.isAccurate).toBe(false)
  })

  it('maps real qualifying Q1/Q2/Q3 strings into millisecond lap times', () => {
    const norrisQ = realShapedRound3.qualifying.find(q => q.driverId === 'norris')!
    const piastriQ = realShapedRound3.qualifying.find(q => q.driverId === 'piastri')!
    const metrics = jolpicaQualifyingToRawMetrics(norrisQ, piastriQ, 2025, 3)
    // "1:26.995" -> 86995 ms
    const q3 = metrics.laps.find(l => l.segment === 'Q3')
    expect(q3!.lapTimeMs).toBe(86_995)
    expect(metrics.headToHead).toBe('ahead') // Norris P2 vs Piastri P3
  })
})

describe('validateFastF1Export — malformed / unsupported payload rejection', () => {
  it('accepts a real-shaped valid payload', () => {
    expect(() => validateFastF1Export(norrisReal)).not.toThrow()
  })

  it('rejects an unsupported schema version', () => {
    const bad = { ...norrisReal, schemaVersion: 'fastf1-export-v2' } as unknown as FastF1SessionExport
    expect(() => validateFastF1Export(bad)).toThrow(/unsupported FastF1 export schemaVersion/)
  })

  it('rejects a payload missing driverId', () => {
    const bad = { ...norrisReal, driverId: '' } as FastF1SessionExport
    expect(() => validateFastF1Export(bad)).toThrow(/driverId/)
  })

  it('rejects a payload where laps is not an array', () => {
    const bad = { ...norrisReal, laps: null } as unknown as FastF1SessionExport
    expect(() => validateFastF1Export(bad)).toThrow(/laps/)
  })

  it('rejects a payload missing season/round', () => {
    const bad = { ...norrisReal, season: undefined } as unknown as FastF1SessionExport
    expect(() => validateFastF1Export(bad)).toThrow(/season or round/)
  })

  it('fastF1ExportToRaceMetrics runs validateFastF1Export first and throws the same way', () => {
    const bad = { ...norrisReal, schemaVersion: 'garbage' } as unknown as FastF1SessionExport
    expect(() => fastF1ExportToRaceMetrics(bad, false, 3)).toThrow(/unsupported FastF1 export schemaVersion/)
  })
})

describe('null handling — nulls stay null, never silently zeroed', () => {
  it('a lap with lapTimeMs=null is excluded from the mapped laps array, not coerced to 0', () => {
    const withNullLap: FastF1SessionExport = {
      ...norrisReal,
      laps: [...norrisReal.laps, { ...norrisReal.laps[0], lapNumber: 99, lapTimeMs: null }],
    }
    const metrics = fastF1ExportToRaceMetrics(withNullLap, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.laps.find(l => l.lapNumber === 99)).toBeUndefined()
  })

  it('a null gridPosition is rejected, never silently mapped to 0 ("started on pole")', () => {
    const withNullGrid: FastF1SessionExport = { ...norrisReal, gridPosition: null }
    expect(() => fastF1ExportToRaceMetrics(withNullGrid, false, 3)).toThrow(/gridPosition is null/)
  })

  it('a null finishPosition is preserved as null in the mapped output (a driver could be unclassified)', () => {
    const withNullFinish: FastF1SessionExport = { ...norrisReal, finishPosition: null, classified: false }
    const metrics = fastF1ExportToRaceMetrics(withNullFinish, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(metrics.finishPosition).toBeNull()
  })
})

describe('real-shaped teammate pair — sanity', () => {
  it('both drivers map cleanly and share the same round/season', () => {
    const n = fastF1ExportToRaceMetrics(norrisReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    const p = fastF1ExportToRaceMetrics(piastriReal, false, methodologyV1.tunables.minCleanLapsForDegradationSlope)
    expect(n.round).toBe(p.round)
    expect(n.season).toBe(p.season)
  })
})
