import type {
	CellCoordinate,
	Puzzle,
	PuzzleSolution,
} from '@/src/core/crossmath'
import {
	coordinateKey,
	coordinatesEqual,
	getCell,
} from '@/src/core/crossmath'
import type { GameSource } from './source'
import {
	appendDraftDigit,
	areAllBlanksFilled,
	buildSolutionMap,
	createInitialEntries,
	isSolutionCorrect,
	listBlankCells,
	nextBlankCoordinate,
} from './helpers'

export type GameStatus = 'playing' | 'completed'

export type UndoEntry = {
	readonly coordinate: CellCoordinate
	readonly previousValue: number | null
	readonly nextValue: number | null
}

export type GameState = {
	readonly puzzle: Puzzle
	readonly solutionByKey: Readonly<Record<string, number>>
	readonly entries: Readonly<Record<string, number | null>>
	readonly selected: CellCoordinate | null
	/** In-progress multi-digit buffer for the selected blank. */
	readonly draft: string
	readonly history: readonly UndoEntry[]
	readonly mistakes: number
	readonly hintsUsed: number
	readonly startedAt: number
	readonly completedAt: number | null
	readonly status: GameStatus
	/**
	 * Future Settings: "Показывать ошибки сразу".
	 * Phase 3 defaults to ON without persistence.
	 */
	readonly showErrorsImmediately: boolean
	readonly source: GameSource
	readonly title: string
	readonly subtitle: string
}

export type GameAction =
	| { readonly type: 'SELECT_CELL'; readonly coordinate: CellCoordinate }
	| { readonly type: 'DIGIT'; readonly digit: number }
	| { readonly type: 'CONFIRM' }
	| { readonly type: 'DELETE' }
	| { readonly type: 'UNDO' }
	| { readonly type: 'HINT'; readonly now?: number }
	| { readonly type: 'TICK_COMPLETE_CHECK'; readonly now?: number }

export type CreateGameStateInput = {
	readonly puzzle: Puzzle
	readonly solution: PuzzleSolution
	readonly source: GameSource
	readonly title: string
	readonly subtitle: string
	readonly startedAt?: number
	readonly showErrorsImmediately?: boolean
	readonly entries?: Readonly<Record<string, number | null>>
	readonly selected?: CellCoordinate | null
	readonly mistakes?: number
	readonly hintsUsed?: number
}

/**
 * Create a fresh playable session from a generated puzzle + known solution.
 * Optional hydration fields restore an unfinished session.
 */
export function createGameState(input: CreateGameStateInput): GameState {
	const blanks = createInitialEntries(input.puzzle)
	const entries = input.entries
		? { ...blanks, ...input.entries }
		: blanks
	const blankCells = listBlankCells(input.puzzle)
	const firstBlank = blankCells[0]?.coordinate ?? null
	const selected =
		input.selected === undefined ? firstBlank : input.selected

	return {
		puzzle: input.puzzle,
		solutionByKey: buildSolutionMap(input.solution),
		entries,
		selected,
		draft: '',
		history: [],
		mistakes: input.mistakes ?? 0,
		hintsUsed: input.hintsUsed ?? 0,
		startedAt: input.startedAt ?? Date.now(),
		completedAt: null,
		status: 'playing',
		showErrorsImmediately: input.showErrorsImmediately ?? true,
		source: input.source,
		title: input.title,
		subtitle: input.subtitle,
	}
}

