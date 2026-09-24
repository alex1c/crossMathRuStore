/**
 * Central CrossMath ad-unit configuration.
 *
 * Production RSYA IDs were NOT found in the repository — placeholders only.
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
 * Production RSYA placement IDs for package com.calculatorplatform.crossmath.
 * Replace PLACEHOLDER_* values with real CrossMath units from Yandex console.
 * Do NOT copy IDs from other ForestMusic apps.
 */
export const PRODUCTION_AD_UNITS = {
	HOME_BANNER: 'PLACEHOLDER_RSYA_HOME_BANNER',
	LEVELS_BANNER: 'PLACEHOLDER_RSYA_LEVELS_BANNER',
	TRACK_LEVELS_BANNER: 'PLACEHOLDER_RSYA_TRACK_LEVELS_BANNER',
	GAME_BANNER: 'PLACEHOLDER_RSYA_GAME_BANNER',
	DAILY_BANNER: 'PLACEHOLDER_RSYA_DAILY_BANNER',
	MULTIPLICATION_BANNER: 'PLACEHOLDER_RSYA_MULTIPLICATION_BANNER',
	STATS_BANNER: 'PLACEHOLDER_RSYA_STATS_BANNER',
	SETTINGS_BANNER: 'PLACEHOLDER_RSYA_SETTINGS_BANNER',
	REMINDER_BANNER: 'PLACEHOLDER_RSYA_REMINDER_BANNER',
	ABOUT_BANNER: 'PLACEHOLDER_RSYA_ABOUT_BANNER',
	REWARDED_HINT: 'PLACEHOLDER_RSYA_REWARDED_HINT',
	INTERSTITIAL_COMPLETION: 'PLACEHOLDER_RSYA_INTERSTITIAL_COMPLETION',
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
): string {
	if (placement === 'training') {
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
