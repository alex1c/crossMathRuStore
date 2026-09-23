import { StyleSheet, Text, View } from 'react-native'
import { BannerSlot, Screen } from '@/src/components'
import { useAppProgress } from '@/src/features/progress'
import { useTheme } from '@/src/theme'

/**
 * Basic derived stats from persisted progress.
 */
export function StatsScreen() {
	const theme = useTheme()
	const { stats } = useAppProgress()

	const rows = [
		{
			label: 'Кампания',
			value: `${stats.campaignSolved} / ${stats.campaignTotal}`,
		},
		{ label: 'Кроссворды дня', value: String(stats.dailySolved) },
		{ label: 'Серия дней', value: String(stats.dailyStreakCurrent) },
		{ label: 'Лучшая серия', value: String(stats.dailyStreakBest) },
		{ label: 'Бесконечная игра', value: String(stats.endlessSolved) },
		{ label: 'Всего решено', value: String(stats.totalPuzzlesSolved) },
		{ label: 'Подсказки', value: String(stats.hintsUsed) },
		{ label: 'Ошибки', value: String(stats.mistakes) },
	]

	return (
		<Screen
			title="Статистика"
			subtitle="Ваш прогресс"
			scroll
			footer={<BannerSlot placement="stats" />}
		>
			{rows.map((row) => (
				<View
					key={row.label}
					style={[
						styles.row,
						{ borderBottomColor: theme.colors.border },
					]}
				>
					<Text
						style={{
							color: theme.colors.textSecondary,
							...theme.typography.body,
						}}
					>
						{row.label}
					</Text>
					<Text
						style={{
							color: theme.colors.text,
							...theme.typography.bodyStrong,
						}}
					>
						{row.value}
					</Text>
				</View>
			))}
		</Screen>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
})
