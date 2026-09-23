import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, HomeMenuButton, Screen } from '@/src/components'
import {
	buildDailyCalendarMonth,
	shiftCalendarMonth,
} from '@/src/features/daily'
import { useAppProgress } from '@/src/features/progress'
import { useTheme } from '@/src/theme'

/**
 * Daily hub: play today + monthly calendar + streak.
 */
export function DailyScreen() {
	const theme = useTheme()
	const progress = useAppProgress()
	const { todayKey, streakCurrent, state } = progress
	const todayDone = Boolean(state.daily.completions[todayKey])
	const initial = useMemo(() => {
		const [y, m] = todayKey.split('-').map(Number)
		return { year: y!, monthIndex: m! - 1 }
	}, [todayKey])
	const [cursor, setCursor] = useState(initial)
	const month = useMemo(
		() =>
			buildDailyCalendarMonth(
				cursor.year,
				cursor.monthIndex,
				Object.keys(state.daily.completions),
				todayKey,
			),
		[cursor, state.daily.completions, todayKey],
	)

	return (
		<Screen
			title="Сегодняшний кроссворд"
			subtitle={
				streakCurrent > 0
					? `🔥 ${streakCurrent} дней подряд`
					: todayKey
			}
			scroll
			footer={<BannerSlot placement="home" />}
		>
			<HomeMenuButton
				label={todayDone ? 'Сегодня решено ✓' : 'Играть сегодня'}
				onPress={() => {
					router.push({
						pathname: '/game',
						params: { source: 'daily', date: todayKey },
					})
				}}
			/>

			<View style={styles.monthHeader}>
				<Pressable
					onPress={() =>
						setCursor((prev) =>
							shiftCalendarMonth(prev.year, prev.monthIndex, -1),
						)
					}
					accessibilityRole="button"
					accessibilityLabel="Предыдущий месяц"
				>
					<Text style={{ color: theme.colors.primary, fontSize: 22 }}>‹</Text>
				</Pressable>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.subtitle,
					}}
				>
					{month.label}
				</Text>
				<Pressable
					onPress={() =>
						setCursor((prev) =>
							shiftCalendarMonth(prev.year, prev.monthIndex, 1),
						)
					}
					accessibilityRole="button"
					accessibilityLabel="Следующий месяц"
				>
					<Text style={{ color: theme.colors.primary, fontSize: 22 }}>›</Text>
				</Pressable>
			</View>

			<View style={styles.weekRow}>
				{['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((label) => (
					<Text
						key={label}
						style={[
							styles.weekLabel,
							{ color: theme.colors.textSecondary },
						]}
					>
						{label}
					</Text>
				))}
			</View>

			<View style={styles.grid}>
				{month.cells.map((cell, index) => {
					const bg =
						cell.state === 'completed'
							? theme.colors.success
							: cell.state === 'today'
								? theme.colors.selectedCell
								: cell.state === 'missed'
									? theme.colors.errorSoft
									: 'transparent'
					const color =
						cell.state === 'completed'
							? theme.colors.textOnPrimary
							: cell.state === 'future' || cell.state === 'empty'
								? theme.colors.textSecondary
								: theme.colors.text
					return (
						<View
							key={`${cell.dateKey ?? 'e'}-${index}`}
							style={[
								styles.day,
								{
									backgroundColor: bg,
									borderColor: theme.colors.border,
									opacity: cell.state === 'empty' ? 0 : 1,
								},
							]}
						>
							<Text style={{ color, fontSize: 12 }}>
								{cell.dayOfMonth ?? ''}
							</Text>
						</View>
					)
				})}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	monthHeader: {
		marginTop: 16,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	weekRow: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	weekLabel: {
		width: '14.28%',
		textAlign: 'center',
		fontSize: 11,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	day: {
		width: '14.28%',
		aspectRatio: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: 2,
	},
})
