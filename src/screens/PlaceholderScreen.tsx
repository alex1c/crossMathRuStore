import { Text, StyleSheet } from 'react-native'
import { Screen } from '@/src/components'
import { useTheme } from '@/src/theme'

type PlaceholderScreenProps = {
	title: string
	description: string
}

/**
 * Minimal placeholder used by Phase 0 navigation routes.
 */
export function PlaceholderScreen({
	title,
	description,
}: PlaceholderScreenProps) {
	const theme = useTheme()

	return (
		<Screen title={title} subtitle={description}>
			<Text
				style={[
					styles.note,
					{
						color: theme.colors.textSecondary,
						...theme.typography.caption,
					},
				]}
			>
				Placeholder — gameplay and content arrive in later phases.
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	note: {
		marginTop: 8,
	},
})
