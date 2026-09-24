/**
 * Phase 6 — ads guards, hint policy, config validation, analytics sanitize.
 */

import {
	FREE_HINTS_PER_PUZZLE,
	getBannerAdUnitId,
	getInterstitialAdUnitId,
	getRewardedHintAdUnitId,
	isPlaceholderAdUnitId,
	validateProductionAdConfig,
	YANDEX_DEMO_AD_UNITS,
	INTERSTITIAL_MIN_COMPLETIONS,
	INTERSTITIAL_MIN_SESSION_MS,
} from '@/src/config/ads'
import {
	getAppMetricaApiKey,
	validateProductionAnalyticsConfig,
} from '@/src/config/analytics'
import {
	createInterstitialGuardState,
	isInterstitialEligible,
	recordMeaningfulCompletion,
	recordInterstitialShown,
	recordRewardedShown,
	INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS,
} from '@/src/services/ads/interstitialGuard'
import {
	createRewardGrantLatch,
} from '@/src/services/ads/rewarded'
import {
	resolveHintGrantKind,
	shouldRequestRewardedForHint,
} from '@/src/services/ads/hintPolicy'
import {
	elapsedBucket,
	sanitizeAnalyticsProps,
} from '@/src/services/analytics'
import {
	pauseActiveTimer,
	resumeActiveTimer,
	createActiveTimer,
	getActiveElapsedMs,
} from '@/src/features/progress'

describe('Phase 6 ads config', () => {
	it('uses Yandex demo units in development', () => {
		expect(getBannerAdUnitId('home', false)).toBe(YANDEX_DEMO_AD_UNITS.banner)
		expect(getRewardedHintAdUnitId(false)).toBe(YANDEX_DEMO_AD_UNITS.rewarded)
		expect(getInterstitialAdUnitId(false)).toBe(
			YANDEX_DEMO_AD_UNITS.interstitial,
		)
		expect(getBannerAdUnitId('training', false)).toBe('')
	})

	it('disables production placeholders instead of shipping demo IDs', () => {
		expect(isPlaceholderAdUnitId('PLACEHOLDER_RSYA_HOME_BANNER')).toBe(true)
		expect(getBannerAdUnitId('home', true)).toBe('')
		expect(getRewardedHintAdUnitId(true)).toBe('')
		expect(validateProductionAdConfig(true).ok).toBe(false)
		expect(validateProductionAdConfig(false).ok).toBe(true)
	})

	it('requires a real AppMetrica key for production validation', () => {
		expect(validateProductionAnalyticsConfig(true).ok).toBe(false)
		expect(getAppMetricaApiKey(false).length).toBeGreaterThan(0)
		expect(getAppMetricaApiKey(true)).toBe('')
	})
})

describe('Phase 6 hint policy', () => {
	it('grants the first hint free then requires rewarded', () => {
		expect(FREE_HINTS_PER_PUZZLE).toBe(1)
		expect(resolveHintGrantKind(0)).toBe('free')
		expect(shouldRequestRewardedForHint(0)).toBe(false)
		expect(resolveHintGrantKind(1)).toBe('rewarded')
		expect(shouldRequestRewardedForHint(1)).toBe(true)
	})
})

describe('Phase 6 reward idempotency', () => {
	it('grants a reward at most once', () => {
		const latch = createRewardGrantLatch()
		expect(latch.tryGrant()).toBe(true)
		expect(latch.tryGrant()).toBe(false)
		expect(latch.granted()).toBe(true)
	})
})

describe('Phase 6 interstitial guard', () => {
	it('requires time, completions, and denies daily/blocked contexts', () => {
		const started = 1_000_000
		let state = createInterstitialGuardState(started)
		for (let i = 0; i < INTERSTITIAL_MIN_COMPLETIONS; i += 1) {
			state = recordMeaningfulCompletion(state)
		}
		expect(
			isInterstitialEligible({
				...state,
				adReady: true,
				blocked: false,
				now: started + INTERSTITIAL_MIN_SESSION_MS - 1,
			}),
		).toBe(false)
		expect(
			isInterstitialEligible({
				...state,
				adReady: true,
				blocked: false,
				now: started + INTERSTITIAL_MIN_SESSION_MS,
			}),
		).toBe(true)
		expect(
			isInterstitialEligible({
				...state,
				adReady: true,
				blocked: true,
				now: started + INTERSTITIAL_MIN_SESSION_MS,
			}),
		).toBe(false)
		const afterShow = recordInterstitialShown(state)
		expect(
			isInterstitialEligible({
				...afterShow,
				adReady: true,
				blocked: false,
				now: started + INTERSTITIAL_MIN_SESSION_MS * 2,
			}),
		).toBe(false)
	})

	it('cools down after rewarded ads', () => {
		const started = 1_000_000
		let state = createInterstitialGuardState(started)
		for (let i = 0; i < INTERSTITIAL_MIN_COMPLETIONS; i += 1) {
			state = recordMeaningfulCompletion(state)
		}
		const rewardedAt = started + INTERSTITIAL_MIN_SESSION_MS
		state = recordRewardedShown(state, rewardedAt)
		expect(
			isInterstitialEligible({
				...state,
				adReady: true,
				blocked: false,
				now: rewardedAt + INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS - 1,
			}),
		).toBe(false)
		expect(
			isInterstitialEligible({
				...state,
				adReady: true,
				blocked: false,
				now: rewardedAt + INTERSTITIAL_AFTER_REWARDED_COOLDOWN_MS,
			}),
		).toBe(true)
	})
})

describe('Phase 6 analytics sanitize', () => {
	it('strips free text and keeps coarse enums', () => {
		expect(
			sanitizeAnalyticsProps({
				source: 'track',
				track: 'hard',
				kind: 'rewarded',
				// @ts-expect-error intentional junk key
				note: 'user typed this',
			}),
		).toEqual({
			source: 'track',
			track: 'hard',
			kind: 'rewarded',
		})
		expect(elapsedBucket(12_000)).toBe('under_30s')
		expect(elapsedBucket(90_000)).toBe('1m_2m')
	})
})

describe('Phase 6 timer + fullscreen ad pause', () => {
	it('does not count paused fullscreen intervals as active solve time', () => {
		const t0 = 1_000_000
		let timer = createActiveTimer(t0)
		timer = pauseActiveTimer(timer, t0 + 10_000)
		expect(getActiveElapsedMs(timer, t0 + 10_000)).toBe(10_000)
		// 20s "ad" while paused
		timer = resumeActiveTimer(timer, t0 + 30_000)
		timer = pauseActiveTimer(timer, t0 + 35_000)
		expect(getActiveElapsedMs(timer, t0 + 35_000)).toBe(15_000)
	})
})
