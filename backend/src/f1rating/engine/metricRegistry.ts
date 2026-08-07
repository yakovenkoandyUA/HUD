import type { MethodologyVersion } from '../types'

/**
 * Canonical list of MIMIR F1 submetrics — the SINGLE source of truth for "how many metrics
 * exist" across the whole calibration/grid/stability/report pipeline. Derived from
 * `methodology.referenceRanges`, which every scored submetric MUST appear in (`aggregateComponent`
 * throws if a weight key has no matching metric result — see engine/aggregate.ts), so this can
 * never silently diverge from what the engine actually scores. Nothing downstream should
 * hand-maintain a second, separately-typed-in list of metric names — that duplication is exactly
 * what let `documentedStrategicExecution` go missing from the grid-wide dataset tooling
 * (`dataset/gridRatings.ts` had its own literal array that simply never included it) while the
 * core per-driver engine (engine/index.ts) scored it correctly the whole time.
 */
export function getCanonicalMetricKeys(methodology: MethodologyVersion): string[] {
  return Object.keys(methodology.referenceRanges)
}

export type MetricState = 'observed' | 'no-signal' | 'insufficient-data' | 'excluded'

export interface MetricStateEntry {
  key: string
  state: MetricState
  sampleSize: number
  note: string
}

/**
 * Metrics whose engine function is STRUCTURALLY no-signal in v1 — the function unconditionally
 * returns `NO_DATA` regardless of input, because the incident/manual-review data source it would
 * need does not exist anywhere in this pipeline yet (see each function's doc comment in
 * `engine/metrics.ts`). This is what makes a metric's 'no-signal' classification below permanent
 * and principled, not an artifact of "this particular dataset run happened to have n=0" — that
 * latter case (e.g. `resultRelativeToExpectedPace`, whose formula is real but whose one required
 * input — `expectedFinishPosition` — is always `null` because no expected-pace model is wired
 * into the adapter yet) is classified 'insufficient-data' instead: a data-availability gap, not a
 * structural absence of the metric's definition.
 */
export const STRUCTURAL_NO_SIGNAL_METRIC_KEYS: readonly string[] = [
  'cleanWeekendRate', 'driverAttributableReliability', 'unforcedErrorControl', 'documentedStrategicExecution',
]

export function classifyMetricState(key: string, sampleSize: number): MetricState {
  if (STRUCTURAL_NO_SIGNAL_METRIC_KEYS.includes(key)) return 'no-signal'
  if (sampleSize === 0) return 'insufficient-data'
  return 'observed'
}

/**
 * Builds one state entry per canonical metric key — always exactly `getCanonicalMetricKeys(...).length`
 * entries, one state each. `sampleSizeByKey` is expected to come from the SAME sample bank used to
 * build calibration candidate ranges (e.g. `bank[key].length` in `dataset/gridRatings.ts`), so the
 * state report and the candidate ranges report can never disagree about how many real samples a
 * metric had.
 */
export function buildMetricStateReport(
  methodology: MethodologyVersion,
  sampleSizeByKey: Record<string, number>,
): MetricStateEntry[] {
  const keys = getCanonicalMetricKeys(methodology)
  return keys.map(key => {
    const sampleSize = sampleSizeByKey[key] ?? 0
    const state = classifyMetricState(key, sampleSize)
    const note =
      state === 'no-signal'
        ? 'structurally no-signal in v1 — no connected incident/manual-review data source (see engine/metrics.ts)'
        : state === 'insufficient-data'
          ? 'zero real samples in this dataset run (data-availability gap, not a structural absence)'
          : `n=${sampleSize} real samples observed`
    return { key, state, sampleSize, note }
  })
}

export interface MetricStateTotals {
  totalMetrics: number
  observedMetrics: number
  noSignalMetrics: number
  insufficientDataMetrics: number
  excludedMetrics: number
}

export function summarizeMetricStates(entries: MetricStateEntry[]): MetricStateTotals {
  return {
    totalMetrics: entries.length,
    observedMetrics: entries.filter(e => e.state === 'observed').length,
    noSignalMetrics: entries.filter(e => e.state === 'no-signal').length,
    insufficientDataMetrics: entries.filter(e => e.state === 'insufficient-data').length,
    excludedMetrics: entries.filter(e => e.state === 'excluded').length,
  }
}

/**
 * Fails LOUDLY (throws) if the state report and the canonical registry disagree — a metric can
 * never be silently dropped (missing from `entries`) or silently double-counted (appearing
 * twice). `expectedTotal` should always be `getCanonicalMetricKeys(methodology).length` (15 for
 * `mimir-f1-v1`/`mimir-f1-v2-candidate`, since the candidate inherits the same reference-range
 * key set — see `dataset/candidateMethodology.ts`).
 */
export function assertMetricStateInvariant(entries: MetricStateEntry[], expectedTotal: number): void {
  const keys = entries.map(e => e.key)
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const k of keys) {
    if (seen.has(k)) duplicates.add(k)
    seen.add(k)
  }
  if (duplicates.size > 0) {
    throw new Error(`[f1rating] metric state report has duplicate key(s): ${[...duplicates].join(', ')}`)
  }
  if (keys.length !== expectedTotal) {
    const totals = summarizeMetricStates(entries)
    throw new Error(
      `[f1rating] metric state report has ${keys.length} entries, expected exactly ${expectedTotal} ` +
      `(observed=${totals.observedMetrics}, noSignal=${totals.noSignalMetrics}, ` +
      `insufficientData=${totals.insufficientDataMetrics}, excluded=${totals.excludedMetrics})`,
    )
  }
}
