import Constants from 'expo-constants'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, Screen } from '@/src/components'
import {
	OTHER_OUR_APPS_LABEL,
	OTHER_OUR_APPS_URL,
} from '@/src/constants/otherApps'
import { useTheme } from '@/src/theme'

/**
 * Lightweight About / Help — version, tutorial replay entry, other apps.
 */
export function AboutScreen() {
	const theme = useTheme()
	const version =
		Constants.expoConfig?.version ??
		Constants.nativeAppVersion ??
		'1.0.0'

	return (
		<Screen
			title="О приложении"
			subtitle="Математический кроссворд"
			scroll
			footer={<BannerSlot placement="about" />}
		>
			<Text
				style={{
					color: theme.colors.textSecondary,
					...theme.typography.body,
					marginBottom: 16,
				}}
			>
				Числовой кроссворд: заполняйте клетки так, чтобы все уравнения
				сходились. Уровни, кроссворд дня и бесконечный режим доступны
				офлайн.
			</Text>

			<Text
				style={{
					color: theme.colors.text,
					...theme.typography.caption,
					marginBottom: 20,
				}}
			>
				Версия {version}
			</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Пройти обучение ещё раз"
				onPress={() =>
					router.push({
						pathname: '/onboarding',
						params: { replay: '1' },
					})
				}
				style={({ pressed }) => [
					styles.row,
					{
						borderColor: theme.colors.border,
						backgroundColor: theme.colors.surface,
						opacity: pressed ? 0.85 : 1,
					},
				]}
			>
				<Text
					style={{
						color: theme.colors.text,
						...theme.typography.bodyStrong,
					}}
				>
					Пройти обучение ещё раз
				</Text>
			</Pressable>

			<Pressable
				accessibilityRole="link"
				accessibilityLabel={OTHER_OUR_APPS_LABEL}
				onPress={() => {
					void Linking.openURL(OTHER_OUR_APPS_URL)
				}}
				style={({ pressed }) => [
					styles.row,
					{
						borderColor: theme.colors.border,
						backgroundColor: theme.colors.surface,
						opacity: pressed ? 0.85 : 1,
						marginTop: 10,
					},
				]}
			>
				<Text
					style={{
						color: theme.colors.primary,
						...theme.typography.bodyStrong,
					}}
				>
					{OTHER_OUR_APPS_LABEL}
				</Text>
				<Text
					style={{
						color: theme.colors.textSecondary,
						...theme.typography.caption,
						marginTop: 4,
					}}
				>
					RuStore · ForestMusic
				</Text>
			</Pressable>

			<View style={{ height: 8 }} />
		</Screen>
	)
}

const styles = StyleSheet.create({
	row: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
})
