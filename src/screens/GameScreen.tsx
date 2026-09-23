import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
	LayoutChangeEvent,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { generateCampaignPuzzle } from '@/src/core/crossmath'
import {
	CompletionCard,
	CrossMathBoard,
	GameControls,
	NumberPad,
} from '@/src/components/game'
import {
	computeGameVerticalLayout,
	createGameState,
	formatElapsed,
	gameReducer,
	getCampaignTierLabel,
	getFillProgress,
	getGameSourceTitle,
	MULTI_DIGIT_DEV_FIXTURE,
	type GameSource,
} from '@/src/features/game'
import { useTheme } from '@/src/theme'

export type GameScreenProps = {
	readonly source: GameSource
}

/** Compact header estimate used until onLayout reports the real size. */
const HEADER_FALLBACK = 58

/**
 * Reusable playable CrossMath session.
 * Remount via React `key` when source/level changes so the reducer resets cleanly.
 *
 * Vertical layout is calculated explicitly so the keypad cannot overflow the
 * viewport; the board uses leftover height with occupied-bounds sizing.
 */
export function GameScreen({ source }: GameScreenProps) {
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const { width: windowWidth, height: windowHeight } = useWindowDimensions()
	const bottomPad = insets.bottom + 16

	const campaignLevel = source.kind === 'campaign' ? source.level : 1

	const initialState = useMemo(() => {
		if (source.kind === 'dev-fixture') {
			return createGameState({
				puzzle: MULTI_DIGIT_DEV_FIXTURE.puzzle,
				solution: MULTI_DIGIT_DEV_FIXTURE.solution,
				source,
				title: getGameSourceTitle(source),
				subtitle: 'DEV-only: 12 + 6 = 18',
			})
		}
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
	}, [campaignLevel, source])

	const [state, dispatch] = useReducer(gameReducer, initialState)
	const [now, setNow] = useState(() => Date.now())
	const [contentSize, setContentSize] = useState({
		width: Math.max(280, windowWidth - 32),
		// Stack header sits above this screen; reserve a modest estimate until layout.
		height: Math.max(320, windowHeight - 120),
	})
	const [headerHeight, setHeaderHeight] = useState(HEADER_FALLBACK)

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

	const vertical = useMemo(
		() =>
			computeGameVerticalLayout({
				availableWidth: contentSize.width,
				availableHeight: Math.max(200, contentSize.height),
				headerHeight,
				sectionGap: 8,
			}),
		[contentSize.width, contentSize.height, headerHeight],
	)

	const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout
		setContentSize((prev) =>
			prev.width === width && prev.height === height
				? prev
				: { width, height },
		)
	}, [])

	const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
		const next = Math.ceil(event.nativeEvent.layout.height)
		setHeaderHeight((prev) => (prev === next ? prev : next))
	}, [])

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
			edges={['left', 'right']}
		>
			<View style={[styles.container, { paddingBottom: bottomPad }]}>
				<View style={styles.inner} onLayout={handleContentLayout}>
					<View style={styles.headerBlock} onLayout={handleHeaderLayout}>
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
							style={{
								marginTop: 4,
								color: theme.colors.textSecondary,
								...theme.typography.caption,
							}}
						>
							Заполнено {progress.filled} из {progress.total}
							{'  ·  '}
							{formatElapsed(elapsedMs)}
						</Text>
					</View>

					<View
						style={[
							styles.boardArea,
							{
								height: vertical.boardAreaHeight,
								marginTop: vertical.sectionGap,
								marginBottom: vertical.sectionGap,
							},
						]}
					>
						<CrossMathBoard
							state={state}
							availableWidth={vertical.boardAreaWidth}
							availableHeight={vertical.boardAreaHeight}
							onSelectCell={(coordinate) => {
								dispatch({ type: 'SELECT_CELL', coordinate })
							}}
						/>
					</View>

					{state.status === 'completed' ? (
						<View
							style={{
								maxHeight: Math.max(
									vertical.controls.totalHeight,
									vertical.boardAreaHeight * 0.7,
								),
							}}
						>
							<CompletionCard
								title={state.title}
								elapsedMs={elapsedMs}
								mistakes={state.mistakes}
								hintsUsed={state.hintsUsed}
								onNextLevel={
									source.kind === 'campaign' &&
									source.level < 250
										? handleNextLevel
										: undefined
								}
								onHome={() => {
									router.replace('/')
								}}
							/>
						</View>
					) : (
						<View
							style={[
								styles.controls,
								{
									height: vertical.controls.totalHeight,
									gap: vertical.controls.sectionGap,
								},
							]}
						>
							<GameControls
								canUndo={state.history.length > 0}
								touchHeight={vertical.controls.touchHeight}
								rowGap={vertical.controls.rowGap}
								onUndo={() => dispatch({ type: 'UNDO' })}
								onDelete={() => dispatch({ type: 'DELETE' })}
								onHint={() => dispatch({ type: 'HINT' })}
							/>
							<NumberPad
								touchHeight={vertical.controls.touchHeight}
								rowGap={vertical.controls.rowGap}
								onDigit={(digit) =>
									dispatch({ type: 'DIGIT', digit })
								}
								onDelete={() => dispatch({ type: 'DELETE' })}
								onConfirm={() => dispatch({ type: 'CONFIRM' })}
							/>
						</View>
					)}
				</View>
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
		paddingTop: 4,
	},
	inner: {
		flex: 1,
	},
	headerBlock: {
		gap: 1,
	},
	boardArea: {
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	controls: {
		justifyContent: 'flex-start',
	},
})
