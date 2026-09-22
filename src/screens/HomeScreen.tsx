import { router } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { BannerSlot, HomeMenuButton, Screen } from '@/src/components'

type HomeMenuItem = {
	label: string
	href: string
	secondary?: boolean
}

const MENU_ITEMS: readonly HomeMenuItem[] = [
	{ label: 'Продолжить', href: '/continue' },
	{ label: 'Сегодняшний кроссворд', href: '/daily' },
	{ label: 'Уровни', href: '/levels' },
	{ label: 'Бесконечная игра', href: '/endless' },
	{ label: 'Таблица умножения', href: '/multiplication-table' },
	{ label: 'Статистика', href: '/stats', secondary: true },
	{ label: 'Настройки', href: '/settings', secondary: true },
	{ label: 'Обучение', href: '/onboarding', secondary: true },
]

/**
 * Home screen — navigation shell only. No game grid or animations in Phase 0.
 */
export function HomeScreen() {
	return (
		<Screen
			title="Математический кроссворд"
			subtitle="CrossMath — числовая головоломка"
			scroll
			footer={<BannerSlot placement="home" />}
		>
			<View style={styles.menu}>
				{MENU_ITEMS.map((item) => (
					<HomeMenuButton
						key={item.href}
						label={item.label}
						secondary={item.secondary}
						onPress={() => {
							router.push(item.href as never)
						}}
					/>
				))}
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	menu: {
		flexGrow: 1,
	},
})
