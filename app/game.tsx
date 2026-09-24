import { ActivityIndicator, View } from 'react-native'
import { Redirect, useLocalSearchParams, type Href } from 'expo-router'
import { GameScreen } from '@/src/screens/GameScreen'
import { useAppProgress, formatLocalDateKey } from '@/src/features/progress'
import type { GameSource } from '@/src/features/game'
import {
	isDifficultyTrack,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'
import { useTheme } from '@/src/theme'

/**
 * Gameplay route — track / daily / endless / multiplication / resume / DEV.
 */
export default function GameRoute() {
	const theme = useTheme()
	const progress = useAppProgress()
	const params = useLocalSearchParams<{
		source?: string
		track?: string
		level?: string
		date?: string
		completed?: string
		table?: string
		sequence?: string
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
	if (__DEV__ && (fixture === 'multi-digit' || fixture === 'bank-dup')) {
		return (
			<GameScreen
				key={`dev-${fixture}`}
				source={{
					kind: 'dev-fixture',
					id: fixture === 'bank-dup' ? 'bank-dup' : 'multi-digit',
				}}
			/>
		)
	}

	const resumeRaw = Array.isArray(params.resume) ? params.resume[0] : params.resume
	if (resumeRaw === '1') {
		if (!progress.state.activeSession) {
			return <Redirect href="/" />
		}
		const activeSource = progress.state.activeSession.source
		if (activeSource.kind === 'campaign') {
			return <Redirect href="/" />
		}
		return (
			<GameScreen
				key={`resume-${getGameSourceKey(activeSource as GameSource)}`}
				source={activeSource as GameSource}
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

	if (sourceKind === 'multiplication') {
		const tableRaw = Array.isArray(params.table) ? params.table[0] : params.table
		const sequenceRaw = Array.isArray(params.sequence)
			? params.sequence[0]
			: params.sequence
		const table =
			tableRaw === 'mixed'
				? 'mixed'
				: Number(tableRaw)
		const sequence = Number(sequenceRaw ?? '0')
		if (
			!(table === 'mixed' || (Number.isInteger(table) && table >= 2 && table <= 9)) ||
			!Number.isInteger(sequence) ||
			sequence < 0
		) {
			return <Redirect href={'/multiplication' as Href} />
		}
		const source: GameSource = {
			kind: 'multiplication',
			table: table as number | 'mixed',
			sequence,
		}
		return (
			<GameScreen
				key={`mult-${table}-${sequence}`}
				source={source}
			/>
		)
	}

	if (sourceKind === 'track') {
		const trackRaw = Array.isArray(params.track) ? params.track[0] : params.track
		const level = parseTrackLevel(params.level)
		if (!trackRaw || !isDifficultyTrack(trackRaw)) {
			return <Redirect href="/levels" />
		}
		const track: DifficultyTrack = trackRaw
		const source: GameSource = { kind: 'track', track, level }
		return (
			<GameScreen key={`track-${track}-${level}`} source={source} />
		)
	}

	return <Redirect href="/levels" />
}

function parseTrackLevel(raw: string | string[] | undefined): number {
	const text = Array.isArray(raw) ? raw[0] : raw
	const value = Number(text ?? '1')
	if (!Number.isInteger(value) || value < 1 || value > 50) {
		return 1
	}
	return value
}

function getGameSourceKey(source: GameSource): string {
	if (source.kind === 'track') {
		return `track-${source.track}-${source.level}`
	}
	if (source.kind === 'daily') {
		return `daily-${source.dateKey}`
	}
	if (source.kind === 'endless') {
		return `endless-${source.completedCount}`
	}
	if (source.kind === 'multiplication') {
		return `mult-${source.table}-${source.sequence}`
	}
	if (source.kind === 'tutorial') {
		return 'tutorial'
	}
	return `dev-${source.id}`
}
