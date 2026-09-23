import {
	analyzeNumberBank,
	analyzeHybridPuzzle,
	buildPregeneratedCampaignCatalog,
	countExpressionSolutions,
	countHybridSolutions,
	deriveAdvancedNumberBank,
	deriveNumberBank,
	deriveTrackSeed,
	evaluateExpression,
	generateDailyTrackPuzzle,
	generateLongExpressionPuzzle,
	generateHybridPuzzle,
	generateTrackPuzzle,
	getTrackProfile,
	measureOccupiedDensity,
	serializePregeneratedCampaignCatalog,
	solveExpressionPuzzle,
	solveHybridPuzzle,
	validatePregeneratedCampaignCatalog,
} from '@/src/core/crossmath'
import type { ExpressionPuzzle } from '@/src/core/crossmath'

describe('Phase 5.5 independent tracks', () => {
	it('keeps the four canonical tracks immediately addressable and independent', () => {
		const tracks = ['easy', 'medium', 'hard', 'lobachevsky'] as const
		for (const track of tracks) {
			const profile = getTrackProfile(track, 1)
			expect(profile.label).toBe({ easy: 'Просто', medium: 'Средне', hard: 'Сложно', lobachevsky: 'Лобачевский' }[track])
			expect(profile.levelWithinTrack).toBe(1)
			expect(profile.config.targetEquationCount).toBeGreaterThan(0)
		}
		expect(deriveTrackSeed('easy', 1)).not.toBe(deriveTrackSeed('hard', 1))
		expect(deriveTrackSeed('hard', 1)).not.toBe(deriveTrackSeed('lobachevsky', 1))
		expect(deriveTrackSeed('lobachevsky', 1)).toBe(deriveTrackSeed('lobachevsky', 1))
		expect(() => getTrackProfile('easy', 0)).toThrow(RangeError)
	})

	it('generates a deterministic dense hard track puzzle with measured structure', () => {
		const first = generateTrackPuzzle('hard', 1)
		const second = generateTrackPuzzle('hard', 1)
		expect(JSON.stringify(first.generated.puzzle)).toBe(JSON.stringify(second.generated.puzzle))
		expect(first.generated.metadata.blankCount).toBeGreaterThanOrEqual(7)
		expect(first.density.crossingCellCount).toBeGreaterThan(0)
		expect(first.density.occupiedDensity).toBeGreaterThan(0)
		expect(first.analysis.solver.status).toBe('unique')
		expect(measureOccupiedDensity(first.generated.puzzle)).toEqual(first.density)
	})

	it('keeps standard and Lobachevsky Daily seeds deterministic and distinct', () => {
		const standard = generateDailyTrackPuzzle('2026-09-23', 'daily-standard')
		const standardAgain = generateDailyTrackPuzzle('2026-09-23', 'daily-standard')
		expect(JSON.stringify(standard.generated.puzzle)).toBe(JSON.stringify(standardAgain.generated.puzzle))
		expect(standard.track).toBe('medium')
		expect(generateDailyTrackPuzzle('2026-09-23', 'daily-lobachevsky').track).toBe('lobachevsky')
	})

	it('uses conventional precedence and rejects fractional long-expression steps', () => {
		expect(evaluateExpression([2, 3, 4], ['add', 'multiply'], { minValue: 0, maxValue: 20 })).toEqual({
		valid: true,
		result: 14,
		steps: [12, 14],
	})
	expect(evaluateExpression([10, 4, 2], ['divide', 'add'], { minValue: 0, maxValue: 20 }).valid).toBe(false)
	})

	it('solves and proves uniqueness for an experimental three-operand expression', () => {
		const generated = generateLongExpressionPuzzle('phase5.5-expression-test', {
			rows: 11,
			columns: 11,
			targetEquationCount: 3,
			targetBlankCount: 3,
			maxGenerationAttempts: 20,
		})
		const result = solveExpressionPuzzle(generated.puzzle)
		expect(result.status).toBe('unique')
		expect(countExpressionSolutions(generated.puzzle).count).toBe(1)
		expect(result.solution?.values.length).toBe(generated.solution.values.length)
	})

	it('generates a connected hybrid puzzle with binary/long crossings', () => {
		const generated = generateHybridPuzzle('phase5.5-hybrid-test', {
			rows: 11,
			columns: 11,
			targetEquationCount: 2,
			targetBinaryEquationCount: 2,
			targetBlankCount: 4,
			maxGenerationAttempts: 12,
		})
		const expressionCount = generated.puzzle.equations.filter((equation) => equation.cells.length > 5).length
		const binaryCount = generated.puzzle.equations.filter((equation) => equation.cells.length === 5).length
		const analysis = analyzeHybridPuzzle(generated.puzzle)
		expect(expressionCount).toBe(2)
		expect(binaryCount).toBe(2)
		expect(analysis.solver.status).toBe('unique')
		expect(countHybridSolutions(generated.puzzle).count).toBe(1)
		expect(solveHybridPuzzle(generated.puzzle).solution?.values.length).toBe(generated.solution.values.length)
		expect(analysis.density.crossingCellCount).toBeGreaterThan(0)
		const exact = deriveAdvancedNumberBank(generated.puzzle, generated.solution, { mode: 'exact' })
		const distractors = deriveAdvancedNumberBank(generated.puzzle, generated.solution, {
			mode: 'distractors',
			distractorCount: 2,
			seed: 'hybrid-bank',
		})
		expect(JSON.stringify(distractors)).toBe(JSON.stringify(deriveAdvancedNumberBank(generated.puzzle, generated.solution, {
			mode: 'distractors',
			distractorCount: 2,
			seed: 'hybrid-bank',
		})))
		expect(distractors.items.length).toBe(exact.items.length + 2)
		expect(distractors.duplicateValueCounts).toEqual(exact.duplicateValueCounts)
	})

	it('builds and reproducibly serializes a validated research catalog', () => {
		const first = buildPregeneratedCampaignCatalog('easy', { levels: [1, 2] })
		const second = buildPregeneratedCampaignCatalog('easy', { levels: [1, 2] })
		const hybrid = buildPregeneratedCampaignCatalog('lobachevsky', { variant: 'hybrid', levels: [1] })
		expect(validatePregeneratedCampaignCatalog(first).valid).toBe(true)
		expect(validatePregeneratedCampaignCatalog(hybrid).valid).toBe(true)
		expect(hybrid.variant).toBe('hybrid')
		expect(serializePregeneratedCampaignCatalog(first)).toBe(serializePregeneratedCampaignCatalog(second))
		expect(first.averagePuzzleJsonBytes).toBeGreaterThan(0)
	})

	it('preserves number-bank multiplicity and distinguishes distractors', () => {
		const generated = generateTrackPuzzle('easy', 1)
		const exact = deriveNumberBank(generated.generated.puzzle, generated.generated.solution, { mode: 'exact' })
		const distractors = deriveNumberBank(generated.generated.puzzle, generated.generated.solution, {
			mode: 'distractors',
			distractorCount: 2,
			seed: 'bank-test',
		})
		expect(exact.items.length).toBe(exact.missingValues.length)
		expect(distractors.items.length).toBeGreaterThanOrEqual(exact.items.length)
		expect(distractors.items.filter((item) => item.kind === 'distractor')).toHaveLength(2)
		expect(analyzeNumberBank(generated.generated.puzzle, exact).bankItemCount).toBe(exact.items.length)
	})
})

