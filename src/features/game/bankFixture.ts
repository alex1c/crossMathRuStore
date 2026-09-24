/**
 * DEV-only Number Bank fixture with duplicate values + distractor.
 */

import type { HybridPuzzle } from '@/src/core/crossmath/hybrid'
import type { PuzzleSolution } from '@/src/core/crossmath'
import type { NumberBankItem } from '@/src/core/crossmath/numberBank'

/**
 * Tiny hybrid-compatible binary board:
 *  3 + □ = 8
 *      +
 *      □
 *      =
 *      11
 * blanks = 5 and 6 (duplicate bank needs another 5 as distractor? use 5,5,6 + distractor 4)
 * Solution blanks: 5 and 6. Bank: 5, 5 (extra), 6, 4 distractor — wait multiplicity of answers: only one 5 needed.
 * Better: two blanks both needing 5? Use:
 * H: 2 + □ = 7 (blank=5)
 * V through blank: □ + 3 = 8 (same blank)
 * Only one blank. Need two blanks with same value:
 * H1: □ + 2 = 7 → 5
 * H2 on another row: □ + 1 = 6 → 5
 */
export const BANK_DUP_DEV_FIXTURE: {
	readonly puzzle: HybridPuzzle
	readonly solution: PuzzleSolution
	readonly bankItems: readonly NumberBankItem[]
} = {
	puzzle: {
		schemaVersion: 1,
		arithmetic: { minValue: 1, maxValue: 12 },
		grid: {
			rows: 3,
			columns: 5,
			cells: [
				{
					kind: 'number',
					coordinate: { row: 0, column: 0 },
					state: 'blank',
					value: null,
				},
				{
					kind: 'operator',
					coordinate: { row: 0, column: 1 },
					operator: 'add',
				},
				{
					kind: 'number',
					coordinate: { row: 0, column: 2 },
					state: 'fixed',
					value: 2,
				},
				{ kind: 'equals', coordinate: { row: 0, column: 3 } },
				{
					kind: 'number',
					coordinate: { row: 0, column: 4 },
					state: 'fixed',
					value: 7,
				},
				{
					kind: 'number',
					coordinate: { row: 2, column: 0 },
					state: 'blank',
					value: null,
				},
				{
					kind: 'operator',
					coordinate: { row: 2, column: 1 },
					operator: 'add',
				},
				{
					kind: 'number',
					coordinate: { row: 2, column: 2 },
					state: 'fixed',
					value: 1,
				},
				{ kind: 'equals', coordinate: { row: 2, column: 3 } },
				{
					kind: 'number',
					coordinate: { row: 2, column: 4 },
					state: 'fixed',
					value: 6,
				},
			],
		},
		equations: [
			{
				id: 'bank-dup-h1',
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
				id: 'bank-dup-h2',
				direction: 'horizontal',
				cells: [
					{ row: 2, column: 0 },
					{ row: 2, column: 1 },
					{ row: 2, column: 2 },
					{ row: 2, column: 3 },
					{ row: 2, column: 4 },
				],
				operator: 'add',
				relation: 'equals',
			},
		],
	},
	solution: {
		values: [
			{ coordinate: { row: 0, column: 0 }, value: 5 },
			{ coordinate: { row: 0, column: 2 }, value: 2 },
			{ coordinate: { row: 0, column: 4 }, value: 7 },
			{ coordinate: { row: 2, column: 0 }, value: 5 },
			{ coordinate: { row: 2, column: 2 }, value: 1 },
			{ coordinate: { row: 2, column: 4 }, value: 6 },
		],
	},
	bankItems: [
		{ id: 'answer-0', value: 5, kind: 'answer' },
		{ id: 'answer-1', value: 5, kind: 'answer' },
		{ id: 'distractor-0', value: 4, kind: 'distractor' },
	],
}
