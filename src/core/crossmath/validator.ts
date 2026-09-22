import { assertArithmeticConfig, evaluateArithmetic } from './arithmetic'
import {
	coordinateIsInGrid,
	coordinateKey,
	equationNumberCoordinates,
} from './model'
import type {
	ArithmeticConfig,
	CrossMathCell,
	Equation,
	Puzzle,
	PuzzleSolution,
	PuzzleValidationOptions,
	PuzzleValidationResult,
} from './types'

const DEFAULT_VALIDATION_ARITHMETIC: ArithmeticConfig = {
	minValue: Number.MIN_SAFE_INTEGER,
	maxValue: Number.MAX_SAFE_INTEGER,
}

function addError(errors: string[], message: string): void {
	if (!errors.includes(message)) {
		errors.push(message)
	}
}

function countConnectedComponents(equations: readonly Equation[]): number {
	if (equations.length === 0) {
		return 0
	}
	const parent = equations.map((_, index) => index)
	const find = (index: number): number => {
		let root = index
		while (parent[root] !== root) {
			root = parent[root]
		}
		while (parent[index] !== index) {
			const next = parent[index]
			parent[index] = root
			index = next
		}
		return root
	}
	const union = (a: number, b: number): void => {
		const rootA = find(a)
		const rootB = find(b)
		if (rootA !== rootB) {
			parent[rootB] = rootA
		}
	}
	for (let left = 0; left < equations.length; left += 1) {
		const leftNumbers = new Set(
			equationNumberCoordinates(equations[left]).map(coordinateKey),
		)
		for (let right = left + 1; right < equations.length; right += 1) {
			const sharesNumber = equationNumberCoordinates(equations[right]).some(
				(coordinate) => leftNumbers.has(coordinateKey(coordinate)),
			)
			if (sharesNumber) {
				union(left, right)
			}
		}
	}
	return new Set(parent.map((_, index) => find(index))).size
}

function validateSolution(
	puzzle: Puzzle,
	solution: PuzzleSolution,
	arithmetic: ArithmeticConfig,
	errors: string[],
): void {
	const assignments = new Map<string, number>()
	for (const assignment of solution.values) {
		const key = coordinateKey(assignment.coordinate)
		if (assignments.has(key)) {
			addError(errors, `solution contains duplicate assignment at ${key}`)
		}
		if (!coordinateIsInGrid(assignment.coordinate, puzzle.grid.rows, puzzle.grid.columns)) {
			addError(errors, `solution coordinate ${key} is outside the grid`)
		}
		if (!Number.isSafeInteger(assignment.value)) {
			addError(errors, `solution value at ${key} is not a safe integer`)
		}
		assignments.set(key, assignment.value)
	}

	for (const cell of puzzle.grid.cells) {
		if (cell.kind !== 'number') {
			continue
		}
		const key = coordinateKey(cell.coordinate)
		const value = assignments.get(key)
		if (value === undefined) {
			addError(errors, `solution is missing number cell ${key}`)
			continue
		}
		if (cell.state === 'fixed' && cell.value !== value) {
			addError(errors, `solution disagrees with fixed clue at ${key}`)
		}
		if (!Number.isSafeInteger(value) || value < arithmetic.minValue || value > arithmetic.maxValue) {
			addError(errors, `solution value at ${key} is outside arithmetic bounds`)
		}
	}

	for (const equation of puzzle.equations) {
		const [aCoordinate, bCoordinate, cCoordinate] = equationNumberCoordinates(equation)
		const a = assignments.get(coordinateKey(aCoordinate))
		const b = assignments.get(coordinateKey(bCoordinate))
		const c = assignments.get(coordinateKey(cCoordinate))
		if (a === undefined || b === undefined || c === undefined) {
			continue
		}
		const evaluation = evaluateArithmetic(a, equation.operator, b, arithmetic)
		if (!evaluation.valid || evaluation.result !== c) {
			addError(errors, `equation ${equation.id} is mathematically invalid`)
		}
	}
}

