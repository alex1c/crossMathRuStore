import { Pressable, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, HomeMenuButton, Screen } from '@/src/components'
import { useAppProgress } from '@/src/features/progress'
import { trackAnalyticsEvent } from '@/src/services/analytics'
import { useTheme } from '@/src/theme'

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9] as const

/**
 * Pick a multiplication table (×2..×9) or mixed practice, then start a puzzle.
 */
export function MultiplicationScreen() {
	const theme = useTheme()
	const { state } = useAppProgress()
	const totalSolved = state.multiplication.totalSolved

	const startTable = (table: number | 'mixed') => {
		const key = String(table)
		const sequence = (state.multiplication.solvedByTable[key] ?? 0) + 1
		trackAnalyticsEvent('multiplication_opened', {
			table: table === 'mixed' ? 'mixed' : String(table),
		})
		router.push({
			pathname: '/game',
			params: {
				source: 'multiplication',
				table: String(table),
				sequence: String(sequence),
			},
		})
	}

	return (
		<Screen
			title="Таблица умножения"
			subtitle={
				totalSolved > 0
					? `Решено: ${totalSolved}`
					: 'Выберите таблицу'
			}
			scroll
			footer={<BannerSlot placement="multiplication" />}
		>
			{TABLES.map((table) => (
				<HomeMenuButton
					key={table}
					label={`×${table}`}
					onPress={() => startTable(table)}
				/>
			))}

			<Pressable
				accessibilityRole="button"
				onPress={() => startTable('mixed')}
				style={({ pressed }) => [
					styles.mixedButton,
					{
						backgroundColor: theme.colors.surface,
						borderColor: theme.colors.border,
						opacity: pressed ? 0.88 : 1,
					},
				]}
			>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.bodyStrong,
						textAlign: 'center',
					}}
				>
					Смешанная
				</Text>
			</Pressable>
		</Screen>
	)
}

const styles = StyleSheet.create({
	mixedButton: {
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 12,
	},
})
