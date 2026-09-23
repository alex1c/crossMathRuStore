/**
 * Pure Daily streak calculation from completed local date keys.
 */

import { shiftLocalDateKey } from './dateKey'

export type StreakSnapshot = {
	readonly current: number
	readonly best: number
}

/**
 * Compute current + best streak from completed Daily date keys.
 *
 * Rules:
 * - consecutive local calendar days
 * - if yesterday completed and today still pending, streak stays alive today
 * - a fully missed day breaks the streak
 */
export function computeDailyStreak(
	completedDateKeys: readonly string[],
	todayKey: string,
): StreakSnapshot {
	const unique = [...new Set(completedDateKeys.filter((key) =>
		/^\d{4}-\d{2}-\d{2}$/.test(key),
	))].sort()

	if (unique.length === 0) {
		return { current: 0, best: 0 }
	}

	let best = 1
	let run = 1
	for (let index = 1; index < unique.length; index += 1) {
		const prev = unique[index - 1]!
		const curr = unique[index]!
		if (shiftLocalDateKey(prev, 1) === curr) {
			run += 1
		} else {
			run = 1
		}
		best = Math.max(best, run)
	}

	const completedSet = new Set(unique)
	let current = 0
	if (completedSet.has(todayKey)) {
		current = 1
		let cursor = shiftLocalDateKey(todayKey, -1)
		while (completedSet.has(cursor)) {
			current += 1
			cursor = shiftLocalDateKey(cursor, -1)
		}
	} else {
		const yesterday = shiftLocalDateKey(todayKey, -1)
		if (completedSet.has(yesterday)) {
			current = 1
			let cursor = shiftLocalDateKey(yesterday, -1)
			while (completedSet.has(cursor)) {
				current += 1
				cursor = shiftLocalDateKey(cursor, -1)
			}
		} else {
			current = 0
		}
	}

	best = Math.max(best, current)
	return { current, best }
}
