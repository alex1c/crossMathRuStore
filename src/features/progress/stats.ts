/**
 * Derived app statistics for the Stats screen (four-track campaign).
 */

import type { PersistedAppState } from '@/src/services/persistence'
import {
	CAMPAIGN_TOTAL_LEVELS,
	DIFFICULTY_TRACKS,
	TRACK_LEVEL_COUNT,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'
import { computeDailyStreak } from './streak'
import { countTrackSolved } from './campaign'

export type AppStats = {
	readonly campaignSolved: number
	readonly campaignTotal: number
	readonly trackSolved: Readonly<Record<DifficultyTrack, number>>
	readonly trackTotal: number
	readonly dailySolvedCount: number
	readonly streakCurrent: number
	readonly streakBest: number
	readonly endlessSolved: number
	readonly endlessBest: number
	readonly multiplicationSolved: number
	readonly totalPuzzlesSolved: number
	readonly totalHintsUsed: number
	readonly totalMistakes: number
}

export function deriveAppStats(
	state: PersistedAppState,
	todayKey: string,
): AppStats {
	const streak = computeDailyStreak(
		Object.keys(state.daily.completions),
		todayKey,
	)
	const trackSolved = {
		easy: countTrackSolved(state.tracks.easy.completedLevels),
		medium: countTrackSolved(state.tracks.medium.completedLevels),
		hard: countTrackSolved(state.tracks.hard.completedLevels),
		lobachevsky: countTrackSolved(state.tracks.lobachevsky.completedLevels),
	}
	const campaignSolved = DIFFICULTY_TRACKS.reduce(
		(sum, track) => sum + trackSolved[track],
		0,
	)
	return {
		campaignSolved,
		campaignTotal: CAMPAIGN_TOTAL_LEVELS,
		trackSolved,
		trackTotal: TRACK_LEVEL_COUNT,
		dailySolvedCount: Object.keys(state.daily.completions).length,
		streakCurrent: streak.current,
		streakBest: streak.best,
		endlessSolved: state.endless.completedCount,
		endlessBest: state.endless.bestCompletedCount,
		multiplicationSolved: state.multiplication.totalSolved,
		totalPuzzlesSolved: state.stats.totalPuzzlesSolved,
		totalHintsUsed: state.stats.totalHintsUsed,
		totalMistakes: state.stats.totalMistakes,
	}
}
