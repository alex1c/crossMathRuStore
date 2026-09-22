import { Text, StyleSheet } from 'react-native'
import { Screen } from '@/src/components'
import { DAILY_REMINDER_COPY } from '@/src/features/daily'
import { useTheme } from '@/src/theme'

/**
 * Today's crossword placeholder.
 * Reminder scheduling is not implemented; domain copy is reserved here.
 */
export default function DailyRoute() {
	const theme = useTheme()

	return (
		<Screen
			title="Сегодняшний кроссворд"
			subtitle="Ежедневная головоломка (placeholder)"
		>
			<Text
				style={[
					styles.note,
					{
						color: theme.colors.textSecondary,
						...theme.typography.body,
					},
				]}
			>
				Дата-зависимая генерация и локальное напоминание «{DAILY_REMINDER_COPY}»
				будут добавлены позже. Уведомление не должно показываться, если
				сегодняшний кроссворд уже решён.
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	note: {
		marginTop: 8,
	},
})
