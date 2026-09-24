import {
	createGameState,
	gameReducer,
	getBlankDisplayValue,
	isBlankShowingError,
	getFillProgress,
	appendDraftDigit,
	computeBoardLayout,
	DEFAULT_BOARD_SIZING,
} from '@/src/features/game'
import {
	generateCampaignPuzzle,
	generatePuzzleForProfile,
	getDifficultyProfile,
	coordinateKey,
	type PuzzleSolution,
} from '@/src/core/crossmath'

function loadLevel(level: number) {
	const profiled = generateCampaignPuzzle(level)
	const state = createGameState({
		puzzle: profiled.generated.puzzle,
		solution: profiled.generated.solution,
		source: { kind: 'track', track: 'easy', level },
		title: `Уровень ${level}`,
		subtitle: 'test',
		startedAt: 1_000_000,
	})
	return { profiled, state }
}

function firstBlank(puzzle: { readonly grid: { readonly cells: readonly { kind: string; state?: string; coordinate: { row: number; column: number } }[] } }) {
	const blank = puzzle.grid.cells.find(
		(cell) => cell.kind === 'number' && cell.state === 'blank',
	)
	if (!blank || blank.kind !== 'number') {
		throw new Error('expected a blank cell')
	}
	return blank.coordinate
}

function solutionValue(
	solution: PuzzleSolution,
	row: number,
	column: number,
): number {
	const found = solution.values.find(
		(item) =>
			item.coordinate.row === row && item.coordinate.column === column,
	)
	if (!found) {
		throw new Error('missing solution value')
	}
	return found.value
}

describe('gameplay reducer', () => {
	it('initializes entries for every blank as null', () => {
		const { state } = loadLevel(1)
		const blanks = state.puzzle.grid.cells.filter(
			(cell) => cell.kind === 'number' && cell.state === 'blank',
		)
		expect(Object.keys(state.entries)).toHaveLength(blanks.length)
		expect(
			Object.values(state.entries).every((value) => value === null),
		).toBe(true)
		expect(getFillProgress(state)).toEqual({
			filled: 0,
			total: blanks.length,
		})
	})

	it('rejects edits to fixed cells via selection', () => {
		const { state } = loadLevel(1)
		const fixed = state.puzzle.grid.cells.find(
			(cell) => cell.kind === 'number' && cell.state === 'fixed',
		)
		expect(fixed).toBeTruthy()
		const next = gameReducer(state, {
			type: 'SELECT_CELL',
			coordinate: fixed!.coordinate,
		})
		expect(next.selected).toBeNull()
	})

	it('sets, replaces, deletes a user entry and supports undo', () => {
		const { state, profiled } = loadLevel(1)
		const blank = firstBlank(state.puzzle)
		const correct = solutionValue(
			profiled.generated.solution,
			blank.row,
			blank.column,
		)
		const wrong = correct === 1 ? 2 : 1
		const key = coordinateKey(blank)

		let current = gameReducer(state, {
			type: 'SELECT_CELL',
			coordinate: blank,
		})
		current = gameReducer(current, { type: 'DIGIT', digit: wrong })
		expect(getBlankDisplayValue(current, blank)).toBe(String(wrong))
		current = gameReducer(current, { type: 'CONFIRM' })
		expect(current.entries[key]).toBe(wrong)
		expect(current.mistakes).toBe(1)
		expect(isBlankShowingError(current, blank)).toBe(true)

		// Delete wrong value before completing the puzzle.
		current = gameReducer(current, {
			type: 'SELECT_CELL',
			coordinate: blank,
		})
		current = gameReducer(current, { type: 'DELETE' })
		expect(current.entries[key]).toBeNull()

		current = gameReducer(current, { type: 'UNDO' })
		expect(current.entries[key]).toBe(wrong)

		// Replace with the correct value (may complete a 1-blank Easy puzzle).
		current = gameReducer(current, {
			type: 'SELECT_CELL',
			coordinate: blank,
		})
		current = gameReducer(current, { type: 'DELETE' })
		for (const digit of String(correct).split('').map(Number)) {
			current = gameReducer(current, { type: 'DIGIT', digit })
		}
		current = gameReducer(current, { type: 'CONFIRM' })
		expect(current.entries[key]).toBe(correct)
		expect(isBlankShowingError(current, blank)).toBe(false)
	})

	it('applies hint and can complete a single-blank easy puzzle', () => {
		const tutorialProfile = getDifficultyProfile('easy')
		const profiled = generatePuzzleForProfile('gameplay-tutorial-fixture', {
			...tutorialProfile,
			id: 'test-tutorial',
			scoreRange: { min: 0, max: 100 },
			config: {
				...tutorialProfile.config,
				targetEquationCount: 3,
				targetBlankCount: 1,
			},
		})
		const state = createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source: { kind: 'track', track: 'easy', level: 1 },
			title: 'Tutorial fixture',
			subtitle: 'test',
			startedAt: 1_000_000,
		})
		const blank = firstBlank(state.puzzle)
		let current = gameReducer(state, {
			type: 'SELECT_CELL',
			coordinate: blank,
		})
		current = gameReducer(current, { type: 'HINT', now: 1_000_500 })
		expect(current.hintsUsed).toBe(1)
		expect(current.status).toBe('completed')
		expect(current.completedAt).toBe(1_000_500)
		expect(getFillProgress(current).filled).toBe(
			getFillProgress(current).total,
		)
	})

	it('does not auto-complete when blanks are filled incorrectly', () => {
		const { state, profiled } = loadLevel(1)
		const blank = firstBlank(state.puzzle)
		const correct = solutionValue(
			profiled.generated.solution,
			blank.row,
			blank.column,
		)
		const wrong =
			correct === state.puzzle.arithmetic.maxValue
				? correct - 1
				: correct + 1

		let current = gameReducer(state, {
			type: 'SELECT_CELL',
			coordinate: blank,
		})
		for (const digit of String(wrong).split('').map(Number)) {
			current = gameReducer(current, { type: 'DIGIT', digit })
		}
		current = gameReducer(current, { type: 'CONFIRM' })
		expect(current.status).toBe('playing')
		expect(current.mistakes).toBeGreaterThanOrEqual(1)
	})
})

