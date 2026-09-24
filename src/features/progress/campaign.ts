/**
 * Per-track unlock / completion pure helpers (independent 1–50 tracks).
 */

import type { DifficultyTrack } from '@/src/core/crossmath/tracks'
import {
	CAMPAIGN_TOTAL_LEVELS,
	TRACK_LEVEL_COUNT,
} from '@/src/core/crossmath/tracks'

export type TrackLevelStatus = 'locked' | 'unlocked' | 'completed'

export function getTrackLevelStatus(
	level: number,
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
): TrackLevelStatus {
	if (!Number.isInteger(level) || level < 1 || level > TRACK_LEVEL_COUNT) {
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

export function isTrackLevelPlayable(
	level: number,
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
): boolean {
	const status = getTrackLevelStatus(
		level,
		highestUnlockedLevel,
		completedLevels,
	)
	return status === 'unlocked' || status === 'completed'
}

export function applyTrackCompletion(
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
	const unlockNext = Math.min(TRACK_LEVEL_COUNT, level + 1)
	return {
		highestUnlockedLevel: Math.max(highestUnlockedLevel, unlockNext, level),
		completedLevels: nextCompleted,
	}
}

/**
 * Next level within a single track.
 */
export function getNextTrackLevel(
	highestUnlockedLevel: number,
	completedLevels: readonly number[],
): number {
	const unlocked = Math.min(
		TRACK_LEVEL_COUNT,
		Math.max(1, highestUnlockedLevel),
	)
	const completed = new Set(completedLevels)
	for (let level = 1; level <= unlocked; level += 1) {
		if (!completed.has(level)) {
			return level
		}
	}
	return unlocked
}

export function countTrackSolved(
	completedLevels: readonly number[],
): number {
	return completedLevels.filter(
		(level) => level >= 1 && level <= TRACK_LEVEL_COUNT,
	).length
}

export type TrackSolvedSummary = Readonly<
	Record<DifficultyTrack, number>
> & {
	readonly total: number
	readonly campaignTotal: number
}

export {
	TRACK_LEVEL_COUNT,
	CAMPAIGN_TOTAL_LEVELS,
}

/** @deprecated Prefer track helpers. Kept for migration-era tests. */
export const getCampaignLevelStatus = getTrackLevelStatus
export const applyCampaignCompletion = applyTrackCompletion
export const getNextCampaignLevel = getNextTrackLevel
export const isCampaignLevelPlayable = isTrackLevelPlayable
