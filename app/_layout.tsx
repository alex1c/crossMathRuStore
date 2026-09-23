import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider, useTheme } from '@/src/theme'
import { AppProgressProvider } from '@/src/features/progress'

export {
	ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
	initialRouteName: 'index',
}

/**
 * Root layout: SafeArea + theme + persisted progress provider.
 */
export default function RootLayout() {
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
