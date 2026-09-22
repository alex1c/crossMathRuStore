import {
	analyzeDifficulty,
	DEFAULT_GENERATION_CONFIG,
	generatePuzzle,
} from '@/src/core/crossmath'

describe('Phase 1 difficulty audit', () => {
	it('records why the Phase 1 default corpus is propagation-only', () => {
		const analyses = Array.from({ length: 100 }, (_, index) => analyzeDifficulty(
			generatePuzzle(`phase1-audit-${index}`, DEFAULT_GENERATION_CONFIG).puzzle,
		))
		const summary = {
			count: analyses.length,
			logicSolved: analyses.filter((analysis) => analysis.logicSolved).length,
			averageInitialForced: analyses.reduce((total, analysis) => total + analysis.metrics.initialForcedCells, 0) / analyses.length,
			averageBlanks: analyses.reduce((total, analysis) => total + analysis.metrics.blankCount, 0) / analyses.length,
			averageWaves: analyses.reduce((total, analysis) => total + analysis.metrics.propagationWaves, 0) / analyses.length,
			maxNodes: Math.max(...analyses.map((analysis) => analysis.metrics.solverNodes)),
		}
		console.log('phase1 difficulty audit', summary)
		expect(summary.logicSolved).toBe(100)
		expect(summary.maxNodes).toBe(1)
		expect(summary.averageInitialForced).toBeLessThan(summary.averageBlanks)
		expect(summary.averageWaves).toBeGreaterThan(1)
	})
})
