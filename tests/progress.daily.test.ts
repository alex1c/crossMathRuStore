import {
	computeDailyStreak,
	createActiveTimer,
	getActiveElapsedMs,
	hydrateActiveTimer,
	pauseActiveTimer,
	resumeActiveTimer,
	formatLocalDateKey,
	shiftLocalDateKey,
	deriveAppStats,
} from '@/src/features/progress'
import { hasActiveDailySessionForDate } from '@/src/features/daily'
import { createDefaultPersistedState } from '@/src/services/persistence'
import { reconcileDailyReminder } from '@/src/features/reminder'
import {
	canEnableReminder,
	getReminderSettingsView,
} from '@/src/features/reminder/settingsView'
import {
	createDailyReminderResponseGate,
	isDevReminderTestEnabled,
	resolveReminderDestination,
} from '@/src/features/reminder/notificationRouting'
import {
	DAILY_REMINDER_DATA,
	DAILY_REMINDER_NOTIFICATION_ID,
	DEV_REMINDER_TEST_NOTIFICATION_ID,
} from '@/src/features/reminder/notificationConstants'
import { getEndlessGenerationProfile } from '@/src/core/crossmath'

describe('active timer', () => {
	it('counts active time and ignores background gaps', () => {
		let timer = createActiveTimer(1_000)
		expect(getActiveElapsedMs(timer, 1_500)).toBe(500)
		timer = pauseActiveTimer(timer, 2_000)
		expect(timer.accumulatedActiveMs).toBe(1_000)
		expect(getActiveElapsedMs(timer, 5_000)).toBe(1_000)
		timer = resumeActiveTimer(timer, 5_000)
		expect(getActiveElapsedMs(timer, 5_400)).toBe(1_400)
	})

	it('keeps a persisted timer active-only across a background gap', () => {
		let timer = createActiveTimer(0)
		timer = pauseActiveTimer(timer, 10_000)
		expect(getActiveElapsedMs(timer, 30_000)).toBe(10_000)

		const restored = hydrateActiveTimer(timer.accumulatedActiveMs, 30_000)
		expect(getActiveElapsedMs(restored, 35_000)).toBe(15_000)
	})
})

describe('daily streak', () => {
	it('handles one day and consecutive days', () => {
		expect(computeDailyStreak(['2026-09-23'], '2026-09-23')).toEqual({
			current: 1,
			best: 1,
		})
		expect(
			computeDailyStreak(
				['2026-09-21', '2026-09-22', '2026-09-23'],
				'2026-09-23',
			),
		).toEqual({ current: 3, best: 3 })
	})

	it('keeps streak alive when today is still pending', () => {
		expect(
			computeDailyStreak(['2026-09-21', '2026-09-22'], '2026-09-23'),
		).toEqual({ current: 2, best: 2 })
	})

	it('breaks after a missed day', () => {
		// Yesterday (22) was missed; prior completions do not keep the streak alive.
		expect(
			computeDailyStreak(['2026-09-20', '2026-09-21'], '2026-09-23'),
		).toEqual({ current: 0, best: 2 })
	})

	it('crosses month and year boundaries', () => {
		expect(
			computeDailyStreak(['2026-01-31', '2026-02-01'], '2026-02-01'),
		).toEqual({ current: 2, best: 2 })
		expect(
			computeDailyStreak(['2025-12-31', '2026-01-01'], '2026-01-01'),
		).toEqual({ current: 2, best: 2 })
	})

	it('tracks best separately from current', () => {
		expect(
			computeDailyStreak(
				['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10'],
				'2026-09-10',
			),
		).toEqual({ current: 1, best: 3 })
	})
})

describe('daily entry session selection', () => {
	it("resumes today's active Daily session from the Daily hub", () => {
		const activeSession = {
			source: { kind: 'daily', dateKey: '2026-09-23' },
		}
		expect(
			hasActiveDailySessionForDate(activeSession, '2026-09-23'),
		).toBe(true)
	})

	it('does not reuse an older Daily or campaign session for today', () => {
		expect(
			hasActiveDailySessionForDate(
				{ source: { kind: 'daily', dateKey: '2026-09-22' } },
				'2026-09-23',
			),
		).toBe(false)
		expect(
			hasActiveDailySessionForDate(
				{ source: { kind: 'track', track: 'easy', level: 1 } },
				'2026-09-23',
			),
		).toBe(false)
	})
})

describe('local date key', () => {
	it('formats and shifts local calendar days', () => {
		const key = formatLocalDateKey(new Date(2026, 8, 23, 15))
		expect(key).toBe('2026-09-23')
		expect(shiftLocalDateKey('2026-09-23', -1)).toBe('2026-09-22')
	})
})

