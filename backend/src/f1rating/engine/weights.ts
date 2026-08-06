import type { MethodologyVersion, WeightsMap } from '../types'

const TOLERANCE = 1e-6

/**
 * Throws if the weights in a weight map do not sum to 1 (within floating-point tolerance).
 * Called at config module load time so a misconfigured methodology version fails fast,
 * and exported for direct unit testing.
 */
export function assertWeightsSumToOne(weights: WeightsMap, label: string): void {
  const sum = Object.values(weights).reduce((acc, w) => acc + w, 0)
  if (Math.abs(sum - 1) > TOLERANCE) {
    throw new Error(`[f1rating] weight map "${label}" sums to ${sum}, expected 1`)
  }
}

export function sumWeights(weights: WeightsMap): number {
  return Object.values(weights).reduce((acc, w) => acc + w, 0)
}

/**
 * Guard for any future production entrypoint (API route, scheduled job) that would serve a
 * `DriverRating` to a user. Throws unless the methodology has been explicitly marked
 * `productionReady: true` by a human after a calibration review — `computeDriverRating` itself
 * does NOT call this (it must keep working for calibration/testing against an unverified
 * methodology), so callers that expose ratings outside internal tooling must call it themselves.
 */
export function assertProductionReady(methodology: MethodologyVersion): void {
  if (!methodology.productionReady) {
    throw new Error(
      `[f1rating] methodology "${methodology.id}" is not productionReady ` +
      `(calibrationStatus="${methodology.calibrationStatus}") — refusing to serve a rating computed with it`,
    )
  }
}
