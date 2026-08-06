import type { MethodologyVersion, ReferenceRange } from '../types'
import { assertWeightsSumToOne } from '../engine/weights'

/**
 * MIMIR F1 Driver Rating Model — methodology `mimir-f1-v1`.
 *
 * HOW TO BUMP THE METHODOLOGY VERSION
 * -------------------------------------
 * Any change to a weight, a reference range, a minimum sample size, or the final-scale mapping
 * changes what a given numeric rating *means* — old and new ratings are not comparable.
 * When you change any of the maps below:
 *   1. Copy this file to `methodologyV2.ts` (or bump the version), change `id` to `mimir-f1-v2`.
 *   2. Keep `methodologyV1.ts` importable so historical ratings computed under v1 remain
 *      reproducible/explainable — `DriverRating.methodologyVersion` records which one was used.
 *   3. Never mutate the weights/ranges of a already-shipped version id in place.
 *
 * WHY TEAMMATE-RELATIVE METRICS DOMINATE THE WEIGHTS
 * ------------------------------------------------------
 * Two drivers in the same team share the same car for a given round, so a delta between
 * teammates cancels out the single largest confound in F1 performance analysis (car
 * performance). Non-relative metrics (peak pace, head-to-head) are weighted lower because
 * they still carry car-performance signal that teammate deltas mostly remove.
 */

const speedWeights = {
  teammateAdjustedQualifyingPace: 0.40,
  teammateAdjustedCleanRacePace: 0.30,
  peakRepresentativePace: 0.15,
  qualifyingHeadToHead: 0.15,
}

const precisionWeights = {
  cleanRaceLapConsistency: 0.30,
  cleanWeekendRate: 0.25,
  driverAttributableReliability: 0.20,
  qualifyingConsistency: 0.15,
  unforcedErrorControl: 0.10,
}

const raceIqWeights = {
  resultRelativeToExpectedPace: 0.25,
  tyreStintManagement: 0.20,
  startAndOpeningLapExecution: 0.20,
  racecraftProxy: 0.15,
  changingConditionAdaptability: 0.10,
  documentedStrategicExecution: 0.10,
}

/**
 * Fixed, documented raw→internal-0-100 mapping windows. These are NOT derived from the
 * current driver pool (no min-max over "all drivers we happen to have loaded") — that is
 * what keeps a driver's score stable when a new driver is added to the system. Ranges are
 * chosen from plausible real-world F1 performance windows; revisit only when bumping the
 * methodology version.
 *
 * `higherIsBetter: false` metrics are lap-time/error deltas where a smaller (or more
 * negative) raw value is the better outcome; `normalizeToReferenceRange` inverts them.
 *
 * ⚠️ CALIBRATION STATUS: plausible-shaped placeholders, informed by general knowledge of F1
 * pace/consistency margins, NOT fitted against real data. A first real-data pass has run (2025
 * McLaren, Norris/Piastri, rounds 1/3/5/10/15 — see `npm run f1rating:calibrate` and
 * `scripts/f1rating-collector/output/calibration-report.json`) and found several of these ranges
 * too narrow for the observed real values. Those findings are recorded as `candidateReferenceRanges`
 * in the calibration report — NOT applied here automatically. A range in this file only changes
 * once a human has reviewed *why* the observed value fell outside it (real signal vs. a
 * methodology bug in the metric itself — see the tyreStintManagement redesign for an example of
 * the latter) and accepted the candidate. `calibrationStatus` stays `'unverified'` and
 * `productionReady` stays `false` until that review process, on a real multi-team dataset, is done.
 * While this methodology has never been `productionReady: true`, accepted range corrections may
 * keep editing `v1` directly. Once `productionReady` is ever flipped to `true`, that guarantee
 * ends — any further change to a weight or reference range must ship as `mimir-f1-v2` per the
 * version-bump rule above, not a silent edit to the version already in use.
 */
