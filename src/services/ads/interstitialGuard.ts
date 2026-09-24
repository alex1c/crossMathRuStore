/**
 * Pure interstitial eligibility — no SDK / UI dependencies (unit-testable).
 *
 * CrossMath policy:
 * - ≥ 5 minutes since app session start
 * - ≥ 5 meaningful puzzle completions this session
 * - max 1 interstitial per app session
 * - never for onboarding / daily-open / immediately after rewarded
 */

import {
	INTERSTITIAL_MAX_PER_SESSION,
	INTERSTITIAL_MIN_COMPLETIONS,
	INTERSTITIAL_MIN_SESSION_MS,
} from '@/src/config/ads'

export type InterstitialGuardState = {
	readonly sessionStartedAt: number
	readonly meaningfulCompletionCount: number
	readonly interstitialShownThisSession: number
	readonly lastRewardedAt: number | null
}

export type InterstitialEligibilityInput = InterstitialGuardState & {
	readonly now: number
	readonly adReady: boolean
	/** Source kinds that must never trigger interstitial. */
	readonly blocked: boolean
}

export function createInterstitialGuardState(
	now = Date.now(),
): InterstitialGuardState {
	return {
		sessionStartedAt: now,
		meaningfulCompletionCount: 0,
		interstitialShownThisSession: 0,
		lastRewardedAt: null,
	}
}

export function recordMeaningfulCompletion(
	state: InterstitialGuardState,
): InterstitialGuardState {
	return {
		...state,
		meaningfulCompletionCount: state.meaningfulCompletionCount + 1,
	}
}

export function recordRewardedShown(
	state: InterstitialGuardState,
	now = Date.now(),
): InterstitialGuardState {
	return {
		...state,
		lastRewardedAt: now,
	}
}

export function recordInterstitialShown(
	state: InterstitialGuardState,
): InterstitialGuardState {
	return {
		...state,
		interstitialShownThisSession: state.interstitialShownThisSession + 1,
	}
}

/** Minimum quiet period after a rewarded ad before interstitial may show. */
export const INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS = 60_000

export function isInterstitialEligible(
	input: InterstitialEligibilityInput,
): boolean {
	if (input.blocked) {
		return false
	}
	if (!input.adReady) {
		return false
	}
	if (input.interstitialShownThisSession >= INTERSTITIAL_MAX_PER_SESSION) {
		return false
	}
	if (input.meaningfulCompletionCount < INTERSTITIAL_MIN_COMPLETIONS) {
		return false
	}
	if (input.now - input.sessionStartedAt < INTERSTITIAL_MIN_SESSION_MS) {
		return false
	}
	if (
		input.lastRewardedAt !== null &&
		input.now - input.lastRewardedAt < INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS
	) {
		return false
	}
	return true
}
