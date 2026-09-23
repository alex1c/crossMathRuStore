/**
 * Daily crossword domain — date identity, streak, reminder suppression.
 */

export { DAILY_REMINDER_COPY } from './legacy'
export {
	buildDailyCalendarMonth,
	shiftCalendarMonth,
	monthFromDateKey,
} from './calendar'
export type {
	DailyCalendarCell,
	DailyCalendarCellState,
	DailyCalendarMonth,
} from './calendar'

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
