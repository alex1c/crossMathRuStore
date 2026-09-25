/**
 * Ads service public surface — initialize once from root layout.
 */

import { initializeYandexAds } from './yandexAdapter'
import { preloadRewardedHint } from './rewarded'
import { preloadInterstitial } from './interstitial'
import { resetAdSessionRuntime } from './adSession'
import { isScreenshotQaModeEnabled } from '@/src/config/ads'

export { initializeYandexAds, getYandexAdsModule } from './yandexAdapter'
export {
	resetAdSessionRuntime,
	noteMeaningfulPuzzleCompletion,
	canAttemptCompletionInterstitial,
	getAdSessionGuardState,
} from './adSession'
export {
	preloadRewardedHint,
	showRewardedHint,
	getRewardedState,
	createRewardGrantLatch,
	resetRewardedForTests,
	type RewardedShowResult,
	type RewardedState,
} from './rewarded'
export {
	preloadInterstitial,
	maybeShowCompletionInterstitial,
	isInterstitialReady,
	resetInterstitialForTests,
} from './interstitial'
export {
	resolveHintGrantKind,
	shouldRequestRewardedForHint,
	type HintGrantKind,
} from './hintPolicy'
export {
	isInterstitialEligible,
	createInterstitialGuardState,
	recordMeaningfulCompletion,
	recordInterstitialShown,
	recordRewardedShown,
} from './interstitialGuard'

let bootstrapped = false

/** One-shot ads bootstrap for root layout — never throws. */
export async function bootstrapAds(): Promise<void> {
	if (bootstrapped) {
		return
	}
	bootstrapped = true
	resetAdSessionRuntime()
	if (isScreenshotQaModeEnabled()) {
		return
	}
	try {
		await initializeYandexAds()
		void preloadRewardedHint()
		void preloadInterstitial()
	} catch {
		// Ads are optional — continue without them.
	}
}

export function resetAdsBootstrapForTests(): void {
	bootstrapped = false
}
