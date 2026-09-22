import { evaluateArithmetic } from './arithmetic'
import {
	coordinateKey,
	equationNumberCoordinates,
} from './model'
import { solvePuzzle } from './solver'
import { validatePuzzle } from './validator'
import type {
	ArithmeticOperator,
	DifficultyAnalysis,
	DifficultyMetrics,
	Puzzle,
} from './types'

const DEFAULT_DIFFICULTY_MAX_NODES = 100_000

type SupportSets = Map<string, Set<number>>

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

function rangeSet(minValue: number, maxValue: number): Set<number> {
	const values = new Set<number>()
	for (let value = minValue; value <= maxValue; value += 1) {
		values.add(value)
	}
	return values
}

function intersect(left: Set<number>, right: Set<number>): Set<number> {
	return new Set([...left].filter((value) => right.has(value)))
}

function collectSupports(puzzle: Puzzle, domains: Map<string, Set<number>>): SupportSets {
	const supports: SupportSets = new Map()
	for (const equation of puzzle.equations) {
		const coordinates = equationNumberCoordinates(equation)
		const equationDomains = coordinates.map((coordinate) => domains.get(coordinateKey(coordinate)))
		if (equationDomains.some((domain) => domain === undefined)) {
			continue
		}
		const [firstDomain, secondDomain, resultDomain] = equationDomains as [Set<number>, Set<number>, Set<number>]
		const equationSupports = [new Set<number>(), new Set<number>(), new Set<number>()]
		for (const first of firstDomain) {
			for (const second of secondDomain) {
				const evaluation = evaluateArithmetic(
					first,
					equation.operator,
					second,
					puzzle.arithmetic,
				)
				if (evaluation.valid && resultDomain.has(evaluation.result)) {
					equationSupports[0].add(first)
					equationSupports[1].add(second)
					equationSupports[2].add(evaluation.result)
				}
			}
		}
		for (let index = 0; index < 3; index += 1) {
			const key = coordinateKey(coordinates[index])
			const existing = supports.get(key)
			supports.set(key, existing ? intersect(existing, equationSupports[index]) : equationSupports[index])
		}
	}
	return supports
}

function operationMetrics(puzzle: Puzzle): {
	mix: Readonly<Partial<Record<ArithmeticOperator, number>>>
	multiplicationFrequency: number
	divisionFrequency: number
} {
	const counts: Partial<Record<ArithmeticOperator, number>> = {}
	for (const equation of puzzle.equations) {
		counts[equation.operator] = (counts[equation.operator] ?? 0) + 1
	}
	const equationCount = Math.max(1, puzzle.equations.length)
	return {
		mix: Object.fromEntries(
			Object.entries(counts).map(([operator, count]) => [operator, (count as number) / equationCount]),
		) as Partial<Record<ArithmeticOperator, number>>,
		multiplicationFrequency: (counts.multiply ?? 0) / equationCount,
		divisionFrequency: (counts.divide ?? 0) / equationCount,
	}
}

function scoreDifficulty(metrics: DifficultyMetrics): number {
	const blankPressure = clamp(metrics.blankCount / 20, 0, 1)
	const deductionPressure = metrics.blankCount === 0
		? 0
		: 1 - metrics.initialForcedCells / metrics.blankCount
	const wavePressure = clamp(Math.max(0, metrics.propagationWaves - 1) / 6, 0, 1)
	const ambiguityPressure = clamp((metrics.averageCandidatesBeforeResolution - 1) / 8, 0, 1)
	const unresolvedPressure = metrics.blankCount === 0
		? 0
		: metrics.unresolvedAfterLogic / metrics.blankCount
	const operationPressure = clamp(
		metrics.multiplicationFrequency * 0.55 + metrics.divisionFrequency * 0.9,
		0,
		1,
	)
	const structurePressure = clamp(metrics.crossingCount / 10, 0, 1)
	const searchPressure = clamp(Math.log2(Math.max(1, metrics.solverNodes)) / 8, 0, 1)
	const score =
		blankPressure * 8 +
		deductionPressure * 24 +
		wavePressure * 20 +
		ambiguityPressure * 18 +
		unresolvedPressure * 10 +
		operationPressure * 8 +
		structurePressure * 7 +
		searchPressure * 5
	return Math.round(clamp(score, 0, 100) * 100) / 100
}

function getBlankKeys(puzzle: Puzzle): string[] {
	return puzzle.grid.cells
		.filter((cell) => cell.kind === 'number' && cell.state === 'blank')
		.map((cell) => coordinateKey(cell.coordinate))
}

