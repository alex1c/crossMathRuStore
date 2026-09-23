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
 * Selects the persisted in-progress Daily session for the requested local
 * date. Campaign and older Daily sessions must never be resumed as today.
 */
export function hasActiveDailySessionForDate(
	activeSession: unknown,
	dateKey: string,
): boolean {
	if (!activeSession || typeof activeSession !== 'object') {
		return false
	}
	const source = (activeSession as { source?: unknown }).source
	if (!source || typeof source !== 'object') {
		return false
	}
	const dailySource = source as { kind?: unknown; dateKey?: unknown }
	return dailySource.kind === 'daily' && dailySource.dateKey === dateKey
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