describe('draft digit helper', () => {
	it('allows building multi-digit values up to maxValue', () => {
		expect(appendDraftDigit('', 2, 24)).toBe('2')
		expect(appendDraftDigit('2', 4, 24)).toBe('24')
		expect(appendDraftDigit('2', 5, 24)).toBeNull()
		expect(appendDraftDigit('0', 1, 24)).toBeNull()
	})
})

describe('board layout sizing', () => {
	it('caps tiny grids and shrinks dense visual grids', () => {
		const easy = computeBoardLayout({
			availableWidth: 360,
			availableHeight: 400,
			rows: 5,
			columns: 5,
			gap: DEFAULT_BOARD_SIZING.gap,
			minCellSize: DEFAULT_BOARD_SIZING.minCellSize,
			maxCellSize: DEFAULT_BOARD_SIZING.maxCellSize,
		})
		expect(easy.cellSize).toBeLessThanOrEqual(
			DEFAULT_BOARD_SIZING.maxCellSize,
		)
		expect(easy.boardWidth).toBeLessThanOrEqual(360)

		const dense = computeBoardLayout({
			availableWidth: 360,
			availableHeight: 320,
			rows: 9,
			columns: 9,
			gap: DEFAULT_BOARD_SIZING.gap,
			minCellSize: DEFAULT_BOARD_SIZING.minCellSize,
			maxCellSize: DEFAULT_BOARD_SIZING.maxCellSize,
		})
		expect(dense.cellSize).toBeGreaterThanOrEqual(
			DEFAULT_BOARD_SIZING.minCellSize,
		)
		expect(dense.boardWidth).toBeLessThanOrEqual(360)
		expect(dense.cellSize).toBeLessThanOrEqual(easy.cellSize)
	})
})

