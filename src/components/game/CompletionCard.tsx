import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'
import { formatElapsed } from '@/src/features/game'
import { hapticSuccess } from '@/src/features/feedback'

type CompletionCardProps = {
	readonly title: string
	readonly detail?: string
	readonly elapsedMs: number
	readonly mistakes: number
	readonly hintsUsed: number
	readonly onNextLevel?: () => void
	readonly onHome: () => void
	readonly nextLabel?: string
}

/**
 * Lightweight completion summary with a small scale/fade celebration.
 */
export function CompletionCard({
	title,
	detail,
	elapsedMs,
	mistakes,
	hintsUsed,
	onNextLevel,
	onHome,
	nextLabel = 'Следующий уровень',
}: CompletionCardProps) {
	const theme = useTheme()
	const scale = useRef(new Animated.Value(0.92)).current
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		hapticSuccess()
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 1,
				duration: 220,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				friction: 7,
				tension: 80,
				useNativeDriver: true,
			}),
		]).start()
	}, [opacity, scale])

	return (
		<Animated.View
			style={[
				styles.card,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.border,
					opacity,
					transform: [{ scale }],
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
				{detail ?? `${title} решён`}
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
		</Animated.View>
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
		padding: 16,
		gap: 10,
	},
	subtitle: {
		marginTop: -2,
	},
	stats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 4,
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
