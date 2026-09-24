/**
 * In-memory ad session runtime for interstitial + rewarded cooldowns.
 */

import {
	createInterstitialGuardState,
	isInterstitialEligible,
	recordInterstitialShown,
	recordMeaningfulCompletion,
	recordRewardedShown,
	type InterstitialGuardState,
} from './interstitialGuard'

let guard: InterstitialGuardState = createInterstitialGuardState()

export function resetAdSessionRuntime(now = Date.now()): void {
	guard = createInterstitialGuardState(now)
}

export function getAdSessionGuardState(): InterstitialGuardState {
	return guard
}

export function noteMeaningfulPuzzleCompletion(): void {
	guard = recordMeaningfulCompletion(guard)
}

export function noteRewardedAdShown(now = Date.now()): void {
	guard = recordRewardedShown(guard, now)
}

export function noteInterstitialAdShown(): void {
	guard = recordInterstitialShown(guard)
}

/**
 * Pure eligibility check against current session guard.
 * `blocked` should be true for daily / onboarding / settings contexts.
 */
export function canAttemptCompletionInterstitial(options: {
	readonly adReady: boolean
	readonly blocked: boolean
	readonly now?: number
}): boolean {
	return isInterstitialEligible({
		...guard,
		adReady: options.adReady,
		blocked: options.blocked,
		now: options.now ?? Date.now(),
	})
}
