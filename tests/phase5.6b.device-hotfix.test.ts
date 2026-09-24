import {
	loadTrackPuzzle,
	type DifficultyTrack,
} from '@/src/core/crossmath'
import {
	computeGameVerticalLayout,
	computeOccupiedBoardLayout,
	getCellGlyphFontSize,
	getGameSourceIdentity,
	getOccupiedBounds,
	toLogicalCoordinate,
	toVisualCoordinate,
	DEFAULT_BOARD_SIZING,
} from '@/src/features/game'
import {
	withLastPlayedTrackLevel,
} from '@/src/features/progress'
import { createDefaultPersistedState } from '@/src/services/persistence'

const CONTENT_WIDTH = 360 // board uses the full measured safe-area width
const CONTROL_WIDTH = 328 // controls retain 16dp horizontal margins
const CONTENT_HEIGHT = 760
const HEADER_HEIGHT = 76

describe('Phase 5.6B hybrid gameplay layout', () => {
	it('keeps semantic source identity stable across route-created objects', () => {
		const first = { kind: 'track', track: 'hard', level: 1 } as const
		const rerendered = { kind: 'track', track: 'hard', level: 1 } as const
		expect(first).not.toBe(rerendered)
		expect(getGameSourceIdentity(first)).toBe(
			getGameSourceIdentity(rerendered),
		)
	})

	it('makes track-played progress idempotent after its first update', () => {
		const fresh = createDefaultPersistedState()
		const marked = withLastPlayedTrackLevel(fresh, 'hard', 1)
		expect(marked).not.toBe(fresh)
		expect(marked.tracks.hard.lastPlayedLevel).toBe(1)
		expect(withLastPlayedTrackLevel(marked, 'hard', 1)).toBe(marked)
	})

	it.each([
		['hard', 1],
		['lobachevsky', 1],
		['lobachevsky', 25],
		['lobachevsky', 50],
	] as const)(
		'%s level %i fits the board and keeps glyphs readable',
		(track: DifficultyTrack, level: number) => {
			const payload = loadTrackPuzzle(track, level)
			const bankItemCount = payload.bank?.items.length ?? 0
			const vertical = computeGameVerticalLayout({
				availableWidth: CONTENT_WIDTH,
				controlAreaWidth: CONTROL_WIDTH,
				availableHeight: CONTENT_HEIGHT,
				headerHeight: HEADER_HEIGHT,
				inputMode: payload.inputMode,
				bankItemCount,
			})
			const board = computeOccupiedBoardLayout(
				payload.puzzle,
				vertical.boardAreaWidth,
				vertical.boardAreaHeight,
				DEFAULT_BOARD_SIZING,
			)
			const widthCellLimit = Math.floor(
				(CONTENT_WIDTH - DEFAULT_BOARD_SIZING.gap * (board.visualColumns - 1)) /
					board.visualColumns,
			)
			const heightCellLimit = Math.floor(
				(vertical.boardAreaHeight -
					DEFAULT_BOARD_SIZING.gap * (board.visualRows - 1)) /
					board.visualRows,
			)
			const geometryLimit = Math.min(
				DEFAULT_BOARD_SIZING.maxCellSize,
				widthCellLimit,
				heightCellLimit,
			)

			expect(board.cellSize).toBe(geometryLimit)
			expect(board.boardWidth).toBeLessThanOrEqual(CONTENT_WIDTH)
			expect(board.boardHeight).toBeLessThanOrEqual(vertical.boardAreaHeight)
			if (geometryLimit >= 32) {
				expect(board.cellSize).toBeGreaterThanOrEqual(32)
			}
			expect(getCellGlyphFontSize(board.cellSize, 'number')).toBeGreaterThanOrEqual(
				board.cellSize >= 28 ? 14 : 12,
			)
			expect(getCellGlyphFontSize(board.cellSize, 'operator')).toBeGreaterThanOrEqual(
				board.cellSize >= 28 ? 14 : 12,
			)
		},
	)

	it('gives a bank board more vertical space than the keypad equivalent', () => {
		const common = {
			availableWidth: CONTENT_WIDTH,
			controlAreaWidth: CONTROL_WIDTH,
			availableHeight: CONTENT_HEIGHT,
			headerHeight: HEADER_HEIGHT,
			bankItemCount: 12,
		}
		const keypad = computeGameVerticalLayout({ ...common, inputMode: 'keypad' })
		const bank = computeGameVerticalLayout({ ...common, inputMode: 'bank' })
		expect(bank.boardAreaHeight).toBeGreaterThan(keypad.boardAreaHeight)
		expect(bank.bannerReservedHeight).toBe(50)
		expect(bank.fits).toBe(true)
	})

	it('compacts only globally empty rows/columns and preserves logical coordinates', () => {
		const puzzle = loadTrackPuzzle('lobachevsky', 1).puzzle
		const bounds = getOccupiedBounds(puzzle)
		const occupiedRows = new Set(puzzle.grid.cells.map((cell) => cell.coordinate.row))
		const occupiedColumns = new Set(
			puzzle.grid.cells.map((cell) => cell.coordinate.column),
		)
		expect(bounds.visualRows).toBe(occupiedRows.size)
		expect(bounds.visualColumns).toBe(occupiedColumns.size)
		for (const cell of puzzle.grid.cells) {
			const visual = toVisualCoordinate(cell.coordinate, bounds)
			expect(toLogicalCoordinate(visual, bounds)).toEqual(cell.coordinate)
		}
	})
})
