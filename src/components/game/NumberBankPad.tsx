import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NumberBankItem } from '@/src/core/crossmath'
import { useTheme } from '@/src/theme'
import { CONTROL_TOUCH } from '@/src/features/game'

type NumberBankPadProps = {
	readonly remainingItems: readonly NumberBankItem[]
	readonly onSelect: (item: NumberBankItem) => void
	readonly disabled?: boolean
	/** Minimum chip touch height (responsive layout). */
	readonly touchHeight?: number
	/** Gap between wrapped chip rows. */
	readonly rowGap?: number
}

/**
 * Wrapping chip grid for Hard / Lobachevsky number-bank input.
 * Only chips still in `remainingItems` are rendered.
 */
export function NumberBankPad({
	remainingItems,
	onSelect,
	disabled = false,
	touchHeight = CONTROL_TOUCH.comfortable,
	rowGap = 8,
}: NumberBankPadProps) {
	const theme = useTheme()

	if (remainingItems.length === 0) {
		return null
	}

	return (
		<View style={[styles.pad, { gap: rowGap }]}>
			{remainingItems.map((item) => (
				<Pressable
					key={item.id}
					disabled={disabled}
					accessibilityRole="button"
					accessibilityLabel={`Число ${item.value}`}
					onPress={() => onSelect(item)}
					style={({ pressed }) => [
						styles.chip,
						{
							minHeight: touchHeight,
							backgroundColor: theme.colors.surface,
							borderColor: theme.colors.border,
							opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
						},
					]}
				>
					<Text
						style={{
							color: theme.colors.userNumber,
							...theme.typography.bodyStrong,
						}}
					>
						{item.value}
					</Text>
				</Pressable>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	pad: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
	},
	chip: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 52,
	},
})
