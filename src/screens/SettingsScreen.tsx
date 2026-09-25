import { useEffect, useRef, useState } from 'react'
import {
	AppState,
	Pressable,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
	Linking,
} from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import {
	formatReminderTime,
	parseReminderTime,
	useAppProgress,
} from '@/src/features/progress'
import {
	canEnableReminder,
	getReminderSettingsView,
} from '@/src/features/reminder/settingsView'
import {
	OTHER_OUR_APPS_LABEL,
	OTHER_OUR_APPS_URL,
} from '@/src/constants/otherApps'
import { useTheme } from '@/src/theme'

/**
 * Settings: gameplay toggles, Daily reminder, tutorial replay, About links.
 */
export function SettingsScreen() {
	const theme = useTheme()
	const progress = useAppProgress()
	const { refreshReminder } = progress
	const { settings } = progress.state
	const [timeText, setTimeText] = useState(
		formatReminderTime(settings.dailyReminderMinutes),
	)
	const [timeError, setTimeError] = useState<string | null>(null)
	const [permissionBusy, setPermissionBusy] = useState(false)
	const [showPermissionHelp, setShowPermissionHelp] = useState(false)
	const permissionRequestInFlight = useRef(false)
	const reminderView = getReminderSettingsView(
		settings.dailyReminderEnabled,
		progress.reminderPermission,
	)
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				void refreshReminder()
			}
		})
		return () => subscription.remove()
	}, [refreshReminder])

	return (
		<Screen
			title="Настройки"
			subtitle="Игра и напоминание"
			scroll
			footer={<BannerSlot placement="settings" />}
		>
			<Text
				style={[
					styles.section,
					{ color: theme.colors.text, ...theme.typography.subtitle },
				]}
			>
				Игра
			</Text>
			<View style={styles.row}>
				<Text
					style={{
						flex: 1,
						color: theme.colors.text,
						...theme.typography.body,
					}}
				>
					Показывать ошибки сразу
				</Text>
				<Switch
					value={settings.showErrorsImmediately}
					onValueChange={(value) => {
						void progress.updateSettings({
							showErrorsImmediately: value,
						})
					}}
				/>
			</View>

			<Text
				style={[
					styles.section,
					{
						color: theme.colors.text,
						...theme.typography.subtitle,
						marginTop: 24,
					},
				]}
			>
				Напоминание
			</Text>
			<View style={styles.row}>
				<Text
					style={{
						flex: 1,
						color: theme.colors.text,
						...theme.typography.body,
					}}
				>
					Напоминать о кроссворде дня
				</Text>
				<Switch
					value={reminderView.enabled}
					disabled={permissionBusy}
					onValueChange={(value) => {
						if (!value) {
							void progress.updateSettings({ dailyReminderEnabled: false })
							return
						}
						if (permissionRequestInFlight.current) return
						permissionRequestInFlight.current = true
						setPermissionBusy(true)
						void (async () => {
							try {
								const permission = await progress.requestNotificationPermission()
								if (canEnableReminder(permission)) {
									await progress.updateSettings({ dailyReminderEnabled: true })
									setShowPermissionHelp(false)
								} else {
									setShowPermissionHelp(true)
								}
							} finally {
								permissionRequestInFlight.current = false
								setPermissionBusy(false)
							}
						})()
					}}
				/>
			</View>
			<Text style={{ color: theme.colors.textSecondary, ...theme.typography.caption }}>
				Если сегодняшний кроссворд ещё не решён
			</Text>
			{reminderView.showTimeControls ? (
				<>
					<Text
						style={{
							marginTop: 12,
							color: theme.colors.textSecondary,
							...theme.typography.caption,
						}}
					>
						Время напоминания
					</Text>
					<TextInput
						value={timeText}
						onChangeText={(text) => {
							setTimeText(text)
							setTimeError(null)
						}}
						onBlur={() => {
							const parsed = parseReminderTime(timeText)
							if (parsed === null) {
								setTimeError('Формат ЧЧ:ММ')
								setTimeText(
									formatReminderTime(settings.dailyReminderMinutes),
								)
								return
							}
							void progress.updateSettings({
								dailyReminderMinutes: parsed,
							})
							setTimeText(formatReminderTime(parsed))
						}}
						keyboardType="numbers-and-punctuation"
						placeholder="19:00"
						style={[
							styles.input,
							{
								borderColor: theme.colors.border,
								color: theme.colors.text,
								backgroundColor: theme.colors.surface,
							},
						]}
					/>
					{timeError ? (
						<Text style={{ color: theme.colors.error }}>{timeError}</Text>
					) : null}
				</>
			) : null}
			{reminderView.showPermissionHelp || showPermissionHelp ? (
				<View style={{ marginTop: 10 }}>
					<Text style={{ color: theme.colors.textSecondary, ...theme.typography.caption }}>
						Уведомления отключены в настройках Android.
					</Text>
					<Pressable onPress={() => void Linking.openSettings()} style={styles.permissionButton}>
						<Text style={{ color: theme.colors.primary }}>Открыть настройки</Text>
					</Pressable>
					{reminderView.showPermissionHelp ? (
						<Pressable
							onPress={() => void progress.updateSettings({ dailyReminderEnabled: false })}
							style={styles.permissionButton}
						>
							<Text style={{ color: theme.colors.primary }}>Выключить напоминание</Text>
						</Pressable>
					) : null}
				</View>
			) : null}

			<Text
				style={[
					styles.section,
					{
						color: theme.colors.text,
						...theme.typography.subtitle,
						marginTop: 24,
					},
				]}
			>
				Обучение и справка
			</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Пройти обучение ещё раз"
				onPress={() =>
					router.push({
						pathname: '/onboarding',
						params: { replay: '1' },
					})
				}
				style={({ pressed }) => [
					styles.linkRow,
					{
						borderColor: theme.colors.border,
						opacity: pressed ? 0.85 : 1,
					},
				]}
			>
				<Text style={{ color: theme.colors.primary, ...theme.typography.bodyStrong }}>
					Пройти обучение ещё раз
				</Text>
			</Pressable>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="О приложении"
				onPress={() => router.push('/about')}
				style={({ pressed }) => [
					styles.linkRow,
					{
						borderColor: theme.colors.border,
						opacity: pressed ? 0.85 : 1,
						marginTop: 10,
					},
				]}
			>
				<Text style={{ color: theme.colors.text, ...theme.typography.bodyStrong }}>
					О приложении
				</Text>
			</Pressable>
			<Pressable
				accessibilityRole="link"
				accessibilityLabel={OTHER_OUR_APPS_LABEL}
				onPress={() => {
					void Linking.openURL(OTHER_OUR_APPS_URL)
				}}
				style={({ pressed }) => [
					styles.linkRow,
					{
						borderColor: theme.colors.border,
						opacity: pressed ? 0.85 : 1,
						marginTop: 10,
					},
				]}
			>
				<Text style={{ color: theme.colors.primary, ...theme.typography.bodyStrong }}>
					{OTHER_OUR_APPS_LABEL}
				</Text>
			</Pressable>
		</Screen>
	)
}

const styles = StyleSheet.create({
	section: {
		marginBottom: 8,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 48,
	},
	input: {
		marginTop: 8,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	permissionButton: {
		marginTop: 12,
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	linkRow: {
		borderWidth: 1,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 12,
		backgroundColor: 'transparent',
	},
})
