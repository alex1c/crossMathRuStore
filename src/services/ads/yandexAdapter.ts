/**
 * Optional Yandex Mobile Ads native bridge.
 * Returns null when the native module is unavailable (web, Jest, Expo Go).
 */

import { Platform } from 'react-native'

type YandexAdsModule = typeof import('yandex-mobile-ads')

let cachedModule: YandexAdsModule | null | undefined
let initialized = false
let initPromise: Promise<void> | null = null

/** Lazily loads the Yandex ads SDK on supported native platforms. */
export function getYandexAdsModule(): YandexAdsModule | null {
	if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
		return null
	}
	if (cachedModule !== undefined) {
		return cachedModule
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		cachedModule = require('yandex-mobile-ads') as YandexAdsModule
	} catch {
		cachedModule = null
	}
	return cachedModule
}

/** Initializes Yandex Mobile Ads once — best-effort, never throws. */
export async function initializeYandexAds(): Promise<void> {
	if (initialized) {
		return
	}
	if (initPromise) {
		return initPromise
	}
	initPromise = (async () => {
		const mod = getYandexAdsModule()
		if (!mod) {
			return
		}
		try {
			await mod.MobileAds.initialize()
			initialized = true
			if (__DEV__) {
			console.log('[CrossMath Ads] Yandex Mobile Ads initialized (demo units)')
		}
		} catch {
			// Native SDK unavailable or misconfigured — ads stay disabled.
		}
	})()
	try {
		await initPromise
	} finally {
		initPromise = null
	}
}

export function resetYandexAdsForTests(): void {
	cachedModule = undefined
	initialized = false
	initPromise = null
}
