import type { MethodologyVersion, StintMetrics } from '../types'
import type { DriverSeasonInput, MetricResult } from './metrics'
import { areStintsTyreComparable } from './exclusions'
import { average } from './teammateRelative'

/**
 * REDESIGN NOTE (corrective iteration after real-data calibration)
 * --------------------------------------------------------------------
 * v1's original formula reported a driver's raw clean-lap degradation slope (ms/lap, from
 * `StintMetrics.degradationMsPerLap`, a linear regression over a single stint's clean laps) as
 * "tyre management". Running real 2025 data through it produced values as extreme as
 * -1449 ms/lap (laps getting dramatically FASTER over a stint) — physically impossible for pure
 * tyre wear. Per-lap investigation showed why: that raw slope conflates
 *   - genuine tyre degradation,
 *   - fuel burn-off (universal, present in every stint, every driver, every session),
 *   - track evolution (rubber laid down / track drying — the -1449 case was a wet stint on a
 *     drying track, i.e. almost pure track evolution, not tyre behavior at all), and
 *   - session-wide pace ramp-up.
 * Two teammates' raw slopes on comparable stints in the same session were often nearly
 * identical (e.g. one real round: -43.26 vs -52.42 ms/lap) — strong evidence the raw slope is
 * dominated by shared session-level effects, not driver-attributable tyre management skill.
 *
 * FIX: the metric now reports a TEAMMATE-RELATIVE delta (`driverSlope − teammateSlope`) computed
 * only on stint PAIRS that are genuinely comparable (same round, same dry session, same
 * compound, tyre-age window within `tyreAgeComparabilityThresholdLaps` — see
 * `areStintsTyreComparable`). Because both cars experience essentially the same fuel-burn curve
 * and track evolution within the same comparable-stint window, that shared noise mostly cancels
 * out of the delta, the same way every other teammate-relative metric in this engine cancels car
 * performance. If no comparable stint pair exists for a round, that round contributes nothing —
 * it is NOT approximated from a single driver's raw slope.
 *
 * The public component/weight key stays `tyreStintManagement` (see `config/methodologyV1.ts`),
 * but what it actually measures is closer to "relative tyre-stint pace evolution vs teammate on
 * matched stints" — the internal helper names below say `stintPaceEvolution` / `StintPairDelta`
 * to keep that semantic honest for anyone reading the code, per the corrective-iteration brief.
 */

export interface ComparableStintPairDelta {
  round: number
  driverStint: StintMetrics
  teammateStint: StintMetrics
  /** Raw linear-regression slope (ms/lap) for each driver's stint — kept for debugging/explainability only. */
  driverSlopeMsPerLap: number
  teammateSlopeMsPerLap: number
  /** driverSlope − teammateSlope. Negative = driver's pace held up relatively better than teammate's. */
  relativeDeltaMsPerLap: number
}

export interface StintPaceEvolutionExplain {
  pairs: ComparableStintPairDelta[]
  excludedRounds: { round: number; reason: string }[]
  rawValue: number | null
  sampleSize: number
  warnings: string[]
}

type Tunables = MethodologyVersion['tunables']

function eligibleDryStints(stints: StintMetrics[], minCleanLaps: number): StintMetrics[] {
  return stints.filter(s => s.trackCondition === 'dry' && s.cleanLapCount >= minCleanLaps && s.degradationMsPerLap !== null)
}

function tyreAge(s: StintMetrics): number {
  return s.endLap - s.startLap
}

/**
 * Picks the best teammate-stint match for `dStint` among `candidates` (already filtered to
 * unused + `areStintsTyreComparable`). This is what guarantees a 1:1 pairing rather than a
 * "first in array order" coincidence: if a driver stint is comparability-eligible against
 * MORE THAN ONE unused teammate stint (possible when strategies diverge — e.g. threshold=3
 * laps and the teammate ran two hard stints both within range), the closest starting tyre age
 * wins, then the closest clean-lap count, then the lowest stint number — fully deterministic,
 * never "whichever happened to come first".
 */
