import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import {
	getNextTrackLevel,
	getTrackLevelStatus,
	TRACK_LEVEL_COUNT,
	useAppProgress,
} from '@/src/features/progress'
import {
	getTrackLabel,
	isDifficultyTrack,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'
import { useTheme } from '@/src/theme'

type TrackLevelsScreenProps = {
	readonly track: DifficultyTrack
}

/** Compact 1–50 grid for a single difficulty track. */
export function TrackLevelsScreen({ track }: TrackLevelsScreenProps) {
	const theme = useTheme()
	const progress = useAppProgress()
	const { highestUnlockedLevel, completedLevels } =
		progress.state.tracks[track]
	const nextLevel = getNextTrackLevel(
		highestUnlockedLevel,
		completedLevels,
	)
	const solved = completedLevels.length

	return (
		<Screen
			title={getTrackLabel(track)}
			subtitle={`${solved} / ${TRACK_LEVEL_COUNT} · далее ${nextLevel}`}
			scroll
			footer={<BannerSlot placement="track_levels" />}
		>
			<View style={styles.grid}>
				{Array.from({ length: TRACK_LEVEL_COUNT }, (_, index) => index + 1).map(
					(level) => {
						const status = getTrackLevelStatus(
							level,
							highestUnlockedLevel,
							completedLevels,
						)
						const locked = status === 'locked'
						const isCurrent = level === nextLevel
						return (
							<Pressable
								key={level}
								disabled={locked}
								accessibilityRole="button"
								accessibilityLabel={
									isCurrent
										? `Уровень ${level}, следующий`
										: `Уровень ${level}`
								}
								onPress={() => {
									router.push({
										pathname: '/game',
										params: {
											source: 'track',
											track,
											level: String(level),
										},
									})
								}}
								style={({ pressed }) => [
									styles.cell,
									{
										backgroundColor:
											status === 'completed'
												? theme.colors.hintedCell
												: isCurrent
													? theme.colors.selectedCell
													: theme.colors.surface,
										borderColor:
											status === 'completed'
												? theme.colors.success
												: isCurrent
													? theme.colors.primary
													: theme.colors.border,
										borderWidth: isCurrent ? 2 : 1,
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
										fontWeight: isCurrent ? '700' : '600',
									}}
								>
									{level}
								</Text>
							</Pressable>
						)
					},
				)}
			</View>

			{__DEV__ && (track === 'hard' || track === 'lobachevsky') ? (
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
						DEV-only track representatives
					</Text>
					<View style={styles.devRow}>
						{[1, 25].map((level) => (
							<Pressable
								key={`dev-${track}-${level}`}
								onPress={() =>
									router.push({
										pathname: '/game',
										params: {
											source: 'track',
											track,
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
									{getTrackLabel(track)} · {level}
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

/** Parses route track param; null when invalid. */
export function parseTrackRouteParam(
	raw: string | string[] | undefined,
): DifficultyTrack | null {
	const text = Array.isArray(raw) ? raw[0] : raw
	if (!text || !isDifficultyTrack(text)) {
		return null
	}
	return text
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	cell: {
		width: '18%',
		minHeight: 40,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	devTitle: {
		marginTop: 20,
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
