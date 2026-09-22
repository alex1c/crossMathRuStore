/**
 * Daily crossword domain placeholder.
 *
 * Future work:
 * - Resolve "today's" puzzle by local calendar date.
 * - Track whether today's puzzle is already solved.
 * - Local reminder copy: "Кроссворд дня ждёт"
 * - Skip notification when the daily puzzle is already completed.
 *
 * Phase 0: navigation + domain slot only — no notification scheduling SDK.
 */

export const DAILY_REMINDER_COPY = 'Кроссворд дня ждёт' as const

export type DailyPuzzleStatus = 'locked' | 'available' | 'in_progress' | 'solved'

export type DailyPuzzleState = {
	/** Local calendar date key, e.g. YYYY-MM-DD. */
	dateKey: string
	status: DailyPuzzleStatus
}

/**
 * Whether a future local reminder should be allowed to fire.
 * Solved days must suppress the reminder.
 */
export function shouldShowDailyReminder(
	state: DailyPuzzleState | null,
): boolean {
	if (!state) {
		return true
	}
	return state.status !== 'solved'
}
