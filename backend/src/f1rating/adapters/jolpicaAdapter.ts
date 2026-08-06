import type { ConstructorId, DriverId, QualifyingHeadToHeadResult, RawQualifyingMetrics, Round, Season } from '../types'

/**
 * Boundary for Jolpica (Ergast-compatible) structured session/results data — the same API
 * `backend/src/controllers/f1Controller.ts` already uses for standings. Ergast/Jolpica exposes
 * qualifying segment times and race classification, but NOT lap-by-lap telemetry, stints, tyre
 * data or track status — that gap is exactly what `fastF1Adapter.ts` fills. A Jolpica-only driver
 * season can populate qualifying pace/head-to-head metrics; race-pace/consistency/stint metrics
 * will honestly report missing data until FastF1 data is also ingested.
 */

/** Shape of one `QualifyingResults[i]` entry from `GET /ergast/f1/{season}/{round}/qualifying/`. */
export interface JolpicaQualifyingResult {
  driverId: string
  constructorId: string
  position: string
  Q1?: string
  Q2?: string
  Q3?: string
}

/** Shape of one `Results[i]` entry from `GET /ergast/f1/{season}/{round}/results/`. */
export interface JolpicaRaceResult {
  driverId: string
  constructorId: string
  grid: string
  position?: string
  positionText: string
  laps: string
  status: string
}

function parseErgastLapTime(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(?:(\d+):)?(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) return null
  const minutes = match[1] ? parseInt(match[1], 10) : 0
  const seconds = parseInt(match[2], 10)
  const millisFraction = match[3].padEnd(3, '0').slice(0, 3)
  return minutes * 60_000 + seconds * 1_000 + parseInt(millisFraction, 10)
}

/**
 * Builds a `RawQualifyingMetrics` from an Ergast/Jolpica qualifying result pair. Each Q-segment
 * time becomes one representative lap sample (Ergast does not expose individual lap attempts,
 * so there is exactly one sample per segment reached, always `isAccurate: true` — Ergast only
 * ever reports a driver's final classified time per segment, never an aborted/invalid lap).
 * `trackCondition` defaults to `'dry'` because Ergast does not report session weather; a caller
 * with better weather data (e.g. from FastF1) should override the returned laps' condition.
 */
export function jolpicaQualifyingToRawMetrics(
  driverResult: JolpicaQualifyingResult,
  teammateResult: JolpicaQualifyingResult | null,
  season: Season,
  round: Round,
): RawQualifyingMetrics {
  const laps: RawQualifyingMetrics['laps'] = []
  for (const [segment, raw] of [['Q1', driverResult.Q1], ['Q2', driverResult.Q2], ['Q3', driverResult.Q3]] as const) {
    const ms = parseErgastLapTime(raw)
    if (ms !== null) {
      laps.push({ segment, lapTimeMs: ms, compound: 'soft', trackCondition: 'dry', isAccurate: true })
    }
  }

  const headToHead = computeHeadToHead(driverResult, teammateResult)

  return {
    driverId: driverResult.driverId as DriverId,
    constructorId: driverResult.constructorId as ConstructorId,
    season,
    round,
    laps,
    headToHead,
  }
}

function computeHeadToHead(
  driver: JolpicaQualifyingResult,
  teammate: JolpicaQualifyingResult | null,
): QualifyingHeadToHeadResult {
  if (!teammate) return 'not_comparable'
  const driverHasTime = driver.Q1 || driver.Q2 || driver.Q3
  const teammateHasTime = teammate.Q1 || teammate.Q2 || teammate.Q3
  if (!driverHasTime || !teammateHasTime) return 'not_comparable'
  const driverPos = parseInt(driver.position, 10)
  const teammatePos = parseInt(teammate.position, 10)
  if (Number.isNaN(driverPos) || Number.isNaN(teammatePos)) return 'not_comparable'
  return driverPos < teammatePos ? 'ahead' : 'behind'
}

/** Ergast `status` strings that indicate a mechanical/technical retirement, not driver error. */
const TECHNICAL_STATUS_PATTERN = /engine|gearbox|hydraulics|electrical|transmission|brakes|suspension|power unit|turbo|clutch|fuel system|oil leak|water leak|exhaust|steering|wheel|puncture/i

/** Best-effort DNF cause classification from an Ergast race-result status string alone. */
export function classifyJolpicaStatus(status: string): 'finished' | 'technical' | 'accident' | 'unknown_dnf' {
  if (/^finished$/i.test(status) || /^\+\d+ lap/i.test(status)) return 'finished'
  if (/accident|collision|spun off/i.test(status)) return 'accident'
  if (TECHNICAL_STATUS_PATTERN.test(status)) return 'technical'
  return 'unknown_dnf'
}
