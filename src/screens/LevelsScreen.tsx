import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import { getCampaignTierLabel } from '@/src/features/game'
import { useTheme } from '@/src/theme'

/** Quick campaign entry points for Phase 3 — not a full 1..250 map. */
const QUICK_LEVELS = [1, 2, 3, 4, 5, 10, 50, 51] as const

/**
 * Minimal functional level picker → `/game`.
 */
export function LevelsScreen() {
	const theme = useTheme()

	return (
		<Screen
			title="Уровни"
			subtitle="Кампания — выберите уровень"
			scroll
			footer={<BannerSlot placement="levels" />}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Уровень 1"
				onPress={() => openLevel(1)}
				style={({ pressed }) => [
					styles.primary,
					{
						backgroundColor: theme.colors.primary,
						minHeight: theme.touchTarget.min,
						opacity: pressed ? 0.85 : 1,
					},
				]}
			>
				<Text
					style={{
						color: theme.colors.textOnPrimary,
						...theme.typography.bodyStrong,
					}}
				>
					Уровень 1 · {getCampaignTierLabel(1)}
				</Text>
			</Pressable>

			<Text
				style={[
					styles.section,
					{
						color: theme.colors.textSecondary,
						...theme.typography.caption,
					},
				]}
			>
				Быстрый выбор
			</Text>

			<View style={styles.grid}>
				{QUICK_LEVELS.map((level) => (
					<Pressable
						key={level}
						accessibilityRole="button"
						accessibilityLabel={`Уровень ${level}`}
						onPress={() => openLevel(level)}
						style={({ pressed }) => [
							styles.chip,
							{
								backgroundColor: theme.colors.surface,
								borderColor: theme.colors.border,
								minHeight: theme.touchTarget.min,
								opacity: pressed ? 0.85 : 1,
							},
						]}
					>
						<Text
							style={{
								color: theme.colors.text,
								...theme.typography.bodyStrong,
							}}
						>
							{level}
						</Text>
						<Text
							style={{
								color: theme.colors.textSecondary,
								...theme.typography.label,
							}}
						>
							{getCampaignTierLabel(level)}
						</Text>
					</Pressable>
				))}
			</View>
		</Screen>
	)
}

function openLevel(level: number): void {
	router.push({
		pathname: '/game',
		params: { source: 'campaign', level: String(level) },
	})
}

const styles = StyleSheet.create({
	primary: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		marginBottom: 16,
	},
	section: {
		marginBottom: 8,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		width: '47%',
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 10,
		gap: 2,
	},
})
