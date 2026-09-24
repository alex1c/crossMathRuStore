import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import {
	CAMPAIGN_TOTAL_LEVELS,
	TRACK_LEVEL_COUNT,
	useAppProgress,
} from '@/src/features/progress'
import {
	DIFFICULTY_TRACKS,
	TRACK_DESCRIPTIONS,
	TRACK_LABELS,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'
import { trackAnalyticsEvent } from '@/src/services/analytics'
import { useTheme } from '@/src/theme'

/**
 * Four independent difficulty tracks — all selectable with no cross-track locks.
 */
export function TrackSelectionScreen() {
	const theme = useTheme()
	const { state, stats } = useAppProgress()

	const totalSolved = stats.campaignSolved

	return (
		<Screen
			title="Уровни"
			subtitle={`${totalSolved} / ${CAMPAIGN_TOTAL_LEVELS} · выберите трек`}
			scroll
			footer={<BannerSlot placement="levels" />}
		>
			{DIFFICULTY_TRACKS.map((track) => {
				const trackProgress = state.tracks[track]
				const solved = trackProgress.completedLevels.length
				return (
					<TrackCard
						key={track}
						track={track}
						solved={solved}
						onPress={() => {
							trackAnalyticsEvent('track_opened', { track })
							router.push({
								pathname: '/track-levels' as never,
								params: { track },
							})
						}}
						theme={theme}
					/>
				)
			})}
		</Screen>
	)
}

type TrackCardProps = {
	readonly track: DifficultyTrack
	readonly solved: number
	readonly onPress: () => void
	readonly theme: ReturnType<typeof useTheme>
}

/** Large tappable row for one difficulty track. */
function TrackCard({ track, solved, onPress, theme }: TrackCardProps) {
	const label = TRACK_LABELS[track]
	const description = TRACK_DESCRIPTIONS[track]

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}, ${solved} из ${TRACK_LEVEL_COUNT}`}
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.border,
					opacity: pressed ? 0.88 : 1,
				},
			]}
		>
			<View style={styles.cardHeader}>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.subtitle,
					}}
				>
					{label}
				</Text>
				<Text
					style={{
						color: theme.colors.primary,
						...theme.typography.bodyStrong,
					}}
				>
					{solved} / {TRACK_LEVEL_COUNT}
				</Text>
			</View>
			<Text
				style={{
					color: theme.colors.textSecondary,
					...theme.typography.body,
					marginTop: theme.spacing.xs,
				}}
			>
				{description}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 18,
		marginBottom: 12,
		minHeight: 88,
		justifyContent: 'center',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
})
