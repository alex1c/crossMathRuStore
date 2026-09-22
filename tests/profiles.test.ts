import {
	DifficultyGenerationError,
	generateCampaignPuzzle,
	generateDailyPuzzle,
	generateMultiplicationTablePuzzle,
	generatePuzzleForProfile,
	getCampaignGenerationProfile,
	getDailyGenerationProfile,
	getDifficultyProfile,
	getEndlessGenerationProfile,
	getMultiplicationTableGenerationProfile,
} from '@/src/core/crossmath'

describe('difficulty profiles and modes', () => {
	it('keeps difficulty analysis deterministic for the same puzzle', () => {
		const first = generatePuzzleForProfile('stable-profile-seed', 'hard')
		const second = generatePuzzleForProfile('stable-profile-seed', 'hard')
		expect(JSON.stringify(first.generated.puzzle)).toBe(JSON.stringify(second.generated.puzzle))
		expect(first.analysis.score).toBe(second.analysis.score)
		expect(first.analysis.metrics).toEqual(second.analysis.metrics)
	})

	it('keeps campaign tiers bounded and progressively targeted', () => {
		expect(getCampaignGenerationProfile(1).difficultyTier).toBe('easy')
		expect(getCampaignGenerationProfile(50).difficultyTier).toBe('easy')
		expect(getCampaignGenerationProfile(51).difficultyTier).toBe('medium')
		expect(getCampaignGenerationProfile(151).difficultyTier).toBe('hard')
		expect(getCampaignGenerationProfile(201).difficultyTier).toBe('expert')
		expect(getCampaignGenerationProfile(1).config.targetBlankCount).toBeLessThanOrEqual(
		getCampaignGenerationProfile(250).config.targetBlankCount ?? 0,
	)
		expect(() => getCampaignGenerationProfile(251)).toThrow(RangeError)
		for (const level of [1, 51, 101, 151, 201, 250]) {
			const generated = generateCampaignPuzzle(level)
			expect(generated.analysis.solver.status).toBe('unique')
		}
	})

	it('keeps Daily and Daily Expert deterministic and separated', () => {
		const dailyProfile = getDailyGenerationProfile('2026-09-22', 'daily')
		const expertProfile = getDailyGenerationProfile('2026-09-22', 'daily-expert')
		const daily = generateDailyPuzzle('2026-09-22', 'daily')
		const dailyAgain = generateDailyPuzzle('2026-09-22', 'daily')
		const expert = generateDailyPuzzle('2026-09-22', 'daily-expert')
		expect(dailyProfile.seed).toBe(getDailyGenerationProfile('2026-09-22', 'daily').seed)
		expect(JSON.stringify(daily.generated.puzzle)).toBe(JSON.stringify(dailyAgain.generated.puzzle))
		expect(daily.profile.id).not.toBe(expert.profile.id)
		expect(expertProfile.difficultyTier).toBe('expert')
		expect(expert.analysis.score).toBeGreaterThan(daily.analysis.score)
	})

	it('bounds Endless progression at the validated Expert profile', () => {
		expect(getEndlessGenerationProfile({ completed: 0, streak: 0 }).difficultyTier).toBe('easy')
		expect(getEndlessGenerationProfile({ completed: 10, streak: 1 }).difficultyTier).toBe('medium')
		expect(getEndlessGenerationProfile({ completed: 30, streak: 2 }).difficultyTier).toBe('hard')
		expect(getEndlessGenerationProfile({ completed: 60, streak: 3 }).difficultyTier).toBe('expert')
		expect(getEndlessGenerationProfile({ completed: 10_000, streak: 4 }).difficultyTier).toBe('expert')
	})

	it('keeps multiplication-table modes crosswords with constrained factors', () => {
		const profile = getMultiplicationTableGenerationProfile(2)
		const generated = generateMultiplicationTablePuzzle(2, 'table-seed')
		expect(profile.config.allowedOperations).toEqual(['multiply'])
		expect(generated.generated.puzzle.mode?.multiplicationTable).toBe(2)
		expect(generated.generated.puzzle.equations.every((equation) => equation.operator === 'multiply')).toBe(true)
		const values = new Map(generated.generated.solution.values.map((assignment) => [
			`${assignment.coordinate.row},${assignment.coordinate.column}`,
			assignment.value,
		]))
		expect(generated.generated.puzzle.equations.every((equation) => {
			const first = values.get(`${equation.cells[0].row},${equation.cells[0].column}`)
			const second = values.get(`${equation.cells[2].row},${equation.cells[2].column}`)
			return first === 2 || second === 2
		})).toBe(true)
	})

	it('fails explicitly when a profile target is unreachable', () => {
		const profile = getDifficultyProfile('easy')
		expect(() => generatePuzzleForProfile('bounded-failure', {
			...profile,
			scoreRange: { min: 99, max: 100 },
			maxCandidateAttempts: 2,
		})).toThrow(DifficultyGenerationError)
	})
})
