/**
 * Versioned CrossMath persistence (schemaVersion 2 — four-track campaign).
 */

import type { CellCoordinate, Puzzle, PuzzleSolution } from '@/src/core/crossmath'
import type { HybridPuzzle } from '@/src/core/crossmath/hybrid'
import type { NumberBankItem } from '@/src/core/crossmath/numberBank'
import type { DifficultyTrack } from '@/src/core/crossmath/tracks'
import {
	DIFFICULTY_TRACKS,
	TRACK_LEVEL_COUNT,
} from '@/src/core/crossmath/tracks'

export const PERSISTENCE_SCHEMA_VERSION = 2 as const
export const PERSISTENCE_STORAGE_KEY = 'crossmath.app.v1'

export type PersistedTrackLevelResult = {
	readonly level: number
	readonly elapsedMs: number
	readonly mistakes: number
	readonly hintsUsed: number
	readonly completedAt: number
}

export type PersistedTrackProgress = {
	readonly highestUnlockedLevel: number
	readonly completedLevels: readonly number[]
	readonly results: Readonly<Record<string, PersistedTrackLevelResult>>
	readonly lastPlayedLevel: number | null
}

export type PersistedTracks = Readonly<
	Record<DifficultyTrack, PersistedTrackProgress>
>

/** Legacy linear campaign (schema v1) — retained only for migration input. */
export type LegacyPersistedCampaign = {
	readonly highestUnlockedLevel: number
	readonly completedLevels: readonly number[]
	readonly results: Readonly<Record<string, PersistedTrackLevelResult>>
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

export type PersistedMultiplicationProgress = {
	readonly solvedByTable: Readonly<Record<string, number>>
	readonly totalSolved: number
}

export type PersistedSettings = {
	readonly showErrorsImmediately: boolean
	readonly dailyReminderEnabled: boolean
	/** Minutes from local midnight, e.g. 19:00 => 1140. */
	readonly dailyReminderMinutes: number
	/** First-launch interactive tutorial finished or skipped. */
	readonly onboardingCompleted: boolean
	/** One-time Hard/Lobachevsky bank tip acknowledged. */
	readonly bankTipSeen: boolean
}

export type PersistedGameSource =
	| {
			readonly kind: 'track'
			readonly track: DifficultyTrack
			readonly level: number
			readonly catalogVersion?: string | null
	  }
	| { readonly kind: 'daily'; readonly dateKey: string }
	| { readonly kind: 'endless'; readonly completedCount: number }
	| {
			readonly kind: 'multiplication'
			readonly table: number | 'mixed'
			readonly sequence: number
	  }
	/** @deprecated schema v1 — cleared on migration if active */
	| { readonly kind: 'campaign'; readonly level: number }

export type PersistedActiveSession = {
	readonly source: PersistedGameSource
	readonly puzzle: Puzzle | HybridPuzzle
	readonly solution: PuzzleSolution
	readonly entries: Readonly<Record<string, number | null>>
	readonly selected: CellCoordinate | null
	readonly mistakes: number
	readonly hintsUsed: number
	readonly hintedKeys?: Readonly<Record<string, true>>
	readonly accumulatedActiveMs: number
	readonly status: 'playing'
	readonly title: string
	readonly subtitle: string
	readonly updatedAt: number
	readonly inputMode?: 'keypad' | 'bank'
	readonly bankItems?: readonly NumberBankItem[]
	readonly bankSeed?: string | null
}

export type PersistedStatsCounters = {
	readonly totalHintsUsed: number
	readonly totalMistakes: number
	readonly totalPuzzlesSolved: number
}

export type PersistedAppState = {
	readonly schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION
	readonly tracks: PersistedTracks
	readonly daily: PersistedDaily
	readonly endless: PersistedEndless
	readonly multiplication: PersistedMultiplicationProgress
	readonly settings: PersistedSettings
	readonly activeSession: PersistedActiveSession | null
	readonly stats: PersistedStatsCounters
}

export const DEFAULT_REMINDER_MINUTES = 19 * 60

export function createDefaultTrackProgress(): PersistedTrackProgress {
	return {
		highestUnlockedLevel: 1,
		completedLevels: [],
		results: {},
		lastPlayedLevel: null,
	}
}

export function createDefaultTracks(): PersistedTracks {
	return {
		easy: createDefaultTrackProgress(),
		medium: createDefaultTrackProgress(),
		hard: createDefaultTrackProgress(),
		lobachevsky: createDefaultTrackProgress(),
	}
}

export function createDefaultPersistedState(): PersistedAppState {
	return {
		schemaVersion: PERSISTENCE_SCHEMA_VERSION,
		tracks: createDefaultTracks(),
		daily: {
			completions: {},
		},
		endless: {
			completedCount: 0,
			bestCompletedCount: 0,
		},
		multiplication: {
			solvedByTable: {},
			totalSolved: 0,
		},
		settings: {
			showErrorsImmediately: true,
			// Fresh installs: reminder OFF until the user enables it.
			dailyReminderEnabled: false,
			dailyReminderMinutes: DEFAULT_REMINDER_MINUTES,
			onboardingCompleted: false,
			bankTipSeen: false,
		},
		activeSession: null,
		stats: {
			totalHintsUsed: 0,
			totalMistakes: 0,
			totalPuzzlesSolved: 0,
		},
	}
}

/**
 * Map legacy linear campaign 1–50 completions into Easy track only.
 * Hard/Lobachevsky stay fresh. Incompatible active campaign sessions cleared.
 */
export function migrateLegacyCampaignToTracks(
	legacy: LegacyPersistedCampaign | null | undefined,
): PersistedTracks {
	const base = createDefaultTracks()
	if (!legacy) {
		return base
	}
	const easyCompleted = legacy.completedLevels
		.filter((level) => level >= 1 && level <= TRACK_LEVEL_COUNT)
		.slice()
		.sort((a, b) => a - b)
	const easyResults: Record<string, PersistedTrackLevelResult> = {}
	for (const [key, result] of Object.entries(legacy.results ?? {})) {
		const level = result?.level ?? Number(key)
		if (!Number.isInteger(level) || level < 1 || level > TRACK_LEVEL_COUNT) {
			continue
		}
		easyResults[String(level)] = {
			level,
			elapsedMs: result.elapsedMs ?? 0,
			mistakes: result.mistakes ?? 0,
			hintsUsed: result.hintsUsed ?? 0,
			completedAt: result.completedAt ?? 0,
		}
	}
	const maxCompleted =
		easyCompleted.length > 0 ? Math.max(...easyCompleted) : 0
	const legacyUnlock = Math.min(
		TRACK_LEVEL_COUNT,
		Math.max(1, Math.min(TRACK_LEVEL_COUNT, legacy.highestUnlockedLevel || 1)),
	)
	const highestUnlockedLevel = Math.min(
		TRACK_LEVEL_COUNT,
		Math.max(
			1,
			legacyUnlock,
			maxCompleted > 0 ? Math.min(TRACK_LEVEL_COUNT, maxCompleted + 1) : 1,
			maxCompleted,
		),
	)
	return {
		...base,
		easy: {
			highestUnlockedLevel,
			completedLevels: easyCompleted,
			results: easyResults,
			lastPlayedLevel:
				legacy.lastPlayedLevel !== null &&
				legacy.lastPlayedLevel >= 1 &&
				legacy.lastPlayedLevel <= TRACK_LEVEL_COUNT
					? legacy.lastPlayedLevel
					: null,
		},
	}
}

export { DIFFICULTY_TRACKS, TRACK_LEVEL_COUNT }
