import { useCallback, useEffect, useRef, useState } from 'react'
import { router, Stack, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from '@/src/theme'
import { AppProgressProvider, useAppProgress } from '@/src/features/progress'
import { createDailyReminderResponseGate } from '@/src/features/reminder/notificationRouting'
import { bootstrapAds } from '@/src/services/ads'
import { bootstrapAnalytics } from '@/src/services/analytics'

export {
	ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
	initialRouteName: 'index',
}

/**
 * Root layout: SafeArea + theme + progress + one-shot ads/analytics bootstrap.
 */
export default function RootLayout() {
	useEffect(() => {
		bootstrapAnalytics()
		void bootstrapAds()
	}, [])

	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<AppProgressProvider>
					<RootNavigator />
				</AppProgressProvider>
			</ThemeProvider>
		</SafeAreaProvider>
	)
}

function RootNavigator() {
	const theme = useTheme()

	return (
		<>
			<ReminderNotificationRouter />
			<StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
			<Stack
				screenOptions={{
					headerShown: true,
					headerBackTitle: 'Назад',
					headerStyle: { backgroundColor: theme.colors.background },
					headerTintColor: theme.colors.text,
					headerTitleStyle: { color: theme.colors.text },
					contentStyle: { backgroundColor: theme.colors.background },
				}}
			>
				<Stack.Screen
					name="index"
					options={{ headerShown: false, title: 'Математический кроссворд' }}
				/>
				<Stack.Screen name="continue" options={{ title: 'Продолжить' }} />
				<Stack.Screen
					name="daily"
					options={{ title: 'Сегодняшний кроссворд' }}
				/>
				<Stack.Screen name="levels" options={{ title: 'Уровни' }} />
				<Stack.Screen
					name="track-levels"
					options={{ title: 'Трек' }}
				/>
				<Stack.Screen
					name="multiplication"
					options={{ title: 'Таблица умножения' }}
				/>
				<Stack.Screen
					name="game"
					options={{ title: 'Игра', headerShown: true }}
				/>
				<Stack.Screen
					name="endless"
					options={{ title: 'Бесконечная игра' }}
				/>
				<Stack.Screen
					name="multiplication-table"
					options={{ title: 'Таблица умножения' }}
				/>
				<Stack.Screen name="stats" options={{ title: 'Статистика' }} />
				<Stack.Screen name="settings" options={{ title: 'Настройки' }} />
				<Stack.Screen name="about" options={{ title: 'О приложении' }} />
				<Stack.Screen
					name="onboarding"
					options={{ title: 'Обучение', headerShown: false }}
				/>
				<Stack.Screen name="+not-found" options={{ title: 'Не найдено' }} />
			</Stack>
		</>
	)
}

/** Routes reminder taps only after both navigation and saved progress are ready. */
function ReminderNotificationRouter() {
	const progress = useAppProgress()
	const navigationState = useRootNavigationState()
	const [pendingRouteVersion, setPendingRouteVersion] = useState(0)
	const pendingDailyRoute = useRef(false)
	const responseGate = useRef(
		createDailyReminderResponseGate(Notifications.DEFAULT_ACTION_IDENTIFIER),
	)

	const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
		if (!responseGate.current(response)) {
			return
		}
		pendingDailyRoute.current = true
		setPendingRouteVersion((version) => version + 1)
		try {
			Notifications.clearLastNotificationResponse()
		} catch {
			// The response is still guarded in memory if this platform lacks clearing.
		}
	}, [])

	useEffect(() => {
		let active = true
		const subscription = Notifications.addNotificationResponseReceivedListener(
			handleResponse,
		)
		try {
			const lastResponse = Notifications.getLastNotificationResponse()
			if (lastResponse) {
				void Promise.resolve().then(() => {
					if (active) handleResponse(lastResponse)
				})
			}
		} catch {
			// Cold-start response retrieval may be unavailable on some platforms.
		}
		return () => {
			active = false
			subscription.remove()
		}
	}, [handleResponse])

	useEffect(() => {
		if (!pendingDailyRoute.current || !progress.ready || !navigationState?.key) {
			return
		}
		pendingDailyRoute.current = false
		router.push('/daily')
	}, [pendingRouteVersion, progress.ready, navigationState?.key])

	return null
}
