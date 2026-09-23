/**
 * Campaign unlock / completion pure helpers.
 */

export type CampaignLevelStatus = 'locked' | 'unlocked' | 'completed'

export function getCampaignLevelStatus(
	level: number,
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
): CampaignLevelStatus {
	if (!Number.isInteger(level) || level < 1 || level > 250) {
		return 'locked'
	}
	if (completedLevels.includes(level)) {
		return 'completed'
	}
	if (level <= highestUnlockedLevel) {
		return 'unlocked'
	}
	return 'locked'
}

export function isCampaignLevelPlayable(
	level: number,
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
): boolean {
	const status = getCampaignLevelStatus(
		level,
		highestUnlockedLevel,
		completedLevels,
	)
	return status === 'unlocked' || status === 'completed'
}

/**
 * Apply a successful campaign level completion.
 */
export function applyCampaignCompletion(
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
	level: number,
): {
	highestUnlockedLevel: number
	completedLevels: number[]
} {
	const nextCompleted = completedLevels.includes(level)
		? [...completedLevels]
		: [...completedLevels, level].sort((a, b) => a - b)
	const unlockNext = Math.min(250, level + 1)
	return {
		highestUnlockedLevel: Math.max(highestUnlockedLevel, unlockNext, level),
		completedLevels: nextCompleted,
	}
}

export const CAMPAIGN_TOTAL_LEVELS = 250
