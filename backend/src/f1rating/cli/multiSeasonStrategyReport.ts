/**
 * Multi-season calibration STRATEGY comparison — compares three candidate calibration
 * architectures on the SAME real raw metric samples, after the 2023-2025 pairwise stability
 * analysis (cli/stabilityReport.ts) showed the intersection of cross-season-stable fixed reference
 * ranges is EMPTY (0 of 15 metrics survive all three pairwise comparisons):
 *
 *   A. current fixed-range approach (methodologyV1.referenceRanges, unchanged)
 *   B. pooled 2023+2024+2025 robust global ranges (dataset/multiSeasonPool.ts)
 *   C. season-normalized robust-z / percentile-rank scoring (dataset/seasonNormalization.ts)
 *
 * For each of the 15 canonical metrics, recommends ONE of: fixed / pooled / season-normalized /
 * insufficient-data / manual-only / investigate — never forces the same strategy onto every
 * metric. EXPERIMENTAL, read-only analysis: never mutates methodologyV1, never sets
 * productionReady=true, never touches UI/API, never writes to a database.
 *
 * Usage:
 *   npm run f1rating:multi-season -- \
 *     --dataset 2023:22:../scripts/f1rating-collector/output_grid_2023 \
 *     --dataset 2024:24:../scripts/f1rating-collector/output_grid_2024 \
 *     --dataset 2025:24:../scripts/f1rating-collector/output_grid_full \
 *     --out ../scripts/f1rating-collector/output_grid_full/reports/multi-season-strategy-report.json
 */
import * as fs from 'fs'
import * as path from 'path'
import { methodologyV1 } from '../config/methodologyV1'
import { computeGridRatings, METRIC_KEYS, type SampleBank } from '../dataset/gridRatings'
import { getCanonicalMetricKeys } from '../engine/metricRegistry'
import { buildCandidateRange, computeDistributionStats } from '../engine/calibrationCandidates'
import { compareCandidateRangeSets, applyStabilityGate, DEFAULT_STABILITY_THRESHOLDS } from '../dataset/stabilityAnalysis'
import { poolSamplesForMetric, groupSamplesBySeason, computePooledMetricStats, type SeasonBank } from '../dataset/multiSeasonPool'
import {
  computeSeasonMedianMad, seasonRobustZScore, DEFAULT_SEASON_NORM_PARAMS,
} from '../dataset/seasonNormalization'
import { classifyNormalizationEligibility, DEFAULT_ELIGIBILITY_THRESHOLDS, type NormalizationStrategy } from '../dataset/normalizationEligibility'
import { summarizeSeasonScores, assessAllPairwiseAlignments, DEFAULT_ALIGNMENT_THRESHOLDS } from '../dataset/normalizedAlignment'
import { recommendStrategy, type FinalRecommendation } from '../dataset/strategyRecommendation'

interface DatasetSpec { season: number; totalRounds: number; dir: string }

function parseArgs(): { datasets: DatasetSpec[]; out: string } {
  const args = process.argv.slice(2)
  const datasets: DatasetSpec[] = []
  let out = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dataset' && args[i + 1]) {
      const [season, totalRounds, dir] = args[i + 1].split(':')
      datasets.push({ season: Number(season), totalRounds: Number(totalRounds), dir })
      i++
    } else if (args[i] === '--out' && args[i + 1]) {
      out = args[i + 1]
      i++
    }
  }
  if (datasets.length < 2) {
    console.error('Usage: --dataset <season>:<totalRounds>:<dir> (repeatable, 2+) --out <file>')
    process.exit(1)
  }
  return { datasets, out: out || path.join(datasets[datasets.length - 1].dir, 'reports', 'multi-season-strategy-report.json') }
}

interface MetricStrategyResult {
  metric: string
  eligibility: { strategy: NormalizationStrategy; nTotal: number; nBySeason: Record<number, number>; note: string }
  strategyA_fixed: {
    perSeasonRecommendation: Record<number, string>
    allPairsStable: boolean
    acceptedAfterGate: boolean
  }
  strategyB_pooled: {
    nTotal: number
    recommendation: string
    saturationBefore: number
    saturationAfter: number
  } | null
  strategyC_seasonNormalized: {
    seasonsNormalized: number[]
    alignment: ReturnType<typeof assessAllPairwiseAlignments>
    allAligned: boolean
  } | null
  finalRecommendation: FinalRecommendation
  reasoning: string
}

