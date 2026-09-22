import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '@/src/theme'

type HomeMenuButtonProps = {
	label: string
	onPress: () => void
	/** Softer visual weight for secondary entries. */
	secondary?: boolean
}

/**
 * Simple home navigation row. No animation polish in Phase 0.
 */
export function HomeMenuButton({
	label,
	onPress,
	secondary = false,
}: HomeMenuButtonProps) {
	const theme = useTheme()
	const styles = createStyles(theme)

	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				secondary ? styles.secondary : null,
				pressed ? styles.pressed : null,
			]}
		>
			<Text style={[styles.label, secondary ? styles.labelSecondary : null]}>
				{label}
			</Text>
		</Pressable>
	)
}

function createStyles(theme: ReturnType<typeof useTheme>) {
	return StyleSheet.create({
		button: {
			minHeight: theme.touchTarget.min,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.md,
			marginBottom: theme.spacing.sm,
		},
		secondary: {
			backgroundColor: theme.colors.surface,
			borderWidth: 1,
			borderColor: theme.colors.border,
		},
		pressed: {
			opacity: 0.85,
		},
		label: {
			...theme.typography.bodyStrong,
			color: theme.colors.textOnPrimary,
		},
		labelSecondary: {
			color: theme.colors.text,
		},
	})
}
