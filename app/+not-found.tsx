import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'

/** Fallback for unknown routes. */
export default function NotFoundScreen() {
	const theme = useTheme()

	return (
		<>
			<Stack.Screen options={{ title: 'Не найдено' }} />
			<View
				style={[
					styles.container,
					{ backgroundColor: theme.colors.background },
				]}
			>
				<Text style={[styles.title, { color: theme.colors.text }]}>
					Экран не найден
				</Text>
				<Link href="/" style={styles.link}>
					<Text style={{ color: theme.colors.primary }}>На главную</Text>
				</Link>
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
	},
	link: {
		marginTop: 16,
		paddingVertical: 12,
	},
})
