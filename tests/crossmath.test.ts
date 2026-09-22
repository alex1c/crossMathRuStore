import {
	countSolutions,
	DEFAULT_GENERATION_CONFIG,
	deriveSeed,
	evaluateArithmetic,
	generatePuzzle,
	solvePuzzle,
	validatePuzzle,
} from '@/src/core/crossmath'
import type {
	ArithmeticOperator,
	CrossMathCell,
	Equation,
	Puzzle,
} from '@/src/core/crossmath'

const arithmetic = { minValue: 1, maxValue: 20 }

function numberCell(row: number, column: number, value: number | null, state: 'fixed' | 'blank'): CrossMathCell {
	return { kind: 'number', coordinate: { row, column }, value, state }
}

function operatorCell(row: number, column: number, operator: ArithmeticOperator): CrossMathCell {
	return { kind: 'operator', coordinate: { row, column }, operator }
}

function equalsCell(row: number, column: number): CrossMathCell {
	return { kind: 'equals', coordinate: { row, column } }
}

function linearPuzzle(
	a: CrossMathCell,
	b: CrossMathCell,
	c: CrossMathCell,
	operator: ArithmeticOperator,
): Puzzle {
	const equation: Equation = {
		id: 'equation-0',
		direction: 'horizontal',
		cells: [
			{ row: 0, column: 0 },
			{ row: 0, column: 1 },
			{ row: 0, column: 2 },
			{ row: 0, column: 3 },
			{ row: 0, column: 4 },
		],
		operator,
		relation: 'equals',
	}
	return {
		schemaVersion: 1,
		arithmetic,
		grid: {
			rows: 1,
			columns: 5,
			cells: [a, operatorCell(0, 1, operator), b, equalsCell(0, 3), c],
		},
		equations: [equation],
	}
}

describe('arithmetic engine', () => {
	it('accepts valid integer operations and enforces bounds', () => {
		expect(evaluateArithmetic(12, 'divide', 3, arithmetic)).toEqual({ valid: true, result: 4 })
		expect(evaluateArithmetic(2, 'multiply', 3, arithmetic)).toEqual({ valid: true, result: 6 })
		expect(evaluateArithmetic(1, 'subtract', 8, arithmetic).valid).toBe(false)
		expect(evaluateArithmetic(10, 'divide', 4, arithmetic)).toEqual({
			valid: false,
			reason: 'non-integer-division',
		})
		expect(evaluateArithmetic(10, 'divide', 0, arithmetic).valid).toBe(false)
		expect(evaluateArithmetic(20, 'add', 1, arithmetic).valid).toBe(false)
	})

	it('allows negative values only when the configured range allows them', () => {
		expect(evaluateArithmetic(5, 'subtract', 8, arithmetic).valid).toBe(false)
		expect(evaluateArithmetic(5, 'subtract', 8, { minValue: -10, maxValue: 10 })).toEqual({
		valid: true,
		result: -3,
	})
	})
})

describe('solver', () => {
	it('finds a unique solution', () => {
		const puzzle = linearPuzzle(
			numberCell(0, 0, 2, 'fixed'),
			numberCell(0, 2, 3, 'fixed'),
			numberCell(0, 4, null, 'blank'),
			'add',
		)
		const result = solvePuzzle(puzzle)
		expect(result.status).toBe('unique')
		expect(result.solution?.values).toContainEqual({ coordinate: { row: 0, column: 4 }, value: 5 })
	})

	it('detects no solution and multiple solutions', () => {
		const impossible = linearPuzzle(
			numberCell(0, 0, 2, 'fixed'),
			numberCell(0, 2, 2, 'fixed'),
			numberCell(0, 4, 5, 'fixed'),
			'add',
		)
		expect(solvePuzzle(impossible).status).toBe('no-solution')

		const multiple = linearPuzzle(
			numberCell(0, 0, null, 'blank'),
			numberCell(0, 2, null, 'blank'),
			numberCell(0, 4, null, 'blank'),
			'add',
		)
		expect(countSolutions(multiple, 2).count).toBe(2)
		expect(solvePuzzle(multiple).status).toBe('multiple')
	})

	it('propagates crossing constraints without mutating the puzzle', () => {
		const puzzle: Puzzle = {
			schemaVersion: 1,
			arithmetic: { minValue: 1, maxValue: 5 },
			grid: {
				rows: 5,
				columns: 5,
				cells: [
					numberCell(0, 0, 2, 'fixed'),
					operatorCell(0, 1, 'add'),
					numberCell(0, 2, 3, 'fixed'),
					equalsCell(0, 3),
					numberCell(0, 4, null, 'blank'),
					operatorCell(1, 2, 'multiply'),
					numberCell(2, 2, null, 'blank'),
					equalsCell(3, 2),
					numberCell(4, 2, 3, 'fixed'),
				],
			},
			equations: [
				{
					id: 'horizontal',
					direction: 'horizontal',
					cells: [
						{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 },
						{ row: 0, column: 3 }, { row: 0, column: 4 },
					],
					operator: 'add', relation: 'equals',
				},
				{
					id: 'vertical',
					direction: 'vertical',
					cells: [
						{ row: 0, column: 2 }, { row: 1, column: 2 }, { row: 2, column: 2 },
						{ row: 3, column: 2 }, { row: 4, column: 2 },
					],
					operator: 'multiply', relation: 'equals',
				},
			],
		}
		const before = JSON.stringify(puzzle)
		const result = solvePuzzle(puzzle)
		expect(result.status).toBe('unique')
		expect(JSON.stringify(puzzle)).toBe(before)
	})

	it('reports the safety limit explicitly', () => {
		const multiple = linearPuzzle(
			numberCell(0, 0, null, 'blank'),
			numberCell(0, 2, null, 'blank'),
			numberCell(0, 4, null, 'blank'),
			'add',
		)
		expect(solvePuzzle(multiple, { maxNodes: 1 }).status).toBe('safety-limit')
	})
})

describe('generator and validation', () => {
	it('is deterministic, crossed, connected, and unique', () => {
		const config = { ...DEFAULT_GENERATION_CONFIG, targetEquationCount: 4, targetBlankCount: 1 }
		const first = generatePuzzle('deterministic-seed', config)
		const second = generatePuzzle('deterministic-seed', config)
		expect(JSON.stringify(first)).toBe(JSON.stringify(second))
		expect(first.metadata.blankCount).toBeGreaterThan(0)
		expect(first.metadata.crossingCount).toBeGreaterThan(0)
		expect(validatePuzzle(first.puzzle, {
			arithmetic: config,
			solution: first.solution,
			requirements: {
				requireHorizontalAndVertical: true,
				requireCrossing: true,
				requireConnected: true,
			},
		}).valid).toBe(true)
		expect(countSolutions(first.puzzle, 2).count).toBe(1)
		expect(JSON.stringify(first.puzzle)).not.toBe(JSON.stringify(generatePuzzle('different-seed', config).puzzle))
	})

	it('derives stable daily-compatible seeds', () => {
		expect(deriveSeed('2026-09-22', 'v1', 'daily')).toBe(deriveSeed('2026-09-22', 'v1', 'daily'))
		expect(deriveSeed('2026-09-22', 'v1', 'daily')).not.toBe(deriveSeed('2026-09-23', 'v1', 'daily'))
	})

	it('fails in a bounded and typed way for impossible generation config', () => {
		expect(() => generatePuzzle('impossible', {
			rows: 5,
			columns: 5,
			allowedOperations: ['divide'],
			minValue: 2,
			maxValue: 2,
			maxGenerationAttempts: 2,
		})).toThrow(/no valid arithmetic equations|unable to generate/)
	})
})
