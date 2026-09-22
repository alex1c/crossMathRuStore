import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import {
	SafeAreaView,
} from 'react-native-safe-area-context'
import { generateCampaignPuzzle } from '@/src/core/crossmath'
import {
	CompletionCard,
	CrossMathBoard,
	GameControls,
	NumberPad,
} from '@/src/components/game'
import {
	createGameState,
	formatElapsed,
	gameReducer,
	getCampaignTierLabel,
	getFillProgress,
	getGameSourceTitle,
	type GameSource,
} from '@/src/features/game'
import { useTheme } from '@/src/theme'

export type GameScreenProps = {
	readonly source: GameSource
}

/**
 * Reusable playable CrossMath session.
 * Remount via React `key` when source/level changes so the reducer resets cleanly.
 */
export function GameScreen({ source }: GameScreenProps) {
	const theme = useTheme()
	const { width: windowWidth, height: windowHeight } = useWindowDimensions()

	const campaignLevel = source.kind === 'campaign' ? source.level : 1

	const initialState = useMemo(() => {
		if (source.kind !== 'campaign') {
			throw new Error('Phase 3 only wires campaign gameplay')
		}
		// Generate once per mounted session — never inside render loops / timers.
		const profiled = generateCampaignPuzzle(campaignLevel)
		return createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source: { kind: 'campaign', level: campaignLevel },
			title: getGameSourceTitle({ kind: 'campaign', level: campaignLevel }),
			subtitle: getCampaignTierLabel(campaignLevel),
		})
	}, [campaignLevel, source.kind])

	const [state, dispatch] = useReducer(gameReducer, initialState)
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		if (state.status === 'completed') {
			return
		}
		const id = setInterval(() => {
			setNow(Date.now())
		}, 1000)
		return () => clearInterval(id)
	}, [state.status])

	const progress = getFillProgress(state)
	const elapsedMs = (state.completedAt ?? now) - state.startedAt

	const boardWidth = Math.max(280, windowWidth - 32)
	const boardHeight = Math.max(
		160,
		Math.min(windowHeight * 0.4, windowHeight - 380),
	)

	const handleNextLevel = useCallback(() => {
		if (source.kind !== 'campaign') {
			return
		}
		const nextLevel = Math.min(250, source.level + 1)
		router.replace({
			pathname: '/game',
			params: { source: 'campaign', level: String(nextLevel) },
		})
	}, [source])

	return (
		<SafeAreaView
			style={[styles.safe, { backgroundColor: theme.colors.background }]}
			edges={['left', 'right', 'bottom']}
		>
			<View style={styles.container}>
				<View style={styles.headerBlock}>
					<Text
						style={{
							color: theme.colors.text,
							...theme.typography.title,
						}}
					>
						{state.title}
					</Text>
					<Text
						style={{
							color: theme.colors.textSecondary,
							...theme.typography.caption,
						}}
					>
						{state.subtitle}
					</Text>
					<Text
						style={[
							styles.hud,
							{
								color: theme.colors.textSecondary,
								...theme.typography.caption,
							},
						]}
					>
						Заполнено {progress.filled} из {progress.total}
						{'  ·  '}
						{formatElapsed(elapsedMs)}
					</Text>
				</View>

				<View style={styles.boardArea}>
					<CrossMathBoard
						state={state}
						availableWidth={boardWidth}
						availableHeight={boardHeight}
						onSelectCell={(coordinate) => {
							dispatch({ type: 'SELECT_CELL', coordinate })
						}}
					/>
				</View>

				{state.status === 'completed' ? (
					<CompletionCard
						title={state.title}
						elapsedMs={elapsedMs}
						mistakes={state.mistakes}
						hintsUsed={state.hintsUsed}
						onNextLevel={
							source.kind === 'campaign' && source.level < 250
								? handleNextLevel
								: undefined
						}
						onHome={() => {
							router.replace('/')
						}}
					/>
				) : (
					<View style={styles.controls}>
						<GameControls
							canUndo={state.history.length > 0}
							onUndo={() => dispatch({ type: 'UNDO' })}
							onDelete={() => dispatch({ type: 'DELETE' })}
							onHint={() => dispatch({ type: 'HINT' })}
						/>
						<NumberPad
							onDigit={(digit) =>
								dispatch({ type: 'DIGIT', digit })
							}
							onDelete={() => dispatch({ type: 'DELETE' })}
							onConfirm={() => dispatch({ type: 'CONFIRM' })}
						/>
					</View>
				)}
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 8,
		gap: 12,
	},
	headerBlock: {
		gap: 2,
	},
	hud: {
		marginTop: 6,
	},
	boardArea: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 160,
	},
	controls: {
		gap: 10,
		paddingBottom: 4,
		transform: [{ translateY: -32 }],
	},
})
