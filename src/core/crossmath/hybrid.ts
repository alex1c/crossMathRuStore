/**
 * Production hybrid / long-expression surface (promoted from Phase 5.5).
 */

import type { CellCoordinate } from './types'
import type { HybridEquation, HybridPuzzle } from './experimental'
import { coordinateKey } from './model'

export type {
	ExpressionEquation,
	ExpressionEvaluation,
	ExpressionPuzzle,
	GeneratedHybridPuzzle,
	HybridEquation,
	HybridPuzzle,
	HybridGenerationConfig,
} from './experimental'

export {
	DEFAULT_HYBRID_GENERATION_CONFIG,
	analyzeHybridPuzzle,
	countHybridSolutions,
	evaluateExpression,
	generateHybridPuzzle,
	measureOccupiedDensity,
	solveHybridPuzzle,
	validatePregeneratedCampaignCatalog,
} from './experimental'

export function isLongExpressionEquation(
	equation: HybridEquation,
): boolean {
	return equation.cells.length > 5
}

export function hybridNumberCoordinates(
	equation: HybridEquation,
): readonly CellCoordinate[] {
	return equation.cells.filter((_, index) => index % 2 === 0)
}

/**
 * Soft highlight set for hybrid + binary equations sharing a coordinate.
 */
export function findHybridRelatedCoordinates(
	puzzle: HybridPuzzle,
	coordinate: CellCoordinate | null,
): ReadonlySet<string> {
	const related = new Set<string>()
	if (!coordinate) {
		return related
	}
	const target = coordinateKey(coordinate)
	for (const equation of puzzle.equations) {
		const touches = equation.cells.some(
			(cell) => coordinateKey(cell) === target,
		)
		if (!touches) {
			continue
		}
		for (const cell of equation.cells) {
			related.add(coordinateKey(cell))
		}
	}
	return related
}

export function countHybridBlanks(puzzle: HybridPuzzle): number {
	return puzzle.grid.cells.filter(
		(cell) => cell.kind === 'number' && cell.state === 'blank',
	).length
}

/**
 * Occupied bounding-box density for hybrid/binary grids (cell geometry only).
 */
export function measureHybridOccupiedDensity(puzzle: HybridPuzzle): {
	readonly occupiedCellCount: number
	readonly occupiedBoundingBoxArea: number
	readonly occupiedDensity: number
} {
	const cells = puzzle.grid.cells
	if (cells.length === 0) {
		return {
			occupiedCellCount: 0,
			occupiedBoundingBoxArea: 1,
			occupiedDensity: 0,
		}
	}
	const rows = cells.map((cell) => cell.coordinate.row)
	const columns = cells.map((cell) => cell.coordinate.column)
	const area =
		(Math.max(...rows) - Math.min(...rows) + 1) *
		(Math.max(...columns) - Math.min(...columns) + 1)
	return {
		occupiedCellCount: cells.length,
		occupiedBoundingBoxArea: Math.max(1, area),
		occupiedDensity: Math.round((cells.length / Math.max(1, area)) * 1000) / 1000,
	}
}
