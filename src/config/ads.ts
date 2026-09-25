/**
 * Central CrossMath ad-unit configuration.
 *
 * Production RSYA application: R-M-20110016
 * Three intentional banner groups share units (not one ID per screen).
 * __DEV__ always resolves to official Yandex demo units (never production IDs).
 * Release builds refuse empty/placeholder/demo IDs via validateProductionAdConfig().
 */

export type BannerPlacement =
	| 'home'
	| 'levels'
	| 'track_levels'
	| 'game'
	| 'daily'
	| 'multiplication'
	| 'stats'
	| 'settings'
	| 'reminder'
	| 'about'
	| 'training'

export type RewardedPlacement = 'hint'
export type InterstitialPlacement = 'completion'

/** Official Yandex demo units — safe for local QA only. */
export const YANDEX_DEMO_AD_UNITS = {
	banner: 'demo-banner-yandex',
	rewarded: 'demo-rewarded-yandex',
	interstitial: 'demo-interstitial-yandex',
} as const

/**
 * Production RSYA units for package com.calculatorplatform.crossmath.
 * Banner IDs are intentionally grouped (GAME / MAIN / SECONDARY).
 * Do NOT copy IDs from other ForestMusic apps.
 */
export const PRODUCTION_AD_UNITS = {
	/** GAME banner group */
	GAME_BANNER: 'R-M-20110016-1',
	/** MAIN / game-discovery banner group */
	HOME_BANNER: 'R-M-20110016-2',
	LEVELS_BANNER: 'R-M-20110016-2',
	TRACK_LEVELS_BANNER: 'R-M-20110016-2',
	DAILY_BANNER: 'R-M-20110016-2',
	MULTIPLICATION_BANNER: 'R-M-20110016-2',
	/** SECONDARY / information banner group */
	STATS_BANNER: 'R-M-20110016-3',
	SETTINGS_BANNER: 'R-M-20110016-3',
	REMINDER_BANNER: 'R-M-20110016-3',
	ABOUT_BANNER: 'R-M-20110016-3',
	REWARDED_HINT: 'R-M-20110016-5',
	INTERSTITIAL_COMPLETION: 'R-M-20110016-4',
} as const

/** Documented grouping for tests and release reports. */
export const PRODUCTION_BANNER_GROUPS = {
	game: 'R-M-20110016-1',
	main: 'R-M-20110016-2',
	secondary: 'R-M-20110016-3',
} as const

const BANNER_PRODUCTION_MAP: Readonly<Record<BannerPlacement, string>> = {
	home: PRODUCTION_AD_UNITS.HOME_BANNER,
	levels: PRODUCTION_AD_UNITS.LEVELS_BANNER,
	track_levels: PRODUCTION_AD_UNITS.TRACK_LEVELS_BANNER,
	game: PRODUCTION_AD_UNITS.GAME_BANNER,
	daily: PRODUCTION_AD_UNITS.DAILY_BANNER,
	multiplication: PRODUCTION_AD_UNITS.MULTIPLICATION_BANNER,
	stats: PRODUCTION_AD_UNITS.STATS_BANNER,
	settings: PRODUCTION_AD_UNITS.SETTINGS_BANNER,
	reminder: PRODUCTION_AD_UNITS.REMINDER_BANNER,
	about: PRODUCTION_AD_UNITS.ABOUT_BANNER,
	training: '', // onboarding never loads a real ad
}

/** Reserved banner height used by GameScreen / BannerSlot geometry. */
export const ADS_BANNER_RESERVED_HEIGHT = 50

/** Free hints allowed per puzzle before rewarded is required. */
export const FREE_HINTS_PER_PUZZLE = 1

/** Interstitial session guard (ForestMusic-conservative + CrossMath brief). */
export const INTERSTITIAL_MIN_SESSION_MS = 5 * 60 * 1000
export const INTERSTITIAL_MIN_COMPLETIONS = 5
export const INTERSTITIAL_MAX_PER_SESSION = 1

export function isAdsProductionBuild(): boolean {
	return !__DEV__
}

/**
 * Local screenshot capture switch. Set EXPO_PUBLIC_SCREENSHOT_QA_MODE=1 before
 * starting Metro; set it to 0 (or remove it) to restore normal DEV ads.
 * The production-build guard makes this switch inert in release bundles.
 */
export function isScreenshotQaModeEnabled(
	production = isAdsProductionBuild(),
	requested = process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE === '1',
): boolean {
	return !production && requested
}

export function isPlaceholderAdUnitId(id: string): boolean {
	if (!id || id.trim().length === 0) {
		return true
	}
	if (id.startsWith('PLACEHOLDER_')) {
		return true
	}
	if (id.startsWith('demo-')) {
		return true
	}
	return false
}

/** Resolves banner unit for the current build flavor. Empty = slot stays neutral. */
export function getBannerAdUnitId(
	placement: BannerPlacement,
	production = isAdsProductionBuild(),
	screenshotQaMode = isScreenshotQaModeEnabled(production),
): string {
	if (placement === 'training' || (!production && screenshotQaMode)) {
		return ''
	}
	if (!production) {
		return YANDEX_DEMO_AD_UNITS.banner
	}
	const id = BANNER_PRODUCTION_MAP[placement]
	return isPlaceholderAdUnitId(id) ? '' : id
}

export function getRewardedHintAdUnitId(
	production = isAdsProductionBuild(),
): string {
	if (!production) {
		return YANDEX_DEMO_AD_UNITS.rewarded
	}
	const id = PRODUCTION_AD_UNITS.REWARDED_HINT
	return isPlaceholderAdUnitId(id) ? '' : id
}

export function getInterstitialAdUnitId(
	production = isAdsProductionBuild(),
): string {
	if (!production) {
		return YANDEX_DEMO_AD_UNITS.interstitial
	}
	const id = PRODUCTION_AD_UNITS.INTERSTITIAL_COMPLETION
	return isPlaceholderAdUnitId(id) ? '' : id
}

export type ProductionAdsValidation = {
	readonly ok: boolean
	readonly missing: readonly string[]
}

/**
 * Release-gate helper — production must not silently use demo/placeholder IDs.
 * Shared banner group IDs are intentional and accepted.
 * Development never fails this check.
 */
export function validateProductionAdConfig(
	production = isAdsProductionBuild(),
): ProductionAdsValidation {
	if (!production) {
		return { ok: true, missing: [] }
	}
	const missing: string[] = []
	for (const [key, value] of Object.entries(PRODUCTION_AD_UNITS)) {
		if (isPlaceholderAdUnitId(value)) {
			missing.push(key)
		}
	}
	return { ok: missing.length === 0, missing }
}
