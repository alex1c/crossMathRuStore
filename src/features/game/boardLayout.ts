/**
 * Pure board sizing helpers — keep cell math out of React components.
 */

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
}

/**
 * Fit a logical crossword grid into the available area without horizontal scroll.
 * Small puzzles stay capped by maxCellSize; large puzzles shrink toward minCellSize.
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
		}
	}

	const widthGaps = gap * Math.max(0, columns - 1)
	const heightGaps = gap * Math.max(0, rows - 1)
	const byWidth = (availableWidth - widthGaps) / columns
	const byHeight = (availableHeight - heightGaps) / rows
	const raw = Math.min(byWidth, byHeight, maxCellSize)
	const cellSize = Math.max(minCellSize, Math.floor(raw))

	return {
		cellSize,
		boardWidth: cellSize * columns + widthGaps,
		boardHeight: cellSize * rows + heightGaps,
	}
}

/** Default Phase 3 sizing knobs for CrossMath boards. */
export const DEFAULT_BOARD_SIZING = {
	gap: 2,
	minCellSize: 22,
	maxCellSize: 44,
} as const
