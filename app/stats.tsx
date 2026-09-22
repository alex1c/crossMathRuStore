import { Text, StyleSheet } from 'react-native'
import { BannerSlot, Screen } from '@/src/components'
import { useTheme } from '@/src/theme'

/** Stats / achievements shell — banner slot reserved for a future non-game ad. */
export default function StatsRoute() {
	const theme = useTheme()

	return (
		<Screen
			title="Статистика"
			subtitle="Прогресс и достижения появятся позже."
			footer={<BannerSlot placement="stats" />}
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
