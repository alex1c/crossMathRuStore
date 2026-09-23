/**
 * Versioned CrossMath app persistence schema (schemaVersion 1).
 * Plain JSON documents — no SQLite in Phase 4.
 */

import type { CellCoordinate, Puzzle, PuzzleSolution } from '@/src/core/crossmath'

export const PERSISTENCE_SCHEMA_VERSION = 1 as const
export const PERSISTENCE_STORAGE_KEY = 'crossmath.app.v1'

export type PersistedCampaignLevelResult = {
	readonly level: number
	readonly elapsedMs: number
	readonly mistakes: number
	readonly hintsUsed: number
	readonly completedAt: number
}

export type PersistedCampaign = {
	readonly highestUnlockedLevel: number
	readonly completedLevels: readonly number[]
	readonly results: Readonly<Record<string, PersistedCampaignLevelResult>>
	readonly lastPlayedLevel: number | null
}

export type PersistedDailyResult = {
	readonly dateKey: string
	readonly elapsedMs: number
	readonly mistakes: number
	readonly hintsUsed: number
	readonly completedAt: number
}

export type PersistedDaily = {
	readonly completions: Readonly<Record<string, PersistedDailyResult>>
}

export type PersistedEndless = {
	readonly completedCount: number
	readonly bestCompletedCount: number
}

export type PersistedSettings = {
	readonly showErrorsImmediately: boolean
	readonly dailyReminderEnabled: boolean
	/** Minutes from local midnight, e.g. 19:00 => 1140. */
	readonly dailyReminderMinutes: number
	/** First-launch interactive tutorial finished or skipped. */
	readonly onboardingCompleted: boolean
}

export type PersistedGameSource =
	| { readonly kind: 'campaign'; readonly level: number }
	| { readonly kind: 'daily'; readonly dateKey: string }
	| { readonly kind: 'endless'; readonly completedCount: number }

/**
 * Unfinished playable session. Puzzle + solution are stored so resume stays
 * exact even if generator knobs change later.
 */
export type PersistedActiveSession = {
	readonly source: PersistedGameSource
	readonly puzzle: Puzzle
	readonly solution: PuzzleSolution
	readonly entries: Readonly<Record<string, number | null>>
	readonly selected: CellCoordinate | null
	readonly mistakes: number
	readonly hintsUsed: number
	readonly accumulatedActiveMs: number
	readonly status: 'playing'
	readonly title: string
	readonly subtitle: string
	readonly updatedAt: number
}

export type PersistedStatsCounters = {
	readonly totalHintsUsed: number
	readonly totalMistakes: number
	readonly totalPuzzlesSolved: number
}

export type PersistedAppState = {
	readonly schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION
	readonly campaign: PersistedCampaign
	readonly daily: PersistedDaily
	readonly endless: PersistedEndless
	readonly settings: PersistedSettings
	readonly activeSession: PersistedActiveSession | null
	readonly stats: PersistedStatsCounters
}

export const DEFAULT_REMINDER_MINUTES = 19 * 60

export function createDefaultPersistedState(): PersistedAppState {
	return {
		schemaVersion: PERSISTENCE_SCHEMA_VERSION,
		campaign: {
			highestUnlockedLevel: 1,
			completedLevels: [],
			results: {},
			lastPlayedLevel: null,
		},
		daily: {
			completions: {},
		},
		endless: {
			completedCount: 0,
			bestCompletedCount: 0,
		},
		settings: {
			showErrorsImmediately: true,
			dailyReminderEnabled: true,
			dailyReminderMinutes: DEFAULT_REMINDER_MINUTES,
			onboardingCompleted: false,
		},
		activeSession: null,
		stats: {
			totalHintsUsed: 0,
			totalMistakes: 0,
			totalPuzzlesSolved: 0,
		},
	}
}
