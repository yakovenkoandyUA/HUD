/**
 * MIMIR F1 Driver Rating Model — domain types.
 *
 * WHAT THIS MODEL MEASURES
 * -------------------------
 * Three independent facets of a driver's on-track performance within a season,
 * derived from session telemetry (laps, sectors, stints, tyres, track status)
 * and documented incident/strategy records:
 *   - Speed      — how fast the driver is, adjusted for the car via teammate comparison.
 *   - Precision  — how consistent and error-free the driver is.
 *   - Race IQ    — how well the driver executes race strategy, starts, and racecraft.
 *
 * WHAT THIS MODEL CANNOT MEASURE OBJECTIVELY
 * --------------------------------------------
 * - Car/team performance in isolation (mitigated, not eliminated, by teammate-relative deltas —
 *   both teammates share the car, but development pace, setup direction and reliability can still
 *   diverge intra-season).
 * - Intent (e.g. whether a defensive move was "fair") — incident records capture outcome and
 *   attribution as documented by a human reviewer, not the model.
 * - Anything for which raw telemetry is not ingested (e.g. private team strategy calls) —
 *   `documentedStrategicExecution` is intentionally manual-review-driven, not inferred.
 * A rating with low `confidence` is not a hidden zero — it is a real value computed on a smaller
 * or reweighted sample, flagged for the consumer to display or discount accordingly.
 */

// ── Identity ──────────────────────────────────────────────────────────────

/** Ergast/Jolpica driver slug, e.g. "max_verstappen". Matches `DriverStanding.driverId` client-side. */
export type DriverId = string

/** Ergast/Jolpica constructor slug, e.g. "red_bull". */
export type ConstructorId = string

export type Season = number
export type Round = number

export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'Sprint' | 'SprintQualifying' | 'Race'

export type QualifyingSegment = 'Q1' | 'Q2' | 'Q3'

// ── Track / tyre conditions ──────────────────────────────────────────────

export type TrackCondition = 'dry' | 'wet' | 'mixed'

export type TyreCompound = 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet'

export type TrackStatus = 'green' | 'sc' | 'vsc' | 'red'

/** Reasons a lap sample is excluded from clean-pace/consistency calculations. */
export type LapExclusionReason =
  | 'safety_car'
  | 'virtual_safety_car'
  | 'red_flag'
  | 'in_lap'
  | 'out_lap'
  | 'inaccurate'
  | 'damaged'
  | 'not_comparable_condition'
  | 'not_comparable_tyre'

// ── Raw qualifying metrics ───────────────────────────────────────────────

export interface QualifyingLapSample {
  segment: QualifyingSegment
  lapTimeMs: number
  compound: TyreCompound
  trackCondition: TrackCondition
  /** FastF1 `IsAccurate` — false laps are excluded from every calculation, never averaged in. */
  isAccurate: boolean
}

export type QualifyingHeadToHeadResult = 'ahead' | 'behind' | 'not_comparable'

export interface RawQualifyingMetrics {
  driverId: DriverId
  constructorId: ConstructorId
  season: Season
  round: Round
  laps: QualifyingLapSample[]
  /** Result of the direct teammate comparison for this session (knocked out earlier does not
   * automatically mean "behind" — it is `not_comparable` unless a genuine representative lap exists
   * for both drivers in the same segment). */
  headToHead: QualifyingHeadToHeadResult
}

// ── Raw race metrics ──────────────────────────────────────────────────────

export interface RaceLapSample {
  lapNumber: number
  lapTimeMs: number
  compound: TyreCompound
  tyreAgeLaps: number
  trackCondition: TrackCondition
  trackStatus: TrackStatus
  isInLap: boolean
  isOutLap: boolean
  isPitLap: boolean
  /** FastF1 `IsAccurate` flag. */
  isAccurate: boolean
  /** Visibly damaged-car lap (documented, e.g. post-contact floor damage) — excluded from pace calcs. */
  isDamaged: boolean
  /** Track position at the end of this lap, if known (used only for the racecraft proxy). */
  position: number | null
}

export interface StintMetrics {
  stintNumber: number
  compound: TyreCompound
  startLap: number
  endLap: number
  trackCondition: TrackCondition
  /** Average of *clean* laps in the stint only (see `filterCleanRaceLaps`). Null if no clean laps. */
  avgCleanLapTimeMs: number | null
  /** Linear degradation slope in ms/lap over clean laps in the stint. Null if insufficient clean laps. */
  degradationMsPerLap: number | null
  cleanLapCount: number
}

