import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAppProgress } from '@/src/features/progress'
import { useTheme } from '@/src/theme'

/** Continue shortcut — resume active session or return Home. */
export default function ContinueRoute() {
	const theme = useTheme()
	const progress = useAppProgress()
	if (!progress.ready) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: theme.colors.background,
				}}
			>
				<ActivityIndicator color={theme.colors.primary} />
			</View>
		)
	}
	if (progress.state.activeSession) {
		return <Redirect href={{ pathname: '/game', params: { resume: '1' } }} />
	}
	return <Redirect href="/" />
}
