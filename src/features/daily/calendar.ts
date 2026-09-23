/**
 * Simple monthly Daily calendar model (no heavy calendar dependency).
 */

import {
	formatLocalDateKey,
	parseLocalDateKey,
	shiftLocalDateKey,
} from '@/src/features/progress/dateKey'

export type DailyCalendarCellState =
	| 'completed'
	| 'missed'
	| 'today'
	| 'future'
	| 'empty'

export type DailyCalendarCell = {
	readonly dateKey: string | null
	readonly dayOfMonth: number | null
	readonly state: DailyCalendarCellState
}

export type DailyCalendarMonth = {
	readonly year: number
	readonly monthIndex: number
	readonly label: string
	readonly cells: readonly DailyCalendarCell[]
}

const MONTH_LABELS = [
	'Январь',
	'Февраль',
	'Март',
	'Апрель',
	'Май',
	'Июнь',
	'Июль',
	'Август',
	'Сентябрь',
	'Октябрь',
	'Ноябрь',
	'Декабрь',
] as const

/**
 * Build a Sunday-first month grid for Daily history.
 */
export function buildDailyCalendarMonth(
	year: number,
	monthIndex: number,
	completedDateKeys: ReadonlySet<string> | readonly string[],
	todayKey: string,
): DailyCalendarMonth {
	const completed = completedDateKeys instanceof Set
		? completedDateKeys
		: new Set(completedDateKeys)
	const first = new Date(year, monthIndex, 1, 12, 0, 0, 0)
	const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
	const startWeekday = first.getDay() // 0 = Sunday
	const cells: DailyCalendarCell[] = []

	for (let i = 0; i < startWeekday; i += 1) {
		cells.push({ dateKey: null, dayOfMonth: null, state: 'empty' })
	}

	for (let day = 1; day <= daysInMonth; day += 1) {
		const dateKey = formatLocalDateKey(new Date(year, monthIndex, day, 12))
		let state: DailyCalendarCellState
		if (dateKey === todayKey) {
			state = completed.has(dateKey) ? 'completed' : 'today'
		} else if (dateKey > todayKey) {
			state = 'future'
		} else if (completed.has(dateKey)) {
			state = 'completed'
		} else {
			state = 'missed'
		}
		cells.push({ dateKey, dayOfMonth: day, state })
	}

	while (cells.length % 7 !== 0) {
		cells.push({ dateKey: null, dayOfMonth: null, state: 'empty' })
	}

	return {
		year,
		monthIndex,
		label: `${MONTH_LABELS[monthIndex]} ${year}`,
		cells,
	}
}

export function shiftCalendarMonth(
	year: number,
	monthIndex: number,
	delta: number,
): { year: number; monthIndex: number } {
	const date = new Date(year, monthIndex + delta, 1, 12)
	return { year: date.getFullYear(), monthIndex: date.getMonth() }
}

export function monthFromDateKey(dateKey: string): {
	year: number
	monthIndex: number
} {
	const date = parseLocalDateKey(dateKey)
	return { year: date.getFullYear(), monthIndex: date.getMonth() }
}

/** Re-export for calendar consumers that need adjacent-day math. */
export { shiftLocalDateKey }
