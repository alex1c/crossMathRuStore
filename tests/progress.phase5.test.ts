/**
 * Phase 5 onboarding / UX logic tests.
 */

import {
	createDefaultPersistedState,
	parsePersistedAppState,
	loadPersistedAppState,
	savePersistedAppState,
	type KeyValueStorage,
} from '@/src/services/persistence'
import {
	getNextCampaignLevel,
	withSettings,
} from '@/src/features/progress'
import {
	advanceAfterEntry,
	advanceAfterSelect,
	advanceFromCrossing,
	TUTORIAL_BLANK,
	TUTORIAL_BLANK_VALUE,
	TUTORIAL_PUZZLE,
	TUTORIAL_SOLUTION,
} from '@/src/features/onboarding'
import {
	buildCompletionPresentation,
	createGameState,
	gameReducer,
	isBlankHinted,
} from '@/src/features/game'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
	const map = { ...initial }
	return {
		async getItem(key) {
			return map[key] ?? null
		},
		async setItem(key, value) {
			map[key] = value
		},
		async removeItem(key) {
			delete map[key]
		},
	}
}

describe('onboarding persistence', () => {
	it('fresh install requires onboarding', () => {
		const state = createDefaultPersistedState()
		expect(state.settings.onboardingCompleted).toBe(false)
	})

	it('completing onboarding persists and survives reload', async () => {
		const storage = memoryStorage()
		let state = createDefaultPersistedState()
		state = withSettings(state, { onboardingCompleted: true })
		await savePersistedAppState(state, storage)
		const loaded = await loadPersistedAppState(storage)
		expect(loaded.settings.onboardingCompleted).toBe(true)
	})

	it('skip also persists onboardingCompleted', async () => {
		const storage = memoryStorage()
		const state = withSettings(createDefaultPersistedState(), {
			onboardingCompleted: true,
		})
		await savePersistedAppState(state, storage)
		expect((await loadPersistedAppState(storage)).settings.onboardingCompleted).toBe(
			true,
		)
	})

	it('replay does not reset campaign progress', () => {
		const defaults = createDefaultPersistedState()
		const state = withSettings(
			{
				...defaults,
				tracks: {
					...defaults.tracks,
					easy: {
						highestUnlockedLevel: 12,
						completedLevels: [1, 2, 3],
						results: {},
						lastPlayedLevel: 3,
					},
				},
			},
			{ onboardingCompleted: true },
		)
		expect(state.settings.onboardingCompleted).toBe(true)
		expect(state.tracks.easy.completedLevels).toEqual([1, 2, 3])
		expect(state.tracks.easy.highestUnlockedLevel).toBe(12)
	})

	it('legacy payloads without onboardingCompleted default to false safely', () => {
		const parsed = parsePersistedAppState({
			schemaVersion: 1,
			settings: {
				showErrorsImmediately: true,
				dailyReminderEnabled: false,
				dailyReminderMinutes: 1140,
			},
		})
		expect(parsed.settings.onboardingCompleted).toBe(false)
	})
})

describe('tutorial step machine', () => {
	it('advances select → enter → crossing → done', () => {
		let step = advanceAfterSelect('select', TUTORIAL_BLANK)
		expect(step).toBe('enter')
		step = advanceAfterEntry(step, TUTORIAL_BLANK, TUTORIAL_BLANK_VALUE)
		expect(step).toBe('crossing')
		step = advanceFromCrossing(step)
		expect(step).toBe('done')
	})

	it('ignores wrong blank selection and wrong values', () => {
		expect(advanceAfterSelect('select', { row: 0, column: 0 })).toBe('select')
		expect(advanceAfterEntry('enter', TUTORIAL_BLANK, 9)).toBe('enter')
	})

	it('tutorial puzzle has a unique blank solution', () => {
		expect(TUTORIAL_PUZZLE.equations).toHaveLength(2)
		expect(TUTORIAL_SOLUTION.values.some((item) =>
			item.coordinate.row === TUTORIAL_BLANK.row &&
			item.coordinate.column === TUTORIAL_BLANK.column &&
			item.value === TUTORIAL_BLANK_VALUE,
		)).toBe(true)
	})
})

describe('completion presentation', () => {
	it('builds campaign / daily / endless copy', () => {
		expect(
			buildCompletionPresentation({
				source: { kind: 'track', track: 'easy', level: 37 },
			}).detail,
		).toContain('37')
		expect(
			buildCompletionPresentation({
				source: { kind: 'daily', dateKey: '2026-09-23' },
				dailyStreak: 4,
			}).detail,
		).toContain('4')
		expect(
			buildCompletionPresentation({
				source: { kind: 'endless', completedCount: 2 },
				endlessCompletedCount: 3,
			}).nextLabel,
		).toBe('Следующая задача')
	})
})

describe('next campaign level', () => {
	it('prefers lowest unlocked incomplete level', () => {
		expect(getNextCampaignLevel(5, [1, 2, 4])).toBe(3)
		expect(getNextCampaignLevel(3, [1, 2, 3])).toBe(3)
		expect(getNextCampaignLevel(1, [])).toBe(1)
	})
})

describe('hint UX', () => {
	it('hints without selection and marks hinted cells', () => {
		const state = createGameState({
			puzzle: TUTORIAL_PUZZLE,
			solution: TUTORIAL_SOLUTION,
			source: { kind: 'tutorial' },
			title: 'Обучение',
			subtitle: 'test',
			selected: null,
		})
		const next = gameReducer(state, { type: 'HINT', now: 1 })
		expect(next.hintsUsed).toBe(1)
		expect(isBlankHinted(next, TUTORIAL_BLANK)).toBe(true)
		expect(next.entries['0,2']).toBe(TUTORIAL_BLANK_VALUE)
	})
})
