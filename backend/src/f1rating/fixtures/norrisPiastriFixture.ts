import type {
  DnfRecord, IncidentRecord, ManualReviewAdjustment, QualifyingLapSample, RaceLapSample,
  RawQualifyingMetrics, RawRaceMetrics, StintMetrics,
} from '../types'
import type { DriverSeasonInput } from '../engine/metrics'

/**
 * ⚠️ SYNTHETIC / TEST-ONLY FIXTURE ⚠️
 * ------------------------------------
 * Every number in this file is invented for pipeline testing. It is NOT a claim about the real
 * 2026 season, NOT sourced from FastF1/Jolpica/FIA, and must never be presented to a user as a
 * real driver rating. It exists so the engine (`engine/index.ts` `computeDriverRating`) can be
 * exercised end-to-end through the exact same pipeline real data will eventually go through —
 * see `engine/__tests__/fixture.test.ts`.
 *
 * The shapes are deliberately varied across four rounds to cover: a clean dry round, a wet/mixed
 * round (for `changingConditionAdaptability` and the wet/dry separation invariant), a round with
 * a technical DNF (must not reduce `driverAttributableReliability`), and a round with an
 * attributable incident + a safety-car period (must be excluded from clean-pace calculations).
 */

const SEASON = 2026
const NORRIS = 'lando_norris'
const PIASTRI = 'oscar_piastri'
const MCLAREN = 'mclaren'

function buildStintLaps(params: {
  startLap: number
  count: number
  baseMs: number
  driftMsPerLap: number
  compound: RaceLapSample['compound']
  trackCondition: RaceLapSample['trackCondition']
  trackStatus?: RaceLapSample['trackStatus']
  startPosition: number
}): RaceLapSample[] {
  const { startLap, count, baseMs, driftMsPerLap, compound, trackCondition, trackStatus = 'green', startPosition } = params
  return Array.from({ length: count }, (_, i) => {
    const lapNumber = startLap + i
    return {
      lapNumber,
      lapTimeMs: Math.round(baseMs + i * driftMsPerLap),
      compound,
      tyreAgeLaps: i,
      trackCondition,
      trackStatus,
      isInLap: i === count - 1 && startLap !== 1,
      isOutLap: i === 0 && startLap !== 1,
      isPitLap: false,
      isAccurate: true,
      isDamaged: false,
      position: startPosition,
    } satisfies RaceLapSample
  })
}

function stintFromLaps(stintNumber: number, laps: RaceLapSample[]): StintMetrics {
  const clean = laps.filter(l => l.trackStatus === 'green' && !l.isInLap && !l.isOutLap)
  const times = clean.map(l => l.lapTimeMs)
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  let slope: number | null = null
  if (times.length >= 3) {
    const xs = times.map((_, i) => i)
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length
    let num = 0, den = 0
    for (let i = 0; i < xs.length; i++) { num += (xs[i] - meanX) * (times[i] - mean); den += (xs[i] - meanX) ** 2 }
    slope = den === 0 ? null : num / den
  }
  return {
    stintNumber,
    compound: laps[0].compound,
    startLap: laps[0].lapNumber,
    endLap: laps[laps.length - 1].lapNumber,
    trackCondition: laps[0].trackCondition,
    avgCleanLapTimeMs: times.length > 0 ? mean : null,
    degradationMsPerLap: slope,
    cleanLapCount: times.length,
  }
}

function quali(driverId: string, constructorId: string, round: number, q1: number, q2: number, q3: number | null, headToHead: RawQualifyingMetrics['headToHead']): RawQualifyingMetrics {
  const laps: QualifyingLapSample[] = [
    { segment: 'Q1', lapTimeMs: q1, compound: 'soft', trackCondition: 'dry', isAccurate: true },
    { segment: 'Q2', lapTimeMs: q2, compound: 'soft', trackCondition: 'dry', isAccurate: true },
  ]
  if (q3 !== null) laps.push({ segment: 'Q3', lapTimeMs: q3, compound: 'soft', trackCondition: 'dry', isAccurate: true })
  return { driverId, constructorId, season: SEASON, round, laps, headToHead }
}

// ── Round 1 — clean dry round ───────────────────────────────────────────────
const r1NorrisLaps = [
  ...buildStintLaps({ startLap: 1, count: 20, baseMs: 90_200, driftMsPerLap: 25, compound: 'medium', trackCondition: 'dry', startPosition: 1 }),
  ...buildStintLaps({ startLap: 21, count: 20, baseMs: 90_400, driftMsPerLap: 15, compound: 'hard', trackCondition: 'dry', startPosition: 1 }),
]
const r1PiastriLaps = [
  ...buildStintLaps({ startLap: 1, count: 20, baseMs: 90_350, driftMsPerLap: 32, compound: 'medium', trackCondition: 'dry', startPosition: 2 }),
  ...buildStintLaps({ startLap: 21, count: 20, baseMs: 90_600, driftMsPerLap: 22, compound: 'hard', trackCondition: 'dry', startPosition: 2 }),
]

