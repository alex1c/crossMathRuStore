/**
 * Phase 6 / 6.1 — ads guards, hint policy, production config, analytics sanitize.
 */

import {
	FREE_HINTS_PER_PUZZLE,
	getBannerAdUnitId,
	getInterstitialAdUnitId,
	getRewardedHintAdUnitId,
	isPlaceholderAdUnitId,
	PRODUCTION_AD_UNITS,
	PRODUCTION_BANNER_GROUPS,
	validateProductionAdConfig,
	YANDEX_DEMO_AD_UNITS,
	INTERSTITIAL_MIN_COMPLETIONS,
	INTERSTITIAL_MIN_SESSION_MS,
	type BannerPlacement,
} from '@/src/config/ads'
import {
	APPMETRICA_PRODUCTION_API_KEY,
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
import * as fs from 'fs'
import * as path from 'path'

describe('Phase 6 ads config', () => {
	it('uses Yandex demo units in development', () => {
		expect(getBannerAdUnitId('home', false)).toBe(YANDEX_DEMO_AD_UNITS.banner)
		expect(getRewardedHintAdUnitId(false)).toBe(YANDEX_DEMO_AD_UNITS.rewarded)
		expect(getInterstitialAdUnitId(false)).toBe(
			YANDEX_DEMO_AD_UNITS.interstitial,
		)
		expect(getBannerAdUnitId('training', false)).toBe('')
	})

	it('detects placeholder shapes without treating real RSYA IDs as placeholders', () => {
		expect(isPlaceholderAdUnitId('PLACEHOLDER_RSYA_HOME_BANNER')).toBe(true)
		expect(isPlaceholderAdUnitId('demo-banner-yandex')).toBe(true)
		expect(isPlaceholderAdUnitId('R-M-20110016-1')).toBe(false)
	})

	it('passes production ad validation with intentional banner grouping', () => {
		const result = validateProductionAdConfig(true)
		expect(result.ok).toBe(true)
		expect(result.missing).toEqual([])
		expect(validateProductionAdConfig(false).ok).toBe(true)
	})

	it('maps placements to the three production banner groups', () => {
		expect(getBannerAdUnitId('game', true)).toBe(PRODUCTION_BANNER_GROUPS.game)

		const mainPlacements: BannerPlacement[] = [
			'home',
			'levels',
			'track_levels',
			'daily',
			'multiplication',
		]
		for (const placement of mainPlacements) {
			expect(getBannerAdUnitId(placement, true)).toBe(
				PRODUCTION_BANNER_GROUPS.main,
			)
		}

		const secondaryPlacements: BannerPlacement[] = [
			'stats',
			'settings',
			'reminder',
			'about',
		]
		for (const placement of secondaryPlacements) {
			expect(getBannerAdUnitId(placement, true)).toBe(
				PRODUCTION_BANNER_GROUPS.secondary,
			)
		}

		expect(getBannerAdUnitId('training', true)).toBe('')
		expect(getRewardedHintAdUnitId(true)).toBe(
			PRODUCTION_AD_UNITS.REWARDED_HINT,
		)
		expect(getInterstitialAdUnitId(true)).toBe(
			PRODUCTION_AD_UNITS.INTERSTITIAL_COMPLETION,
		)
		expect(PRODUCTION_AD_UNITS.REWARDED_HINT).toBe('R-M-20110016-5')
		expect(PRODUCTION_AD_UNITS.INTERSTITIAL_COMPLETION).toBe(
			'R-M-20110016-4',
		)
	})

	it('configures CrossMath AppMetrica production key', () => {
		expect(APPMETRICA_PRODUCTION_API_KEY).toBe(
			'2f9a4c33-9a81-4dfd-b4ff-9c8a8206353f',
		)
		expect(validateProductionAnalyticsConfig(true)).toEqual({
			ok: true,
			missing: [],
		})
		expect(getAppMetricaApiKey(true)).toBe(APPMETRICA_PRODUCTION_API_KEY)
		expect(getAppMetricaApiKey(false).length).toBeGreaterThan(0)
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

describe('Phase 6.1 signing wiring', () => {
	it('points release signing at external properties without embedded passwords', () => {
		const pluginPath = path.join(
			process.cwd(),
			'plugins',
			'withReleaseSigning.js',
		)
		const source = fs.readFileSync(pluginPath, 'utf8')
		expect(source).toContain(
			'D:/secure/android-signing/crossMath/signing.properties',
		)
		expect(source).toContain('crossmath')
		expect(source).toContain('.trim()')
		expect(source).not.toMatch(/storePassword\s*[:=]\s*['"][^'"]+['"]/)
		expect(source).not.toMatch(/keyPassword\s*[:=]\s*['"][^'"]+['"]/)
		expect(source).not.toMatch(/\.jks/)
	})
})
