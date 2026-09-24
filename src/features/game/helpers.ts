import type {
	CellCoordinate,
	NumberCell,
	Puzzle,
	PuzzleSolution,
} from '@/src/core/crossmath'
import type { HybridPuzzle } from '@/src/core/crossmath/hybrid'
import {
	coordinateKey,
	coordinatesEqual,
} from '@/src/core/crossmath'

/** Binary or hybrid puzzle sharing the same grid cell model. */
export type PlayablePuzzle = Puzzle | HybridPuzzle

/**
 * Collect blank number cells in stable row/column order.
 */
export function listBlankCells(puzzle: PlayablePuzzle): readonly NumberCell[] {
	return puzzle.grid.cells
		.filter(
			(cell): cell is NumberCell =>
				cell.kind === 'number' && cell.state === 'blank',
		)
		.slice()
		.sort((a, b) =>
			a.coordinate.row === b.coordinate.row
				? a.coordinate.column - b.coordinate.column
				: a.coordinate.row - b.coordinate.row,
		)
}

/**
 * Map the known generated solution to coordinate keys for O(1) checks.
 */
export function buildSolutionMap(
	solution: PuzzleSolution,
): Readonly<Record<string, number>> {
	const map: Record<string, number> = {}
	for (const assignment of solution.values) {
		map[coordinateKey(assignment.coordinate)] = assignment.value
	}
	return map
}

/**
 * Initial user entries: every blank starts empty (null).
 */
export function createInitialEntries(
	puzzle: PlayablePuzzle,
): Record<string, number | null> {
	const entries: Record<string, number | null> = {}
	for (const cell of listBlankCells(puzzle)) {
		entries[coordinateKey(cell.coordinate)] = null
	}
	return entries
}

/**
 * Soft highlight set: equations (binary or long) that touch `coordinate`.
 */
export function findRelatedCoordinates(
	puzzle: PlayablePuzzle,
	coordinate: CellCoordinate | null,
): ReadonlySet<string> {
	const related = new Set<string>()
	if (!coordinate) {
		return related
	}
	for (const equation of puzzle.equations) {
		if (equation.cells.some((cell) => coordinatesEqual(cell, coordinate))) {
			for (const cell of equation.cells) {
				related.add(coordinateKey(cell))
			}
		}
	}
	return related
}

/**
 * Next blank after `current` in reading order (wraps). Returns null if none.
 */
export function nextBlankCoordinate(
	puzzle: PlayablePuzzle,
	current: CellCoordinate,
): CellCoordinate | null {
	const blanks = listBlankCells(puzzle)
	if (blanks.length === 0) {
		return null
	}
	const index = blanks.findIndex((cell) =>
		coordinatesEqual(cell.coordinate, current),
	)
	if (index < 0) {
		return blanks[0]?.coordinate ?? null
	}
	const next = blanks[(index + 1) % blanks.length]
	return next?.coordinate ?? null
}

/**
 * True when every blank has a non-null entry.
 */
export function areAllBlanksFilled(
	entries: Readonly<Record<string, number | null>>,
): boolean {
	return Object.values(entries).every((value) => value !== null)
}

/**
 * True when filled entries match the known solution on every blank.
 */
export function isSolutionCorrect(
	entries: Readonly<Record<string, number | null>>,
	solutionByKey: Readonly<Record<string, number>>,
): boolean {
	for (const [key, value] of Object.entries(entries)) {
		if (value === null) {
			return false
		}
		if (solutionByKey[key] !== value) {
			return false
		}
	}
	return true
}

/**
 * Append a digit to a draft string without exceeding arithmetic maxValue.
 * Returns null when the digit would create an out-of-range value.
 */
export function appendDraftDigit(
	draft: string,
	digit: number,
	maxValue: number,
): string | null {
	if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
		return null
	}
	const next = `${draft}${digit}`
	if (next.length > 1 && next.startsWith('0')) {
		return null
	}
	const numeric = Number(next)
	if (!Number.isSafeInteger(numeric) || numeric > maxValue) {
		return null
	}
	return next
}

/**
 * Format elapsed milliseconds as mm:ss for the completion / HUD timer.
 */
export function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
