/**
 * Local calendar date helpers (device timezone — not UTC).
 */

/**
 * Format a Date as local YYYY-MM-DD.
 */
export function formatLocalDateKey(date: Date = new Date()): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD into a local Date at noon (avoids DST edge midnight issues).
 */
export function parseLocalDateKey(dateKey: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
	if (!match) {
		throw new Error(`invalid dateKey: ${dateKey}`)
	}
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/**
 * Shift a local date key by an integer day delta.
 */
export function shiftLocalDateKey(dateKey: string, deltaDays: number): string {
	const date = parseLocalDateKey(dateKey)
	date.setDate(date.getDate() + deltaDays)
	return formatLocalDateKey(date)
}

/**
 * Minutes from local midnight → "HH:MM".
 */
export function formatReminderTime(minutes: number): string {
	const clamped = Math.min(23 * 60 + 59, Math.max(0, Math.floor(minutes)))
	const hours = Math.floor(clamped / 60)
	const mins = clamped % 60
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Parse "HH:MM" into minutes from midnight.
 */
export function parseReminderTime(text: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
	if (!match) {
		return null
	}
	const hours = Number(match[1])
	const mins = Number(match[2])
	if (
		!Number.isInteger(hours) ||
		!Number.isInteger(mins) ||
		hours < 0 ||
		hours > 23 ||
		mins < 0 ||
		mins > 59
	) {
		return null
	}
	return hours * 60 + mins
}
