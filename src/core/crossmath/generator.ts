import { assertArithmeticConfig, evaluateArithmetic } from './arithmetic'
import { coordinateKey, equationPath } from './model'
import { deriveSeed, SeededRandom } from './rng'
import { countSolutions } from './solver'
import { validatePuzzle } from './validator'
import type {
	ArithmeticOperator,
	CellCoordinate,
	CrossMathCell,
	Equation,
	GeneratedPuzzle,
	NumberAssignment,
	Puzzle,
	PuzzleGenerationConfig,
	PuzzleMetadata,
	PuzzleSolution,
} from './types'

export const DEFAULT_GENERATION_CONFIG: PuzzleGenerationConfig = {
	rows: 11,
	columns: 11,
	minValue: 1,
	maxValue: 24,
	allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
	targetEquationCount: 5,
	blankRatio: 0.4,
	maxGenerationAttempts: 40,
	generatorVersion: 'v1',
	requireConnected: true,
	solverMaxNodes: 100_000,
}

export class PuzzleGenerationError extends Error {
	public readonly code = 'GENERATION_FAILED'

	public constructor(message: string) {
		super(message)
		this.name = 'PuzzleGenerationError'
	}
}

type Triple = {
	readonly operator: ArithmeticOperator
	readonly a: number
	readonly b: number
	readonly c: number
}

type Structure = {
	readonly equations: Equation[]
	readonly cells: Map<string, CrossMathCell>
	readonly assignments: Map<string, number>
}

function normalizeConfig(
	config: Partial<PuzzleGenerationConfig> = {},
): PuzzleGenerationConfig {
	const normalized = { ...DEFAULT_GENERATION_CONFIG, ...config }
	assertArithmeticConfig(normalized)
	if (normalized.rows < 5 || normalized.columns < 5) {
		throw new PuzzleGenerationError('grid must be at least 5 by 5 for binary equations')
	}
	if (!Number.isInteger(normalized.targetEquationCount) || normalized.targetEquationCount < 2) {
		throw new PuzzleGenerationError('targetEquationCount must be at least 2')
	}
	if (normalized.allowedOperations.length === 0) {
		throw new PuzzleGenerationError('at least one arithmetic operation is required')
	}
	if (!Number.isInteger(normalized.maxGenerationAttempts) || normalized.maxGenerationAttempts < 1) {
		throw new PuzzleGenerationError('maxGenerationAttempts must be a positive integer')
	}
	if (!Number.isInteger(normalized.solverMaxNodes) || normalized.solverMaxNodes < 1) {
		throw new PuzzleGenerationError('solverMaxNodes must be a positive integer')
	}
	if (
		normalized.blankRatio !== undefined &&
		(normalized.blankRatio < 0 || normalized.blankRatio > 1)
	) {
		throw new PuzzleGenerationError('blankRatio must be between 0 and 1')
	}
	if (
		normalized.targetBlankCount !== undefined &&
		(!Number.isInteger(normalized.targetBlankCount) || normalized.targetBlankCount < 0)
	) {
		throw new PuzzleGenerationError('targetBlankCount must be a non-negative integer')
	}
	return normalized
}

function buildTriples(config: PuzzleGenerationConfig): {
	all: Triple[]
	byAnchor: Map<string, Triple[]>
} {
	const all: Triple[] = []
	const byAnchor = new Map<string, Triple[]>()
	for (const operator of config.allowedOperations) {
		for (let a = config.minValue; a <= config.maxValue; a += 1) {
			for (let b = config.minValue; b <= config.maxValue; b += 1) {
				const evaluation = evaluateArithmetic(a, operator, b, config)
				if (!evaluation.valid) {
					continue
				}
				const triple: Triple = { operator, a, b, c: evaluation.result }
				all.push(triple)
				for (const [index, value] of [a, b, evaluation.result].entries()) {
					const key = `${index}:${value}`
					const list = byAnchor.get(key) ?? []
					list.push(triple)
					byAnchor.set(key, list)
				}
			}
		}
	}
	return { all, byAnchor }
}

function addEquation(
	structure: Structure,
	equation: Equation,
	triple: Triple,
	anchorIndex?: number,
): void {
	structure.equations.push(equation)
	for (let index = 0; index < equation.cells.length; index += 1) {
		const coordinate = equation.cells[index]
		const key = coordinateKey(coordinate)
		if (index === 1) {
			structure.cells.set(key, {
				kind: 'operator',
				coordinate,
				operator: equation.operator,
			})
		} else if (index === 3) {
			structure.cells.set(key, { kind: 'equals', coordinate })
		} else {
			const numberIndex = index === 0 ? 0 : index === 2 ? 1 : 2
			const value = numberIndex === 0 ? triple.a : numberIndex === 1 ? triple.b : triple.c
			if (anchorIndex !== numberIndex || !structure.assignments.has(key)) {
				structure.assignments.set(key, value)
				structure.cells.set(key, {
					kind: 'number',
					coordinate,
					state: 'fixed',
					value,
				})
			}
		}
	}
}

