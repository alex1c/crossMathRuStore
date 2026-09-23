import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'
import { CONTROL_TOUCH } from '@/src/features/game'

type NumberPadProps = {
	readonly disabled?: boolean
	readonly onDigit: (digit: number) => void
	readonly onDelete: () => void
	readonly onConfirm: () => void
	/** Responsive key height from vertical layout helper. */
	readonly touchHeight?: number
	/** Responsive gap between keypad rows. */
	readonly rowGap?: number
}

const ROWS: readonly (readonly (number | 'delete' | 'confirm')[])[] = [
	[1, 2, 3],
	[4, 5, 6],
	[7, 8, 9],
	['delete', 0, 'confirm'],
]

/**
 * Custom number pad for multi-digit CrossMath values (no system keyboard).
 */
export function NumberPad({
	disabled = false,
	onDigit,
	onDelete,
	onConfirm,
	touchHeight = CONTROL_TOUCH.comfortable,
	rowGap = 8,
}: NumberPadProps) {
	const theme = useTheme()

	return (
		<View style={[styles.pad, { gap: rowGap }]}>
			{ROWS.map((row, rowIndex) => (
				<View key={`pad-row-${rowIndex}`} style={[styles.row, { gap: rowGap }]}>
					{row.map((key) => {
						const label =
							key === 'delete'
								? '⌫'
								: key === 'confirm'
									? '✓'
									: String(key)
						const accessibilityLabel =
							key === 'delete'
								? 'Удалить'
								: key === 'confirm'
									? 'Подтвердить'
									: `Цифра ${key}`

						return (
							<Pressable
								key={String(key)}
								disabled={disabled}
								accessibilityRole="button"
								accessibilityLabel={accessibilityLabel}
								onPress={() => {
									if (key === 'delete') {
										onDelete()
										return
									}
									if (key === 'confirm') {
										onConfirm()
										return
									}
									onDigit(key)
								}}
								style={({ pressed }) => [
									styles.key,
									{
										backgroundColor: theme.colors.surface,
										borderColor: theme.colors.border,
										height: touchHeight,
										opacity: disabled
											? 0.45
											: pressed
												? 0.8
												: 1,
									},
									key === 'confirm'
										? {
												backgroundColor:
													theme.colors.primary,
												borderColor:
													theme.colors.primary,
											}
										: null,
								]}
							>
								<Text
									style={[
										styles.keyLabel,
										{
											color:
												key === 'confirm'
													? theme.colors
															.textOnPrimary
													: theme.colors.text,
											...theme.typography.bodyStrong,
										},
									]}
								>
									{label}
								</Text>
							</Pressable>
						)
					})}
				</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	pad: {},
	row: {
		flexDirection: 'row',
	},
	key: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	keyLabel: {
		textAlign: 'center',
	},
})
