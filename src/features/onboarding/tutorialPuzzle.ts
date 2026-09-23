/**
 * Handcrafted interactive tutorial puzzle (not campaign Level 1).
 * One blank sits at the crossing of a horizontal and vertical equation.
 */

import type { Puzzle, PuzzleSolution } from '@/src/core/crossmath'

/** Blank coordinate the tutorial coach marks and expects the user to fill. */
export const TUTORIAL_BLANK = { row: 0, column: 2 } as const

/** Correct value for the tutorial blank (2 + □ = 5 and □ + 4 = 7). */
export const TUTORIAL_BLANK_VALUE = 3 as const

/**
 * Mini crossing puzzle:
 *   2 + □ = 5
 *       +
 *       4
 *       =
 *       7
 */
export const TUTORIAL_PUZZLE: Puzzle = {
	schemaVersion: 1,
	arithmetic: { minValue: 1, maxValue: 12 },
	grid: {
		rows: 5,
		columns: 5,
		cells: [
			{
				kind: 'number',
				coordinate: { row: 0, column: 0 },
				state: 'fixed',
				value: 2,
			},
			{
				kind: 'operator',
				coordinate: { row: 0, column: 1 },
				operator: 'add',
			},
			{
				kind: 'number',
				coordinate: { row: 0, column: 2 },
				state: 'blank',
				value: null,
			},
			{ kind: 'equals', coordinate: { row: 0, column: 3 } },
			{
				kind: 'number',
				coordinate: { row: 0, column: 4 },
				state: 'fixed',
				value: 5,
			},
			{
				kind: 'operator',
				coordinate: { row: 1, column: 2 },
				operator: 'add',
			},
			{
				kind: 'number',
				coordinate: { row: 2, column: 2 },
				state: 'fixed',
				value: 4,
			},
			{ kind: 'equals', coordinate: { row: 3, column: 2 } },
			{
				kind: 'number',
				coordinate: { row: 4, column: 2 },
				state: 'fixed',
				value: 7,
			},
		],
	},
	equations: [
		{
			id: 'tutorial-h',
			direction: 'horizontal',
			cells: [
				{ row: 0, column: 0 },
				{ row: 0, column: 1 },
				{ row: 0, column: 2 },
				{ row: 0, column: 3 },
				{ row: 0, column: 4 },
			],
			operator: 'add',
			relation: 'equals',
		},
		{
			id: 'tutorial-v',
			direction: 'vertical',
			cells: [
				{ row: 0, column: 2 },
				{ row: 1, column: 2 },
				{ row: 2, column: 2 },
				{ row: 3, column: 2 },
				{ row: 4, column: 2 },
			],
			operator: 'add',
			relation: 'equals',
		},
	],
}

export const TUTORIAL_SOLUTION: PuzzleSolution = {
	values: [
		{ coordinate: { row: 0, column: 0 }, value: 2 },
		{ coordinate: TUTORIAL_BLANK, value: TUTORIAL_BLANK_VALUE },
		{ coordinate: { row: 0, column: 4 }, value: 5 },
		{ coordinate: { row: 2, column: 2 }, value: 4 },
		{ coordinate: { row: 4, column: 2 }, value: 7 },
	],
}
