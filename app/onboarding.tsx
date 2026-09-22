import { Text, StyleSheet } from 'react-native'
import { Screen } from '@/src/components'
import { ONBOARDING_ROUTE } from '@/src/features/onboarding'
import { useTheme } from '@/src/theme'

/**
 * Mandatory learning entry point (ForestMusic rule).
 * Interactive tutorial content is deferred; route + domain slot exist now.
 */
export default function OnboardingRoute() {
	const theme = useTheme()

	return (
		<Screen
			title="Обучение"
			subtitle="Как играть в математический кроссворд"
		>
			<Text
				style={[
					styles.note,
					{
						color: theme.colors.textSecondary,
						...theme.typography.body,
					},
				]}
			>
				Интерактивный tutorial будет добавлен позже. Route:{' '}
				{ONBOARDING_ROUTE}
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	note: {
		marginTop: 8,
	},
})