const referenceRanges: Record<string, ReferenceRange> = {
  teammateAdjustedQualifyingPace: {
    key: 'teammateAdjustedQualifyingPace',
    min: -1.5, max: 1.5, higherIsBetter: false,
    description: '% gap of representative qualifying lap time vs teammate (negative = faster).',
  },
  teammateAdjustedCleanRacePace: {
    key: 'teammateAdjustedCleanRacePace',
    min: -1.2, max: 1.2, higherIsBetter: false,
    description: '% gap of average clean-lap race pace vs teammate on comparable stints.',
  },
  peakRepresentativePace: {
    key: 'peakRepresentativePace',
    min: -1.0, max: 1.0, higherIsBetter: false,
    description: '% gap of best sustained-stint average pace vs teammate (never a single fastest lap).',
  },
  qualifyingHeadToHead: {
    key: 'qualifyingHeadToHead',
    min: 0, max: 100, higherIsBetter: true,
    description: '% of comparable qualifying sessions won directly against the teammate.',
  },
  cleanRaceLapConsistency: {
    key: 'cleanRaceLapConsistency',
    min: 0, max: 2.5, higherIsBetter: false,
    description: 'Coefficient of variation (%) of clean race laps within a single stint (never pooled ' +
      'across stints/compounds — see engine/cleanRaceLapConsistency.ts for why that matters).',
  },
  cleanWeekendRate: {
    key: 'cleanWeekendRate',
    min: 0, max: 100, higherIsBetter: true,
    description: '% of rounds with no driver-attributable incident and no driver-attributable DNF.',
  },
  driverAttributableReliability: {
    key: 'driverAttributableReliability',
    min: 0, max: 100, higherIsBetter: true,
    description: '% of starts without a driver-attributable DNF (technical DNFs excluded from the penalty).',
  },
  qualifyingConsistency: {
    key: 'qualifyingConsistency',
    min: 0, max: 2, higherIsBetter: false,
    description: 'Coefficient of variation (%) of valid qualifying laps within the same segment.',
  },
  unforcedErrorControl: {
    key: 'unforcedErrorControl',
    min: 0, max: 2, higherIsBetter: false,
    description: 'Attributable unforced-error incidents per round.',
  },
  resultRelativeToExpectedPace: {
    key: 'resultRelativeToExpectedPace',
    min: -5, max: 5, higherIsBetter: true,
    description: 'Average (expectedFinishPosition − actualFinishPosition); positive = beat pace-based expectation.',
  },
  tyreStintManagement: {
    key: 'tyreStintManagement',
    // ⚠️ CHANGELOG — formula changed within mimir-f1-v1 (still pre-productionReady, see the
    // version-bump rule above for why this is allowed here and won't be once productionReady=true):
    //   BEFORE: absolute clean-lap degradation slope (ms/lap) of a single driver's single stint.
    //   AFTER:  teammate-relative COMPARABLE-STINT slope DELTA (driverSlope − teammateSlope),
    //           averaged across stint pairs — see engine/tyreStintManagement.ts doc comment.
    // Same metric key, same weight slot, DIFFERENT underlying quantity — anyone diffing a rating
    // computed before vs. after this change is comparing two different measurements that happen
    // to share a name. The v1-original absolute slope conflated tyre wear with fuel burn-off,
    // track evolution and pace management (real data produced -53.85 ms/lap, i.e. laps getting
    // FASTER — physically impossible for "pure tyre degradation"). The teammate-relative delta
    // cancels most of that shared session-level noise the same way every other teammate-relative
    // metric in this engine does.
    //
    // SIGN / DIRECTION: `higherIsBetter: false` — a MORE NEGATIVE delta scores HIGHER. Concretely:
    // driverSlope more negative than teammateSlope means the driver's lap times fell (or rose
    // less) relative to the teammate over a matched stint — scored as better, consistent with
    // every other "gap to teammate" metric in this engine (smaller/more-negative gap = faster).
    // This is a DIRECTIONAL PROXY, not a physical tyre-wear measurement — it does not claim the
    // driver's tyres literally degraded less; it says their PACE EVOLVED more favorably than
    // their teammate's on a matched stint, which residual factors (traffic, fuel offset from
    // differing strategy, setup) can still influence. Treat as "relative stint pace evolution",
    // per the internal `stintPaceEvolution` naming in the engine module.
    //
    // This range is an unverified placeholder for the new delta semantics — investigate-only,
    // see candidateReferenceRanges in the calibration report; do not treat as calibrated.
    min: -50, max: 50, higherIsBetter: false,
    description: 'PROXY, not raw tyre wear: teammate-relative clean-lap pace-evolution delta ' +
      '(ms/lap) on comparable stints (driverSlope − teammateSlope). Negative = driver\'s pace ' +
      'evolved more favorably than teammate\'s on a matched stint — scored as better.',
  },
  startAndOpeningLapExecution: {
    key: 'startAndOpeningLapExecution',
    min: -3, max: 3, higherIsBetter: true,
    description: 'Average positions gained/lost from grid to end of lap 1, penalized for attributable contact.',
  },
  racecraftProxy: {
    key: 'racecraftProxy',
    min: -3, max: 3, higherIsBetter: true,
    description: 'Average net position change during green-flag racing, excluding lap 1 and pit-stop laps. ' +
      'v1 limitation: this is a position-delta proxy, not a true overtake/defend count — it cannot ' +
      'distinguish a strategy-driven position change from an on-track battle.',
  },
  changingConditionAdaptability: {
    key: 'changingConditionAdaptability',
    min: -1.5, max: 1.5, higherIsBetter: false,
    description: '% teammate pace gap computed only across wet/mixed-condition rounds (normalized separately from dry).',
  },
  documentedStrategicExecution: {
    key: 'documentedStrategicExecution',
    min: 0, max: 100, higherIsBetter: true,
    description: 'v1 has no objective telemetry proxy for strategic execution — this sub-component always ' +
      'reports missing raw data and is reweighted away unless a manual review adjustment ' +
      '(category "strategic_intervention") is recorded for the round.',
  },
}

