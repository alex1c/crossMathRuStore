import {
	computeDailyStreak,
	createActiveTimer,
	getActiveElapsedMs,
	pauseActiveTimer,
	resumeActiveTimer,
	formatLocalDateKey,
	shiftLocalDateKey,
	deriveAppStats,
} from '@/src/features/progress'
import { createDefaultPersistedState } from '@/src/services/persistence'
import { reconcileDailyReminder } from '@/src/features/reminder'
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

describe('local date key', () => {
	it('formats and shifts local calendar days', () => {
		const key = formatLocalDateKey(new Date(2026, 8, 23, 15))
		expect(key).toBe('2026-09-23')
		expect(shiftLocalDateKey('2026-09-23', -1)).toBe('2026-09-22')
	})
})

describe('daily reminder reconciliation', () => {
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
			campaign: {
				...state.campaign,
				completedLevels: [1, 2],
				highestUnlockedLevel: 3,
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
		expect(stats.dailySolved).toBe(2)
		expect(stats.dailyStreakCurrent).toBe(2)
		expect(stats.endlessSolved).toBe(4)
		expect(stats.totalPuzzlesSolved).toBe(6)
		expect(stats.hintsUsed).toBe(3)
		expect(stats.mistakes).toBe(5)
	})
})