function calculateLogicMetrics(
	puzzle: Puzzle,
	blankKeys: readonly string[],
): Pick<
		DifficultyMetrics,
		| 'initialForcedCells'
		| 'forcedCellsByWave'
		| 'propagationWaves'
		| 'longestForcedChain'
		| 'unresolvedAfterLogic'
		| 'averageCandidatesBeforeResolution'
		| 'maxCandidatesBeforeResolution'
		| 'ambiguityMoments'
		| 'choiceWaves'
	> & { logicSolved: boolean } {
	const domains = new Map<string, Set<number>>()
	for (const cell of puzzle.grid.cells) {
		if (cell.kind !== 'number') {
			continue
		}
		domains.set(
			coordinateKey(cell.coordinate),
			cell.state === 'fixed' && cell.value !== null
				? new Set([cell.value])
				: rangeSet(puzzle.arithmetic.minValue, puzzle.arithmetic.maxValue),
		)
	}

	const blankSet = new Set(blankKeys)
	const forcedCellsByWave: number[] = []
	let ambiguityMoments = 0
	let choiceWaves = 0
	let maxCandidatesBeforeResolution = 0
	let candidateObservationTotal = 0
	let candidateObservationCount = 0
	let wave = 0
	while (true) {
		const supports = collectSupports(puzzle, domains)
		const forced = new Map<string, number>()
		let waveHasChoice = false
		for (const key of blankSet) {
			const current = domains.get(key) ?? new Set<number>()
			if (current.size <= 1) {
				continue
			}
			const candidates = supports.has(key) ? intersect(current, supports.get(key) as Set<number>) : current
			domains.set(key, candidates)
			if (candidates.size > 1) {
				ambiguityMoments += 1
				waveHasChoice = true
			}
			candidateObservationTotal += candidates.size
			candidateObservationCount += 1
			maxCandidatesBeforeResolution = Math.max(maxCandidatesBeforeResolution, candidates.size)
			if (candidates.size === 1) {
				forced.set(key, [...candidates][0])
			}
		}
		if (waveHasChoice) {
			choiceWaves += 1
		}
		if (forced.size === 0) {
			break
		}
		forcedCellsByWave.push(forced.size)
		for (const [key, value] of forced) {
			domains.set(key, new Set([value]))
		}
		wave += 1
		if (wave > blankKeys.length + 1) {
			break
		}
	}

	const unresolvedAfterLogic = blankKeys.filter((key) => (domains.get(key)?.size ?? 0) > 1).length
	const averageCandidatesBeforeResolution = candidateObservationCount === 0
		? 0
		: Math.round((candidateObservationTotal / candidateObservationCount) * 100) / 100
	return {
		initialForcedCells: forcedCellsByWave[0] ?? 0,
		forcedCellsByWave,
		propagationWaves: forcedCellsByWave.length,
		longestForcedChain: forcedCellsByWave.length,
		unresolvedAfterLogic,
		averageCandidatesBeforeResolution,
		maxCandidatesBeforeResolution,
		ambiguityMoments,
		choiceWaves,
		logicSolved: unresolvedAfterLogic === 0,
	}
}

export function analyzeDifficulty(
	puzzle: Puzzle,
	options: { readonly maxNodes?: number } = {},
): DifficultyAnalysis {
	const validation = validatePuzzle(puzzle)
	if (!validation.valid) {
		throw new Error(`cannot analyze invalid puzzle: ${validation.errors.join('; ')}`)
	}
	const solver = solvePuzzle(puzzle, {
		maxNodes: options.maxNodes ?? DEFAULT_DIFFICULTY_MAX_NODES,
	})
	const blankCount = validation.blankCount
	const fixedClueCount = validation.numberCellCount - blankCount
	const operations = operationMetrics(puzzle)
	const logic = calculateLogicMetrics(puzzle, getBlankKeys(puzzle))
	const metrics: DifficultyMetrics = {
		blankCount,
		fixedClueCount,
		clueRatio: validation.numberCellCount === 0 ? 1 : fixedClueCount / validation.numberCellCount,
		equationCount: validation.equationCount,
		crossingCount: validation.crossingCount,
		connectedComponents: validation.connectedComponents,
		structuralDensity: puzzle.grid.rows * puzzle.grid.columns === 0
			? 0
			: puzzle.grid.cells.length / (puzzle.grid.rows * puzzle.grid.columns),
		...logic,
		operationMix: operations.mix,
		multiplicationFrequency: operations.multiplicationFrequency,
		divisionFrequency: operations.divisionFrequency,
		numericRange: puzzle.arithmetic.maxValue - puzzle.arithmetic.minValue,
		solverBranches: solver.metrics.branchCount,
		solverNodes: solver.metrics.nodesVisited,
		solverMaxDepth: solver.metrics.maxDepth,
	}
	return {
		score: scoreDifficulty(metrics),
		metrics,
		solver,
		logicSolved: logic.logicSolved,
	}
}
