/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-notifications', () => ({
	setNotificationHandler: jest.fn(),
	getPermissionsAsync: jest.fn(async () => ({
		granted: false,
		canAskAgain: true,
		status: 'undetermined',
	})),
	requestPermissionsAsync: jest.fn(async () => ({
		granted: false,
		canAskAgain: true,
		status: 'denied',
	})),
	cancelScheduledNotificationAsync: jest.fn(async () => undefined),
	scheduleNotificationAsync: jest.fn(async () => 'id'),
	setNotificationChannelAsync: jest.fn(async () => undefined),
	SchedulableTriggerInputTypes: { DATE: 'date' },
	AndroidImportance: { DEFAULT: 3 },
	IosAuthorizationStatus: { PROVISIONAL: 2 },
}))

jest.mock('expo-haptics', () => ({
	selectionAsync: jest.fn(async () => undefined),
	impactAsync: jest.fn(async () => undefined),
	notificationAsync: jest.fn(async () => undefined),
	ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
	NotificationFeedbackType: {
		Success: 'success',
		Error: 'error',
		Warning: 'warning',
	},
}))
