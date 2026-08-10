import type { DriverId, ConstructorId, RawQualifyingMetrics, RawRaceMetrics, Round, Season } from '../types'
import type { DriverSeasonInput } from '../engine/metrics'
import { seasonRoundKey } from '../engine/seasonRoundKey'

/**
 * Per-event teammate resolution — the foundation grid-wide calibration is built on. Never
 * assumes a driver's teammate is fixed for a season: every round is resolved independently from
 * that round's actual roster, so driver substitutions and mid-season team switches are handled
 * correctly without any hardcoded schedule of "who drove for whom when".
 */

export interface RosterEntry {
  driverId: DriverId
  constructorId: ConstructorId
}

export interface TeammateResolution {
  driverId: DriverId
  constructorId: ConstructorId
  teammateId: DriverId | null
  reason?: string
}

/**
 * Resolves teammate pairs from a single session/round's roster. Deterministic: the >2-drivers
 * anomaly branch (which should never happen in real F1 — each constructor fields exactly 2 cars
 * per session — but is handled rather than assumed away) sorts by `driverId` before pairing, so
 * re-running on the same roster always produces the same pairing.
 */
export function resolveTeammates(roster: RosterEntry[]): TeammateResolution[] {
  const byConstructor = new Map<ConstructorId, RosterEntry[]>()
  for (const entry of roster) {
    const list = byConstructor.get(entry.constructorId) ?? []
    list.push(entry)
    byConstructor.set(entry.constructorId, list)
  }

  const result: TeammateResolution[] = []
  for (const [constructorId, entries] of byConstructor) {
    if (entries.length === 1) {
      result.push({
        driverId: entries[0].driverId, constructorId, teammateId: null,
        reason: 'only one driver from this constructor has valid data in this session',
      })
      continue
    }
    if (entries.length === 2) {
      result.push({ driverId: entries[0].driverId, constructorId, teammateId: entries[1].driverId })
      result.push({ driverId: entries[1].driverId, constructorId, teammateId: entries[0].driverId })
      continue
    }
    // Anomalous (>2 drivers from one constructor in one session) — should not happen in real F1,
    // but resolved deterministically rather than assumed away or thrown on.
    const sorted = [...entries].sort((a, b) => a.driverId.localeCompare(b.driverId))
    const reason = `anomalous roster size ${entries.length} for constructor "${constructorId}" in this session`
    result.push({ driverId: sorted[0].driverId, constructorId, teammateId: sorted[1].driverId, reason })
    result.push({ driverId: sorted[1].driverId, constructorId, teammateId: sorted[0].driverId, reason })
    for (const extra of sorted.slice(2)) {
      result.push({ driverId: extra.driverId, constructorId, teammateId: null, reason: `${reason} — excluded from pairing` })
    }
  }
  return result
}

export interface CompositeTeammateInput {
  driverSeasonInput: DriverSeasonInput
  /** (season, round) key -> which real driverId actually supplied that round's teammate data
   * (audit trail). Keyed via `seasonRoundKey` — see that module for why a bare round number is
   * never a safe map key here. */
  teammateByRound: Map<string, DriverId>
  /** Rounds `driverId` raced in but had no resolvable teammate (single-driver-only that
   * session). Season-tagged so multi-season callers can't misattribute a gap to the wrong year. */
  roundsWithoutTeammate: { season: Season; round: Round }[]
}

/**
 * Builds a synthetic "teammate" `DriverSeasonInput` for `driverId` by pulling, ROUND BY ROUND,
 * whichever real driver was actually their teammate that round (per `rosterByRound`). This is
 * what lets the existing engine (`computeDriverRating`, which takes one `teammate` argument)
 * handle a season with substitutions correctly WITHOUT any change to its API or metric
 * functions — from the engine's point of view it is just "the teammate's data for round N";
 * this function is the only place that knows those per-round entries may come from different
 * real people. A round with no resolvable teammate (single-driver-only, or the constructor
 * fielding only one classified driver that session) is simply omitted from the composite — the
 * engine's existing round-matching (`byRound`) then correctly treats it as missing data, which
 * lowers confidence rather than fabricating a comparison.
 */
export function buildCompositeTeammateInput(
  driverId: DriverId,
  allDrivers: Map<DriverId, DriverSeasonInput>,
  rosterByRound: Map<string, RosterEntry[]>,
): CompositeTeammateInput {
  const driver = allDrivers.get(driverId)
  const qualifying: RawQualifyingMetrics[] = []
  const race: RawRaceMetrics[] = []
  const teammateByRound = new Map<string, DriverId>()
  const roundsWithoutTeammate: { season: Season; round: Round }[] = []

  // Deduplicated by (season, round) key, but the VALUE carries the real season+round pair — a
  // bare `Set<Round>` would collapse round 1 of every season into one entry.
  const seasonRounds = new Map<string, { season: Season; round: Round }>()
  for (const q of driver?.qualifying ?? []) seasonRounds.set(seasonRoundKey(q.season, q.round), { season: q.season, round: q.round })
  for (const r of driver?.race ?? []) seasonRounds.set(seasonRoundKey(r.season, r.round), { season: r.season, round: r.round })

  for (const [key, { season, round }] of seasonRounds) {
    const roster = rosterByRound.get(key) ?? []
    const resolutions = resolveTeammates(roster)
    const mine = resolutions.find(r => r.driverId === driverId)
    if (!mine || !mine.teammateId) {
      roundsWithoutTeammate.push({ season, round })
      continue
    }
    const teammateDriver = allDrivers.get(mine.teammateId)
    if (!teammateDriver) {
      roundsWithoutTeammate.push({ season, round })
      continue
    }
    const teammateQ = teammateDriver.qualifying.find(q => q.season === season && q.round === round)
    const teammateR = teammateDriver.race.find(r => r.season === season && r.round === round)
    if (teammateQ) qualifying.push(teammateQ)
    if (teammateR) race.push(teammateR)
    if (teammateQ || teammateR) teammateByRound.set(key, mine.teammateId)
  }

  return {
    driverSeasonInput: { driverId: `${driverId}__composite-teammate`, qualifying, race, dnfs: [], incidents: [] },
    teammateByRound,
    roundsWithoutTeammate,
  }
}
