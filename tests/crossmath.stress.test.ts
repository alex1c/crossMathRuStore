import {
	countSolutions,
	DEFAULT_GENERATION_CONFIG,
	generatePuzzle,
	validatePuzzle,
} from '@/src/core/crossmath'

describe('CrossMath deterministic stress corpus', () => {
	it('validates 1,000 representative generated seeds', () => {
		const stressConfig = { ...DEFAULT_GENERATION_CONFIG }
		const startedAt = Date.now()
		const summary = {
			seedsAttempted: 1000,
			generated: 0,
			failed: 0,
			invalid: 0,
			unique: 0,
			multiple: 0,
			noSolution: 0,
			safetyLimitHits: 0,
			totalNodes: 0,
			maxNodes: 0,
		}
		for (let index = 0; index < summary.seedsAttempted; index += 1) {
			try {
				const generated = generatePuzzle(`phase1-corpus-${index}`, stressConfig)
				summary.generated += 1
				const validation = validatePuzzle(generated.puzzle, {
					arithmetic: stressConfig,
					solution: generated.solution,
					requirements: {
						requireHorizontalAndVertical: true,
						requireCrossing: true,
						requireConnected: true,
					},
				})
				if (!validation.valid) {
					summary.invalid += 1
				}
				const result = countSolutions(generated.puzzle, 2, {
					maxNodes: stressConfig.solverMaxNodes,
				})
				summary.totalNodes += result.metrics.nodesVisited
				summary.maxNodes = Math.max(summary.maxNodes, result.metrics.nodesVisited)
				if (result.status === 'safety-limit') {
					summary.safetyLimitHits += 1
				} else if (result.count === 1) {
					summary.unique += 1
				} else if (result.count === 2) {
					summary.multiple += 1
				} else {
					summary.noSolution += 1
				}
			} catch {
				summary.failed += 1
			}
		}
		const totalRuntimeMs = Date.now() - startedAt
		console.log('crossmath stress summary', { ...summary, totalRuntimeMs })
		expect(summary.invalid).toBe(0)
		expect(summary.multiple).toBe(0)
		expect(summary.noSolution).toBe(0)
		expect(summary.safetyLimitHits).toBe(0)
		expect(summary.generated).toBeGreaterThanOrEqual(950)
		expect(summary.totalNodes).toBeGreaterThan(0)
	})
})
