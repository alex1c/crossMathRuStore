import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
	AppState,
	type AppStateStatus,
	LayoutChangeEvent,
	Pressable,
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
import {
	CompletionCard,
	CrossMathBoard,
	GameBannerSlot,
	GameControls,
	NumberBankPad,
	NumberPad,
} from '@/src/components/game'
import {
	computeGameVerticalLayout,
	createSessionFromPersisted,
	createSessionFromSource,
	formatElapsed,
	buildCompletionPresentation,
	GAME_BANNER_RESERVED_HEIGHT,
	gameReducer,
	getFillProgress,
	getRemainingBankItems,
	type GameSource,
	type GameState,
} from '@/src/features/game'
import {
	createActiveTimer,
	getActiveElapsedMs,
	hydrateActiveTimer,
	pauseActiveTimer,
	resumeActiveTimer,
	useAppProgress,
	type ActiveTimerState,
} from '@/src/features/progress'
import {
	hapticEntry,
	hapticError,
	hapticSelection,
} from '@/src/features/feedback'
import { useTheme } from '@/src/theme'
import type { PersistedActiveSession, PersistedGameSource } from '@/src/services/persistence'

export type GameScreenProps = {
	readonly source: GameSource
	readonly resume?: boolean
}

const HEADER_FALLBACK = 58

/**
 * Reusable playable CrossMath session with keypad/bank modes + banner slot.
 */
