import { generateCampaignPuzzle } from '@/src/core/crossmath'
import {
	DEFAULT_BOARD_SIZING,
	computeBoardLayout,
	computeControlsHeight,
	computeGameVerticalLayout,
	computeOccupiedBoardLayout,
	getOccupiedBounds,
	toLogicalCoordinate,
	toVisualCoordinate,
} from '@/src/features/game'

describe('occupied board bounds', () => {
	it('excludes absent outer coordinates on sparse campaign puzzles', () => {
		const cases = [
			{ level: 1, logical: [9, 9] as const },
			{ level: 51, logical: [11, 11] as const },
			{ level: 160, logical: [13, 13] as const },
			{ level: 220, logical: [15, 15] as const },
		]

		for (const item of cases) {
			const profiled = generateCampaignPuzzle(item.level)
			const puzzle = profiled.generated.puzzle
			expect(puzzle.grid.rows).toBe(item.logical[0])
			expect(puzzle.grid.columns).toBe(item.logical[1])

			const bounds = getOccupiedBounds(puzzle)
			expect(bounds.visualRows).toBeLessThan(puzzle.grid.rows)
			expect(bounds.visualColumns).toBeLessThanOrEqual(puzzle.grid.columns)
			expect(bounds.visualRows).toBe(
				bounds.maxRow - bounds.minRow + 1,
			)
			expect(bounds.visualColumns).toBe(
				bounds.maxColumn - bounds.minColumn + 1,
			)

			// Every real cell stays inside the occupied box.
			for (const cell of puzzle.grid.cells) {
				expect(cell.coordinate.row).toBeGreaterThanOrEqual(bounds.minRow)
				expect(cell.coordinate.row).toBeLessThanOrEqual(bounds.maxRow)
				expect(cell.coordinate.column).toBeGreaterThanOrEqual(
					bounds.minColumn,
				)
				expect(cell.coordinate.column).toBeLessThanOrEqual(
					bounds.maxColumn,
				)
			}
		}
	})

	it('normalizes visual coordinates without mutating logical ones', () => {
		const puzzle = generateCampaignPuzzle(220).generated.puzzle
		const bounds = getOccupiedBounds(puzzle)
		const sample = puzzle.grid.cells[0]!.coordinate
		const visual = toVisualCoordinate(sample, bounds)
		const logical = toLogicalCoordinate(visual, bounds)
		expect(logical).toEqual(sample)
		expect(visual.row).toBe(sample.row - bounds.minRow)
		expect(visual.column).toBe(sample.column - bounds.minColumn)
	})

	it('gives sparse expert puzzles larger cells than full-logical sizing', () => {
		const puzzle = generateCampaignPuzzle(220).generated.puzzle
		const availableWidth = 360
		const availableHeight = 360

		const oldStyle = computeBoardLayout({
			availableWidth,
			availableHeight,
			rows: puzzle.grid.rows,
			columns: puzzle.grid.columns,
			gap: DEFAULT_BOARD_SIZING.gap,
			minCellSize: DEFAULT_BOARD_SIZING.minCellSize,
			maxCellSize: DEFAULT_BOARD_SIZING.maxCellSize,
		})
		const occupied = computeOccupiedBoardLayout(
			puzzle,
			availableWidth,
			availableHeight,
		)

		expect(occupied.visualRows).toBeLessThan(puzzle.grid.rows)
		expect(occupied.cellSize).toBeGreaterThan(oldStyle.cellSize)
		expect(occupied.boardWidth).toBeLessThanOrEqual(availableWidth)
		expect(occupied.boardHeight).toBeLessThanOrEqual(availableHeight)
		expect(occupied.cellSize).toBeLessThanOrEqual(
			DEFAULT_BOARD_SIZING.maxCellSize,
		)
	})

	it('caps tiny Easy puzzles with maxCellSize', () => {
		const puzzle = generateCampaignPuzzle(1).generated.puzzle
		const layout = computeOccupiedBoardLayout(puzzle, 400, 500)
		expect(layout.cellSize).toBeLessThanOrEqual(
			DEFAULT_BOARD_SIZING.maxCellSize,
		)
		expect(layout.boardWidth).toBeLessThanOrEqual(400)
		expect(layout.boardHeight).toBeLessThanOrEqual(500)
	})
})

describe('game vertical layout fit', () => {
	it('fits header + board + controls + banner into a tall phone viewport', () => {
		const layout = computeGameVerticalLayout({
			availableWidth: 360,
			availableHeight: 700,
			headerHeight: 58,
			sectionGap: 8,
			bannerReservedHeight: 50,
			bannerGap: 8,
		})

		expect(layout.fits).toBe(true)
		expect(layout.bannerReservedHeight).toBe(50)
		expect(layout.totalHeight).toBeLessThanOrEqual(701)
		expect(layout.controls.touchHeight).toBeGreaterThanOrEqual(40)
		expect(layout.boardAreaHeight).toBeGreaterThanOrEqual(120)
		expect(layout.controls.totalHeight).toBe(
			computeControlsHeight(
				layout.controls.touchHeight,
				layout.controls.rowGap,
				layout.controls.sectionGap,
			),
		)
		expect(
			layout.headerHeight +
				layout.sectionGap * 2 +
				layout.boardAreaHeight +
				layout.controls.totalHeight +
				layout.bannerGap +
				layout.bannerReservedHeight,
		).toBe(layout.totalHeight)
	})

	it('compacts controls on a shorter viewport while keeping banner + touch targets', () => {
		const layout = computeGameVerticalLayout({
			availableWidth: 360,
			availableHeight: 520,
			headerHeight: 58,
			sectionGap: 8,
			bannerReservedHeight: 50,
			bannerGap: 8,
		})

		expect(layout.fits).toBe(true)
		expect(layout.bannerReservedHeight).toBe(50)
		expect(layout.controls.touchHeight).toBeGreaterThanOrEqual(40)
		expect(layout.controls.touchHeight).toBeLessThanOrEqual(48)
		expect(layout.totalHeight).toBeLessThanOrEqual(521)
	})

	it('keeps representative campaign boards inside allocated board area with banner', () => {
		const vertical = computeGameVerticalLayout({
			availableWidth: 360,
			availableHeight: 700,
			headerHeight: 58,
			bannerReservedHeight: 50,
			bannerGap: 8,
		})

		for (const level of [1, 51, 160, 220]) {
			const puzzle = generateCampaignPuzzle(level).generated.puzzle
			const board = computeOccupiedBoardLayout(
				puzzle,
				vertical.boardAreaWidth,
				vertical.boardAreaHeight,
			)
			expect(board.boardWidth).toBeLessThanOrEqual(
				vertical.boardAreaWidth,
			)
			expect(board.boardHeight).toBeLessThanOrEqual(
				vertical.boardAreaHeight,
			)
			expect(board.cellSize).toBeGreaterThanOrEqual(
				DEFAULT_BOARD_SIZING.minCellSize,
			)
			expect(vertical.fits).toBe(true)
		}
	})
})
