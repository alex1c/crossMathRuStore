/**
 * Free vs rewarded hint policy — pure helpers for GameScreen / tests.
 */

import { FREE_HINTS_PER_PUZZLE } from '@/src/config/ads'

export type HintGrantKind = 'free' | 'rewarded'

/**
 * First FREE_HINTS_PER_PUZZLE hints on a puzzle are free.
 * Further hints require a verified rewarded callback.
 */
export function resolveHintGrantKind(hintsUsed: number): HintGrantKind {
	if (hintsUsed < FREE_HINTS_PER_PUZZLE) {
		return 'free'
	}
	return 'rewarded'
}

export function shouldRequestRewardedForHint(hintsUsed: number): boolean {
	return resolveHintGrantKind(hintsUsed) === 'rewarded'
}
