import {
	calibrateDifficultyProfiles,
} from '@/src/core/crossmath'

describe('CrossMath Phase 2 calibration corpus', () => {
	it('calibrates all difficulty profiles with deterministic seeds', () => {
		const requested = Number(process.env.CROSSMATH_CALIBRATION_TARGET ?? 1_000)
		const summaries = calibrateDifficultyProfiles({
			acceptedTarget: requested,
			maxSeedAttempts: requested * 3,
		})
		for (const summary of Object.values(summaries)) {
			const average = summary.average
			const median = summary.median
			console.log('calibration', JSON.stringify({
				profile: summary.profile,
				accepted: summary.accepted,
				attempts: summary.attempts,
				generationFailures: summary.generationFailures,
				invalid: summary.invalid,
				nonUnique: summary.nonUnique,
				safetyLimitHits: summary.safetyLimitHits,
				acceptanceRate: Math.round(summary.acceptanceRate * 1000) / 1000,
				average: {
					blanks: average.blankCount,
					equations: average.equationCount,
					crossings: average.crossingCount,
					initialForced: average.initialForcedCells,
					waves: average.propagationWaves,
					chain: average.longestForcedChain,
					candidates: average.averageCandidatesBeforeResolution,
					branches: average.solverBranches,
					nodes: average.solverNodes,
					maxDepth: average.solverMaxDepth,
					multiply: average.multiplicationFrequency,
					divide: average.divisionFrequency,
					score: average.difficultyScore,
					candidateAttempts: average.candidateAttempts,
					runtimeMs: average.generationRuntimeMs,
				},
				median: {
					blanks: median.blankCount,
					equations: median.equationCount,
					crossings: median.crossingCount,
					initialForced: median.initialForcedCells,
					waves: median.propagationWaves,
					chain: median.longestForcedChain,
					candidates: median.averageCandidatesBeforeResolution,
					branches: median.solverBranches,
					nodes: median.solverNodes,
					maxDepth: median.solverMaxDepth,
					multiply: median.multiplicationFrequency,
					divide: median.divisionFrequency,
					score: median.difficultyScore,
					candidateAttempts: median.candidateAttempts,
					runtimeMs: median.generationRuntimeMs,
				},
				scoreMin: summary.scoreMin,
				scoreMax: summary.scoreMax,
			}))
			expect(summary.accepted).toBe(requested)
			expect(summary.invalid).toBe(0)
			expect(summary.nonUnique).toBe(0)
			expect(summary.safetyLimitHits).toBe(0)
		}
	}, 600_000)
})
