import { Text, StyleSheet } from 'react-native'
import { BannerSlot, Screen } from '@/src/components'
import { useTheme } from '@/src/theme'

/** Level select placeholder — banner slot reserved for a future non-game ad. */
export default function LevelsRoute() {
	const theme = useTheme()

	return (
		<Screen
			title="Уровни"
			subtitle="Каталог уровней появится позже."
			footer={<BannerSlot placement="levels" />}
		>
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