const round1: { norris: RawRaceMetrics; piastri: RawRaceMetrics; norrisQ: RawQualifyingMetrics; piastriQ: RawQualifyingMetrics } = {
  norrisQ: quali(NORRIS, MCLAREN, 1, 91_200, 90_800, 90_450, 'ahead'),
  piastriQ: quali(PIASTRI, MCLAREN, 1, 91_400, 91_000, 90_700, 'behind'),
  norris: {
    driverId: NORRIS, constructorId: MCLAREN, season: SEASON, round: 1,
    laps: r1NorrisLaps,
    stints: [stintFromLaps(1, r1NorrisLaps.slice(0, 20)), stintFromLaps(2, r1NorrisLaps.slice(20))],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true,
  },
  piastri: {
    driverId: PIASTRI, constructorId: MCLAREN, season: SEASON, round: 1,
    laps: r1PiastriLaps,
    stints: [stintFromLaps(1, r1PiastriLaps.slice(0, 20)), stintFromLaps(2, r1PiastriLaps.slice(20))],
    start: { gridPosition: 2, positionAfterLap1: 2, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 2, expectedFinishPosition: 2, classified: true,
  },
}

// ── Round 2 — wet/mixed round ───────────────────────────────────────────────
const r2NorrisLaps = [
  ...buildStintLaps({ startLap: 1, count: 12, baseMs: 98_500, driftMsPerLap: -40, compound: 'intermediate', trackCondition: 'wet', startPosition: 3 }),
  ...buildStintLaps({ startLap: 13, count: 15, baseMs: 91_000, driftMsPerLap: 20, compound: 'medium', trackCondition: 'dry', startPosition: 2 }),
]
const r2PiastriLaps = [
  ...buildStintLaps({ startLap: 1, count: 12, baseMs: 99_200, driftMsPerLap: -35, compound: 'intermediate', trackCondition: 'wet', startPosition: 4 }),
  ...buildStintLaps({ startLap: 13, count: 15, baseMs: 91_300, driftMsPerLap: 18, compound: 'medium', trackCondition: 'dry', startPosition: 4 }),
]

const round2 = {
  norrisQ: quali(NORRIS, MCLAREN, 2, 91_600, 91_100, 90_900, 'ahead'),
  piastriQ: quali(PIASTRI, MCLAREN, 2, 91_900, 91_500, null, 'behind'),
  norris: {
    driverId: NORRIS, constructorId: MCLAREN, season: SEASON, round: 2,
    laps: r2NorrisLaps,
    stints: [stintFromLaps(1, r2NorrisLaps.slice(0, 12)), stintFromLaps(2, r2NorrisLaps.slice(12))],
    start: { gridPosition: 3, positionAfterLap1: 3, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 2, expectedFinishPosition: 3, classified: true,
  } satisfies RawRaceMetrics,
  piastri: {
    driverId: PIASTRI, constructorId: MCLAREN, season: SEASON, round: 2,
    laps: r2PiastriLaps,
    stints: [stintFromLaps(1, r2PiastriLaps.slice(0, 12)), stintFromLaps(2, r2PiastriLaps.slice(12))],
    start: { gridPosition: 4, positionAfterLap1: 4, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 4, expectedFinishPosition: 4, classified: true,
  } satisfies RawRaceMetrics,
}

// ── Round 3 — Piastri technical DNF ─────────────────────────────────────────
const r3NorrisLaps = buildStintLaps({ startLap: 1, count: 30, baseMs: 89_900, driftMsPerLap: 18, compound: 'medium', trackCondition: 'dry', startPosition: 1 })
const r3PiastriLaps = buildStintLaps({ startLap: 1, count: 18, baseMs: 90_200, driftMsPerLap: 20, compound: 'medium', trackCondition: 'dry', startPosition: 3 })

const round3 = {
  norrisQ: quali(NORRIS, MCLAREN, 3, 90_900, 90_500, 90_100, 'ahead'),
  piastriQ: quali(PIASTRI, MCLAREN, 3, 91_100, 90_700, 90_500, 'behind'),
  norris: {
    driverId: NORRIS, constructorId: MCLAREN, season: SEASON, round: 3,
    laps: r3NorrisLaps,
    stints: [stintFromLaps(1, r3NorrisLaps)],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true,
  } satisfies RawRaceMetrics,
  piastri: {
    driverId: PIASTRI, constructorId: MCLAREN, season: SEASON, round: 3,
    laps: r3PiastriLaps,
    stints: [stintFromLaps(1, r3PiastriLaps)],
    start: { gridPosition: 3, positionAfterLap1: 3, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: null, expectedFinishPosition: 3, classified: false,
  } satisfies RawRaceMetrics,
}
const round3PiastriDnf: DnfRecord = {
  id: 'dnf-r3-piastri', season: SEASON, round: 3, driverId: PIASTRI,
  cause: 'technical', driverAttributable: false, lapNumber: 18,
  notes: 'Synthetic fixture: engine failure, not driver-caused — must not reduce reliability score.',
}

// ── Round 4 — Norris attributable incident + safety car period ─────────────
const r4NorrisClean1 = buildStintLaps({ startLap: 1, count: 10, baseMs: 90_100, driftMsPerLap: 20, compound: 'medium', trackCondition: 'dry', startPosition: 2 })
const r4NorrisScLaps = buildStintLaps({ startLap: 11, count: 4, baseMs: 105_000, driftMsPerLap: 0, compound: 'medium', trackCondition: 'dry', trackStatus: 'sc', startPosition: 2 })
const r4NorrisClean2 = buildStintLaps({ startLap: 15, count: 12, baseMs: 90_300, driftMsPerLap: 22, compound: 'hard', trackCondition: 'dry', startPosition: 2 })
const r4NorrisLaps = [...r4NorrisClean1, ...r4NorrisScLaps, ...r4NorrisClean2]

const r4PiastriLaps = buildStintLaps({ startLap: 1, count: 26, baseMs: 90_050, driftMsPerLap: 19, compound: 'medium', trackCondition: 'dry', startPosition: 1 })

const round4 = {
  norrisQ: quali(NORRIS, MCLAREN, 4, 91_300, 90_900, 90_600, 'behind'),
  piastriQ: quali(PIASTRI, MCLAREN, 4, 91_000, 90_700, 90_400, 'ahead'),
  norris: {
    driverId: NORRIS, constructorId: MCLAREN, season: SEASON, round: 4,
    laps: r4NorrisLaps,
    stints: [stintFromLaps(1, r4NorrisClean1), stintFromLaps(2, r4NorrisClean2)],
    start: { gridPosition: 2, positionAfterLap1: 2, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 2, expectedFinishPosition: 2, classified: true,
  } satisfies RawRaceMetrics,
  piastri: {
    driverId: PIASTRI, constructorId: MCLAREN, season: SEASON, round: 4,
    laps: r4PiastriLaps,
    stints: [stintFromLaps(1, r4PiastriLaps)],
    start: { gridPosition: 1, positionAfterLap1: 1, positionsGainedLost: 0, attributableContactOnLap1: false },
    finishPosition: 1, expectedFinishPosition: 1, classified: true,
  } satisfies RawRaceMetrics,
}
const round4NorrisIncident: IncidentRecord = {
  id: 'incident-r4-norris', season: SEASON, round: 4, driverId: NORRIS,
  type: 'unforced_error', attributable: true, source: 'synthetic-fixture',
  description: 'Synthetic fixture: brief lock-up and off-track excursion, no contact.',
}

// ── Assembled per-driver season inputs ──────────────────────────────────────

export const norrisSeasonFixture: DriverSeasonInput = {
  driverId: NORRIS,
  qualifying: [round1.norrisQ, round2.norrisQ, round3.norrisQ, round4.norrisQ],
  race: [round1.norris, round2.norris, round3.norris, round4.norris],
  dnfs: [],
  incidents: [round4NorrisIncident],
}

export const piastriSeasonFixture: DriverSeasonInput = {
  driverId: PIASTRI,
  qualifying: [round1.piastriQ, round2.piastriQ, round3.piastriQ, round4.piastriQ],
  race: [round1.piastri, round2.piastri, round3.piastri, round4.piastri],
  dnfs: [round3PiastriDnf],
  incidents: [],
}

/** Synthetic manual-review example: a strategic call attributed to the team, not the driver. */
export const norrisManualAdjustmentFixture: ManualReviewAdjustment = {
  id: 'manual-r2-norris-strategy',
  season: SEASON,
  round: 2,
  sessionType: 'Race',
  driverId: NORRIS,
  affectedComponent: 'raceIq',
  category: 'strategic_intervention',
  signedAdjustment: 1.5,
  maxAllowedMagnitude: 3,
  reason: 'Synthetic fixture: early intermediate-to-slick call executed well relative to team instruction.',
  source: 'synthetic-fixture',
  reviewer: 'fixture-author',
  createdAt: '2026-01-01T00:00:00.000Z',
  sourceEventId: 'synthetic-r2-norris-strategy-call',
}

export const fixtureManualAdjustments: ManualReviewAdjustment[] = [norrisManualAdjustmentFixture]
export const fixtureDnfs: DnfRecord[] = [round3PiastriDnf]
export const FIXTURE_SEASON = SEASON
export const FIXTURE_CALCULATED_AFTER_ROUND = 4
