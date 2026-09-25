import {
	DAILY_REMINDER_DESTINATION,
	DAILY_REMINDER_NOTIFICATION_ID,
	DEV_REMINDER_TEST_NOTIFICATION_ID,
} from './notificationConstants'

export type ReminderDestination = 'daily'

export function resolveReminderDestination(
	data: unknown,
): ReminderDestination | null {
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		return null
	}
	return (data as { destination?: unknown }).destination ===
		DAILY_REMINDER_DESTINATION
		? 'daily'
		: null
}

export function isDevReminderTestEnabled(isDev: boolean): boolean {
	return isDev
}

export function getDailyReminderResponseKey(response: {
	readonly actionIdentifier: string
	readonly notification: {
		readonly date: number
		readonly request: {
			readonly identifier: string
			readonly content: { readonly data?: unknown }
		}
	}
}, defaultActionIdentifier: string): string | null {
	const { notification } = response
	if (response.actionIdentifier !== defaultActionIdentifier) {
		return null
	}
	if (
		notification.request.identifier !== DAILY_REMINDER_NOTIFICATION_ID &&
		notification.request.identifier !== DEV_REMINDER_TEST_NOTIFICATION_ID
	) {
		return null
	}
	if (resolveReminderDestination(notification.request.content.data) !== 'daily') {
		return null
	}
	return `${notification.request.identifier}:${notification.date}`
}

export function createDailyReminderResponseGate(defaultActionIdentifier: string) {
	const handled = new Set<string>()
	return (response: Parameters<typeof getDailyReminderResponseKey>[0]) => {
		const key = getDailyReminderResponseKey(response, defaultActionIdentifier)
		if (!key || handled.has(key)) {
			return null
		}
		handled.add(key)
		return key
	}
}
