/**
 * expo-notifications adapter for Daily reminder.
 * Failures are swallowed — never crash the app.
 */

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import {
	reconcileDailyReminder,
	type ReminderPermission,
	type ReminderPlan,
} from './reconcile'
import { parseLocalDateKey } from '@/src/features/progress/dateKey'

export const DAILY_REMINDER_NOTIFICATION_ID = 'crossmath-daily-reminder'

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
})

export async function getReminderPermissionStatus(): Promise<ReminderPermission> {
	try {
		const settings = await Notifications.getPermissionsAsync()
		if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
			return 'granted'
		}
		if (settings.canAskAgain === false) {
			return 'denied'
		}
		return settings.status === 'denied' ? 'denied' : 'undetermined'
	} catch {
		return 'denied'
	}
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
	try {
		const settings = await Notifications.requestPermissionsAsync()
		if (settings.granted) {
			return 'granted'
		}
		return settings.canAskAgain === false ? 'denied' : 'denied'
	} catch {
		return 'denied'
	}
}

function buildTriggerDate(
	dateKey: string,
	minutesFromMidnight: number,
	now: Date = new Date(),
): Date {
	const base = parseLocalDateKey(dateKey)
	const hours = Math.floor(minutesFromMidnight / 60)
	const minutes = minutesFromMidnight % 60
	const trigger = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate(),
		hours,
		minutes,
		0,
		0,
	)
	// If today's time already passed, schedule for tomorrow same clock time.
	if (trigger.getTime() <= now.getTime()) {
		trigger.setDate(trigger.getDate() + 1)
	}
	return trigger
}

async function cancelDailyReminder(): Promise<void> {
	try {
		await Notifications.cancelScheduledNotificationAsync(
			DAILY_REMINDER_NOTIFICATION_ID,
		)
	} catch {
		// ignore
	}
}

async function scheduleDailyReminder(plan: Extract<ReminderPlan, { action: 'schedule' }>): Promise<void> {
	await cancelDailyReminder()
	const triggerDate = buildTriggerDate(plan.dateKey, plan.minutesFromMidnight)
	await Notifications.scheduleNotificationAsync({
		identifier: DAILY_REMINDER_NOTIFICATION_ID,
		content: {
			title: plan.title,
			body: plan.body,
			sound: false,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: triggerDate,
			channelId: Platform.OS === 'android' ? 'daily-reminder' : undefined,
		},
	})
}

async function ensureAndroidChannel(): Promise<void> {
	if (Platform.OS !== 'android') {
		return
	}
	try {
		await Notifications.setNotificationChannelAsync('daily-reminder', {
			name: 'Кроссворд дня',
			importance: Notifications.AndroidImportance.DEFAULT,
		})
	} catch {
		// ignore
	}
}

/**
 * Apply reminder reconciliation against the native scheduler.
 */
export async function applyDailyReminderPlan(input: {
	readonly enabled: boolean
	readonly minutesFromMidnight: number
	readonly todayKey: string
	readonly todayCompleted: boolean
	readonly permission: ReminderPermission
}): Promise<ReminderPlan> {
	const plan = reconcileDailyReminder(input)
	try {
		await ensureAndroidChannel()
		if (plan.action === 'cancel' || plan.action === 'none') {
			if (plan.action === 'cancel') {
				await cancelDailyReminder()
			}
			return plan
		}
		await scheduleDailyReminder(plan)
		return plan
	} catch {
		return { action: 'none', reason: 'scheduler-error' }
	}
}