export function validatePuzzle(
	puzzle: Puzzle,
	options: PuzzleValidationOptions = {},
): PuzzleValidationResult {
	const errors: string[] = []
	const requirements = options.requirements ?? {}
	const arithmetic = options.arithmetic ?? puzzle.arithmetic ?? DEFAULT_VALIDATION_ARITHMETIC
	try {
		assertArithmeticConfig(arithmetic)
	} catch (error) {
		addError(errors, error instanceof Error ? error.message : 'invalid arithmetic config')
	}

	if (!Number.isInteger(puzzle.grid.rows) || puzzle.grid.rows <= 0) {
		addError(errors, 'grid rows must be a positive integer')
	}
	if (!Number.isInteger(puzzle.grid.columns) || puzzle.grid.columns <= 0) {
		addError(errors, 'grid columns must be a positive integer')
	}

	const cells = new Map<string, CrossMathCell>()
	let numberCellCount = 0
	let blankCount = 0
	for (const cell of puzzle.grid.cells) {
		const key = coordinateKey(cell.coordinate)
		if (!coordinateIsInGrid(cell.coordinate, puzzle.grid.rows, puzzle.grid.columns)) {
			addError(errors, `cell ${key} is outside the grid`)
		}
		if (cells.has(key)) {
			addError(errors, `duplicate cell at ${key}`)
		}
		cells.set(key, cell)
		if (cell.kind === 'number') {
			numberCellCount += 1
			if (cell.state === 'blank') {
				blankCount += 1
				if (cell.value !== null) {
					addError(errors, `blank number cell ${key} must have null value`)
				}
			} else if (!Number.isSafeInteger(cell.value)) {
				addError(errors, `fixed number cell ${key} must have a safe integer value`)
			}
		}
	}

	if (puzzle.equations.length === 0) {
		addError(errors, 'puzzle must contain at least one equation')
	}
	const equationIds = new Set<string>()
	const numberAppearances = new Map<string, number>()
	const directions = new Set<Equation['direction']>()
	for (const equation of puzzle.equations) {
		if (equationIds.has(equation.id)) {
			addError(errors, `duplicate equation id ${equation.id}`)
		}
		equationIds.add(equation.id)
		directions.add(equation.direction)
		if (equation.relation !== 'equals') {
			addError(errors, `equation ${equation.id} has unsupported relation`)
		}
		if (equation.cells.length !== 5) {
			addError(errors, `equation ${equation.id} must have five ordered cells`)
			continue
		}
		for (let index = 0; index < equation.cells.length; index += 1) {
			const coordinate = equation.cells[index]
			const key = coordinateKey(coordinate)
			if (!coordinateIsInGrid(coordinate, puzzle.grid.rows, puzzle.grid.columns)) {
				addError(errors, `equation ${equation.id} references outside coordinate ${key}`)
			}
			const cell = cells.get(key)
			if (!cell) {
				addError(errors, `equation ${equation.id} references absent cell ${key}`)
				continue
			}
			const expectedKind = index === 1 ? 'operator' : index === 3 ? 'equals' : 'number'
			if (cell.kind !== expectedKind) {
				addError(errors, `equation ${equation.id} has wrong cell kind at index ${index}`)
			}
			if (index === 1 && cell.kind === 'operator' && cell.operator !== equation.operator) {
				addError(errors, `equation ${equation.id} operator disagrees with grid cell`)
			}
			if (index === 0 || index === 2 || index === 4) {
				numberAppearances.set(key, (numberAppearances.get(key) ?? 0) + 1)
			}
			if (index > 0) {
				const previous = equation.cells[index - 1]
				const rowDelta = coordinate.row - previous.row
				const columnDelta = coordinate.column - previous.column
				const validStep = equation.direction === 'horizontal'
					? rowDelta === 0 && columnDelta === 1
					: rowDelta === 1 && columnDelta === 0
				if (!validStep) {
					addError(errors, `equation ${equation.id} is not a contiguous ${equation.direction} path`)
				}
			}
		}
	}

	const crossingCount = [...numberAppearances.values()].filter((count) => count > 1).length
	const connectedComponents = countConnectedComponents(puzzle.equations)
	if (requirements.requireHorizontalAndVertical && directions.size < 2) {
		addError(errors, 'puzzle must contain horizontal and vertical equations')
	}
	if (requirements.requireCrossing && crossingCount === 0) {
		addError(errors, 'puzzle must contain at least one number crossing')
	}
	if (requirements.requireConnected && connectedComponents > 1) {
		addError(errors, 'equations must form one connected component')
	}

	if (options.solution) {
		validateSolution(puzzle, options.solution, arithmetic, errors)
	}

	return {
		valid: errors.length === 0,
		errors,
		equationCount: puzzle.equations.length,
		numberCellCount,
		blankCount,
		crossingCount,
		connectedComponents,
	}
}

export function hasRequiredPuzzleStructure(
	puzzle: Puzzle,
	requirements: Required<import('./types').PuzzleStructureRequirements>,
): boolean {
	return validatePuzzle(puzzle, { requirements }).valid
}