function pickClosestStint(dStint: StintMetrics, candidates: StintMetrics[]): StintMetrics {
  return [...candidates].sort((a, b) => {
    const ageDiffA = Math.abs(tyreAge(a) - tyreAge(dStint))
    const ageDiffB = Math.abs(tyreAge(b) - tyreAge(dStint))
    if (ageDiffA !== ageDiffB) return ageDiffA - ageDiffB
    const lapDiffA = Math.abs(a.cleanLapCount - dStint.cleanLapCount)
    const lapDiffB = Math.abs(b.cleanLapCount - dStint.cleanLapCount)
    if (lapDiffA !== lapDiffB) return lapDiffA - lapDiffB
    return a.stintNumber - b.stintNumber
  })[0]
}

/**
 * Pairs up comparable stints between a driver and their teammate, round by round, and returns
 * the full explainable breakdown: which pairs were found, which rounds had none and why, the
 * raw per-stint slopes behind each pair, and the resulting teammate-relative delta.
 */
export function explainStintPaceEvolution(
  driver: DriverSeasonInput,
  teammate: DriverSeasonInput,
  tunables: Tunables,
  tyreAgeComparabilityThresholdLaps: number,
): StintPaceEvolutionExplain {
  const pairs: ComparableStintPairDelta[] = []
  const excludedRounds: { round: number; reason: string }[] = []
  const teammateRaceByRound = new Map(teammate.race.map(r => [r.round, r]))

  for (const race of driver.race) {
    const teammateRace = teammateRaceByRound.get(race.round)
    if (!teammateRace) {
      excludedRounds.push({ round: race.round, reason: 'teammate has no race entry for this round' })
      continue
    }

    const driverStints = eligibleDryStints(race.stints, tunables.minCleanLapsForDegradationSlope)
    const teammateStints = eligibleDryStints(teammateRace.stints, tunables.minCleanLapsForDegradationSlope)

    const usedTeammateStints = new Set<number>()
    let foundPairThisRound = false
    // Driver stints are processed in chronological (stintNumber) order — combined with
    // `pickClosestStint`'s deterministic tie-break, this guarantees each teammate stint is
    // consumed by at most one driver stint (1:1), never a cartesian A↔A/A↔B/B↔A/B↔B expansion.
    for (const dStint of driverStints) {
      const candidates = teammateStints.filter(
        tStint => !usedTeammateStints.has(tStint.stintNumber) &&
          areStintsTyreComparable(dStint, tStint, tyreAgeComparabilityThresholdLaps),
      )
      if (candidates.length === 0) continue
      const match = pickClosestStint(dStint, candidates)
      usedTeammateStints.add(match.stintNumber)
      foundPairThisRound = true
      const driverSlope = dStint.degradationMsPerLap as number
      const teammateSlope = match.degradationMsPerLap as number
      pairs.push({
        round: race.round,
        driverStint: dStint,
        teammateStint: match,
        driverSlopeMsPerLap: driverSlope,
        teammateSlopeMsPerLap: teammateSlope,
        relativeDeltaMsPerLap: driverSlope - teammateSlope,
      })
    }
    if (!foundPairThisRound) {
      excludedRounds.push({
        round: race.round,
        reason: driverStints.length === 0 || teammateStints.length === 0
          ? 'no eligible dry stint (insufficient clean laps) for driver and/or teammate'
          : 'no dry stint pair matched on compound + tyre-age window (areStintsTyreComparable)',
      })
    }
  }

  const deltas = pairs.map(p => p.relativeDeltaMsPerLap)
  const rawValue = average(deltas)
  const warnings: string[] = []
  if (pairs.length === 0) {
    warnings.push('no comparable stint pairs found across any round — tyreStintManagement is unmeasured (null), not zero')
  }

  return { pairs, excludedRounds, rawValue, sampleSize: pairs.length, warnings }
}

export function tyreStintManagement(
  driver: DriverSeasonInput,
  teammate: DriverSeasonInput,
  tunables: Tunables,
  tyreAgeComparabilityThresholdLaps: number,
): MetricResult {
  const explain = explainStintPaceEvolution(driver, teammate, tunables, tyreAgeComparabilityThresholdLaps)
  return { rawValue: explain.rawValue, sampleSize: explain.sampleSize }
}
