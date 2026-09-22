/**
 * Pure TypeScript CrossMath engine surface.
 *
 * CRITICAL: this module must stay free of React Native / Expo imports so
 * generator, solver, and uniqueness checks can run under Jest/Node at scale.
 *
 * Phase 0 ships only types + placeholders. Algorithms arrive in Phase 1.
 */

/** Arithmetic operators planned for intersecting equations. */
export type CrossMathOperator = '+' | '-' | '×' | '÷'

/**
 * Placeholder cell kinds for the future board model.
 * Empty value cells are filled by the player; operators/results are givens.
 */
export type CrossMathCellKind =
	| 'empty'
	| 'given'
	| 'operator'
	| 'equals'
	| 'result'
	| 'blocked'

/**
 * Minimal board cell shape reserved for Phase 1.
 * Not used by UI yet.
 */
export type CrossMathCell = {
	row: number
	col: number
	kind: CrossMathCellKind
	value: number | null
	operator?: CrossMathOperator
}

/**
 * Puzzle document placeholder. Generator/solver will populate this later.
 */
export type CrossMathPuzzle = {
	id: string
	width: number
	height: number
	cells: CrossMathCell[]
}

/**
 * Engine API surface reserved for Phase 1 pure-TS implementation.
 */
export type CrossMathEngine = {
	generate: (seed: string) => CrossMathPuzzle
	solve: (puzzle: CrossMathPuzzle) => CrossMathPuzzle | null
	hasUniqueSolution: (puzzle: CrossMathPuzzle) => boolean
}

/**
 * Phase 0 stub — throws until Phase 1 lands the real engine.
 */
export function createCrossMathEngine(): CrossMathEngine {
	const notImplemented = (): never => {
		throw new Error(
			'CrossMath engine is not implemented yet (Phase 1).',
		)
	}

	return {
		generate: notImplemented,
		solve: notImplemented,
		hasUniqueSolution: notImplemented,
	}
}
