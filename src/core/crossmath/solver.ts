import { evaluateArithmetic } from './arithmetic'
import { coordinateKey, equationNumberCoordinates } from './model'
import { validatePuzzle } from './validator'
import type {
	Puzzle,
	PuzzleSolution,
	SolutionCountResult,
	SolverMetrics,
	SolverResult,
} from './types'

const DEFAULT_MAX_NODES = 100_000

type DomainMap = Map<string, Set<number>>

type MutableMetrics = {
	nodesVisited: number
	branchCount: number
	propagationSteps: number
	maxDepth: number
	elapsedMs: number
}

function metricsSnapshot(metrics: MutableMetrics, startedAt: number): SolverMetrics {
	return {
		nodesVisited: metrics.nodesVisited,
		branchCount: metrics.branchCount,
		propagationSteps: metrics.propagationSteps,
		maxDepth: metrics.maxDepth,
		elapsedMs: Date.now() - startedAt,
	}
}

function createDomain(minValue: number, maxValue: number): Set<number> {
	const values = new Set<number>()
	for (let value = minValue; value <= maxValue; value += 1) {
		values.add(value)
	}
	return values
}

function cloneDomains(domains: DomainMap): DomainMap {
	return new Map(
		[...domains.entries()].map(([key, values]) => [key, new Set(values)]),
	)
}

function initializeDomains(puzzle: Puzzle): DomainMap {
	const domains: DomainMap = new Map()
	for (const cell of puzzle.grid.cells) {
		if (cell.kind !== 'number') {
			continue
		}
		const values = cell.state === 'fixed' && cell.value !== null
			? new Set([cell.value])
			: createDomain(puzzle.arithmetic.minValue, puzzle.arithmetic.maxValue)
		domains.set(coordinateKey(cell.coordinate), values)
	}
	return domains
}

/**
 * Generalised arc consistency for each ternary arithmetic relation. Every
 * surviving value must participate in at least one valid tuple, so crossings
 * are propagated before the search branches.
 */
function propagate(puzzle: Puzzle, domains: DomainMap, metrics: MutableMetrics): boolean {
	let changed = true
	while (changed) {
		changed = false
		for (const equation of puzzle.equations) {
			const coordinates = equationNumberCoordinates(equation)
			const equationDomains = coordinates.map((coordinate) => domains.get(coordinateKey(coordinate)))
			if (equationDomains.some((domain) => domain === undefined)) {
				return false
			}
			const [firstDomain, secondDomain, resultDomain] = equationDomains as [Set<number>, Set<number>, Set<number>]
			const supported = [new Set<number>(), new Set<number>(), new Set<number>()]
			for (const first of firstDomain) {
				for (const second of secondDomain) {
					const evaluation = evaluateArithmetic(
						first,
						equation.operator,
						second,
						puzzle.arithmetic,
					)
					if (evaluation.valid && resultDomain.has(evaluation.result)) {
						supported[0].add(first)
						supported[1].add(second)
						supported[2].add(evaluation.result)
					}
				}
			}
			metrics.propagationSteps += 1
			for (let index = 0; index < 3; index += 1) {
				const domain = equationDomains[index] as Set<number>
				for (const value of domain) {
					if (!supported[index].has(value)) {
						domain.delete(value)
						changed = true
					}
				}
				if (domain.size === 0) {
					return false
				}
			}
		}
	}
	return true
}

function chooseBranchVariable(domains: DomainMap): string | undefined {
	let selected: string | undefined
	let smallestSize = Number.POSITIVE_INFINITY
	for (const [key, domain] of domains) {
		if (domain.size > 1 && domain.size < smallestSize) {
			selected = key
			smallestSize = domain.size
		}
	}
	return selected
}

function solutionFromDomains(puzzle: Puzzle, domains: DomainMap): PuzzleSolution {
	return {
		values: puzzle.grid.cells.flatMap((cell) => {
			if (cell.kind !== 'number') {
				return []
			}
			const values = domains.get(coordinateKey(cell.coordinate))
			const value = values ? [...values][0] : undefined
			return value === undefined ? [] : [{ coordinate: cell.coordinate, value }]
		}),
	}
}

