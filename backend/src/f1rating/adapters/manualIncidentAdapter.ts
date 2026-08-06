import type {
  DnfCause, DnfRecord, DriverId, IncidentRecord, IncidentType, ManualReviewAdjustment,
  ManualReviewCategory, RatingComponent, Round, Season, SessionType,
} from '../types'

/**
 * Boundary for FIA documents / manually reviewed incident records. There is no FIA structured
 * data feed to poll — these records are expected to be entered by a human reviewer (e.g. from
 * FIA stewards' decisions or race-control documents) through whatever future admin surface the
 * app adds; this module only defines the input shape and construction rules, not a UI.
 */

export interface RawIncidentInput {
  id: string
  season: Season
  round: Round
  driverId: string
  type: IncidentType
  attributable: boolean
  description: string
  source: string
}

export function buildIncidentRecord(input: RawIncidentInput): IncidentRecord {
  return { ...input, driverId: input.driverId as DriverId }
}

export interface RawDnfInput {
  id: string
  season: Season
  round: Round
  driverId: string
  cause: DnfCause
  lapNumber: number | null
  notes?: string
}

/**
 * The only way to construct a `DnfRecord`. `driverAttributable` is derived from `cause` here,
 * never accepted as a caller-supplied field — this is what makes the "technical DNF never
 * reduces driver-attributable reliability" invariant structurally true rather than a convention
 * that could be violated at a call site.
 */
export function buildDnfRecord(input: RawDnfInput): DnfRecord {
  const driverAttributable = input.cause === 'driver_error' || input.cause === 'contact_at_fault'
  return { ...input, driverId: input.driverId as DriverId, driverAttributable }
}

export interface RawManualReviewInput {
  id: string
  season: Season
  round: Round
  sessionType: SessionType
  driverId: string
  affectedComponent: RatingComponent
  category: ManualReviewCategory
  signedAdjustment: number
  maxAllowedMagnitude: number
  reason: string
  source: string
  reviewer: string
  createdAt: string
  /** See `ManualReviewAdjustment.sourceEventId` in types.ts — used to dedupe re-entries of the same event. */
  sourceEventId: string
}

/**
 * Constructs a `ManualReviewAdjustment`. Validates the auditable fields are present and that
 * the requested adjustment is at least internally consistent (magnitude bound is non-negative);
 * the actual clamping to `maxAllowedMagnitude` happens at apply-time in `engine/manualReview.ts`,
 * not here, so a record always preserves what was originally requested for audit purposes.
 */
export function buildManualReviewAdjustment(input: RawManualReviewInput): ManualReviewAdjustment {
  if (input.maxAllowedMagnitude < 0) {
    throw new Error(`[f1rating] manual review adjustment ${input.id}: maxAllowedMagnitude must be >= 0`)
  }
  if (!input.reason.trim()) {
    throw new Error(`[f1rating] manual review adjustment ${input.id}: reason is required`)
  }
  if (!input.sourceEventId.trim()) {
    throw new Error(`[f1rating] manual review adjustment ${input.id}: sourceEventId is required (for duplicate detection)`)
  }
  if (!input.source.trim() || !input.reviewer.trim()) {
    throw new Error(`[f1rating] manual review adjustment ${input.id}: source and reviewer are required for audit`)
  }
  return { ...input, driverId: input.driverId as DriverId }
}
