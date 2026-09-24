/**
 * App progress mutations — pure transforms over PersistedAppState (schema v2).
 */

import type {
	PersistedActiveSession,
	PersistedAppState,
	PersistedDailyResult,
	PersistedSettings,
	PersistedTrackLevelResult,
} from '@/src/services/persistence'
import type { DifficultyTrack } from '@/src/core/crossmath/tracks'
import { applyTrackCompletion } from './campaign'

export function withTrackCompleted(
	state: PersistedAppState,
	track: DifficultyTrack,
	result: PersistedTrackLevelResult,
): PersistedAppState {
	const current = state.tracks[track]
	const next = applyTrackCompletion(
		current.highestUnlockedLevel,
		current.completedLevels,
		result.level,
	)
	const previous = current.results[String(result.level)]
	const keepPrevious =
		previous &&
		(previous.elapsedMs < result.elapsedMs ||
			(previous.elapsedMs === result.elapsedMs &&
				previous.mistakes <= result.mistakes))
	const isFirst = !previous
	return {
		...state,
		tracks: {
			...state.tracks,
			[track]: {
				...current,
				highestUnlockedLevel: next.highestUnlockedLevel,
				completedLevels: next.completedLevels,
				lastPlayedLevel: result.level,
				results: {
					...current.results,
					[String(result.level)]: keepPrevious ? previous : result,
				},
			},
		},
		activeSession:
			state.activeSession?.source.kind === 'track' &&
			state.activeSession.source.track === track &&
			state.activeSession.source.level === result.level
				? null
				: state.activeSession,
		stats: isFirst
			? {
					totalHintsUsed: state.stats.totalHintsUsed + result.hintsUsed,
					totalMistakes: state.stats.totalMistakes + result.mistakes,
					totalPuzzlesSolved: state.stats.totalPuzzlesSolved + 1,
				}
			: state.stats,
	}
}

/** @deprecated Use withTrackCompleted */
export function withCampaignCompleted(
	state: PersistedAppState,
	result: PersistedTrackLevelResult,
): PersistedAppState {
	return withTrackCompleted(state, 'easy', result)
}

export function withDailyCompleted(
	state: PersistedAppState,
	result: PersistedDailyResult,
): PersistedAppState {
	const existing = state.daily.completions[result.dateKey]
	const completions = {
		...state.daily.completions,
		[result.dateKey]: existing ?? result,
	}
	const isFirst = !existing
	return {
		...state,
		daily: { completions },
		activeSession:
			state.activeSession?.source.kind === 'daily' &&
			state.activeSession.source.dateKey === result.dateKey
				? null
				: state.activeSession,
		stats: isFirst
			? {
					totalHintsUsed: state.stats.totalHintsUsed + result.hintsUsed,
					totalMistakes: state.stats.totalMistakes + result.mistakes,
					totalPuzzlesSolved: state.stats.totalPuzzlesSolved + 1,
				}
			: state.stats,
	}
}

export function withEndlessCompleted(
	state: PersistedAppState,
	payload: {
		readonly elapsedMs: number
		readonly mistakes: number
		readonly hintsUsed: number
	},
): PersistedAppState {
	const completedCount = state.endless.completedCount + 1
	return {
		...state,
		endless: {
			completedCount,
			bestCompletedCount: Math.max(
				state.endless.bestCompletedCount,
				completedCount,
			),
		},
		activeSession: null,
		stats: {
			totalHintsUsed: state.stats.totalHintsUsed + payload.hintsUsed,
			totalMistakes: state.stats.totalMistakes + payload.mistakes,
			totalPuzzlesSolved: state.stats.totalPuzzlesSolved + 1,
		},
	}
}

export function withMultiplicationCompleted(
	state: PersistedAppState,
	table: number | 'mixed',
	payload: {
		readonly mistakes: number
		readonly hintsUsed: number
	},
): PersistedAppState {
	const key = String(table)
	const previous = state.multiplication.solvedByTable[key] ?? 0
	return {
		...state,
		multiplication: {
			solvedByTable: {
				...state.multiplication.solvedByTable,
				[key]: previous + 1,
			},
			totalSolved: state.multiplication.totalSolved + 1,
		},
		activeSession:
			state.activeSession?.source.kind === 'multiplication'
				? null
				: state.activeSession,
		stats: {
			totalHintsUsed: state.stats.totalHintsUsed + payload.hintsUsed,
			totalMistakes: state.stats.totalMistakes + payload.mistakes,
			totalPuzzlesSolved: state.stats.totalPuzzlesSolved + 1,
		},
	}
}

export function withActiveSession(
	state: PersistedAppState,
	session: PersistedActiveSession | null,
): PersistedAppState {
	return { ...state, activeSession: session }
}

export function withSettings(
	state: PersistedAppState,
	patch: Partial<PersistedSettings>,
): PersistedAppState {
	return {
		...state,
		settings: { ...state.settings, ...patch },
	}
}

export function withLastPlayedTrackLevel(
	state: PersistedAppState,
	track: DifficultyTrack,
	level: number,
): PersistedAppState {
	return {
		...state,
		tracks: {
			...state.tracks,
			[track]: {
				...state.tracks[track],
				lastPlayedLevel: level,
			},
		},
	}
}

/** @deprecated */
export function withLastPlayedLevel(
	state: PersistedAppState,
	level: number,
): PersistedAppState {
	return withLastPlayedTrackLevel(state, 'easy', level)
}
