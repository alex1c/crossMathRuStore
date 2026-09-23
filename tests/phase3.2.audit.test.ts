import {
	generateCampaignPuzzle,
	getCampaignGenerationProfile,
	getDifficultyProfile,
	validatePuzzle,
} from '@/src/core/crossmath'

const REPRESENTATIVE_LEVELS = [1, 10, 25, 49, 50, 51, 52, 75, 99, 100, 101, 102, 149, 150, 151, 152, 160, 200, 220, 250]

function cellGlyph(cell: (typeof generateCampaignPuzzle extends never ? never : ReturnType<typeof generateCampaignPuzzle>)['generated']['puzzle']['grid']['cells'][number]): string {
	if (cell.kind === 'number') return cell.state === 'blank' ? '_' : String(cell.value)
	if (cell.kind === 'operator') return cell.operator === 'multiply' ? '×' : cell.operator === 'divide' ? '÷' : cell.operator === 'add' ? '+' : '−'
	return '='
}

function compactGrid(result: ReturnType<typeof generateCampaignPuzzle>): string {
	const { grid } = result.generated.puzzle
	const byCoordinate = new Map(grid.cells.map((cell) => [`${cell.coordinate.row},${cell.coordinate.column}`, cellGlyph(cell)]))
	const occupiedRows = grid.cells.map((cell) => cell.coordinate.row)
	const occupiedColumns = grid.cells.map((cell) => cell.coordinate.column)
	const minRow = Math.min(...occupiedRows)
	const maxRow = Math.max(...occupiedRows)
	const minColumn = Math.min(...occupiedColumns)
	const maxColumn = Math.max(...occupiedColumns)
	return Array.from({ length: maxRow - minRow + 1 }, (_, rowOffset) =>
		Array.from({ length: maxColumn - minColumn + 1 }, (_, columnOffset) =>
			byCoordinate.get(`${minRow + rowOffset},${minColumn + columnOffset}`) ?? '·',
		).join(' '),
	).join(' / ')
}

function equationText(result: ReturnType<typeof generateCampaignPuzzle>): string[] {
	const values = new Map(result.generated.solution.values.map((assignment) => [
		`${assignment.coordinate.row},${assignment.coordinate.column}`,
		assignment.value,
	]))
	const operatorSymbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' } as const
	return result.generated.puzzle.equations.map((equation) => {
		const first = values.get(`${equation.cells[0].row},${equation.cells[0].column}`)
		const second = values.get(`${equation.cells[2].row},${equation.cells[2].column}`)
		const resultValue = values.get(`${equation.cells[4].row},${equation.cells[4].column}`)
		return `${first} ${operatorSymbols[equation.operator]} ${second} = ${resultValue}`
	})
}

describe('Phase 3.2 current profile audit', () => {
	it('prints current settings and representative campaign metrics', () => {
		console.log('profile-settings', JSON.stringify({
			easy: getDifficultyProfile('easy'),
			medium: getDifficultyProfile('medium'),
			hard: getDifficultyProfile('hard'),
			expert: getDifficultyProfile('expert'),
		}))
		const generatedByLevel = new Map<number, ReturnType<typeof generateCampaignPuzzle>>()
		for (const level of REPRESENTATIVE_LEVELS) {
			const profile = getCampaignGenerationProfile(level)
			const startedAt = Date.now()
			const result = generateCampaignPuzzle(level)
			const generationTimeMs = Date.now() - startedAt
			generatedByLevel.set(level, result)
			const validation = validatePuzzle(result.generated.puzzle)
			console.log('representative', JSON.stringify({
				level,
				tier: profile.difficultyTier,
				targetBlanks: profile.config.targetBlankCount,
				actualBlanks: result.analysis.metrics.blankCount,
				score: result.analysis.score,
				waves: result.analysis.metrics.propagationWaves,
				candidates: result.analysis.metrics.averageCandidatesBeforeResolution,
				maxCandidates: result.analysis.metrics.maxCandidatesBeforeResolution,
				ambiguity: result.analysis.metrics.ambiguityMoments,
				equations: result.analysis.metrics.equationCount,
				crossings: result.analysis.metrics.crossingCount,
				generationAttempts: result.generated.metadata.generationAttempts,
				candidateAttempts: result.candidateAttempts,
				generationTimeMs,
				equationsList: equationText(result),
				grid: compactGrid(result),
				validation,
			}))
			expect(result.analysis.solver.status).toBe('unique')
			expect(validation.valid).toBe(true)
		}
		expect(generatedByLevel.get(1)?.analysis.metrics.blankCount).toBeGreaterThanOrEqual(3)
		expect(generatedByLevel.get(50)?.analysis.metrics.blankCount).toBeGreaterThanOrEqual(4)
		expect(generatedByLevel.get(51)?.analysis.metrics.blankCount).toBeGreaterThanOrEqual(
		generatedByLevel.get(50)?.analysis.metrics.blankCount ?? 0,
	)
	})
})
