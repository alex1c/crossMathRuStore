/**
 * Pure interactive onboarding step machine.
 */

import { coordinatesEqual, type CellCoordinate } from '@/src/core/crossmath'
import { TUTORIAL_BLANK, TUTORIAL_BLANK_VALUE } from './tutorialPuzzle'

export type TutorialStepId =
	| 'select'
	| 'enter'
	| 'crossing'
	| 'done'

export type TutorialStep = {
	readonly id: TutorialStepId
	readonly title: string
	readonly body: string
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
	{
		id: 'select',
		title: 'Выберите пустую клетку',
		body: 'Нажмите на подсвеченную клетку — в неё нужно вписать число.',
	},
	{
		id: 'enter',
		title: 'Введите подходящее число',
		body: 'Смотрите на уравнение: 2 + □ = 5. Наберите число на панели и нажмите ✓.',
	},
	{
		id: 'crossing',
		title: 'Клетки пересекаются',
		body: 'Одно и то же число должно подходить и по горизонтали, и по вертикали.',
	},
	{
		id: 'done',
		title: 'Готово!',
		body: 'Дальше вас ждут Уровни, Кроссворд дня и Подсказка, если застрянете.',
	},
] as const

export function getTutorialStep(id: TutorialStepId): TutorialStep {
	return TUTORIAL_STEPS.find((step) => step.id === id) ?? TUTORIAL_STEPS[0]!
}

/**
 * Advance tutorial after the user selects a cell.
 */
export function advanceAfterSelect(
	step: TutorialStepId,
	coordinate: CellCoordinate,
): TutorialStepId {
	if (step !== 'select') {
		return step
	}
	if (coordinatesEqual(coordinate, TUTORIAL_BLANK)) {
		return 'enter'
	}
	return step
}

/**
 * Advance tutorial after a committed entry on the blank.
 */
export function advanceAfterEntry(
	step: TutorialStepId,
	coordinate: CellCoordinate,
	value: number,
): TutorialStepId {
	if (step !== 'enter') {
		return step
	}
	if (
		coordinatesEqual(coordinate, TUTORIAL_BLANK) &&
		value === TUTORIAL_BLANK_VALUE
	) {
		return 'crossing'
	}
	return step
}

/**
 * Manual continue from the crossing explanation into the finale.
 */
export function advanceFromCrossing(step: TutorialStepId): TutorialStepId {
	return step === 'crossing' ? 'done' : step
}

export function isTutorialComplete(step: TutorialStepId): boolean {
	return step === 'done'
}