function chooseTriple(
	tripleIndex: ReturnType<typeof buildTriples>,
	rng: SeededRandom,
	anchorIndex?: number,
	anchorValue?: number,
): Triple | undefined {
	if (anchorIndex === undefined || anchorValue === undefined) {
		return tripleIndex.all.length > 0 ? rng.pick(tripleIndex.all) : undefined
	}
	const candidates = tripleIndex.byAnchor.get(`${anchorIndex}:${anchorValue}`) ?? []
	return candidates.length > 0 ? rng.pick(candidates) : undefined
}

function buildSolvedStructure(
	rng: SeededRandom,
	config: PuzzleGenerationConfig,
	tripleIndex: ReturnType<typeof buildTriples>,
): Structure | undefined {
	const firstRow = rng.integer(0, config.rows - 1)
	const firstColumn = rng.integer(0, config.columns - 5)
	const structure: Structure = {
		equations: [],
		cells: new Map(),
		assignments: new Map(),
	}
	const firstTriple = chooseTriple(tripleIndex, rng)
	if (!firstTriple) {
		return undefined
	}
	const firstEquation: Equation = {
		id: 'equation-0',
		direction: 'horizontal',
		cells: equationPath(firstRow, firstColumn, 'horizontal'),
		operator: firstTriple.operator,
		relation: 'equals',
	}
	addEquation(structure, firstEquation, firstTriple)

	const searchBudget = { remaining: Math.max(500, config.targetEquationCount * 500) }
	const cloneStructure = (source: Structure): Structure => ({
		equations: [...source.equations],
		cells: new Map(source.cells),
		assignments: new Map(source.assignments),
	})
	const extend = (current: Structure, equationIndex: number): Structure | undefined => {
		if (equationIndex >= config.targetEquationCount) {
			return current
		}
		if (searchBudget.remaining <= 0) {
			return undefined
		}
		const candidates: {
			anchorIndex: number
			anchor: CellCoordinate
			path: Equation['cells']
			direction: Equation['direction']
			triples: Triple[]
		}[] = []
		for (const parent of current.equations) {
			for (const anchorIndex of [0, 2, 4]) {
				const anchor = parent.cells[anchorIndex]
				const direction = parent.direction === 'horizontal' ? 'vertical' : 'horizontal'
				const deltaRow = direction === 'vertical' ? 1 : 0
				const deltaColumn = direction === 'horizontal' ? 1 : 0
				const startRow = anchor.row - deltaRow * anchorIndex
				const startColumn = anchor.column - deltaColumn * anchorIndex
				const path = equationPath(startRow, startColumn, direction)
				const inBounds = path.every(
					(coordinate) => coordinate.row >= 0 && coordinate.row < config.rows &&
						coordinate.column >= 0 && coordinate.column < config.columns,
				)
				const anchorValue = current.assignments.get(coordinateKey(anchor))
				const triples = (tripleIndex.byAnchor.get(`${anchorIndex}:${anchorValue}`) ?? []).filter((triple) =>
					path.every((coordinate, pathIndex) => {
						const existing = current.cells.get(coordinateKey(coordinate))
						if (!existing) {
							return true
						}
						if (pathIndex === 1) {
							return existing.kind === 'operator' && existing.operator === triple.operator
						}
						if (pathIndex === 3) {
							return existing.kind === 'equals'
						}
						const value = pathIndex === 0 ? triple.a : pathIndex === 2 ? triple.b : triple.c
						return existing.kind === 'number' && current.assignments.get(coordinateKey(coordinate)) === value
					}),
				)
				if (inBounds && triples.length > 0) {
					candidates.push({ anchorIndex, anchor, path, direction, triples })
				}
			}
		}
		for (const candidate of rng.shuffle(candidates)) {
			for (const triple of rng.shuffle(candidate.triples)) {
				searchBudget.remaining -= 1
				const next = cloneStructure(current)
				const equation: Equation = {
					id: `equation-${equationIndex}`,
					direction: candidate.direction,
					cells: candidate.path,
					operator: triple.operator,
					relation: 'equals',
				}
				addEquation(next, equation, triple, candidate.anchorIndex)
				const result = extend(next, equationIndex + 1)
				if (result) {
					return result
				}
				if (searchBudget.remaining <= 0) {
					return undefined
				}
			}
		}
		return undefined
	}
	return extend(structure, 1)
}

