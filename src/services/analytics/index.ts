/**
 * Privacy-safe analytics facade — semantic events only, no user content.
 */

import {
	createAppMetricaReporter,
	initializeAppMetrica,
	type AnalyticsReporter,
} from './appMetricaAdapter'
import {
	SAFE_ANALYTICS_PROP_KEYS,
	elapsedBucket,
	type AnalyticsEventName,
	type SafeAnalyticsProps,
} from './events'

let reporter: AnalyticsReporter = createAppMetricaReporter()
let bootstrapped = false

export function setAnalyticsReporterForTests(next: AnalyticsReporter): void {
	reporter = next
}

export function resetAnalyticsReporterForTests(): void {
	reporter = createAppMetricaReporter()
	bootstrapped = false
}

export function sanitizeAnalyticsProps(
	props?: SafeAnalyticsProps,
): Record<string, string | number | boolean> | undefined {
	if (!props) {
		return undefined
	}
	const sanitized: Record<string, string | number | boolean> = {}
	for (const key of SAFE_ANALYTICS_PROP_KEYS) {
		const value = props[key]
		if (value === undefined) {
			continue
		}
		if (typeof value === 'boolean' || typeof value === 'number') {
			sanitized[key] = value
			continue
		}
		if (typeof value === 'string' && isCoarseEnumValue(value)) {
			sanitized[key] = value
		}
	}
	return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function isCoarseEnumValue(value: string): boolean {
	if (value.length === 0 || value.length > 48) {
		return false
	}
	if (/\s/.test(value)) {
		return false
	}
	return /^[a-z0-9_]+$/.test(value)
}

export function trackAnalyticsEvent(
	eventName: AnalyticsEventName,
	props?: SafeAnalyticsProps,
): void {
	try {
		const attributes = sanitizeAnalyticsProps(props)
		reporter.reportEvent(eventName, attributes)
	} catch {
		// Analytics must never break user flows.
	}
}

/** One-shot analytics bootstrap for root layout. */
export function bootstrapAnalytics(): void {
	if (bootstrapped) {
		return
	}
	bootstrapped = true
	try {
		initializeAppMetrica()
	} catch {
		// Non-fatal.
	}
}

export { elapsedBucket }
export type { AnalyticsEventName, SafeAnalyticsProps }
