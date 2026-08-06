import type { ReferenceRange } from '../types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Maps a raw metric value into a fixed internal 0–100 scale using a documented reference range
 * (see `config/methodologyV1.ts`). Deliberately NOT a min-max normalization over the current
 * driver pool — the range is fixed config, so adding a new driver never rewrites another
 * driver's normalized value.
 */
export function normalizeToReferenceRange(rawValue: number, range: ReferenceRange): number {
  const clamped = clamp(rawValue, range.min, range.max)
  const fraction = range.max === range.min ? 1 : (clamped - range.min) / (range.max - range.min)
  const internal = range.higherIsBetter ? fraction * 100 : (1 - fraction) * 100
  return clamp(internal, 0, 100)
}

/**
 * Affine map from the internal 0–100 scale to the public UI scale (70–99 for methodology v1).
 * Deterministic and pool-independent, like `normalizeToReferenceRange`.
 *
 * WHAT 70–99 MEANS — READ BEFORE CHANGING OR DISPLAYING THIS NUMBER
 * ---------------------------------------------------------------------
 * `finalScale.min` (70) is the FLOOR of a rating scale calibrated around the current F1 grid —
 * i.e. every driver on the grid is already a top-tier professional, so the scale expresses
 * *relative standing among active F1 drivers*, not an absolute 0–100 "how good is this human at
 * driving" score. An internal score of exactly 0 (the worst end of every reference range) still
 * legitimately maps to 70 by construction — that is NOT a "passing grade", NOT a neutral/default
 * value, and NOT evidence of a bug. Do not "fix" this by shifting the floor, and do not let a
 * future feature treat 70 as a meaningful baseline (e.g. "70 = average") — it isn't one; it is
 * simply where this affine map bottoms out. If the intended meaning of the scale ever changes,
 * that is a `finalScale` change and therefore a new methodology version (see the version-bump
 * rule in `config/methodologyV1.ts`), not a silent edit here.
 */
export function mapInternalToFinalScale(internalScore: number, finalScale: { min: number; max: number }): number {
  const clampedInternal = clamp(internalScore, 0, 100)
  const raw = finalScale.min + (clampedInternal / 100) * (finalScale.max - finalScale.min)
  return Math.round(clamp(raw, finalScale.min, finalScale.max))
}
