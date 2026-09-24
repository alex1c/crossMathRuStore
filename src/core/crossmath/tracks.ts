/**
 * Production difficulty tracks — independent 50-level campaigns.
 * Promoted from Phase 5.5 research; no cross-track locks.
 */

export type DifficultyTrack = 'easy' | 'medium' | 'hard' | 'lobachevsky'

export const DIFFICULTY_TRACKS: readonly DifficultyTrack[] = [
	'easy',
	'medium',
	'hard',
	'lobachevsky',
] as const

export const TRACK_LEVEL_COUNT = 50 as const
export const CAMPAIGN_TOTAL_LEVELS =
	DIFFICULTY_TRACKS.length * TRACK_LEVEL_COUNT

export const TRACK_LABELS: Readonly<Record<DifficultyTrack, string>> = {
	easy: 'Просто',
	medium: 'Средне',
	hard: 'Сложно',
	lobachevsky: 'Лобачевский',
}

export const TRACK_DESCRIPTIONS: Readonly<Record<DifficultyTrack, string>> = {
	easy: 'Для спокойной игры и знакомства',
	medium: 'Уже нужно подумать',
	hard: 'Плотные кроссворды и меньше очевидных ходов',
	lobachevsky: 'Для тех, кому обычного сложного мало',
}

/** Keypad for Easy/Medium; Number Bank for Hard/Lobachevsky. */
export type TrackInputMode = 'keypad' | 'bank'

export function getTrackInputMode(track: DifficultyTrack): TrackInputMode {
	return track === 'hard' || track === 'lobachevsky' ? 'bank' : 'keypad'
}

export function isDifficultyTrack(value: string): value is DifficultyTrack {
	return (
		value === 'easy' ||
		value === 'medium' ||
		value === 'hard' ||
		value === 'lobachevsky'
	)
}

export function getTrackLabel(track: DifficultyTrack): string {
	return TRACK_LABELS[track]
}

export function assertTrackLevel(level: number): number {
	if (!Number.isInteger(level) || level < 1 || level > TRACK_LEVEL_COUNT) {
		throw new RangeError(
			`track level must be an integer from 1 to ${TRACK_LEVEL_COUNT}`,
		)
	}
	return level
}
