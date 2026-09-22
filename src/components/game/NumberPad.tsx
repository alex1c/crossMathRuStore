import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'

type NumberPadProps = {
	readonly disabled?: boolean
	readonly onDigit: (digit: number) => void
	readonly onDelete: () => void
	readonly onConfirm: () => void
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
}: NumberPadProps) {
	const theme = useTheme()

	return (
		<View style={styles.pad}>
			{ROWS.map((row, rowIndex) => (
				<View key={`pad-row-${rowIndex}`} style={styles.row}>
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
										minHeight: theme.touchTarget.min,
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
	pad: {
		gap: 8,
	},
	row: {
		flexDirection: 'row',
		gap: 8,
	},
	key: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
	},
	keyLabel: {
		textAlign: 'center',
	},
})
