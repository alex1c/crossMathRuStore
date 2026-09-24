import type {
	CellCoordinate,
	PuzzleSolution,
} from '@/src/core/crossmath'
import {
	coordinateKey,
	coordinatesEqual,
	getCell,
} from '@/src/core/crossmath'
import type { NumberBankItem } from '@/src/core/crossmath/numberBank'
import { remainingBankItems } from '@/src/core/crossmath/numberBank'
import type { GameSource } from './source'
import {
	appendDraftDigit,
	areAllBlanksFilled,
	buildSolutionMap,
	createInitialEntries,
	isSolutionCorrect,
	listBlankCells,
	nextBlankCoordinate,
	type PlayablePuzzle,
} from './helpers'

export type GameStatus = 'playing' | 'completed'
export type GameInputMode = 'keypad' | 'bank'

export type UndoEntry = {
	readonly coordinate: CellCoordinate
	readonly previousValue: number | null
	readonly nextValue: number | null
}

export type GameState = {
	readonly puzzle: PlayablePuzzle
	readonly solutionByKey: Readonly<Record<string, number>>
	readonly entries: Readonly<Record<string, number | null>>
	readonly selected: CellCoordinate | null
	/** In-progress multi-digit buffer for the selected blank (keypad mode). */
	readonly draft: string
	readonly history: readonly UndoEntry[]
	readonly mistakes: number
	readonly hintsUsed: number
	/** Coordinate keys revealed via hint (visual distinction). */
	readonly hintedKeys: Readonly<Record<string, true>>
	readonly startedAt: number
	readonly completedAt: number | null
	readonly status: GameStatus
	readonly showErrorsImmediately: boolean
	readonly source: GameSource
	readonly title: string
	readonly subtitle: string
	readonly inputMode: GameInputMode
	/** Initial deterministic bank order (bank mode). */
	readonly bankItems: readonly NumberBankItem[]
	readonly bankSeed: string | null
}

export type GameAction =
	| { readonly type: 'SELECT_CELL'; readonly coordinate: CellCoordinate }
	| { readonly type: 'DIGIT'; readonly digit: number }
	| { readonly type: 'CONFIRM' }
	| { readonly type: 'PLACE_BANK'; readonly value: number }
	| { readonly type: 'DELETE' }
	| { readonly type: 'UNDO' }
	| { readonly type: 'HINT'; readonly now?: number }
	| { readonly type: 'TICK_COMPLETE_CHECK'; readonly now?: number }

export type CreateGameStateInput = {
	readonly puzzle: PlayablePuzzle
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
	readonly hintedKeys?: Readonly<Record<string, true>>
	readonly inputMode?: GameInputMode
	readonly bankItems?: readonly NumberBankItem[]
	readonly bankSeed?: string | null
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
		hintedKeys: input.hintedKeys ?? {},
		startedAt: input.startedAt ?? Date.now(),
		completedAt: null,
		status: 'playing',
		showErrorsImmediately: input.showErrorsImmediately ?? true,
		source: input.source,
		title: input.title,
		subtitle: input.subtitle,
		inputMode: input.inputMode ?? 'keypad',
		bankItems: input.bankItems ?? [],
		bankSeed: input.bankSeed ?? null,
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
		case 'PLACE_BANK':
			return placeBankValue(state, action.value)
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
	const cell = getCell(state.puzzle as never, coordinate)
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
	if (state.inputMode !== 'keypad') {
		return state
	}
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

function placeBankValue(state: GameState, value: number): GameState {
	if (state.inputMode !== 'bank' || !state.selected || state.status === 'completed') {
		return state
	}
	const remaining = remainingBankItems(state.bankItems, state.entries)
	const available = remaining.some((item) => item.value === value)
	if (!available) {
		// Allow replacing the currently selected cell with the same value family:
		// temporarily treat the selected value as returned to the bank.
		const key = coordinateKey(state.selected)
		const current = state.entries[key] ?? null
		const probeEntries =
			current === null
				? state.entries
				: { ...state.entries, [key]: null }
		const probeRemaining = remainingBankItems(state.bankItems, probeEntries)
		if (!probeRemaining.some((item) => item.value === value)) {
			return state
		}
	}
	const afterCommit = commitValue(state, state.selected, value)
	const advanced = advanceAfterCommit(afterCommit, state.selected)
	return maybeComplete(advanced, Date.now())
}

function confirmDraft(state: GameState): GameState {
	if (state.inputMode !== 'keypad') {
		return state
	}
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
	if (state.status === 'completed') {
		return state
	}
	// Prefer selected blank; otherwise first empty blank; else first blank.
	let target = state.selected
	if (!target || !isBlankCoordinate(state.puzzle, target)) {
		target = findHintTarget(state)
	}
	if (!target) {
		return state
	}
	const key = coordinateKey(target)
	const correct = state.solutionByKey[key]
	if (correct === undefined) {
		return state
	}
	const previous = state.entries[key] ?? null
	if (previous === correct) {
		return { ...state, selected: target, draft: '' }
	}
	const next: GameState = {
		...state,
		selected: target,
		draft: '',
		entries: { ...state.entries, [key]: correct },
		hintsUsed: state.hintsUsed + 1,
		hintedKeys: { ...state.hintedKeys, [key]: true },
		history: [
			...state.history,
			{
				coordinate: target,
				previousValue: previous,
				nextValue: correct,
			},
		],
	}
	const advanced = advanceAfterCommit(next, target)
	return maybeComplete(advanced, now)
}

function isBlankCoordinate(
	puzzle: PlayablePuzzle,
	coordinate: CellCoordinate,
): boolean {
	const cell = getCell(puzzle as never, coordinate)
	return !!cell && cell.kind === 'number' && cell.state === 'blank'
}

function findHintTarget(state: GameState): CellCoordinate | null {
	const blanks = listBlankCells(state.puzzle)
	const empty = blanks.find((cell) => {
		const value = state.entries[coordinateKey(cell.coordinate)]
		return value === null || value === undefined
	})
	return empty?.coordinate ?? blanks[0]?.coordinate ?? null
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
 * Whether a blank was filled via hint (distinct visual).
 */
export function isBlankHinted(
	state: GameState,
	coordinate: CellCoordinate,
): boolean {
	return state.hintedKeys[coordinateKey(coordinate)] === true
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
	if (isBlankHinted(state, coordinate)) {
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
 * Remaining bank chips for UI (derived from initial bank + entries).
 */
export function getRemainingBankItems(
	state: GameState,
): readonly NumberBankItem[] {
	return remainingBankItems(state.bankItems, state.entries)
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