describe('daily reminder reconciliation', () => {
	it('routes production and development reminder payloads to Daily', () => {
		expect(DAILY_REMINDER_DATA).toEqual({ destination: 'daily' })
		expect(DAILY_REMINDER_NOTIFICATION_ID).not.toBe(
			DEV_REMINDER_TEST_NOTIFICATION_ID,
		)
		expect(resolveReminderDestination(DAILY_REMINDER_DATA)).toBe('daily')
		expect(resolveReminderDestination({ destination: 'home' })).toBeNull()
		expect(resolveReminderDestination(null)).toBeNull()
		expect(resolveReminderDestination('daily')).toBeNull()
	})

	it('ignores malformed, non-tap, and duplicate notification responses', () => {
		const response = {
			actionIdentifier: 'tap',
			notification: {
				date: 1234,
				request: {
					identifier: DAILY_REMINDER_NOTIFICATION_ID,
					content: { data: DAILY_REMINDER_DATA },
				},
			},
		}
		const gate = createDailyReminderResponseGate('tap')
		expect(gate(response)).toBe('crossmath-daily-reminder:1234')
		expect(gate(response)).toBeNull()
		expect(
			createDailyReminderResponseGate('tap')({
				...response,
				notification: {
					...response.notification,
					request: {
					...response.notification.request,
					content: { data: { destination: 'unknown' } },
					},
				},
			}),
		).toBeNull()
		expect(isDevReminderTestEnabled(false)).toBe(false)
		expect(isDevReminderTestEnabled(true)).toBe(true)
	})

	it('keeps fresh and permission-denied reminders visually OFF without time controls', () => {
		const fresh = createDefaultPersistedState()
		expect(
			getReminderSettingsView(
				fresh.settings.dailyReminderEnabled,
				'undetermined',
			),
		).toEqual({
			enabled: false,
			showTimeControls: false,
			showPermissionHelp: false,
		})
		expect(getReminderSettingsView(true, 'denied')).toEqual({
			enabled: false,
			showTimeControls: false,
			showPermissionHelp: true,
		})
	})

	it('shows an existing enabled reminder as ON only while permission is granted', () => {
		expect(canEnableReminder('granted')).toBe(true)
		expect(canEnableReminder('denied')).toBe(false)
		expect(getReminderSettingsView(true, 'granted')).toEqual({
			enabled: true,
			showTimeControls: true,
			showPermissionHelp: false,
		})
	})

	it('cancels when disabled or today completed', () => {
		expect(
			reconcileDailyReminder({
				enabled: false,
				minutesFromMidnight: 1140,
				todayKey: '2026-09-23',
				todayCompleted: false,
				permission: 'granted',
			}).action,
		).toBe('cancel')
		expect(
			reconcileDailyReminder({
				enabled: true,
				minutesFromMidnight: 1140,
				todayKey: '2026-09-23',
				todayCompleted: true,
				permission: 'granted',
			}).action,
		).toBe('cancel')
	})

	it('schedules when enabled and today pending', () => {
		const plan = reconcileDailyReminder({
			enabled: true,
			minutesFromMidnight: 1140,
			todayKey: '2026-09-23',
			todayCompleted: false,
			permission: 'granted',
		})
		expect(plan).toMatchObject({
			action: 'schedule',
			minutesFromMidnight: 1140,
		})
	})

	it('uses the updated local reminder time during reconciliation', () => {
		const plan = reconcileDailyReminder({
			enabled: true,
			minutesFromMidnight: 20 * 60 + 15,
			todayKey: '2026-09-23',
			todayCompleted: false,
			permission: 'granted',
		})
		expect(plan).toMatchObject({ action: 'schedule', minutesFromMidnight: 1215 })
	})

	it('does nothing harmful when permission denied', () => {
		expect(
			reconcileDailyReminder({
				enabled: true,
				minutesFromMidnight: 1140,
				todayKey: '2026-09-23',
				todayCompleted: false,
				permission: 'denied',
			}).action,
		).toBe('none')
	})
})

describe('endless progression', () => {
	it('advances Easy → Medium → Hard → Expert and caps at Expert', () => {
		expect(getEndlessGenerationProfile({ completed: 0, streak: 0 }).difficultyTier).toBe(
			'easy',
		)
		expect(getEndlessGenerationProfile({ completed: 10, streak: 0 }).difficultyTier).toBe(
			'medium',
		)
		expect(getEndlessGenerationProfile({ completed: 30, streak: 0 }).difficultyTier).toBe(
			'hard',
		)
		expect(getEndlessGenerationProfile({ completed: 60, streak: 0 }).difficultyTier).toBe(
			'expert',
		)
		expect(getEndlessGenerationProfile({ completed: 120, streak: 0 }).difficultyTier).toBe(
			'expert',
		)
	})
})

describe('derived stats', () => {
	it('aggregates campaign / daily / endless counters', () => {
		let state = createDefaultPersistedState()
		state = {
			...state,
			tracks: {
				...state.tracks,
				easy: {
					...state.tracks.easy,
					completedLevels: [1, 2],
					highestUnlockedLevel: 3,
				},
			},
			daily: {
				completions: {
					'2026-09-22': {
						dateKey: '2026-09-22',
						elapsedMs: 1,
						mistakes: 0,
						hintsUsed: 0,
						completedAt: 1,
					},
					'2026-09-23': {
						dateKey: '2026-09-23',
						elapsedMs: 1,
						mistakes: 0,
						hintsUsed: 0,
						completedAt: 2,
					},
				},
			},
			endless: { completedCount: 4, bestCompletedCount: 4 },
			stats: {
				totalPuzzlesSolved: 6,
				totalHintsUsed: 3,
				totalMistakes: 5,
			},
		}
		const stats = deriveAppStats(state, '2026-09-23')
		expect(stats.campaignSolved).toBe(2)
		expect(stats.dailySolvedCount).toBe(2)
		expect(stats.streakCurrent).toBe(2)
		expect(stats.endlessSolved).toBe(4)
		expect(stats.totalPuzzlesSolved).toBe(6)
		expect(stats.totalHintsUsed).toBe(3)
		expect(stats.totalMistakes).toBe(5)
	})
})
