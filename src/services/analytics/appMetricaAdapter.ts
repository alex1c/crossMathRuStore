/**
 * Optional AppMetrica native bridge — null when module unavailable.
 */

import { Platform } from 'react-native'
import { getAppMetricaApiKey } from '@/src/config/analytics'

type AppMetricaModule = typeof import('@appmetrica/react-native-analytics').default

let cachedModule: AppMetricaModule | null | undefined
let activated = false

export function getAppMetricaModule(): AppMetricaModule | null {
	if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
		return null
	}
	if (cachedModule !== undefined) {
		return cachedModule
	}
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const loaded = require('@appmetrica/react-native-analytics')
			.default as AppMetricaModule
		cachedModule = loaded
	} catch {
		cachedModule = null
	}
	return cachedModule
}

/** Activates AppMetrica once — non-blocking, never throws. */
export function initializeAppMetrica(): void {
	if (activated) {
		return
	}
	const mod = getAppMetricaModule()
	const apiKey = getAppMetricaApiKey()
	if (!mod || !apiKey) {
		return
	}
	try {
		mod.activate({
			apiKey,
			sessionTimeout: 300,
			logs: __DEV__,
			statisticsSending: true,
			locationTracking: false,
			advIdentifiersTracking: false,
		})
		activated = true
		if (__DEV__) {
			console.log('[CrossMath Analytics] AppMetrica activated (dev key)')
		}
	} catch {
		// Analytics stays disabled when native module is missing.
	}
}

export type AnalyticsReporter = {
	reportEvent: (
		eventName: string,
		attributes?: Record<string, string | number | boolean>,
	) => void
}

export function createAppMetricaReporter(): AnalyticsReporter {
	return {
		reportEvent: (eventName, attributes) => {
			if (!getAppMetricaApiKey()) {
				return
			}
			const mod = getAppMetricaModule()
			if (!mod) {
				return
			}
			try {
				if (attributes && Object.keys(attributes).length > 0) {
					mod.reportEvent(eventName, attributes)
				} else {
					mod.reportEvent(eventName)
				}
			} catch {
				// Best-effort analytics must never surface errors to the UI.
			}
		},
	}
}

export function resetAppMetricaForTests(): void {
	cachedModule = undefined
	activated = false
}
