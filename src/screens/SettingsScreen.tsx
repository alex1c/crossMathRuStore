import { useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
} from 'react-native'
import { Screen } from '@/src/components'
import {
	formatReminderTime,
	parseReminderTime,
	useAppProgress,
} from '@/src/features/progress'
import { DEFAULT_REMINDER_MINUTES } from '@/src/services/persistence'
import { useTheme } from '@/src/theme'

/**
 * Settings: show-errors toggle + Daily reminder controls.
 */
export function SettingsScreen() {
	const theme = useTheme()
	const progress = useAppProgress()
	const { settings } = progress.state
	const [timeText, setTimeText] = useState(
		formatReminderTime(settings.dailyReminderMinutes),
	)
	const [timeError, setTimeError] = useState<string | null>(null)

	return (
		<Screen title="Настройки" subtitle="Игра и напоминание" scroll>
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
					Кроссворд дня
				</Text>
				<Switch
					value={settings.dailyReminderEnabled}
					onValueChange={(value) => {
						void (async () => {
							if (value) {
								await progress.requestNotificationPermission()
							}
							await progress.updateSettings({
								dailyReminderEnabled: value,
							})
						})()
					}}
				/>
			</View>

			<Text
				style={{
					marginTop: 12,
					color: theme.colors.textSecondary,
					...theme.typography.caption,
				}}
			>
				Время (по умолчанию{' '}
				{formatReminderTime(DEFAULT_REMINDER_MINUTES)})
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

			<Text
				style={{
					marginTop: 10,
					color: theme.colors.textSecondary,
					...theme.typography.caption,
				}}
			>
				Разрешение:{' '}
				{progress.reminderPermission === 'granted'
					? 'разрешено'
					: progress.reminderPermission === 'denied'
						? 'запрещено'
						: 'не запрошено'}
			</Text>

			{progress.reminderPermission !== 'granted' ? (
				<Pressable
					onPress={() => {
						void progress.requestNotificationPermission()
					}}
					style={({ pressed }) => [
						styles.permissionButton,
						{
							borderColor: theme.colors.border,
							opacity: pressed ? 0.85 : 1,
						},
					]}
				>
					<Text style={{ color: theme.colors.primary }}>
						Запросить разрешение
					</Text>
				</Pressable>
			) : null}
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
})
