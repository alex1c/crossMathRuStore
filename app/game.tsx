import { ActivityIndicator, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { GameScreen } from '@/src/screens/GameScreen'
import { useAppProgress, formatLocalDateKey } from '@/src/features/progress'
import type { GameSource } from '@/src/features/game'
import { useTheme } from '@/src/theme'

/**
 * Gameplay route — campaign / daily / endless / resume / DEV fixture.
 */
export default function GameRoute() {
	const theme = useTheme()
	const progress = useAppProgress()
	const params = useLocalSearchParams<{
		source?: string
		level?: string
		date?: string
		completed?: string
		fixture?: string
		resume?: string
	}>()

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

	const fixture = Array.isArray(params.fixture) ? params.fixture[0] : params.fixture
	if (__DEV__ && fixture === 'multi-digit') {
		return (
			<GameScreen
				key="dev-multi-digit"
				source={{ kind: 'dev-fixture', id: 'multi-digit' }}
			/>
		)
	}

	const resumeRaw = Array.isArray(params.resume) ? params.resume[0] : params.resume
	if (resumeRaw === '1') {
		if (!progress.state.activeSession) {
			return <Redirect href="/" />
		}
		return (
			<GameScreen
				key={`resume-${progress.state.activeSession.updatedAt}`}
				source={progress.state.activeSession.source}
				resume
			/>
		)
	}

	const sourceKind = Array.isArray(params.source) ? params.source[0] : params.source

	if (sourceKind === 'daily') {
		const date =
			(Array.isArray(params.date) ? params.date[0] : params.date) ??
			formatLocalDateKey()
		const source: GameSource = { kind: 'daily', dateKey: date }
		return <GameScreen key={`daily-${date}`} source={source} />
	}

	if (sourceKind === 'endless') {
		const completed = Number(
			Array.isArray(params.completed) ? params.completed[0] : params.completed,
		)
		const count =
			Number.isInteger(completed) && completed >= 0
				? completed
				: progress.state.endless.completedCount
		const source: GameSource = { kind: 'endless', completedCount: count }
		return <GameScreen key={`endless-${count}`} source={source} />
	}

	const level = parseLevel(params.level)
	const source: GameSource = { kind: 'campaign', level }
	return <GameScreen key={`campaign-${level}`} source={source} />
}

function parseLevel(raw: string | string[] | undefined): number {
	const text = Array.isArray(raw) ? raw[0] : raw
	const value = Number(text ?? '1')
	if (!Number.isInteger(value) || value < 1 || value > 250) {
		return 1
	}
	return value
}
