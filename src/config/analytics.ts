/**
 * Central AppMetrica configuration for CrossMath.
 * Production key is the CrossMath AppMetrica application API key.
 * Do NOT copy keys from other ForestMusic apps.
 */

import { isAdsProductionBuild } from './ads'

/** CrossMath production AppMetrica application API key. */
export const APPMETRICA_PRODUCTION_API_KEY =
	'2f9a4c33-9a81-4dfd-b4ff-9c8a8206353f' as const

/** Documented smoke-test key shape — never used for production traffic. */
export const APPMETRICA_DEV_API_KEY =
	'00000000-0000-0000-0000-000000000000' as const

export function isPlaceholderAppMetricaKey(key: string): boolean {
	if (!key || key.trim().length === 0) {
		return true
	}
	if (key.startsWith('PLACEHOLDER_')) {
		return true
	}
	if (key === APPMETRICA_DEV_API_KEY) {
		return true
	}
	return false
}

/**
 * Resolves AppMetrica API key for the current flavor.
 * Empty string disables analytics (safe no-op reporter).
 */
export function getAppMetricaApiKey(
	production = isAdsProductionBuild(),
): string {
	if (!production) {
		return APPMETRICA_DEV_API_KEY
	}
	return isPlaceholderAppMetricaKey(APPMETRICA_PRODUCTION_API_KEY)
		? ''
		: APPMETRICA_PRODUCTION_API_KEY
}

export function validateProductionAnalyticsConfig(
	production = isAdsProductionBuild(),
): { readonly ok: boolean; readonly missing: readonly string[] } {
	if (!production) {
		return { ok: true, missing: [] }
	}
	if (isPlaceholderAppMetricaKey(APPMETRICA_PRODUCTION_API_KEY)) {
		return { ok: false, missing: ['APPMETRICA_PRODUCTION_API_KEY'] }
	}
	return { ok: true, missing: [] }
}
