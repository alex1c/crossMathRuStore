import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CrossMathCell } from '@/src/core/crossmath'
import { operatorSymbol } from '@/src/core/crossmath'
import { useTheme, type ThemeColors } from '@/src/theme'
import { getCellGlyphFontSize } from '@/src/features/game/boardLayout'

export type BoardCellVisual =
	| { readonly kind: 'absent' }
	| {
			readonly kind: 'present'
			readonly cell: CrossMathCell
			readonly displayText: string
			readonly selected: boolean
			readonly related: boolean
			readonly errored: boolean
			readonly hinted: boolean
			readonly coachHighlight: boolean
			readonly interactive: boolean
			readonly accessibilityLabel: string
	  }

type BoardCellProps = {
	readonly visual: BoardCellVisual
	readonly size: number
	readonly onPress?: () => void
}

/**
 * Single crossword cell. Absent coordinates render as empty spacers.
 */
export const BoardCell = memo(function BoardCell({
	visual,
	size,
	onPress,
}: BoardCellProps) {
	const theme = useTheme()

	if (visual.kind === 'absent') {
		return <View style={{ width: size, height: size }} />
	}

	const styles = createStyles(theme.colors, size, visual)
	const content = (
		<View style={styles.inner}>
			<Text
				style={styles.text}
				numberOfLines={1}
			>
				{visual.displayText}
			</Text>
		</View>
	)

	if (!visual.interactive) {
		return (
			<View
				accessible
				accessibilityLabel={visual.accessibilityLabel}
				style={styles.shell}
			>
				{content}
			</View>
		)
	}

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={visual.accessibilityLabel}
			accessibilityState={{ selected: visual.selected }}
			onPress={onPress}
			style={({ pressed }) => [
				styles.shell,
				pressed ? styles.pressed : null,
			]}
		>
			{content}
		</Pressable>
	)
})

function createStyles(
	colors: ThemeColors,
	size: number,
	visual: Extract<BoardCellVisual, { kind: 'present' }>,
) {
	const isOperator = visual.cell.kind === 'operator'
	const isEquals = visual.cell.kind === 'equals'
	const isFixed =
		visual.cell.kind === 'number' && visual.cell.state === 'fixed'
	const isBlank =
		visual.cell.kind === 'number' && visual.cell.state === 'blank'
	const glyphKind = isOperator
		? 'operator'
		: visual.cell.kind === 'equals'
			? 'equals'
			: 'number'
	const fontSize = getCellGlyphFontSize(size, glyphKind)

	let backgroundColor = 'transparent'
	let borderColor = 'transparent'
	let textColor = colors.equation
	let borderWidth = 0

	if (isBlank) {
		backgroundColor = colors.surface
		borderColor = colors.border
		borderWidth = 1.5
		textColor = colors.userNumber
		if (visual.related && !visual.selected) {
			backgroundColor = colors.relatedCell
		}
		if (visual.hinted) {
			backgroundColor = colors.hintedCell
			borderColor = colors.success
			textColor = colors.success
		}
		if (visual.selected) {
			backgroundColor = colors.selectedCell
			borderColor = colors.primary
			borderWidth = 2.5
		}
		if (visual.coachHighlight && !visual.selected) {
			borderColor = colors.primary
			borderWidth = 2
			backgroundColor = colors.selectedCell
		}
		if (visual.errored) {
			backgroundColor = colors.errorSoft
			borderColor = colors.error
			textColor = colors.error
		}
	} else if (isFixed) {
		textColor = colors.fixedNumber
		if (visual.related) {
			backgroundColor = colors.relatedCell
		}
	} else if (isOperator) {
		textColor = colors.operator
		if (visual.related) {
			backgroundColor = colors.relatedCell
		}
	} else if (isEquals) {
		textColor = colors.textSecondary
		if (visual.related) {
			backgroundColor = colors.relatedCell
		}
	}

	return StyleSheet.create({
		shell: {
			width: size,
			height: size,
			borderRadius: Math.max(4, Math.floor(size * 0.16)),
			borderWidth,
			borderColor,
			backgroundColor,
			alignItems: 'center',
			justifyContent: 'center',
		},
		pressed: {
			opacity: 0.85,
		},
		inner: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: 1,
		},
		text: {
			fontSize,
			lineHeight: fontSize + 2,
			fontWeight: isFixed ? '700' : isBlank ? '600' : '500',
			color: textColor,
			textAlign: 'center',
		},
	})
}

/**
 * Resolve glyph for a core cell (operators use public symbol helper).
 */
export function cellGlyph(cell: CrossMathCell, blankText: string): string {
	if (cell.kind === 'operator') {
		return operatorSymbol(cell.operator)
	}
	if (cell.kind === 'equals') {
		return '='
	}
	if (cell.state === 'fixed') {
		return String(cell.value ?? '')
	}
	return blankText
}
