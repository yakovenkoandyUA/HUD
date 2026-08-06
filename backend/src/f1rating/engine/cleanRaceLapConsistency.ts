import type { MethodologyVersion, TyreCompound } from '../types'
import type { DriverSeasonInput, MetricResult } from './metrics'
import { filterCleanRaceLaps } from './exclusions'
import { average, coefficientOfVariationPct, medianAbsoluteDeviation, median } from './teammateRelative'

/**
 * REDESIGN NOTE (corrective iteration after real-data calibration)
 * --------------------------------------------------------------------
 * v1's original formula pooled ALL of a race's clean dry laps together — across every stint and
 * every compound — before computing one coefficient-of-variation per round. That inflates
 * apparent inconsistency for reasons that have nothing to do with the driver: a medium-tyre
 * stint and a hard-tyre stint have different baseline pace, so pooling them into one variance
 * calculation measures "how much did pace change between strategy phases", not "how consistent
 * is the driver within a single tyre context". Real 2025 data produced a 3.6% CoV outlier this
 * way — plausible signs of exactly that pooling artifact, not necessarily real inconsistency.
 *
 * FIX: consistency is now computed PER STINT (same compound, same tyre-age window, by
 * construction — a stint) and then averaged across all qualifying stints. `teammateAdjustedCleanRacePace`
 * (in `metrics.ts`) is intentionally NOT changed the same way — pooling clean laps across an
 * entire race is legitimate for an AVERAGE pace metric (overall race pace includes whatever
 * strategy was run), it is specifically variance/consistency measures that pooling corrupts.
 */

export interface StintConsistencySample {
  round: number
  stintNumber: number
  compound: TyreCompound
  cleanLapCount: number
  includedLapTimesMs: number[]
  excludedLapCount: number
  exclusionReasons: string[]
  medianMs: number
  /** Median absolute deviation (ms) — more outlier-robust than stddev, reported for debugging. */
  madMs: number
  /** The metric's actual unit: coefficient of variation (stddev/mean) as a percentage. */
  covPct: number
}

export interface CleanRaceLapConsistencyExplain {
  samples: StintConsistencySample[]
  rawValue: number | null
  sampleSize: number
  warnings: string[]
}

type Tunables = MethodologyVersion['tunables']

export function explainCleanRaceLapConsistency(driver: DriverSeasonInput, tunables: Tunables): CleanRaceLapConsistencyExplain {
  const samples: StintConsistencySample[] = []

  for (const race of driver.race) {
    for (const stint of race.stints) {
      if (stint.trackCondition !== 'dry') continue

      const stintLaps = race.laps.filter(l => l.lapNumber >= stint.startLap && l.lapNumber <= stint.endLap)
      const { kept, excluded } = filterCleanRaceLaps(stintLaps)
      const dryKept = kept.filter(l => l.trackCondition === 'dry')
      if (dryKept.length < tunables.minCleanLapsForConsistencyStint) continue

      const lapTimes = dryKept.map(l => l.lapTimeMs)
      const cov = coefficientOfVariationPct(lapTimes)
      const med = median(lapTimes)
      const mad = medianAbsoluteDeviation(lapTimes)
      if (cov === null || med === null || mad === null) continue

      samples.push({
        round: race.round,
        stintNumber: stint.stintNumber,
        compound: stint.compound,
        cleanLapCount: dryKept.length,
        includedLapTimesMs: lapTimes,
        excludedLapCount: excluded.length,
        exclusionReasons: [...new Set(excluded.map(e => e.reason))],
        medianMs: med,
        madMs: mad,
        covPct: cov,
      })
    }
  }

  const rawValue = average(samples.map(s => s.covPct))
  const warnings: string[] = []
  if (samples.length === 0) {
    warnings.push(`no stint met the minimum clean-lap threshold (${tunables.minCleanLapsForConsistencyStint}) for consistency measurement`)
  }

  return { samples, rawValue, sampleSize: samples.length, warnings }
}

export function cleanRaceLapConsistency(driver: DriverSeasonInput, tunables: Tunables): MetricResult {
  const explain = explainCleanRaceLapConsistency(driver, tunables)
  return { rawValue: explain.rawValue, sampleSize: explain.sampleSize }
}