export const methodologyV1: MethodologyVersion = {
  id: 'mimir-f1-v1',
  effectiveFrom: '2026-01-01',
  description: 'First production-grade iteration of the MIMIR F1 Driver Rating Model.',
  // Machine-readable, not just the comment above this config: see CalibrationStatus/
  // productionReady doc comments in types.ts and `assertProductionReady` in engine/weights.ts.
  calibrationStatus: 'unverified',
  productionReady: false,
  minSampleSize: {
    teammateAdjustedQualifyingPace: 3,
    teammateAdjustedCleanRacePace: 3,
    peakRepresentativePace: 2,
    qualifyingHeadToHead: 3,
    cleanRaceLapConsistency: 3,
    cleanWeekendRate: 3,
    driverAttributableReliability: 3,
    qualifyingConsistency: 3,
    unforcedErrorControl: 3,
    resultRelativeToExpectedPace: 3,
    tyreStintManagement: 2,
    startAndOpeningLapExecution: 2,
    racecraftProxy: 2,
    changingConditionAdaptability: 1,
    documentedStrategicExecution: 0,
  },
  speedWeights,
  precisionWeights,
  raceIqWeights,
  referenceRanges,
  finalScale: { min: 70, max: 99 },
  tyreAgeComparabilityThresholdLaps: 3,
  tunables: {
    confidenceMissingPenaltyPerItem: 0.15,
    confidenceMissingPenaltyCap: 0.6,
    confidenceHighThreshold: 0.75,
    confidenceMediumThreshold: 0.4,
    attributableLap1ContactPenaltyPositions: 2,
    minCleanLapsForStintAverage: 2,
    minCleanLapsForDegradationSlope: 3,
    minCleanLapsForConsistencyStint: 3,
    maxManualAdjustmentMagnitude: 5,
    maxCumulativeManualAdjustmentPerComponent: 8,
  },
}

assertWeightsSumToOne(methodologyV1.speedWeights, `${methodologyV1.id}.speedWeights`)
assertWeightsSumToOne(methodologyV1.precisionWeights, `${methodologyV1.id}.precisionWeights`)
assertWeightsSumToOne(methodologyV1.raceIqWeights, `${methodologyV1.id}.raceIqWeights`)
