import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import {
	CAMPAIGN_TOTAL_LEVELS,
	getCampaignLevelStatus,
	useAppProgress,
} from '@/src/features/progress'
import { getCampaignTierLabel } from '@/src/features/game'
import { useTheme } from '@/src/theme'

const TIERS = [
	{ start: 1, end: 50 },
	{ start: 51, end: 100 },
	{ start: 101, end: 150 },
	{ start: 151, end: 200 },
	{ start: 201, end: 250 },
] as const

/**
 * Campaign 1–250 compact grid with lock / unlock / completed states.
 */
export function LevelsScreen() {
	const theme = useTheme()
	const progress = useAppProgress()
	const { highestUnlockedLevel, completedLevels } = progress.state.campaign

	return (
		<Screen
			title="Уровни"
			subtitle={`${completedLevels.length} / ${CAMPAIGN_TOTAL_LEVELS}`}
			scroll
			footer={<BannerSlot placement="levels" />}
		>
			{TIERS.map((tier) => (
				<View key={tier.start} style={styles.tierBlock}>
					<Text
						style={{
							color: theme.colors.text,
							...theme.typography.subtitle,
							marginBottom: 8,
						}}
					>
						{getCampaignTierLabel(tier.start)}
					</Text>
					<View style={styles.grid}>
						{Array.from(
							{ length: tier.end - tier.start + 1 },
							(_, index) => tier.start + index,
						).map((level) => {
							const status = getCampaignLevelStatus(
								level,
								highestUnlockedLevel,
								completedLevels,
							)
							const locked = status === 'locked'
							return (
								<Pressable
									key={level}
									disabled={locked}
									accessibilityRole="button"
									accessibilityLabel={`Уровень ${level}`}
									onPress={() => {
										router.push({
											pathname: '/game',
											params: {
												source: 'campaign',
												level: String(level),
											},
										})
									}}
									style={({ pressed }) => [
										styles.cell,
										{
											backgroundColor:
												status === 'completed'
													? theme.colors.selectedCell
													: theme.colors.surface,
											borderColor:
												status === 'completed'
													? theme.colors.success
													: theme.colors.border,
											opacity: locked
												? 0.35
												: pressed
													? 0.85
													: 1,
										},
									]}
								>
									<Text
										style={{
											color: theme.colors.text,
											...theme.typography.label,
										}}
									>
										{level}
									</Text>
								</Pressable>
							)
						})}
					</View>
				</View>
			))}

			{__DEV__ ? (
				<>
					<Text
						style={[
							styles.devTitle,
							{
								color: theme.colors.textSecondary,
								...theme.typography.caption,
							},
						]}
					>
						DEV-only physical QA
					</Text>
					<View style={styles.devRow}>
						{[160, 220].map((level) => (
							<Pressable
								key={`dev-${level}`}
								onPress={() =>
									router.push({
										pathname: '/game',
										params: {
											source: 'campaign',
											level: String(level),
										},
									})
								}
								style={[
									styles.devChip,
									{
										borderColor: theme.colors.border,
										backgroundColor: theme.colors.surface,
									},
								]}
							>
								<Text style={{ color: theme.colors.text }}>
									{level}
								</Text>
							</Pressable>
						))}
						<Pressable
							onPress={() =>
								router.push({
									pathname: '/game',
									params: { fixture: 'multi-digit' },
								})
							}
							style={[
								styles.devChip,
								{
									borderColor: theme.colors.border,
									backgroundColor: theme.colors.surface,
								},
							]}
						>
							<Text style={{ color: theme.colors.text }}>
								12/18
							</Text>
						</Pressable>
					</View>
				</>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	tierBlock: {
		marginBottom: 20,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	cell: {
		width: '18%',
		minHeight: 40,
		borderWidth: 1,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	devTitle: {
		marginTop: 8,
		marginBottom: 8,
	},
	devRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	devChip: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
})