export interface StartExecutionMetrics {
  gridPosition: number
  positionAfterLap1: number
  /** Positive = gained positions. */
  positionsGainedLost: number
  /** Documented, driver-attributable contact on lap 1 (from incident records, not inferred). */
  attributableContactOnLap1: boolean
}

export interface RawRaceMetrics {
  driverId: DriverId
  constructorId: ConstructorId
  season: Season
  round: Round
  laps: RaceLapSample[]
  stints: StintMetrics[]
  start: StartExecutionMetrics
  finishPosition: number | null
  /** Grid-independent expected finish based on representative qualifying pace rank, not points. */
  expectedFinishPosition: number | null
  classified: boolean
}

// ── Incidents / reliability ──────────────────────────────────────────────

export type IncidentType = 'contact' | 'off_track' | 'unforced_error' | 'penalty' | 'other'

export interface IncidentRecord {
  id: string
  season: Season
  round: Round
  driverId: DriverId
  type: IncidentType
  /** Was this incident caused by the driver (vs. e.g. being hit by someone else)? Set by human review. */
  attributable: boolean
  description: string
  source: string
}

export type DnfCause = 'technical' | 'driver_error' | 'contact_at_fault' | 'contact_not_at_fault' | 'unknown'

export interface DnfRecord {
  id: string
  season: Season
  round: Round
  driverId: DriverId
  cause: DnfCause
  /** Derived from `cause` at construction time (see `buildDnfRecord`) — never set independently,
   * so `technical` DNFs can never accidentally count against driver-attributable reliability. */
  driverAttributable: boolean
  lapNumber: number | null
  notes?: string
}

// ── Manual review ─────────────────────────────────────────────────────────

export type RatingComponent = 'speed' | 'precision' | 'raceIq'

export type ManualReviewCategory =
  | 'contact_fault'
  | 'damage'
  | 'team_orders'
  | 'strategic_intervention'
  | 'traffic'
  | 'car_spec_variance'
  | 'changing_conditions'

/**
 * A single, audited, bounded correction to a *component-level input*, never to a final rating.
 * `signedAdjustment` is applied on the internal 0–100 component scale, clamped to the smaller of
 * `[-maxAllowedMagnitude, +maxAllowedMagnitude]` and the methodology's system-wide
 * `tunables.maxManualAdjustmentMagnitude` — see `engine/manualReview.ts`. The SUM of all applied
 * adjustments for one component is separately clamped to
 * `tunables.maxCumulativeManualAdjustmentPerComponent`, so many small, individually-legal
 * adjustments cannot add up to a de facto large override.
 */
export interface ManualReviewAdjustment {
  id: string
  season: Season
  round: Round
  sessionType: SessionType
  driverId: DriverId
  affectedComponent: RatingComponent
  category: ManualReviewCategory
  signedAdjustment: number
  maxAllowedMagnitude: number
  reason: string
  source: string
  reviewer: string
  createdAt: string
  /**
   * Identifies the underlying real-world event this adjustment is about (e.g. a specific
   * `IncidentRecord.id`, or a stable id assigned to a documented strategy call). Two adjustments
   * for the same driver/component/round sharing a `sourceEventId` are treated as re-entries of
   * the same event — only the first is applied, the rest are ignored with a warning — so the
   * same contact/strategy call cannot be counted twice by accident.
   */
  sourceEventId: string
}

// ── Confidence / sampling ─────────────────────────────────────────────────

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface Confidence {
  level: ConfidenceLevel
  /** 0–1. */
  score: number
  sampleSize: number
  missingComponents: string[]
}

export interface MetricSample<T> {
  value: T
  sampleSize: number
}

// ── Reference ranges / methodology config ─────────────────────────────────

/**
 * A fixed, documented mapping window for a raw metric → internal 0–100 score.
 * Ranges are chosen from known plausible performance windows (e.g. teammate qualifying gap
 * rarely exceeds ±1.5% of lap time at the front of the field) and are NOT derived from the
 * current driver pool — this is what keeps scores stable when a new driver is added.
 * `higherIsBetter=false` means the raw value is inverted before mapping (e.g. lap-time deltas).
 */
export interface ReferenceRange {
  key: string
  min: number
  max: number
  higherIsBetter: boolean
  description: string
}

export type WeightsMap = Record<string, number>

export type CalibrationStatus = 'unverified' | 'calibrated'

