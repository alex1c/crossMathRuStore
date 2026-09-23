/**
 * Onboarding / interactive tutorial feature.
 *
 * ForestMusic rule: learning is mandatory and replayable without resetting progress.
 */

export const ONBOARDING_ROUTE = '/onboarding' as const

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed'

export type OnboardingState = {
	status: OnboardingStatus
}

export {
	TUTORIAL_BLANK,
	TUTORIAL_BLANK_VALUE,
	TUTORIAL_PUZZLE,
	TUTORIAL_SOLUTION,
} from './tutorialPuzzle'

export {
	TUTORIAL_STEPS,
	getTutorialStep,
	advanceAfterSelect,
	advanceAfterEntry,
	advanceFromCrossing,
	isTutorialComplete,
} from './tutorialSteps'
export type { TutorialStepId, TutorialStep } from './tutorialSteps'
