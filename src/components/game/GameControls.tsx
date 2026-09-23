import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'
import { CONTROL_TOUCH } from '@/src/features/game'

type GameControlsProps = {
	readonly disabled?: boolean
	readonly canUndo: boolean
	readonly onUndo: () => void
	readonly onDelete: () => void
	readonly onHint: () => void
	/** Responsive action-row height from vertical layout helper. */
	readonly touchHeight?: number
	readonly rowGap?: number
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
	touchHeight = CONTROL_TOUCH.comfortable,
	rowGap = 8,
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
		<View style={[styles.row, { gap: rowGap }]}>
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
							height: touchHeight,
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
	},
	button: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
})
