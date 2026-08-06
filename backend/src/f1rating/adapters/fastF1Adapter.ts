import type {
  ConstructorId, DriverId, RaceLapSample, RawRaceMetrics, Round, Season, StartExecutionMetrics,
  StintMetrics, TrackCondition, TrackStatus, TyreCompound,
} from '../types'

/**
 * TypeScript boundary for a FastF1-derived session export. The UI and this engine never call
 * Python or FastF1 directly — a (currently unwritten) minimal collector script would run
 * `fastf1.get_session(season, round, sessionType)`, load its local FastF1 cache, and dump JSON
 * matching `FastF1SessionExport` below. This repo has no existing Python tooling (verified: no
 * `requirements.txt`/`pyproject.toml`/scripts other than an unrelated CSS migration script), so
 * v1 ships the contract + mapper only; adding the collector is a follow-up once real data
 * ingestion is prioritized (see final report, "next steps").
 *
 * Schema version: `fastf1-export-v1`. Bump alongside any breaking field change and keep the
 * mapper backward-compatible or explicitly reject older versions.
 */
export interface FastF1SessionExport {
  schemaVersion: 'fastf1-export-v1'
  season: number
  round: number
  sessionType: 'FP1' | 'FP2' | 'FP3' | 'Q' | 'Sprint' | 'SprintQualifying' | 'Race'
  driverId: string
  constructorId: string
  laps: FastF1LapRow[]
  gridPosition: number | null
  finishPosition: number | null
  classified: boolean
}

export interface FastF1LapRow {
  lapNumber: number
  lapTimeMs: number | null
  compound: TyreCompound
  tyreLifeLaps: number
  stintNumber: number
  trackStatus: TrackStatus
  trackCondition: TrackCondition
  isPitOutLap: boolean
  isPitInLap: boolean
  /** FastF1 `Lap.IsAccurate` — false for laps with missing/implausible sector data. */
  isAccurate: boolean
  /** Set by a human/documented process reviewing onboard/broadcast footage; not inferred by FastF1. */
  isDamaged: boolean
  position: number | null
}

function toLapExclusionSample(row: FastF1LapRow): RaceLapSample | null {
  if (row.lapTimeMs === null) return null
  return {
    lapNumber: row.lapNumber,
    lapTimeMs: row.lapTimeMs,
    compound: row.compound,
    tyreAgeLaps: row.tyreLifeLaps,
    trackCondition: row.trackCondition,
    trackStatus: row.trackStatus,
    isInLap: row.isPitInLap,
    isOutLap: row.isPitOutLap,
    isPitLap: row.isPitInLap || row.isPitOutLap,
    isAccurate: row.isAccurate,
    isDamaged: row.isDamaged,
    position: row.position,
  }
}

function linearDegradationSlopeMsPerLap(cleanLaps: FastF1LapRow[], minCleanLaps: number): number | null {
  if (cleanLaps.length < minCleanLaps) return null
  const xs = cleanLaps.map(l => l.tyreLifeLaps)
  const ys = cleanLaps.map(l => l.lapTimeMs as number)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  return num / den
}

function isCleanLap(row: FastF1LapRow): boolean {
  return row.lapTimeMs !== null && row.isAccurate && !row.isDamaged && !row.isPitInLap && !row.isPitOutLap &&
    row.trackStatus === 'green'
}

function buildStints(laps: FastF1LapRow[], minCleanLapsForDegradationSlope: number): StintMetrics[] {
  const stintNumbers = [...new Set(laps.map(l => l.stintNumber))].sort((a, b) => a - b)
  return stintNumbers.map(stintNumber => {
    const stintLaps = laps.filter(l => l.stintNumber === stintNumber)
    const cleanLaps = stintLaps.filter(isCleanLap)
    const cleanTimes = cleanLaps.map(l => l.lapTimeMs as number)
    return {
      stintNumber,
      compound: stintLaps[0]?.compound ?? 'medium',
      startLap: Math.min(...stintLaps.map(l => l.lapNumber)),
      endLap: Math.max(...stintLaps.map(l => l.lapNumber)),
      trackCondition: stintLaps[0]?.trackCondition ?? 'dry',
      avgCleanLapTimeMs: cleanTimes.length > 0 ? cleanTimes.reduce((a, b) => a + b, 0) / cleanTimes.length : null,
      degradationMsPerLap: linearDegradationSlopeMsPerLap(cleanLaps, minCleanLapsForDegradationSlope),
      cleanLapCount: cleanLaps.length,
    }
  })
}

/**
 * Maps a validated `FastF1SessionExport` (Race session) into `RawRaceMetrics`. Start execution
 * metrics require `positionAfterLap1`, derived here from the `position` field of the first
 * completed lap — the export must include per-lap position for this to be non-zero-sampled;
 * if absent, `attributableContactOnLap1` must be supplied separately from an `IncidentRecord`
 * (this mapper never infers "contact" from lap-time anomalies alone).
 */
export function fastF1ExportToRaceMetrics(
  session: FastF1SessionExport,
  attributableContactOnLap1: boolean,
  /** Pass `methodology.tunables.minCleanLapsForDegradationSlope` — not defaulted here, so this
   * adapter can never silently drift from whatever methodology version is actually in use. */
  minCleanLapsForDegradationSlope: number,
): RawRaceMetrics {
  if (session.sessionType !== 'Race' && session.sessionType !== 'Sprint') {
    throw new Error(`[f1rating] fastF1ExportToRaceMetrics expects a Race/Sprint export, got "${session.sessionType}"`)
  }
  const laps = session.laps.map(toLapExclusionSample).filter((l): l is RaceLapSample => l !== null)
  const stints = buildStints(session.laps, minCleanLapsForDegradationSlope)

  const lap1 = session.laps.find(l => l.lapNumber === 1)
  const gridPosition = session.gridPosition ?? 0
  const positionAfterLap1 = lap1?.position ?? gridPosition

  return {
    driverId: session.driverId as DriverId,
    constructorId: session.constructorId as ConstructorId,
    season: session.season as Season,
    round: session.round as Round,
    laps,
    stints,
    start: {
      gridPosition,
      positionAfterLap1,
      positionsGainedLost: gridPosition - positionAfterLap1,
      attributableContactOnLap1,
    },
    finishPosition: session.finishPosition,
    // Expected finish is intentionally NOT derived here from championship standings/points —
    // it must be supplied by the caller from a pace-based rank (e.g. qualifying classification),
    // per the "ratings do not depend on standings points" invariant.
    expectedFinishPosition: null,
    classified: session.classified,
  }
}
