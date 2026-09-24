/**
 * Rewarded hint controller — preload, single-flight show, idempotent reward.
 */

import { getRewardedHintAdUnitId } from '@/src/config/ads'
import { getYandexAdsModule } from './yandexAdapter'
import { noteRewardedAdShown } from './adSession'

export type RewardedState =
	| 'idle'
	| 'loading'
	| 'ready'
	| 'showing'
	| 'earned'
	| 'error'

export type RewardedShowResult =
	| 'earned'
	| 'closed_without_reward'
	| 'load_error'
	| 'show_error'
	| 'busy'
	| 'unavailable'

type RewardedAd = import('yandex-mobile-ads').RewardedAd

let state: RewardedState = 'idle'
let currentAd: RewardedAd | null = null
let loading = false
let rewardGrantedForCurrentShow = false

export function getRewardedState(): RewardedState {
	return state
}

export function resetRewardedForTests(): void {
	state = 'idle'
	currentAd = null
	loading = false
	rewardGrantedForCurrentShow = false
}

export async function preloadRewardedHint(): Promise<void> {
	const adUnitId = getRewardedHintAdUnitId()
	if (!adUnitId) {
		state = 'error'
		return
	}
	if (loading || state === 'ready' || state === 'showing') {
		return
	}
	const mod = getYandexAdsModule()
	if (!mod) {
		state = 'error'
		return
	}
	loading = true
	state = 'loading'
	try {
		const loader = await mod.RewardedAdLoader.create()
		const ad = await loader.loadAd({ adUnitId })
		currentAd = ad
		state = 'ready'
	} catch {
		currentAd = null
		state = 'error'
	} finally {
		loading = false
	}
}

/**
 * Shows a preloaded rewarded ad. Resolves once with a single result.
 * Reward is granted only via onRewarded, at most once per show.
 */
export function showRewardedHint(options?: {
	readonly onFullscreenChange?: (active: boolean) => void
}): Promise<RewardedShowResult> {
	if (state === 'showing') {
		return Promise.resolve('busy')
	}
	if (state !== 'ready' || !currentAd) {
		return Promise.resolve('unavailable')
	}

	const ad = currentAd
	currentAd = null
	state = 'showing'
	rewardGrantedForCurrentShow = false
	options?.onFullscreenChange?.(true)

	return new Promise((resolve) => {
		let settled = false
		const finish = (result: RewardedShowResult) => {
			if (settled) {
				return
			}
			settled = true
			options?.onFullscreenChange?.(false)
			if (result === 'earned') {
				state = 'earned'
				noteRewardedAdShown()
			} else {
				state = 'error'
			}
			// Preload next in background; failures are non-fatal.
			void preloadRewardedHint()
			resolve(result)
		}

		ad.onRewarded = () => {
			if (rewardGrantedForCurrentShow) {
				return
			}
			rewardGrantedForCurrentShow = true
			finish('earned')
		}
		ad.onAdFailedToShow = () => {
			finish('show_error')
		}
		ad.onAdDismissed = () => {
			if (rewardGrantedForCurrentShow) {
				finish('earned')
				return
			}
			finish('closed_without_reward')
		}

		try {
			ad.show()
		} catch {
			finish('show_error')
		}
	})
}

/**
 * Idempotent reward latch used by unit tests without a native ad object.
 */
export function createRewardGrantLatch(): {
	readonly tryGrant: () => boolean
	readonly granted: () => boolean
} {
	let granted = false
	return {
		tryGrant: () => {
			if (granted) {
				return false
			}
			granted = true
			return true
		},
		granted: () => granted,
	}
}
