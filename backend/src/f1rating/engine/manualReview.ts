import type { ManualReviewAdjustment, RatingComponent } from '../types'
import { clamp } from './normalize'

export interface ManualReviewApplication {
  adjustedScore: number
  appliedAdjustments: ManualReviewAdjustment[]
  ignoredAdjustments: { adjustment: ManualReviewAdjustment; reason: string }[]
  warnings: string[]
}

/**
 * Applies bounded manual-review adjustments on top of an internal 0–100 component score.
 * This is the ONLY function allowed to move a score based on human review, and it is
 * structurally incapable of overriding a final rating: it only ever adds a clamped delta to
 * the internal *component* score, and `ManualReviewAdjustment` (see types.ts) has no field
 * for a final-rating override — there is nothing here that could set `speed`/`precision`/
 * `raceIq` directly even by mistake.
 *
 * Three independent guards, each necessary on its own:
 *  1. Component match — an adjustment whose `affectedComponent` doesn't match `component` is
 *     ignored, not applied.
 *  2. Per-adjustment bound — each adjustment's magnitude is clamped to the SMALLER of its own
 *     declared `maxAllowedMagnitude` and the system-wide `maxSystemMagnitude`.
 *  3. Cumulative bound — the SUM of all applied (already per-item-clamped) deltas is itself
 *     clamped to `maxCumulativeMagnitude`, so many small, individually-legal adjustments cannot
 *     add up to a large de facto override ("ten disciplined +5s" cannot become a +50).
 * A fourth guard deduplicates by `sourceEventId`: two adjustments for the same component that
 * reference the same underlying event are re-entries, not independent evidence — only the
 * first is applied.
 */
export function applyManualAdjustments(
  baseInternalScore: number | null,
  adjustments: ManualReviewAdjustment[],
  component: RatingComponent,
  maxSystemMagnitude: number,
  maxCumulativeMagnitude: number,
): ManualReviewApplication {
  const applied: ManualReviewAdjustment[] = []
  const ignored: { adjustment: ManualReviewAdjustment; reason: string }[] = []
  const warnings: string[] = []
  const seenSourceEventIds = new Set<string>()

  let delta = 0
  for (const adj of adjustments) {
    if (adj.affectedComponent !== component) {
      ignored.push({ adjustment: adj, reason: `targets ${adj.affectedComponent}, not ${component}` })
      continue
    }
    if (seenSourceEventIds.has(adj.sourceEventId)) {
      ignored.push({
        adjustment: adj,
        reason: `duplicate sourceEventId "${adj.sourceEventId}" for component "${component}" — ` +
          `another adjustment for the same event was already applied`,
      })
      continue
    }
    seenSourceEventIds.add(adj.sourceEventId)

    const effectiveMax = Math.min(Math.abs(adj.maxAllowedMagnitude), Math.abs(maxSystemMagnitude))
    const bounded = clamp(adj.signedAdjustment, -effectiveMax, effectiveMax)
    if (bounded !== adj.signedAdjustment) {
      const cappedBy = Math.abs(adj.maxAllowedMagnitude) <= Math.abs(maxSystemMagnitude)
        ? 'its own maxAllowedMagnitude'
        : 'the system-wide maxManualAdjustmentMagnitude'
      warnings.push(
        `manual adjustment ${adj.id} clamped from ${adj.signedAdjustment} to ${bounded} (capped by ${cappedBy})`,
      )
    }
    delta += bounded
    applied.push(adj)
  }

  const cumulativeMax = Math.abs(maxCumulativeMagnitude)
  const cumulativeClampedDelta = clamp(delta, -cumulativeMax, cumulativeMax)
  if (cumulativeClampedDelta !== delta) {
    warnings.push(
      `cumulative manual adjustment for component "${component}" clamped from ${delta} to ` +
      `${cumulativeClampedDelta} (maxCumulativeManualAdjustmentPerComponent=${cumulativeMax}, ` +
      `${applied.length} adjustment(s) applied)`,
    )
  }

  const base = baseInternalScore ?? 0
  const adjustedScore = clamp(base + cumulativeClampedDelta, 0, 100)

  if (baseInternalScore === null && applied.length > 0) {
    warnings.push(
      `component "${component}" had no raw data but received ${applied.length} manual adjustment(s); ` +
      `adjusted score is manual-review-only and should be treated as low confidence`,
    )
  }

  return { adjustedScore, appliedAdjustments: applied, ignoredAdjustments: ignored, warnings }
}
