import type { Puzzle, PuzzleSolution } from '@/src/core/crossmath'

/**
 * Development-only fixture for physical number-pad QA.
 * The real GameScreen renders and owns the session; this is not a mock screen.
 */
export const MULTI_DIGIT_DEV_FIXTURE: {
	readonly puzzle: Puzzle
	readonly solution: PuzzleSolution
} = {
	puzzle: {
		schemaVersion: 1,
		arithmetic: { minValue: 1, maxValue: 24 },
		grid: {
			rows: 1,
			columns: 5,
			cells: [
				{ kind: 'number', coordinate: { row: 0, column: 0 }, state: 'blank', value: null },
				{ kind: 'operator', coordinate: { row: 0, column: 1 }, operator: 'add' },
				{ kind: 'number', coordinate: { row: 0, column: 2 }, state: 'fixed', value: 6 },
				{ kind: 'equals', coordinate: { row: 0, column: 3 } },
				{ kind: 'number', coordinate: { row: 0, column: 4 }, state: 'blank', value: null },
			],
		},
		equations: [{
			id: 'dev-multi-digit-addition',
			direction: 'horizontal',
			cells: [
				{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 },
				{ row: 0, column: 3 }, { row: 0, column: 4 },
			],
			operator: 'add',
			relation: 'equals',
		}],
	},
	solution: {
		values: [
			{ coordinate: { row: 0, column: 0 }, value: 12 },
			{ coordinate: { row: 0, column: 2 }, value: 6 },
			{ coordinate: { row: 0, column: 4 }, value: 18 },
		],
	},
}
