import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { BannerSlot, HomeMenuButton, Screen } from '@/src/components'
import {
	getNextCampaignLevel,
	useAppProgress,
} from '@/src/features/progress'
import { getGameSourceTitle } from '@/src/features/game'
import { useTheme } from '@/src/theme'
import { useEffect } from 'react'

/**
 * Home — progress-aware entry with first-launch onboarding gate.
 */
export function HomeScreen() {
	const theme = useTheme()
	const progress = useAppProgress()

	useEffect(() => {
		if (
			progress.ready &&
			!progress.state.settings.onboardingCompleted
		) {
			router.replace('/onboarding')
		}
	}, [progress.ready, progress.state.settings.onboardingCompleted])

	if (!progress.ready) {
		return (
			<View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
				<ActivityIndicator color={theme.colors.primary} />
			</View>
		)
	}

	if (!progress.state.settings.onboardingCompleted) {
		return (
			<View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
				<ActivityIndicator color={theme.colors.primary} />
			</View>
		)
	}

	const { state, todayKey, streakCurrent } = progress
	const active = state.activeSession
	const todayDone = Boolean(state.daily.completions[todayKey])
	const campaignSolved = state.campaign.completedLevels.length
	const nextLevel = getNextCampaignLevel(
		state.campaign.highestUnlockedLevel,
		state.campaign.completedLevels,
	)

	return (
		<Screen
			title="Математический кроссворд"
			subtitle="CrossMath"
			scroll
			footer={<BannerSlot placement="home" />}
		>
			{active ? (
				<HomeMenuButton
					label={`Продолжить\n${getGameSourceTitle(active.source as never)}`}
					onPress={() => {
						router.push({
							pathname: '/game',
							params: { resume: '1' },
						})
					}}
				/>
			) : null}

			<HomeMenuButton
				label={
					todayDone
						? 'Сегодняшний кроссворд\nСегодня решено ✓'
						: streakCurrent > 0
							? `Сегодняшний кроссворд\n🔥 ${streakCurrent} дн.`
							: 'Сегодняшний кроссворд'
				}
				onPress={() => router.push('/daily')}
			/>

			<HomeMenuButton
				label={`Уровни\n${campaignSolved} / 250 · далее ${nextLevel}`}
				onPress={() => router.push('/levels')}
			/>

			<HomeMenuButton
				label="Бесконечная игра"
				onPress={() =>
					router.push({
						pathname: '/game',
						params: {
							source: 'endless',
							completed: String(state.endless.completedCount),
						},
					})
				}
			/>

			<HomeMenuButton
				label="Статистика"
				secondary
				onPress={() => router.push('/stats')}
			/>

			<HomeMenuButton
				label="Настройки"
				secondary
				onPress={() => router.push('/settings')}
			/>

			<HomeMenuButton
				label="О приложении"
				secondary
				onPress={() => router.push('/about')}
			/>
		</Screen>
	)
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
