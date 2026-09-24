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

jest.mock('yandex-mobile-ads', () => ({
	MobileAds: { initialize: jest.fn(async () => undefined) },
	BannerAdSize: {
		stickySize: jest.fn(async () => ({ width: 320, height: 50 })),
	},
	BannerView: 'BannerView',
	RewardedAdLoader: {
		create: jest.fn(async () => ({ loadAd: jest.fn() })),
	},
	InterstitialAdLoader: {
		create: jest.fn(async () => ({ loadAd: jest.fn() })),
	},
}))

jest.mock('@appmetrica/react-native-analytics', () => ({
	__esModule: true,
	default: {
		activate: jest.fn(),
		reportEvent: jest.fn(),
	},
}))
