/**
 * Pure Daily reminder reconciliation — no native SDK imports.
 */

export const DAILY_REMINDER_TITLE = 'Математический кроссворд' as const
export const DAILY_REMINDER_BODY = 'Кроссворд дня ждёт 🧩' as const

export type ReminderPermission = 'granted' | 'denied' | 'undetermined'

export type ReminderPlan =
	| { readonly action: 'none'; readonly reason: string }
	| {
			readonly action: 'schedule'
			readonly dateKey: string
			readonly minutesFromMidnight: number
			readonly title: string
			readonly body: string
	  }
	| { readonly action: 'cancel'; readonly reason: string }

export type ReminderReconciliationInput = {
	readonly enabled: boolean
	readonly minutesFromMidnight: number
	readonly todayKey: string
	readonly todayCompleted: boolean
	readonly permission: ReminderPermission
}

/**
 * Decide whether to schedule, cancel, or skip today's Daily reminder.
 * If today is already completed — never annoy the user.
 */
export function reconcileDailyReminder(
	input: ReminderReconciliationInput,
): ReminderPlan {
	if (!input.enabled) {
		return { action: 'cancel', reason: 'disabled' }
	}
	if (input.permission === 'denied') {
		return { action: 'none', reason: 'permission-denied' }
	}
	if (input.todayCompleted) {
		return { action: 'cancel', reason: 'today-completed' }
	}
	return {
		action: 'schedule',
		dateKey: input.todayKey,
		minutesFromMidnight: input.minutesFromMidnight,
		title: DAILY_REMINDER_TITLE,
		body: DAILY_REMINDER_BODY,
	}
}