describe('Phase 5.5 expression solver regression', () => {
	it('does not mutate a JSON-friendly expression puzzle', () => {
		const puzzle: ExpressionPuzzle = {
			schemaVersion: 1,
			arithmetic: { minValue: 1, maxValue: 20 },
			grid: {
				rows: 1,
				columns: 7,
				cells: [
					{ kind: 'number', coordinate: { row: 0, column: 0 }, state: 'fixed', value: 2 },
					{ kind: 'operator', coordinate: { row: 0, column: 1 }, operator: 'add' },
					{ kind: 'number', coordinate: { row: 0, column: 2 }, state: 'fixed', value: 3 },
					{ kind: 'operator', coordinate: { row: 0, column: 3 }, operator: 'multiply' },
					{ kind: 'number', coordinate: { row: 0, column: 4 }, state: 'fixed', value: 4 },
					{ kind: 'equals', coordinate: { row: 0, column: 5 } },
					{ kind: 'number', coordinate: { row: 0, column: 6 }, state: 'blank', value: null },
				],
			},
			equations: [{
				id: 'precedence',
				direction: 'horizontal',
				cells: [
					{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 },
					{ row: 0, column: 3 }, { row: 0, column: 4 }, { row: 0, column: 5 }, { row: 0, column: 6 },
				],
				operators: ['add', 'multiply'],
				relation: 'equals',
			}],
		}
		const before = JSON.stringify(puzzle)
		expect(solveExpressionPuzzle(puzzle).solution?.values).toContainEqual({ coordinate: { row: 0, column: 6 }, value: 14 })
		expect(JSON.stringify(puzzle)).toBe(before)
	})
})