export function GameScreen({ source, resume = false }: GameScreenProps) {
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const { width: windowWidth, height: windowHeight } = useWindowDimensions()
	const bottomPad = insets.bottom + 8
	const progress = useAppProgress()
	const {
		state: progressState,
		saveActiveSession,
		markTrackPlayed,
		completeTrackLevel,
		completeDaily,
		completeEndless,
		completeMultiplication,
		updateSettings,
	} = progress

	const initial = useMemo(() => {
		const showErrors = progress.state.settings.showErrorsImmediately
		if (resume && progress.state.activeSession) {
			return {
				game: createSessionFromPersisted(progress.state.activeSession, {
					showErrorsImmediately: showErrors,
				}),
				timer: hydrateActiveTimer(
					progress.state.activeSession.accumulatedActiveMs,
				),
			}
		}
		return {
			game: createSessionFromSource(source, {
				showErrorsImmediately: showErrors,
			}),
			timer: createActiveTimer(),
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount snapshot
	}, [source, resume])

	const [state, dispatch] = useReducer(gameReducer, initial.game)
	const [timer, setTimer] = useState<ActiveTimerState>(initial.timer)
	const [now, setNow] = useState(() => Date.now())
	const [contentSize, setContentSize] = useState({
		width: Math.max(280, windowWidth - 32),
		height: Math.max(320, windowHeight - 120),
	})
	const [headerHeight, setHeaderHeight] = useState(HEADER_FALLBACK)
	const [bankTipDismissed, setBankTipDismissed] = useState(
		progress.state.settings.bankTipSeen,
	)
	const stateRef = useRef(state)
	const timerRef = useRef(timer)
	const appStateRef = useRef<AppStateStatus>(AppState.currentState)
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		timerRef.current = timer
	}, [timer])

	useEffect(() => {
		if (state.status === 'completed') {
			return
		}
		const id = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(id)
	}, [state.status])

	const buildPersistedSession = useCallback(
		(game: GameState, activeTimer: ActiveTimerState): PersistedActiveSession | null => {
			if (game.status !== 'playing') {
				return null
			}
			if (
				game.source.kind !== 'track' &&
				game.source.kind !== 'daily' &&
				game.source.kind !== 'endless' &&
				game.source.kind !== 'multiplication'
			) {
				return null
			}
			const persistedSource: PersistedGameSource = game.source
			return {
				source: persistedSource,
				puzzle: game.puzzle,
				solution: {
					values: Object.entries(game.solutionByKey).map(([key, value]) => {
						const [row, column] = key.split(',').map(Number)
						return {
							coordinate: { row: row!, column: column! },
							value,
						}
					}),
				},
				entries: game.entries,
				selected: game.selected,
				mistakes: game.mistakes,
				hintsUsed: game.hintsUsed,
				hintedKeys: game.hintedKeys,
				accumulatedActiveMs: getActiveElapsedMs(activeTimer),
				status: 'playing',
				title: game.title,
				subtitle: game.subtitle,
				updatedAt: Date.now(),
				inputMode: game.inputMode,
				bankItems: game.bankItems,
				bankSeed: game.bankSeed,
			}
		},
		[],
	)

	const scheduleSave = useCallback(() => {
		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current)
		}
		saveTimerRef.current = setTimeout(() => {
			const session = buildPersistedSession(stateRef.current, timerRef.current)
			void saveActiveSession(session)
		}, 250)
	}, [buildPersistedSession, saveActiveSession])

	const persistTimerSnapshot = useCallback(
		(activeTimer: ActiveTimerState) => {
			const session = buildPersistedSession(stateRef.current, activeTimer)
			void saveActiveSession(session)
		},
		[buildPersistedSession, saveActiveSession],
	)

	useEffect(() => {
		const onChange = (status: AppStateStatus) => {
			if (stateRef.current.status === 'completed') {
				return
			}
			if (status === appStateRef.current) {
				return
			}
			appStateRef.current = status
			const previousTimer = timerRef.current
			const nextTimer =
				status === 'active'
					? resumeActiveTimer(previousTimer)
					: pauseActiveTimer(previousTimer)
			if (nextTimer === previousTimer) {
				return
			}
			timerRef.current = nextTimer
			setTimer(nextTimer)
			persistTimerSnapshot(nextTimer)
		}
		const sub = AppState.addEventListener('change', onChange)
		return () => sub.remove()
	}, [persistTimerSnapshot])

	useEffect(() => {
		if (state.status === 'playing') {
			scheduleSave()
		}
	}, [state.entries, state.mistakes, state.hintsUsed, state.selected, state.status, scheduleSave])

	useEffect(() => {
		if (source.kind === 'track') {
			void markTrackPlayed(source.track, source.level)
		}
	}, [source, markTrackPlayed])

	const fill = getFillProgress(state)
	const elapsedMs =
		state.status === 'completed'
			? getActiveElapsedMs(pauseActiveTimer(timer, now), now)
			: getActiveElapsedMs(timer, now)

	const remainingBank = useMemo(
		() => getRemainingBankItems(state),
		[state],
	)

	const vertical = useMemo(
		() =>
			computeGameVerticalLayout({
				availableWidth: contentSize.width,
				availableHeight: Math.max(200, contentSize.height),
				headerHeight,
				sectionGap: 8,
				bannerReservedHeight: GAME_BANNER_RESERVED_HEIGHT,
				bannerGap: 8,
				inputMode: state.inputMode,
				bankItemCount: Math.max(state.bankItems.length, remainingBank.length, 8),
			}),
		[
			contentSize.width,
			contentSize.height,
			headerHeight,
			state.inputMode,
			state.bankItems.length,
			remainingBank.length,
		],
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

	const finalizeCompletion = useCallback(async () => {
		const frozen = pauseActiveTimer(timerRef.current)
		setTimer(frozen)
		const elapsed = getActiveElapsedMs(frozen)
		const game = stateRef.current
		await saveActiveSession(null)
		try {
			if (game.source.kind === 'track') {
				await completeTrackLevel(game.source.track, {
					level: game.source.level,
					elapsedMs: elapsed,
					mistakes: game.mistakes,
					hintsUsed: game.hintsUsed,
					completedAt: Date.now(),
				})
			} else if (game.source.kind === 'daily') {
				await completeDaily({
					dateKey: game.source.dateKey,
					elapsedMs: elapsed,
					mistakes: game.mistakes,
					hintsUsed: game.hintsUsed,
					completedAt: Date.now(),
				})
			} else if (game.source.kind === 'endless') {
				await completeEndless({
					elapsedMs: elapsed,
					mistakes: game.mistakes,
					hintsUsed: game.hintsUsed,
				})
			} else if (game.source.kind === 'multiplication') {
				await completeMultiplication(game.source.table, {
					mistakes: game.mistakes,
					hintsUsed: game.hintsUsed,
				})
			}
		} catch {
			// Persistence errors must not crash the completion UI.
		}
	}, [
		completeTrackLevel,
		completeDaily,
		completeEndless,
		completeMultiplication,
		saveActiveSession,
	])

	const completedOnceRef = useRef(false)

	useEffect(() => {
		if (state.status === 'completed' && !completedOnceRef.current) {
			completedOnceRef.current = true
			void finalizeCompletion()
		}
	}, [state.status, finalizeCompletion])

	const handleNext = useCallback(() => {
		if (source.kind === 'track' && source.level < 50) {
			router.replace({
				pathname: '/game',
				params: {
					source: 'track',
					track: source.track,
					level: String(source.level + 1),
				},
			})
			return
		}
		if (source.kind === 'endless') {
			const nextCount = progressState.endless.completedCount
			router.replace({
				pathname: '/game',
				params: {
					source: 'endless',
					completed: String(nextCount),
				},
			})
			return
		}
		if (source.kind === 'multiplication') {
			router.replace({
				pathname: '/game',
				params: {
					source: 'multiplication',
					table: String(source.table),
					sequence: String(source.sequence + 1),
				},
			})
			return
		}
		router.replace('/')
	}, [source, progressState.endless.completedCount])

	const nextPresentation = buildCompletionPresentation({
		source,
		endlessCompletedCount: progressState.endless.completedCount,
		dailyStreak: progress.streakCurrent,
	})

	const showBankTip =
		state.inputMode === 'bank' &&
		!bankTipDismissed &&
		state.status === 'playing'

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
							Заполнено {fill.filled} из {fill.total}
							{'  ·  '}
							{formatElapsed(elapsedMs)}
						</Text>
						{showBankTip ? (
							<Pressable
								accessibilityRole="button"
								onPress={() => {
									setBankTipDismissed(true)
									void updateSettings({ bankTipSeen: true })
								}}
								style={[
									styles.tip,
									{
										backgroundColor: theme.colors.selectedCell,
										borderColor: theme.colors.border,
									},
								]}
							>
								<Text
									style={{
										color: theme.colors.text,
										...theme.typography.caption,
									}}
								>
									Выберите пустую клетку, затем подходящее число.
									Не все числа обязательно понадобятся.
								</Text>
							</Pressable>
						) : null}
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
								hapticSelection()
								dispatch({ type: 'SELECT_CELL', coordinate })
							}}
						/>
					</View>

					{state.status === 'completed' ? (
						<View style={{ maxHeight: vertical.completionMaxHeight }}>
							<CompletionCard
								title={state.title}
								detail={nextPresentation.detail}
								elapsedMs={elapsedMs}
								mistakes={state.mistakes}
								hintsUsed={state.hintsUsed}
								onNextLevel={
									nextPresentation.showNext ? handleNext : undefined
								}
								nextLabel={nextPresentation.nextLabel ?? undefined}
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
								onHint={() => {
									hapticEntry()
									dispatch({ type: 'HINT' })
								}}
							/>
							{state.inputMode === 'bank' ? (
								<NumberBankPad
									remainingItems={remainingBank}
									touchHeight={vertical.controls.touchHeight}
									rowGap={vertical.controls.rowGap}
									onSelect={(item) => {
										hapticSelection()
										const beforeMistakes = stateRef.current.mistakes
										dispatch({ type: 'PLACE_BANK', value: item.value })
										setTimeout(() => {
											const after = stateRef.current
											if (after.mistakes > beforeMistakes) {
												hapticError()
											} else {
												hapticEntry()
											}
										}, 0)
									}}
								/>
							) : (
								<NumberPad
									touchHeight={vertical.controls.touchHeight}
									rowGap={vertical.controls.rowGap}
									onDigit={(digit) => {
										hapticSelection()
										dispatch({ type: 'DIGIT', digit })
									}}
									onDelete={() => dispatch({ type: 'DELETE' })}
									onConfirm={() => {
										const beforeMistakes = stateRef.current.mistakes
										dispatch({ type: 'CONFIRM' })
										setTimeout(() => {
											const after = stateRef.current
											if (after.mistakes > beforeMistakes) {
												hapticError()
											} else {
												hapticEntry()
											}
										}, 0)
									}}
								/>
							)}
						</View>
					)}

					<View style={{ height: vertical.bannerGap }} />
					<GameBannerSlot height={vertical.bannerReservedHeight} />
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 4,
	},
	inner: { flex: 1 },
	headerBlock: { gap: 1 },
	boardArea: {
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	controls: {
		justifyContent: 'flex-start',
	},
	tip: {
		marginTop: 6,
		padding: 8,
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
	},
})
