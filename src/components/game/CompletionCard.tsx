import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'
import { formatElapsed } from '@/src/features/game'

type CompletionCardProps = {
	readonly title: string
	readonly elapsedMs: number
	readonly mistakes: number
	readonly hintsUsed: number
	readonly onNextLevel?: () => void
	readonly onHome: () => void
	readonly nextLabel?: string
}

/**
 * Lightweight completion summary — no ads / rewards in Phase 3.
 */
export function CompletionCard({
	title,
	elapsedMs,
	mistakes,
	hintsUsed,
	onNextLevel,
	onHome,
	nextLabel = 'Следующий уровень',
}: CompletionCardProps) {
	const theme = useTheme()

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.border,
				},
			]}
		>
			<Text
				style={{
					color: theme.colors.success,
					...theme.typography.display,
				}}
			>
				Готово!
			</Text>
			<Text
				style={[
					styles.subtitle,
					{
						color: theme.colors.text,
						...theme.typography.subtitle,
					},
				]}
			>
				{title} решён
			</Text>

			<View style={styles.stats}>
				<Stat label="Время" value={formatElapsed(elapsedMs)} />
				<Stat label="Ошибки" value={String(mistakes)} />
				<Stat label="Подсказки" value={String(hintsUsed)} />
			</View>

			{onNextLevel ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={nextLabel}
					onPress={onNextLevel}
					style={({ pressed }) => [
						styles.primary,
						{
							backgroundColor: theme.colors.primary,
							opacity: pressed ? 0.85 : 1,
							minHeight: theme.touchTarget.min,
						},
					]}
				>
					<Text
						style={{
							color: theme.colors.textOnPrimary,
							...theme.typography.bodyStrong,
						}}
					>
						{nextLabel}
					</Text>
				</Pressable>
			) : null}

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="На главную"
				onPress={onHome}
				style={({ pressed }) => [
					styles.secondary,
					{
						borderColor: theme.colors.border,
						opacity: pressed ? 0.85 : 1,
						minHeight: theme.touchTarget.min,
					},
				]}
			>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.bodyStrong,
					}}
				>
					На главную
				</Text>
			</Pressable>
		</View>
	)

	function Stat({ label, value }: { label: string; value: string }) {
		return (
			<View style={styles.stat}>
				<Text
					style={{
						color: theme.colors.textSecondary,
						...theme.typography.caption,
					}}
				>
					{label}
				</Text>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.bodyStrong,
					}}
				>
					{value}
				</Text>
			</View>
		)
	}
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderRadius: 16,
		padding: 20,
		gap: 12,
		transform: [{ translateY: -32 }],
	},
	subtitle: {
		marginTop: -4,
	},
	stats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 8,
	},
	stat: {
		alignItems: 'center',
		flex: 1,
	},
	primary: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
	secondary: {
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
})