export interface MethodologyVersion {
  id: string
  effectiveFrom: string
  description: string
  /**
   * Machine-readable calibration state — NOT a comment a future endpoint could ignore.
   * `'unverified'` means the reference ranges in this version are plausible-shaped placeholders
   * that have not been validated against real historical data (see `productionReady`).
   */
  calibrationStatus: CalibrationStatus
  /**
   * A production endpoint MUST check this before serving a rating computed under this
   * methodology version to a user — see `engine/weights.ts` `assertProductionReady`.
   * `false` for every version until a human explicitly flips it after calibration review;
   * there is no code path that sets this automatically.
   */
  productionReady: boolean
  minSampleSize: Record<string, number>
  speedWeights: WeightsMap
  precisionWeights: WeightsMap
  raceIqWeights: WeightsMap
  referenceRanges: Record<string, ReferenceRange>
  /** Affine map from internal 0–100 score to the public 70–99 UI scale. */
  finalScale: { min: number; max: number }
  /** Max age-in-laps difference for two stints to be considered tyre-comparable. */
  tyreAgeComparabilityThresholdLaps: number
  /**
   * Every other tunable constant the engine needs that isn't a per-metric weight or reference
   * range. Kept here — not as local `const` literals inside engine functions — so nothing in
   * `engine/` hardcodes a number that changes the model's behavior; bumping any of these is a
   * methodology-version-worthy change like any weight or reference range.
   */
  tunables: {
    /** Confidence score penalty per missing/excluded sub-metric (see `engine/confidence.ts`). */
    confidenceMissingPenaltyPerItem: number
    /** Upper bound on the total missing-component penalty, regardless of how many are missing. */
    confidenceMissingPenaltyCap: number
    /** Confidence score (0–1) at/above which a component is "high" confidence. */
    confidenceHighThreshold: number
    /** Confidence score (0–1) at/above which a component is "medium" confidence. */
    confidenceMediumThreshold: number
    /** Position-equivalent penalty applied to `startAndOpeningLapExecution` for an attributable lap-1 contact. */
    attributableLap1ContactPenaltyPositions: number
    /** Minimum clean laps in a stint before it counts toward `peakRepresentativePace`. */
    minCleanLapsForStintAverage: number
    /** Minimum clean laps in a stint before a degradation slope is trusted (`tyreStintManagement`). */
    minCleanLapsForDegradationSlope: number
    /**
     * System-wide ceiling on any single manual review adjustment's magnitude, enforced in
     * addition to (never above) each adjustment's own declared `maxAllowedMagnitude`. This is
     * what keeps "bounded" an engine-enforced guarantee rather than something a careless or
     * malicious adjustment record could self-declare away by setting a huge `maxAllowedMagnitude`.
     */
    maxManualAdjustmentMagnitude: number
    /**
     * System-wide ceiling on the SUM of all applied manual adjustments' deltas for one
     * component (post per-adjustment clamping, post deduplication). This is what stops many
     * individually-legal small adjustments from adding up to a large de facto override —
     * e.g. ten distinct +5 adjustments must still net out to at most this value.
     */
    maxCumulativeManualAdjustmentPerComponent: number
  }
}

// ── Component / final rating output ───────────────────────────────────────

export interface ComponentBreakdownItem {
  key: string
  rawValue: number | null
  normalizedValue: number | null
  weight: number
  /** Weight actually used after reweighting for missing components. */
  effectiveWeight: number
  contribution: number
  sampleSize: number
  confidence: Confidence
  excluded: boolean
  exclusionReason?: string
}

export interface ComponentScore {
  component: RatingComponent
  /** Internal 0–100 scale, pre manual-adjustment. Null if no metric had data. */
  internalScoreRaw: number | null
  /** Internal 0–100 scale, post manual-adjustment, pre final-scale mapping. */
  internalScoreAdjusted: number | null
  /** Public 70–99 UI scale. Null only when there is no usable data at all. */
  score: number | null
  confidence: Confidence
  breakdown: ComponentBreakdownItem[]
  appliedManualAdjustments: ManualReviewAdjustment[]
  warnings: string[]
}

export interface DriverRating {
  driverId: DriverId
  season: Season
  calculatedAfterRound: Round
  methodologyVersion: string
  generatedAt: string
  speed: ComponentScore
  precision: ComponentScore
  raceIq: ComponentScore
  warnings: string[]
  insufficientData: boolean
}
