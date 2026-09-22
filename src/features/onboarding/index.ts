/**
 * Onboarding / tutorial feature slot.
 *
 * ForestMusic rule: learning is mandatory.
 * Phase 0 only reserves the route and domain marker.
 * Full interactive tutorial arrives in a later phase.
 */

export const ONBOARDING_ROUTE = '/onboarding' as const

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed'

export type OnboardingState = {
	status: OnboardingStatus
}