export function countSolutions(
	puzzle: Puzzle,
	limit = 2,
	options: { readonly maxNodes?: number } = {},
): SolutionCountResult {
	const startedAt = Date.now()
	const metrics: MutableMetrics = {
		nodesVisited: 0,
		branchCount: 0,
		propagationSteps: 0,
		maxDepth: 0,
		elapsedMs: 0,
	}
	const requestedLimit = Math.max(1, Math.min(2, Math.floor(limit)))
	const maxNodes = Math.max(1, options.maxNodes ?? DEFAULT_MAX_NODES)
	const validation = validatePuzzle(puzzle)
	if (!validation.valid) {
		return { count: 0, status: 'complete', metrics: metricsSnapshot(metrics, startedAt) }
	}

	const initialDomains = initializeDomains(puzzle)
	let count = 0
	let safetyLimitHit = false
	const search = (domains: DomainMap, depth: number): void => {
		if (safetyLimitHit || count >= requestedLimit) {
			return
		}
		metrics.nodesVisited += 1
		metrics.maxDepth = Math.max(metrics.maxDepth, depth)
		if (metrics.nodesVisited > maxNodes) {
			safetyLimitHit = true
			return
		}
		const nextDomains = cloneDomains(domains)
		if (!propagate(puzzle, nextDomains, metrics)) {
			return
		}
		const branchKey = chooseBranchVariable(nextDomains)
		if (!branchKey) {
			count += 1
			return
		}
		metrics.branchCount += 1
		const values = [...(nextDomains.get(branchKey) as Set<number>)]
		for (const value of values) {
			const branchDomains = cloneDomains(nextDomains)
			branchDomains.set(branchKey, new Set([value]))
			search(branchDomains, depth + 1)
			if (safetyLimitHit || count >= requestedLimit) {
				return
			}
		}
	}
	search(initialDomains, 0)
	return {
		count: Math.min(2, count) as 0 | 1 | 2,
		status: safetyLimitHit ? 'safety-limit' : 'complete',
		metrics: metricsSnapshot(metrics, startedAt),
	}
}

export function solvePuzzle(
	puzzle: Puzzle,
	options: { readonly maxNodes?: number } = {},
): SolverResult {
	const startedAt = Date.now()
	const countResult = countSolutions(puzzle, 2, options)
	let solution: PuzzleSolution | undefined
	if (countResult.count > 0 && countResult.status === 'complete') {
		const domains = initializeDomains(puzzle)
		let found: PuzzleSolution | undefined
		const findOne = (current: DomainMap): void => {
			if (found) {
				return
			}
			const next = cloneDomains(current)
			const localMetrics: MutableMetrics = {
				nodesVisited: 0,
				branchCount: 0,
				propagationSteps: 0,
				maxDepth: 0,
				elapsedMs: 0,
			}
			if (!propagate(puzzle, next, localMetrics)) {
				return
			}
			const key = chooseBranchVariable(next)
			if (!key) {
				found = solutionFromDomains(puzzle, next)
				return
			}
			for (const value of next.get(key) as Set<number>) {
				const branch = cloneDomains(next)
				branch.set(key, new Set([value]))
				findOne(branch)
				if (found) {
					return
				}
			}
		}
		findOne(domains)
		if (found) {
			solution = found
		}
	}
	const status = countResult.status === 'safety-limit'
		? 'safety-limit'
		: countResult.count === 0
			? 'no-solution'
			: countResult.count === 1
				? 'unique'
				: 'multiple'
	return {
		status,
		solutionCount: countResult.count,
		solution,
		metrics: {
			...countResult.metrics,
			elapsedMs: Date.now() - startedAt,
		},
		error: status === 'safety-limit' ? 'solver maxNodes safety limit exceeded' : undefined,
	}
}

export function hasUniqueSolution(
	puzzle: Puzzle,
	options: { readonly maxNodes?: number } = {},
): boolean {
	return solvePuzzle(puzzle, options).status === 'unique'
}
