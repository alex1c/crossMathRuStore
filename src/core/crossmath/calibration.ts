import { generatePuzzleForProfile, getDifficultyProfile } from './profiles'
import { validatePuzzle } from './validator'
import type {
	CalibrationProfileSummary,
	DifficultyMetrics,
	DifficultyTier,
	GenerationProfile,
} from './types'

type NumericMetricSelector = (metrics: DifficultyMetrics) => number

const METRIC_SELECTORS: Readonly<Record<string, NumericMetricSelector>> = {
	blankCount: (metrics) => metrics.blankCount,
	equationCount: (metrics) => metrics.equationCount,
	crossingCount: (metrics) => metrics.crossingCount,
	initialForcedCells: (metrics) => metrics.initialForcedCells,
	propagationWaves: (metrics) => metrics.propagationWaves,
	longestForcedChain: (metrics) => metrics.longestForcedChain,
	averageCandidatesBeforeResolution: (metrics) => metrics.averageCandidatesBeforeResolution,
	maxCandidatesBeforeResolution: (metrics) => metrics.maxCandidatesBeforeResolution,
	ambiguityMoments: (metrics) => metrics.ambiguityMoments,
	choiceWaves: (metrics) => metrics.choiceWaves,
	solverBranches: (metrics) => metrics.solverBranches,
	solverNodes: (metrics) => metrics.solverNodes,
	solverMaxDepth: (metrics) => metrics.solverMaxDepth,
	multiplicationFrequency: (metrics) => metrics.multiplicationFrequency,
	divisionFrequency: (metrics) => metrics.divisionFrequency,
}

function average(values: readonly number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values: readonly number[]): number {
	if (values.length === 0) {
		return 0
	}
	const sorted = [...values].sort((left, right) => left - right)
	const middle = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle]
}

export function calibrateDifficultyProfile(
	tier: DifficultyTier,
	options: {
		readonly acceptedTarget?: number
		readonly maxSeedAttempts?: number
		readonly seedPrefix?: string
		readonly profile?: GenerationProfile
	} = {},
): CalibrationProfileSummary {
	const target = options.acceptedTarget ?? 1_000
	const maxSeedAttempts = options.maxSeedAttempts ?? target * 3
	const profile = options.profile ?? getDifficultyProfile(tier)
	const seedPrefix = options.seedPrefix ?? 'phase2-calibration'
	const observations = new Map<string, number[]>()
	for (const key of Object.keys(METRIC_SELECTORS)) {
		observations.set(key, [])
	}
	observations.set('generationRuntimeMs', [])
	const scoreValues: number[] = []
	const candidateAttempts: number[] = []
	let accepted = 0
	let seedAttempts = 0
	let generationFailures = 0
	let invalid = 0
	let nonUnique = 0
	let safetyLimitHits = 0
	let totalCandidateAttempts = 0
	while (accepted < target && seedAttempts < maxSeedAttempts) {
		const startedAt = Date.now()
		try {
			const result = generatePuzzleForProfile(`${seedPrefix}-${tier}-${seedAttempts}`, profile)
			totalCandidateAttempts += result.candidateAttempts
			const validation = validatePuzzle(result.generated.puzzle, {
				solution: result.generated.solution,
				requirements: {
					requireHorizontalAndVertical: true,
					requireCrossing: true,
					requireConnected: true,
				},
			})
			if (!validation.valid) {
				invalid += 1
			} else if (result.analysis.solver.status === 'safety-limit') {
				safetyLimitHits += 1
			} else if (result.analysis.solver.status !== 'unique') {
				nonUnique += 1
			} else {
				accepted += 1
				for (const [key, selector] of Object.entries(METRIC_SELECTORS)) {
					observations.get(key)?.push(selector(result.analysis.metrics))
				}
				scoreValues.push(result.analysis.score)
				candidateAttempts.push(result.candidateAttempts)
				observations.get('generationRuntimeMs')?.push(Date.now() - startedAt)
			}
		} catch {
			generationFailures += 1
		}
		seedAttempts += 1
	}

	const averageMetrics: Record<string, number> = {}
	const medianMetrics: Record<string, number> = {}
	for (const [key, values] of observations) {
		averageMetrics[key] = Math.round(average(values) * 100) / 100
		medianMetrics[key] = Math.round(median(values) * 100) / 100
	}
	averageMetrics.difficultyScore = Math.round(average(scoreValues) * 100) / 100
	medianMetrics.difficultyScore = Math.round(median(scoreValues) * 100) / 100
	averageMetrics.candidateAttempts = Math.round(average(candidateAttempts) * 100) / 100
	medianMetrics.candidateAttempts = Math.round(median(candidateAttempts) * 100) / 100
	return {
		profile: tier,
		accepted,
		attempts: totalCandidateAttempts,
		generationFailures,
		invalid,
		nonUnique,
		safetyLimitHits,
		acceptanceRate: totalCandidateAttempts === 0 ? 0 : accepted / totalCandidateAttempts,
		average: averageMetrics,
		median: medianMetrics,
		scoreMin: scoreValues.length ? Math.min(...scoreValues) : 0,
		scoreMax: scoreValues.length ? Math.max(...scoreValues) : 0,
	}
}

export function calibrateDifficultyProfiles(
	options: {
		readonly acceptedTarget?: number
		readonly maxSeedAttempts?: number
		readonly seedPrefix?: string
	} = {},
): Readonly<Record<DifficultyTier, CalibrationProfileSummary>> {
	return {
		easy: calibrateDifficultyProfile('easy', options),
		medium: calibrateDifficultyProfile('medium', options),
		hard: calibrateDifficultyProfile('hard', options),
		expert: calibrateDifficultyProfile('expert', options),
	}
}
