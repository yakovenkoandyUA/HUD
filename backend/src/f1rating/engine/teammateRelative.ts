/**
 * Percentage gap of `driverValue` relative to `teammateValue` (e.g. lap times in ms).
 * Negative = driver is faster/better than the teammate on this metric. This is the core
 * primitive behind every "teammate-adjusted" sub-metric — see module doc in `types.ts` for why
 * these are weighted most heavily.
 */
export function teammatePercentGap(driverValue: number, teammateValue: number): number | null {
  if (teammateValue === 0) return null
  return ((driverValue - teammateValue) / teammateValue) * 100
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

export function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = average(values)
  if (mean === null) return null
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** Coefficient of variation as a percentage — used for lap-time consistency metrics. */
export function coefficientOfVariationPct(values: number[]): number | null {
  const mean = average(values)
  const stdDev = standardDeviation(values)
  if (mean === null || stdDev === null || mean === 0) return null
  return (stdDev / mean) * 100
}
