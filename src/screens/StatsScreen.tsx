import { StyleSheet, Text, View } from 'react-native'
import { BannerSlot, Screen } from '@/src/components'
import { useAppProgress } from '@/src/features/progress'
import {
	DIFFICULTY_TRACKS,
	TRACK_LABELS,
	TRACK_LEVEL_COUNT,
} from '@/src/core/crossmath/tracks'
import { useTheme } from '@/src/theme'

/**
 * Derived stats — four-track campaign, daily, endless, multiplication.
 */
export function StatsScreen() {
	const theme = useTheme()
	const { stats } = useAppProgress()

	const rows: { label: string; value: string }[] = [
		{
			label: 'Кампания (всего)',
			value: `${stats.campaignSolved} / ${stats.campaignTotal}`,
		},
		...DIFFICULTY_TRACKS.map((track) => ({
			label: TRACK_LABELS[track],
			value: `${stats.trackSolved[track]} / ${TRACK_LEVEL_COUNT}`,
		})),
	]

	if (stats.multiplicationSolved > 0) {
		rows.push({
			label: 'Таблица умножения',
			value: String(stats.multiplicationSolved),
		})
	}

	rows.push(
		{
			label: 'Кроссворды дня',
			value: String(stats.dailySolvedCount),
		},
		{ label: 'Серия дней', value: String(stats.streakCurrent) },
		{ label: 'Лучшая серия', value: String(stats.streakBest) },
		{ label: 'Бесконечная игра', value: String(stats.endlessSolved) },
		{ label: 'Всего решено', value: String(stats.totalPuzzlesSolved) },
		{ label: 'Подсказки', value: String(stats.totalHintsUsed) },
		{ label: 'Ошибки', value: String(stats.totalMistakes) },
	)

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
