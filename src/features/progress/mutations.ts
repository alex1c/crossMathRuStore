/**
 * App progress mutations — pure transforms over PersistedAppState.
 */

import type {
	PersistedActiveSession,
	PersistedAppState,
	PersistedCampaignLevelResult,
	PersistedDailyResult,
	PersistedSettings,
} from '@/src/services/persistence'
import { applyCampaignCompletion } from './campaign'

export function withCampaignCompleted(
	state: PersistedAppState,
	result: PersistedCampaignLevelResult,
): PersistedAppState {
	const next = applyCampaignCompletion(
		state.campaign.highestUnlockedLevel,
		state.campaign.completedLevels,
		result.level,
	)
	const previous = state.campaign.results[String(result.level)]
	const keepPrevious =
		previous &&
		(previous.elapsedMs < result.elapsedMs ||
			(previous.elapsedMs === result.elapsedMs &&
				previous.mistakes <= result.mistakes))
	return {
		...state,
		campaign: {
			...state.campaign,
			highestUnlockedLevel: next.highestUnlockedLevel,
			completedLevels: next.completedLevels,
			lastPlayedLevel: result.level,
			results: {
				...state.campaign.results,
				[String(result.level)]: keepPrevious ? previous : result,
			},
		},
		activeSession:
			state.activeSession?.source.kind === 'campaign' &&
			state.activeSession.source.level === result.level
				? null
				: state.activeSession,
		stats: {
			totalHintsUsed: state.stats.totalHintsUsed + result.hintsUsed,
			totalMistakes: state.stats.totalMistakes + result.mistakes,
			totalPuzzlesSolved: state.stats.totalPuzzlesSolved + 1,
		},
	}
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

export function withLastPlayedLevel(
	state: PersistedAppState,
	level: number,
): PersistedAppState {
	return {
		...state,
		campaign: { ...state.campaign, lastPlayedLevel: level },
	}
}
