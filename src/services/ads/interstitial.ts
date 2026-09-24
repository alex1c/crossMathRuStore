/**
 * Completion interstitial — preload + guarded show. Never blocks Next/Home.
 */

import { getInterstitialAdUnitId } from '@/src/config/ads'
import {
	canAttemptCompletionInterstitial,
	noteInterstitialAdShown,
} from './adSession'
import { getYandexAdsModule } from './yandexAdapter'

type InterstitialAd = import('yandex-mobile-ads').InterstitialAd

let ready = false
let loading = false
let currentAd: InterstitialAd | null = null

export function resetInterstitialForTests(): void {
	ready = false
	loading = false
	currentAd = null
}

export function isInterstitialReady(): boolean {
	return ready && currentAd !== null
}

export async function preloadInterstitial(): Promise<void> {
	const adUnitId = getInterstitialAdUnitId()
	if (!adUnitId || loading || ready) {
		return
	}
	const mod = getYandexAdsModule()
	if (!mod) {
		return
	}
	loading = true
	try {
		const loader = await mod.InterstitialAdLoader.create()
		const ad = await loader.loadAd({ adUnitId })
		currentAd = ad
		ready = true
	} catch {
		currentAd = null
		ready = false
	} finally {
		loading = false
	}
}

/**
 * After puzzle completion is persisted, optionally show a guarded interstitial.
 * Returns immediately on no-fill / ineligible — never waits on retries.
 */
export async function maybeShowCompletionInterstitial(options: {
	readonly sourceKind: string
	readonly onFullscreenChange?: (active: boolean) => void
}): Promise<boolean> {
	// Daily completion: conservative — skip interstitial to avoid ritual → ad feel.
	const blocked =
		options.sourceKind === 'daily' ||
		options.sourceKind === 'tutorial' ||
		options.sourceKind === 'dev-fixture'

	const eligible = canAttemptCompletionInterstitial({
		adReady: isInterstitialReady(),
		blocked,
	})
	if (!eligible || !currentAd) {
		return false
	}

	const ad = currentAd
	currentAd = null
	ready = false
	options.onFullscreenChange?.(true)

	try {
		await new Promise<void>((resolve) => {
			let done = false
			const finish = () => {
				if (done) {
					return
				}
				done = true
				resolve()
			}
			ad.onAdDismissed = finish
			ad.onAdFailedToShow = finish
			try {
				ad.show()
			} catch {
				finish()
			}
		})
		noteInterstitialAdShown()
		options.onFullscreenChange?.(false)
		void preloadInterstitial()
		return true
	} catch {
		options.onFullscreenChange?.(false)
		void preloadInterstitial()
		return false
	}
}
