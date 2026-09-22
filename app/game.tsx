import { GameScreen } from '@/src/screens/GameScreen'
import type { GameSource } from '@/src/features/game'
import { useLocalSearchParams } from 'expo-router'

/**
 * Gameplay route: `/game?source=campaign&level=1`
 * Remounts when level changes so session state resets cleanly.
 */
export default function GameRoute() {
	const params = useLocalSearchParams<{
		source?: string
		level?: string
	}>()

	const level = parseLevel(params.level)
	const source: GameSource = {
		kind: 'campaign',
		level,
	}

	return (
		<GameScreen
			key={`campaign-${level}`}
			source={source}
		/>
	)
}

function parseLevel(raw: string | string[] | undefined): number {
	const text = Array.isArray(raw) ? raw[0] : raw
	const value = Number(text ?? '1')
	if (!Number.isInteger(value) || value < 1 || value > 250) {
		return 1
	}
	return value
}