function recommend(
  eligibilityStrategy: NormalizationStrategy,
  strategyAAllStable: boolean,
  strategyCAllAligned: boolean | null,
): { finalRecommendation: FinalRecommendation; reasoning: string } {
  if (eligibilityStrategy === 'manual-source-required') {
    return { finalRecommendation: 'manual-only', reasoning: 'structurally no-signal in v1 — no amount of collection/normalization changes this until an incident/FIA source exists' }
  }
  if (eligibilityStrategy === 'insufficient-signal') {
    return { finalRecommendation: 'insufficient-data', reasoning: 'total pooled sample across all seasons is still below the usable floor' }
  }
  if (strategyAAllStable) {
    return { finalRecommendation: 'fixed', reasoning: 'fixed reference range is ALREADY stable across every pairwise season comparison — no need for a more complex strategy' }
  }
  if (eligibilityStrategy === 'season-normalized' && strategyCAllAligned) {
    return { finalRecommendation: 'season-normalized', reasoning: 'fixed range is unstable across seasons, but season-normalized scores align well across seasons (comparable spread/tails after normalization)' }
  }
  if (eligibilityStrategy === 'season-normalized' && strategyCAllAligned === false) {
    return { finalRecommendation: 'investigate', reasoning: 'fixed range is unstable AND season-normalized scores still do not align across seasons — the drift may not be a simple scale issue; needs manual investigation before any strategy is trusted' }
  }
  return { finalRecommendation: 'pooled', reasoning: 'fixed range is unstable and season-normalization is not eligible (insufficient per-season sample), but pooled sample is usable — pooled range is the least-bad available option, though NOT validated as bias-free' }
}