function createPuzzle(
	config: PuzzleGenerationConfig,
	structure: Structure,
	blankKeys: ReadonlySet<string>,
): Puzzle {
	const cells = [...structure.cells.values()]
		.map((cell): CrossMathCell => {
			if (cell.kind !== 'number' || !blankKeys.has(coordinateKey(cell.coordinate))) {
				return cell
			}
			return { ...cell, state: 'blank', value: null }
		})
		.sort((left, right) => left.coordinate.row - right.coordinate.row || left.coordinate.column - right.coordinate.column)
	return {
		schemaVersion: 1,
		arithmetic: { minValue: config.minValue, maxValue: config.maxValue },
		grid: { rows: config.rows, columns: config.columns, cells },
		equations: structure.equations,
	}
}

function createSolution(structure: Structure): PuzzleSolution {
	const values: NumberAssignment[] = [...structure.assignments.entries()]
		.map(([key, value]) => {
			const [row, column] = key.split(',').map(Number)
			return { coordinate: { row, column }, value }
		})
		.sort((left, right) => left.coordinate.row - right.coordinate.row || left.coordinate.column - right.coordinate.column)
	return { values }
}

function hideUniqueNumbers(
	rng: SeededRandom,
	config: PuzzleGenerationConfig,
	structure: Structure,
	solution: PuzzleSolution,
): { puzzle: Puzzle; blankCount: number } | undefined {
	const numberCoordinates = solution.values.map((assignment) => assignment.coordinate)
	const requested = config.targetBlankCount ?? Math.floor(numberCoordinates.length * (config.blankRatio ?? 0.4))
	const target = Math.min(Math.max(0, requested), Math.max(0, numberCoordinates.length - 1))
	const blankKeys = new Set<string>()
	for (const coordinate of rng.shuffle(numberCoordinates)) {
		if (blankKeys.size >= target) {
			break
		}
		const key = coordinateKey(coordinate)
		blankKeys.add(key)
		const candidate = createPuzzle(config, structure, blankKeys)
		const validation = validatePuzzle(candidate, {
			arithmetic: config,
			solution,
			requirements: {
				requireHorizontalAndVertical: true,
				requireCrossing: true,
				requireConnected: config.requireConnected,
			},
		})
		const count = countSolutions(candidate, 2, { maxNodes: config.solverMaxNodes })
		if (!validation.valid || count.status !== 'complete' || count.count !== 1) {
			blankKeys.delete(key)
		}
	}
	if (blankKeys.size < target) {
		return undefined
	}
	return { puzzle: createPuzzle(config, structure, blankKeys), blankCount: blankKeys.size }
}

export function generatePuzzle(
	seed: string | number,
	configOverrides: Partial<PuzzleGenerationConfig> = {},
): GeneratedPuzzle {
	const config = normalizeConfig(configOverrides)
	const tripleIndex = buildTriples(config)
	if (tripleIndex.all.length === 0) {
		throw new PuzzleGenerationError('configuration has no valid arithmetic equations')
	}
	const rng = new SeededRandom(deriveSeed(seed, config.generatorVersion))
	for (let attempt = 1; attempt <= config.maxGenerationAttempts; attempt += 1) {
		const structure = buildSolvedStructure(rng, config, tripleIndex)
		if (!structure) {
			continue
		}
		const solution = createSolution(structure)
		const hidden = hideUniqueNumbers(rng, config, structure, solution)
		if (!hidden) {
			continue
		}
		const validation = validatePuzzle(hidden.puzzle, {
			arithmetic: config,
			solution,
			requirements: {
				requireHorizontalAndVertical: true,
				requireCrossing: true,
				requireConnected: config.requireConnected,
			},
		})
		const count = countSolutions(hidden.puzzle, 2, { maxNodes: config.solverMaxNodes })
		if (!validation.valid || count.status !== 'complete' || count.count !== 1) {
			continue
		}
		const metadata: PuzzleMetadata = {
			seed,
			generatorVersion: config.generatorVersion,
			generationAttempts: attempt,
			equationCount: hidden.puzzle.equations.length,
			numberCellCount: validation.numberCellCount,
			blankCount: hidden.blankCount,
			crossingCount: validation.crossingCount,
		}
		return { puzzle: hidden.puzzle, solution, metadata }
	}
	throw new PuzzleGenerationError(
		`unable to generate a unique connected puzzle after ${config.maxGenerationAttempts} attempts`,
	)
}
