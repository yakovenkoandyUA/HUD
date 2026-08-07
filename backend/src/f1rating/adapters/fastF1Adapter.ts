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

// Must match `SCHEMA_VERSION` in scripts/f1rating-collector/collect.py — no automated
// cross-language check exists, each side pins its own value and points at the other in a comment.
export const SUPPORTED_SCHEMA_VERSION = 'fastf1-export-v1' as const

/**
 * Rejects a malformed or unsupported-version payload BEFORE any mapping runs — a bad export
 * should fail loudly here, not produce a `RawRaceMetrics` with corrupted/default-filled fields.
 */
export function validateFastF1Export(session: FastF1SessionExport): void {
  if (session.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `[f1rating] unsupported FastF1 export schemaVersion "${session.schemaVersion}" ` +
      `(expected "${SUPPORTED_SCHEMA_VERSION}")`,
    )
  }
  if (!session.driverId || typeof session.driverId !== 'string') {
    throw new Error('[f1rating] FastF1 export missing/invalid driverId')
  }
  if (!session.constructorId || typeof session.constructorId !== 'string') {
    throw new Error('[f1rating] FastF1 export missing/invalid constructorId')
  }
  if (!Array.isArray(session.laps)) {
    throw new Error('[f1rating] FastF1 export "laps" must be an array')
  }
  if (typeof session.season !== 'number' || typeof session.round !== 'number') {
    throw new Error('[f1rating] FastF1 export missing/invalid season or round')
  }
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

/**
 * A stint's condition is 'dry' only if EVERY lap in it was classified dry, 'wet' only if every
 * lap was wet — otherwise 'mixed'. Real 2025 data caught the bug this fixes: a stint's condition
 * used to be taken from its FIRST lap only, so a stint that started dry but actually straddled a
 * wet/dry transition (real example: 2025 Australian GP, Verstappen/Lawson stint 5 — laps
 * genuinely alternate dry/wet per-lap classification mid-stint) got labeled uniformly 'dry' and
 * fed straight into `tyreStintManagement`'s regression, producing a physically-impossible
 * ±1921 ms/lap "degradation" pair. `eligibleDryStints` (in `engine/tyreStintManagement.ts`) and
 * the equivalent dry-only filters in `cleanRaceLapConsistency.ts`/`peakRepresentativePace` all
 * gate on `trackCondition === 'dry'` — labeling a straddling stint 'mixed' here is what makes
 * them correctly exclude it, per the "uncertain → exclude, never guess dry" rule.
 */
function resolveStintCondition(stintLaps: FastF1LapRow[]): TrackCondition {
  // Any single uncertain lap makes the whole stint uncertain — we don't even confidently know
  // that lap's true condition, so we can't confidently say the stint merely "disagrees" (mixed).
  if (stintLaps.some(l => l.trackCondition === 'uncertain')) return 'uncertain'
  const conditions = new Set(stintLaps.map(l => l.trackCondition))
  if (conditions.size === 1) return [...conditions][0]
  return 'mixed'
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
      trackCondition: resolveStintCondition(stintLaps),
      avgCleanLapTimeMs: cleanTimes.length > 0 ? cleanTimes.reduce((a, b) => a + b, 0) / cleanTimes.length : null,
      degradationMsPerLap: linearDegradationSlopeMsPerLap(cleanLaps, minCleanLapsForDegradationSlope),
      cleanLapCount: cleanLaps.length,
    }
  })
}

/**
 * Maps a validated `FastF1SessionExport` (Race session) into `RawRaceMetrics`. Runs
 * `validateFastF1Export` first — a malformed or unsupported-version payload throws rather than
 * silently producing corrupted metrics. Start execution metrics require `positionAfterLap1`,
 * derived here from the `position` field of the first completed lap — the export must include
 * per-lap position for this to be non-zero-sampled; if absent, `attributableContactOnLap1` must
 * be supplied separately from an `IncidentRecord` (this mapper never infers "contact" from
 * lap-time anomalies alone).
 *
 * `gridPosition: null` throws rather than defaulting to a number — a classified race result
 * missing its grid position is malformed input, and silently mapping that to `0` would fabricate
 * a false "started on pole" for every driver with genuinely missing data (exactly the
 * null-hidden-under-zero pattern this engine's data-quality invariants forbid everywhere else).
 */
export function fastF1ExportToRaceMetrics(
  session: FastF1SessionExport,
  attributableContactOnLap1: boolean,
  /** Pass `methodology.tunables.minCleanLapsForDegradationSlope` — not defaulted here, so this
   * adapter can never silently drift from whatever methodology version is actually in use. */
  minCleanLapsForDegradationSlope: number,
): RawRaceMetrics {
  validateFastF1Export(session)
  if (session.sessionType !== 'Race' && session.sessionType !== 'Sprint') {
    throw new Error(`[f1rating] fastF1ExportToRaceMetrics expects a Race/Sprint export, got "${session.sessionType}"`)
  }
  if (session.gridPosition === null) {
    throw new Error(
      `[f1rating] fastF1ExportToRaceMetrics: gridPosition is null for driver "${session.driverId}" ` +
      `round ${session.round} — cannot compute start-execution metrics without it (this is a reject, not a 0-fallback)`,
    )
  }
  const laps = session.laps.map(toLapExclusionSample).filter((l): l is RaceLapSample => l !== null)
  const stints = buildStints(session.laps, minCleanLapsForDegradationSlope)

  const lap1 = session.laps.find(l => l.lapNumber === 1)
  const gridPosition = session.gridPosition
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
