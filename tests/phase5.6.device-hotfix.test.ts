import * as Haptics from 'expo-haptics'
import {
	hapticEntry,
	hapticError,
	hapticSelection,
	hapticSuccess,
} from '@/src/features/feedback/haptics'
import { DIFFICULTY_TRACKS, TRACK_LABELS } from '@/src/core/crossmath/tracks'
import {
	parsePersistedAppState,
	createDefaultPersistedState,
} from '@/src/services/persistence'
import { getTrackLevelStatus } from '@/src/features/progress'
import { parseTrackRouteParam } from '@/src/screens/TrackLevelsScreen'

jest.mock('expo-haptics', () => ({
	ImpactFeedbackStyle: { Light: 'light' },
	NotificationFeedbackType: { Error: 'error', Success: 'success' },
	selectionAsync: jest.fn(),
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
}))

describe('Phase 5.6 device hotfix regressions', () => {
	it('swallows rejected haptic promises and synchronous native errors', async () => {
		const rejected = Promise.reject(new Error('native haptics unavailable'))
		jest.mocked(Haptics.selectionAsync).mockReturnValue(rejected)
		jest.mocked(Haptics.impactAsync).mockImplementation(() => {
			throw new Error('native method unavailable')
		})
		jest.mocked(Haptics.notificationAsync).mockRejectedValue(
			new Error('native haptics unavailable'),
		)

		expect(() => hapticSelection()).not.toThrow()
		expect(() => hapticEntry()).not.toThrow()
		expect(() => hapticError()).not.toThrow()
		expect(() => hapticSuccess()).not.toThrow()
		await Promise.resolve()
	})

	it('keeps Level 1 unlocked independently in all four fresh tracks', () => {
		const fresh = createDefaultPersistedState()
		for (const track of DIFFICULTY_TRACKS) {
			expect(fresh.tracks[track].highestUnlockedLevel).toBe(1)
			expect(
				getTrackLevelStatus(
					1,
					fresh.tracks[track].highestUnlockedLevel,
					fresh.tracks[track].completedLevels,
				),
			).toBe('unlocked')
		}
		expect(DIFFICULTY_TRACKS.map((track) => TRACK_LABELS[track])).toEqual([
			'Просто',
			'Средне',
			'Сложно',
			'Лобачевский',
		])
	})

	it('migrates old progress into Easy while other tracks retain Level 1', () => {
		const migrated = parsePersistedAppState({
			schemaVersion: 1,
			campaign: {
				highestUnlockedLevel: 8,
				completedLevels: [1, 2, 3, 4, 5, 6, 7],
				results: {},
				lastPlayedLevel: 7,
			},
		})
		expect(migrated.tracks.easy.highestUnlockedLevel).toBe(8)
		for (const track of ['medium', 'hard', 'lobachevsky'] as const) {
			expect(migrated.tracks[track].highestUnlockedLevel).toBe(1)
			expect(migrated.tracks[track].completedLevels).toEqual([])
		}
	})

	it('preserves progression locks and validates the selected track route', () => {
		expect(getTrackLevelStatus(2, 1, [])).toBe('locked')
		expect(getTrackLevelStatus(2, 2, [])).toBe('unlocked')
		expect(getTrackLevelStatus(1, 1, [1])).toBe('completed')
		expect(parseTrackRouteParam('hard')).toBe('hard')
		expect(parseTrackRouteParam(['lobachevsky', 'easy'])).toBe('lobachevsky')
		expect(parseTrackRouteParam('unknown')).toBeNull()
	})
})
