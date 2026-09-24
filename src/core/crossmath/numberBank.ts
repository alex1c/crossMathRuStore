/**
 * Production Number Bank helpers (promoted from Phase 5.5 research).
 */

import type { PuzzleSolution } from './types'
import type {
	HybridPuzzle,
	NumberBank,
	NumberBankItem,
} from './experimental'
import {
	analyzeAdvancedNumberBank,
	analyzeNumberBank,
	deriveAdvancedNumberBank,
	deriveNumberBank,
} from './experimental'
import { SeededRandom } from './rng'

export type {
	NumberBank,
	NumberBankAnalysis,
	NumberBankItem,
	NumberBankMode,
} from './experimental'

export {
	analyzeAdvancedNumberBank,
	analyzeNumberBank,
	deriveAdvancedNumberBank,
	deriveNumberBank,
}

/**
 * Deterministic bank for Hard / Lobachevsky (~20% distractors via research API).
 */
export function createTrackNumberBank(
	puzzle: HybridPuzzle,
	solution: PuzzleSolution,
	seed: string | number,
): NumberBank {
	const bank = deriveAdvancedNumberBank(puzzle, solution, {
		mode: 'distractors',
		seed,
	})
	const random = new SeededRandom(seed)
	const shuffled = random.shuffle([...bank.items])
	return {
		...bank,
		items: shuffled,
	}
}

/**
 * Remaining bank items after current blank placements (multiplicity-preserving).
 * Source of truth: initial ordered bank + current entries by value counts.
 */
export function remainingBankItems(
	initialItems: readonly NumberBankItem[],
	entries: Readonly<Record<string, number | null>>,
): NumberBankItem[] {
	const usedCounts: Record<string, number> = {}
	for (const value of Object.values(entries)) {
		if (value === null || value === undefined) {
			continue
		}
		const key = String(value)
		usedCounts[key] = (usedCounts[key] ?? 0) + 1
	}
	const remaining: NumberBankItem[] = []
	const consumed: Record<string, number> = {}
	for (const item of initialItems) {
		const key = String(item.value)
		const already = consumed[key] ?? 0
		const used = usedCounts[key] ?? 0
		if (already < used) {
			consumed[key] = already + 1
			continue
		}
		remaining.push(item)
	}
	return remaining
}