/**
 * Pure gameplay reducer — no React / RN imports.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
	if (state.status === 'completed' && action.type !== 'UNDO') {
		return state
	}

	switch (action.type) {
		case 'SELECT_CELL':
			return selectCell(state, action.coordinate)
		case 'DIGIT':
			return applyDigit(state, action.digit)
		case 'CONFIRM':
			return confirmDraft(state)
		case 'DELETE':
			return deleteSelection(state)
		case 'UNDO':
			return undoLast(state)
		case 'HINT':
			return applyHint(state, action.now ?? Date.now())
		case 'TICK_COMPLETE_CHECK':
			return maybeComplete(state, action.now ?? Date.now())
		default:
			return state
	}
}

function selectCell(state: GameState, coordinate: CellCoordinate): GameState {
	const cell = getCell(state.puzzle, coordinate)
	if (!cell || cell.kind !== 'number' || cell.state !== 'blank') {
		const committed = commitDraftIfNeeded(state)
		return { ...committed, selected: null, draft: '' }
	}
	if (state.selected && coordinatesEqual(state.selected, coordinate)) {
		return state
	}
	const committed = commitDraftIfNeeded(state)
	return {
		...committed,
		selected: coordinate,
		draft: '',
	}
}

function applyDigit(state: GameState, digit: number): GameState {
	if (!state.selected || state.status === 'completed') {
		return state
	}
	const nextDraft = appendDraftDigit(
		state.draft,
		digit,
		state.puzzle.arithmetic.maxValue,
	)
	if (nextDraft === null) {
		return state
	}
	return { ...state, draft: nextDraft }
}

function confirmDraft(state: GameState): GameState {
	if (!state.selected || state.draft === '') {
		return state
	}
	const value = Number(state.draft)
	if (!Number.isSafeInteger(value)) {
		return { ...state, draft: '' }
	}
	const afterCommit = commitValue(state, state.selected, value)
	const advanced = advanceAfterCommit(afterCommit, state.selected)
	return maybeComplete(advanced, Date.now())
}

function deleteSelection(state: GameState): GameState {
	if (!state.selected || state.status === 'completed') {
		return state
	}
	if (state.draft !== '') {
		return { ...state, draft: state.draft.slice(0, -1) }
	}
	const key = coordinateKey(state.selected)
	const previous = state.entries[key] ?? null
	if (previous === null) {
		return state
	}
	return {
		...state,
		entries: { ...state.entries, [key]: null },
		history: [
			...state.history,
			{
				coordinate: state.selected,
				previousValue: previous,
				nextValue: null,
			},
		],
	}
}

function undoLast(state: GameState): GameState {
	if (state.history.length === 0) {
		return state
	}
	const history = state.history.slice(0, -1)
	const last = state.history[state.history.length - 1]!
	const key = coordinateKey(last.coordinate)
	return {
		...state,
		entries: { ...state.entries, [key]: last.previousValue },
		selected: last.coordinate,
		draft: '',
		history,
		status: 'playing',
		completedAt: null,
	}
}

function applyHint(state: GameState, now: number): GameState {
	if (!state.selected || state.status === 'completed') {
		return state
	}
	const key = coordinateKey(state.selected)
	const correct = state.solutionByKey[key]
	if (correct === undefined) {
		return state
	}
	const previous = state.entries[key] ?? null
	if (previous === correct) {
		return { ...state, draft: '' }
	}
	const next: GameState = {
		...state,
		draft: '',
		entries: { ...state.entries, [key]: correct },
		hintsUsed: state.hintsUsed + 1,
		history: [
			...state.history,
			{
				coordinate: state.selected,
				previousValue: previous,
				nextValue: correct,
			},
		],
	}
	const advanced = advanceAfterCommit(next, state.selected)
	return maybeComplete(advanced, now)
}

function commitDraftIfNeeded(state: GameState): GameState {
	if (!state.selected || state.draft === '') {
		return { ...state, draft: '' }
	}
	const value = Number(state.draft)
	if (!Number.isSafeInteger(value)) {
		return { ...state, draft: '' }
	}
	return {
		...commitValue(state, state.selected, value),
		draft: '',
	}
}

function commitValue(
	state: GameState,
	coordinate: CellCoordinate,
	value: number,
): GameState {
	const key = coordinateKey(coordinate)
	const previous = state.entries[key] ?? null
	if (previous === value) {
		return { ...state, draft: '' }
	}

	let mistakes = state.mistakes
	if (
		state.showErrorsImmediately &&
		state.solutionByKey[key] !== undefined &&
		state.solutionByKey[key] !== value
	) {
		mistakes += 1
	}

	return {
		...state,
		draft: '',
		entries: { ...state.entries, [key]: value },
		mistakes,
		history: [
			...state.history,
			{
				coordinate,
				previousValue: previous,
				nextValue: value,
			},
		],
	}
}

function advanceAfterCommit(
	state: GameState,
	from: CellCoordinate,
): GameState {
	const next = nextBlankCoordinate(state.puzzle, from)
	if (!next || coordinatesEqual(next, from)) {
		return { ...state, draft: '' }
	}
	// Only auto-advance when the current blank is filled.
	const key = coordinateKey(from)
	if (state.entries[key] === null) {
		return { ...state, draft: '' }
	}
	return {
		...state,
		selected: next,
		draft: '',
	}
}

function maybeComplete(state: GameState, now: number): GameState {
	if (state.status === 'completed') {
		return state
	}
	if (!areAllBlanksFilled(state.entries)) {
		return state
	}
	if (!isSolutionCorrect(state.entries, state.solutionByKey)) {
		return state
	}
	return {
		...state,
		status: 'completed',
		completedAt: now,
		draft: '',
	}
}

/**
 * Display value for a blank: draft while editing, otherwise committed entry.
 */
export function getBlankDisplayValue(
	state: GameState,
	coordinate: CellCoordinate,
): string {
	const key = coordinateKey(coordinate)
	if (
		state.selected &&
		coordinatesEqual(state.selected, coordinate) &&
		state.draft !== ''
	) {
		return state.draft
	}
	const value = state.entries[key]
	return value === null || value === undefined ? '' : String(value)
}

/**
 * Whether a blank should show the error style (wrong committed value).
 */
export function isBlankShowingError(
	state: GameState,
	coordinate: CellCoordinate,
): boolean {
	if (!state.showErrorsImmediately) {
		return false
	}
	const key = coordinateKey(coordinate)
	const value = state.entries[key]
	if (value === null || value === undefined) {
		return false
	}
	// While drafting on this cell, do not flash error until commit.
	if (
		state.selected &&
		coordinatesEqual(state.selected, coordinate) &&
		state.draft !== ''
	) {
		return false
	}
	return state.solutionByKey[key] !== value
}

/**
 * Progress counters for the HUD.
 */
export function getFillProgress(state: GameState): {
	filled: number
	total: number
} {
	const values = Object.values(state.entries)
	const filled = values.filter((value) => value !== null).length
	return { filled, total: values.length }
}
