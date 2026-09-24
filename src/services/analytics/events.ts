/**
 * Privacy-safe CrossMath analytics event catalog.
 * No puzzle entries, free text, or personal identifiers.
 */

export const ANALYTICS_EVENTS = [
	'onboarding_started',
	'onboarding_completed',
	'onboarding_skipped',
	'track_opened',
	'puzzle_started',
	'puzzle_completed',
	'daily_opened',
	'daily_completed',
	'endless_started',
	'endless_puzzle_completed',
	'multiplication_opened',
	'multiplication_puzzle_started',
	'multiplication_puzzle_completed',
	'hint_requested',
	'hint_granted',
	'rewarded_ad_result',
	'banner_load_error',
	'rewarded_earned',
	'interstitial_shown',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

export const SAFE_ANALYTICS_PROP_KEYS = [
	'source',
	'track',
	'local_level',
	'input_mode',
	'kind',
	'result',
	'table',
	'completed_count',
	'mistakes',
	'hints',
	'streak',
	'elapsed_bucket',
	'placement',
] as const

export type SafeAnalyticsPropKey = (typeof SAFE_ANALYTICS_PROP_KEYS)[number]

export type SafeAnalyticsProps = Partial<
	Record<SafeAnalyticsPropKey, string | number | boolean>
>

/** Coarse elapsed buckets — avoids high-cardinality exact ms. */
export function elapsedBucket(ms: number): string {
	if (ms < 30_000) {
		return 'under_30s'
	}
	if (ms < 60_000) {
		return '30s_60s'
	}
	if (ms < 120_000) {
		return '1m_2m'
	}
	if (ms < 300_000) {
		return '2m_5m'
	}
	return 'over_5m'
}
