import {
	generateCampaignPuzzle,
	generateDailyPuzzle,
	generateEndlessPuzzle,
	generateMultiplicationTablePuzzle,
	getCampaignGenerationProfile,
} from '@/src/core/crossmath'

describe('CrossMath Phase 3.2 progression guards', () => {
	it('keeps the campaign early tiers substantive and bounded', () => {
		const levelTargets = new Map([
			[1, 3],
			[50, 5],
			[51, 5],
			[100, 5],
			[101, 6],
			[150, 6],
			[151, 6],
			[201, 7],
		])
		for (const [level, minimumBlanks] of levelTargets) {
			const profile = getCampaignGenerationProfile(level)
			const result = generateCampaignPuzzle(level)
			expect(profile.config.targetBlankCount).toBeGreaterThanOrEqual(minimumBlanks)
			expect(result.analysis.metrics.blankCount).toBeGreaterThanOrEqual(minimumBlanks)
			expect(result.analysis.solver.status).toBe('unique')
		}
		expect(getCampaignGenerationProfile(50).config.targetBlankCount).toBeGreaterThanOrEqual(
			getCampaignGenerationProfile(1).config.targetBlankCount ?? 0,
		)
		expect(getCampaignGenerationProfile(51).config.targetBlankCount).toBeGreaterThanOrEqual(
			getCampaignGenerationProfile(50).config.targetBlankCount ?? 0,
		)
	})

	it('keeps representative boundary transitions deterministic and unique', () => {
		for (const boundary of [[49, 50, 51, 52], [99, 100, 101, 102], [149, 150, 151, 152], [199, 200, 201, 202]]) {
			const firstRun = boundary.map((level) => generateCampaignPuzzle(level))
			const secondRun = boundary.map((level) => generateCampaignPuzzle(level))
			for (const [index, result] of firstRun.entries()) {
				expect(result.analysis.solver.status).toBe('unique')
				expect(result.analysis.metrics.blankCount).toBeGreaterThanOrEqual(1)
				expect(JSON.stringify(result.generated.puzzle)).toBe(JSON.stringify(secondRun[index].generated.puzzle))
			}
		}
	})

	it('keeps Daily, Endless, and multiplication modes generated and unique', () => {
		for (const dateKey of ['2026-01-01', '2026-06-15', '2026-12-31']) {
			expect(generateDailyPuzzle(dateKey).analysis.solver.status).toBe('unique')
			expect(generateDailyPuzzle(dateKey, 'daily-expert').analysis.solver.status).toBe('unique')
		}
		for (const completed of [0, 5, 10, 30, 60]) {
			expect(generateEndlessPuzzle({ completed, streak: 0 }).analysis.solver.status).toBe('unique')
		}
		for (const table of [2, 5, 'mixed'] as const) {
			expect(generateMultiplicationTablePuzzle(table, `phase3.2-${table}`).analysis.solver.status).toBe('unique')
		}
	})
})
