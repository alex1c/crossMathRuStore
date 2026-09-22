import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'

type GameControlsProps = {
	readonly disabled?: boolean
	readonly canUndo: boolean
	readonly onUndo: () => void
	readonly onDelete: () => void
	readonly onHint: () => void
}

/**
 * Secondary gameplay actions under the board / above the number pad.
 */
export function GameControls({
	disabled = false,
	canUndo,
	onUndo,
	onDelete,
	onHint,
}: GameControlsProps) {
	const theme = useTheme()

	const buttons = [
		{
			key: 'undo',
			label: 'Отменить',
			onPress: onUndo,
			enabled: !disabled && canUndo,
		},
		{
			key: 'delete',
			label: 'Удалить',
			onPress: onDelete,
			enabled: !disabled,
		},
		{
			key: 'hint',
			label: 'Подсказка',
			onPress: onHint,
			enabled: !disabled,
		},
	] as const

	return (
		<View style={styles.row}>
			{buttons.map((button) => (
				<Pressable
					key={button.key}
					accessibilityRole="button"
					accessibilityLabel={button.label}
					disabled={!button.enabled}
					onPress={button.onPress}
					style={({ pressed }) => [
						styles.button,
						{
							backgroundColor: theme.colors.surface,
							borderColor: theme.colors.border,
							minHeight: theme.touchTarget.min,
							opacity: !button.enabled
								? 0.4
								: pressed
									? 0.8
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
						{button.label}
					</Text>
				</Pressable>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 8,
	},
	button: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 6,
	},
})