function main(): void {
  const { datasets, out } = parseArgs()

  const seasonBanks: SeasonBank[] = []
  const perSeasonReferenceCandidates: Record<number, Record<string, ReturnType<typeof buildCandidateRange>>> = {}

  for (const spec of datasets) {
    console.log(`Loading ${spec.season} from ${spec.dir} (totalRounds=${spec.totalRounds})...`)
    const grid = computeGridRatings(spec.dir, methodologyV1, spec.totalRounds)
    seasonBanks.push({ season: spec.season, bank: grid.bank })

    const teamCount = grid.manifest.teams.length
    const driverCount = grid.manifest.drivers.length
    const roundCount = grid.manifest.includedRounds.length
    const candidates: Record<string, ReturnType<typeof buildCandidateRange>> = {}
    for (const key of METRIC_KEYS) {
      const values = grid.bank[key].map(s => s.value)
      candidates[key] = buildCandidateRange({
        values, range: methodologyV1.referenceRanges[key], teamCount, driverCount, roundCount,
        forceInvestigate: key === 'tyreStintManagement',
        note: `${spec.season} season, ${teamCount} teams, ${driverCount} drivers, ${roundCount} rounds`,
      })
    }
    perSeasonReferenceCandidates[spec.season] = candidates
  }

  const canonicalKeys = getCanonicalMetricKeys(methodologyV1)
  const results: MetricStrategyResult[] = []

  for (const metric of canonicalKeys) {
    // --- Strategy A: fixed, all pairwise season comparisons ---
    const seasons = datasets.map(d => d.season)
    const pairStabilities: { pair: string; stable: boolean }[] = []
    for (let i = 0; i < seasons.length; i++) {
      for (let j = i + 1; j < seasons.length; j++) {
        const a = { [metric]: perSeasonReferenceCandidates[seasons[i]][metric] }
        const b = { [metric]: perSeasonReferenceCandidates[seasons[j]][metric] }
        const cmp = compareCandidateRangeSets(a, b, DEFAULT_STABILITY_THRESHOLDS)
        pairStabilities.push({ pair: `${seasons[i]}-${seasons[j]}`, stable: cmp[metric]?.classification === 'stable' })
      }
    }
    const allPairsStable = pairStabilities.length > 0 && pairStabilities.every(p => p.stable)
    const perSeasonRecommendation: Record<number, string> = {}
    for (const season of seasons) perSeasonRecommendation[season] = perSeasonReferenceCandidates[season][metric].recommendation

    // --- Pooling to determine eligibility + strategy B ---
    const pooledSamples = poolSamplesForMetric(seasonBanks, metric)
    const pooledStats = computePooledMetricStats(metric, pooledSamples, methodologyV1.referenceRanges[metric], Math.max(...datasets.map(d => d.totalRounds)))
    const eligibility = classifyNormalizationEligibility(metric, pooledStats.nBySeason, DEFAULT_ELIGIBILITY_THRESHOLDS)

    const strategyB_pooled = pooledStats.nTotal > 0 ? {
      nTotal: pooledStats.nTotal,
      recommendation: pooledStats.pooledCandidateRange.recommendation,
      saturationBefore: pooledStats.pooledCandidateRange.saturationBefore,
      saturationAfter: pooledStats.pooledCandidateRange.saturationAfter,
    } : null

    // --- Strategy C: season-normalized, only for eligible metrics ---
    let strategyC_seasonNormalized: MetricStrategyResult['strategyC_seasonNormalized'] = null
    let strategyCAllAligned: boolean | null = null
    if (eligibility.strategy === 'season-normalized') {
      const bySeason = groupSamplesBySeason(pooledSamples)
      const higherIsBetter = methodologyV1.referenceRanges[metric].higherIsBetter
      const seasonMedianMads = Object.entries(bySeason)
        .map(([season, samples]) => computeSeasonMedianMad(Number(season), samples))
        .filter((s): s is NonNullable<typeof s> => s !== null && s.n >= DEFAULT_SEASON_NORM_PARAMS.minSeasonSampleSize)

      const normalizedScoresBySeason: Record<number, number[]> = {}
      for (const seasonStats of seasonMedianMads) {
        const samples = bySeason[seasonStats.season]
        const scores = samples
          .map(s => seasonRobustZScore(s.value, seasonStats, higherIsBetter))
          .filter((s): s is number => s !== null)
        normalizedScoresBySeason[seasonStats.season] = scores
      }
      const summaries = Object.entries(normalizedScoresBySeason).map(([season, scores]) => summarizeSeasonScores(Number(season), scores))
      const alignment = assessAllPairwiseAlignments(summaries, DEFAULT_ALIGNMENT_THRESHOLDS)
      strategyCAllAligned = alignment.length > 0 && alignment.every(a => a.aligned)
      strategyC_seasonNormalized = {
        seasonsNormalized: seasonMedianMads.map(s => s.season), alignment, allAligned: strategyCAllAligned,
      }
    }

    const { finalRecommendation, reasoning } = recommend(eligibility.strategy, allPairsStable, strategyCAllAligned)

    results.push({
      metric,
      eligibility: { strategy: eligibility.strategy, nTotal: eligibility.nTotal, nBySeason: eligibility.nBySeason, note: eligibility.note },
      strategyA_fixed: { perSeasonRecommendation, allPairsStable, acceptedAfterGate: false },
      strategyB_pooled,
      strategyC_seasonNormalized,
      finalRecommendation,
      reasoning,
    })
  }

  console.log('\n=== Per-metric strategy recommendation ===')
  for (const r of results) {
    console.log(`${r.metric.padEnd(32)} -> ${r.finalRecommendation.padEnd(18)} (${r.eligibility.strategy}, fixedStable=${r.strategyA_fixed.allPairsStable})`)
  }

  const counts: Record<FinalRecommendation, number> = {
    fixed: 0, pooled: 0, 'season-normalized': 0, 'insufficient-data': 0, 'manual-only': 0, investigate: 0,
  }
  for (const r of results) counts[r.finalRecommendation]++
  console.log('\n=== Summary ===')
  console.log(counts)

  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({
    generatedAt: new Date().toISOString(),
    datasets: datasets.map(d => ({ season: d.season, totalRounds: d.totalRounds })),
    thresholds: {
      stability: DEFAULT_STABILITY_THRESHOLDS, eligibility: DEFAULT_ELIGIBILITY_THRESHOLDS,
      normalization: DEFAULT_SEASON_NORM_PARAMS, alignment: DEFAULT_ALIGNMENT_THRESHOLDS,
    },
    results,
    summary: counts,
  }, null, 2))
  console.log(`\nWrote ${out}`)
}

main()
