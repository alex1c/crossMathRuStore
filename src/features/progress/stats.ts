/**
 * Derived stats from persisted app state.
 */

import type { PersistedAppState } from '@/src/services/persistence'
import { CAMPAIGN_TOTAL_LEVELS } from './campaign'
import { computeDailyStreak } from './streak'

export type AppStats = {
	readonly campaignSolved: number
	readonly campaignTotal: number
	readonly dailySolved: number
	readonly dailyStreakCurrent: number
	readonly dailyStreakBest: number
	readonly endlessSolved: number
	readonly totalPuzzlesSolved: number
	readonly hintsUsed: number
	readonly mistakes: number
}

export function deriveAppStats(
	state: PersistedAppState,
	todayKey: string,
): AppStats {
	const dailyKeys = Object.keys(state.daily.completions)
	const streak = computeDailyStreak(dailyKeys, todayKey)
	return {
		campaignSolved: state.campaign.completedLevels.length,
		campaignTotal: CAMPAIGN_TOTAL_LEVELS,
		dailySolved: dailyKeys.length,
		dailyStreakCurrent: streak.current,
		dailyStreakBest: streak.best,
		endlessSolved: state.endless.completedCount,
		totalPuzzlesSolved: state.stats.totalPuzzlesSolved,
		hintsUsed: state.stats.totalHintsUsed,
		mistakes: state.stats.totalMistakes,
	}
}
