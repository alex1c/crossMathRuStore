/**
 * Pure board sizing helpers — keep cell math out of React components.
 *
 * CrossMath grids are sparse: logical 13×13 / 15×15 profiles often occupy a
 * much smaller bounding box. Visual layout must size against occupied cells,
 * not the full logical canvas, while gameplay keeps logical coordinates.
 */

import type { CellCoordinate } from '@/src/core/crossmath'
import type { PlayablePuzzle } from './helpers'

export type OccupiedBounds = {
	readonly minRow: number
	readonly maxRow: number
	readonly minColumn: number
	readonly maxColumn: number
	/** Inclusive occupied row count used for visual sizing. */
	readonly visualRows: number
	/** Inclusive occupied column count used for visual sizing. */
	readonly visualColumns: number
	/** Logical row indices in their original order, with empty rows compacted. */
	readonly rowCoordinates: readonly number[]
	/** Logical column indices in their original order, with empty columns compacted. */
	readonly columnCoordinates: readonly number[]
}

export type BoardLayoutInput = {
	readonly availableWidth: number
	readonly availableHeight: number
	readonly rows: number
	readonly columns: number
	readonly gap: number
	readonly minCellSize: number
	readonly maxCellSize: number
}

export type BoardLayout = {
	readonly cellSize: number
	readonly boardWidth: number
	readonly boardHeight: number
	readonly visualRows: number
	readonly visualColumns: number
}

/**
 * Bounding box of coordinates that actually contain puzzle cells.
 * Empty / absent outer coordinates are excluded from visual sizing.
 */
export function getOccupiedBounds(puzzle: PlayablePuzzle): OccupiedBounds {
	const cells = puzzle.grid.cells
	if (cells.length === 0) {
		return {
			minRow: 0,
			maxRow: 0,
			minColumn: 0,
			maxColumn: 0,
			visualRows: 1,
			visualColumns: 1,
			rowCoordinates: [0],
			columnCoordinates: [0],
		}
	}

	let minRow = Infinity
	let maxRow = -Infinity
	let minColumn = Infinity
	let maxColumn = -Infinity
	for (const cell of cells) {
		minRow = Math.min(minRow, cell.coordinate.row)
		maxRow = Math.max(maxRow, cell.coordinate.row)
		minColumn = Math.min(minColumn, cell.coordinate.column)
		maxColumn = Math.max(maxColumn, cell.coordinate.column)
	}

	const rowCoordinates = [...new Set(cells.map((cell) => cell.coordinate.row))]
		.sort((a, b) => a - b)
	const columnCoordinates = [...new Set(cells.map((cell) => cell.coordinate.column))]
		.sort((a, b) => a - b)
	return {
		minRow,
		maxRow,
		minColumn,
		maxColumn,
		visualRows: rowCoordinates.length,
		visualColumns: columnCoordinates.length,
		rowCoordinates,
		columnCoordinates,
	}
}

/**
 * Map a logical core coordinate into the visual board grid.
 */
export function toVisualCoordinate(
	logical: CellCoordinate,
	bounds: OccupiedBounds,
): CellCoordinate {
	return {
		row: bounds.rowCoordinates.indexOf(logical.row),
		column: bounds.columnCoordinates.indexOf(logical.column),
	}
}

/**
 * Map a visual board coordinate back to the logical core coordinate.
 */
export function toLogicalCoordinate(
	visual: CellCoordinate,
	bounds: OccupiedBounds,
): CellCoordinate {
	return {
		row: bounds.rowCoordinates[visual.row] ?? bounds.minRow + visual.row,
		column:
			bounds.columnCoordinates[visual.column] ??
			bounds.minColumn + visual.column,
	}
}

/**
 * Fit a visual crossword grid into the available area without horizontal scroll.
 * Pass occupied visualRows/visualColumns — not the sparse logical canvas size.
 * Small puzzles stay capped by maxCellSize; large ones shrink toward minCellSize.
 */
export function computeBoardLayout(input: BoardLayoutInput): BoardLayout {
	const {
		availableWidth,
		availableHeight,
		rows,
		columns,
		gap,
		minCellSize,
		maxCellSize,
	} = input

	if (
		rows < 1 ||
		columns < 1 ||
		availableWidth <= 0 ||
		availableHeight <= 0
	) {
		return {
			cellSize: minCellSize,
			boardWidth: minCellSize,
			boardHeight: minCellSize,
			visualRows: Math.max(1, rows),
			visualColumns: Math.max(1, columns),
		}
	}

	const widthGaps = gap * Math.max(0, columns - 1)
	const heightGaps = gap * Math.max(0, rows - 1)
	const byWidth = (availableWidth - widthGaps) / columns
	const byHeight = (availableHeight - heightGaps) / rows
	const raw = Math.min(byWidth, byHeight, maxCellSize)
	// minCellSize is a preferred target, not permission to overflow and clip a
	// dense board. Preserve the full board inside its measured area.
	const cellSize = Math.max(1, Math.floor(raw))

	return {
		cellSize,
		boardWidth: cellSize * columns + widthGaps,
		boardHeight: cellSize * rows + heightGaps,
		visualRows: rows,
		visualColumns: columns,
	}
}

/**
 * Convenience: occupied bounds + layout against available board area.
 */
export function computeOccupiedBoardLayout(
	puzzle: PlayablePuzzle,
	availableWidth: number,
	availableHeight: number,
	sizing: {
		readonly gap: number
		readonly minCellSize: number
		readonly maxCellSize: number
	} = DEFAULT_BOARD_SIZING,
): BoardLayout & { readonly bounds: OccupiedBounds } {
	const bounds = getOccupiedBounds(puzzle)
	const layout = computeBoardLayout({
		availableWidth,
		availableHeight,
		rows: bounds.visualRows,
		columns: bounds.visualColumns,
		gap: sizing.gap,
		minCellSize: sizing.minCellSize,
		maxCellSize: sizing.maxCellSize,
	})
	return { ...layout, bounds }
}

/** Default Phase 3.1 sizing knobs for CrossMath boards. */
export const DEFAULT_BOARD_SIZING = {
	gap: 1,
	minCellSize: 24,
	/** Caps Easy so a tiny sparse puzzle does not become huge. */
	maxCellSize: 56,
} as const

export type CellGlyphKind = 'number' | 'operator' | 'equals'

/** Readable type scale that stays legible in dense cells without auto-shrinking. */
export function getCellGlyphFontSize(
	cellSize: number,
	kind: CellGlyphKind,
): number {
	const factor = kind === 'operator' ? 0.54 : 0.5
	const readableFloor = cellSize >= 22 ? 14 : 12
	return Math.min(24, Math.max(readableFloor, Math.floor(cellSize * factor)))
}
