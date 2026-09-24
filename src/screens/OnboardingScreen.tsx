/**
 * Interactive first-launch / replayable tutorial screen.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
	LayoutChangeEvent,
	Pressable,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context'
import { BannerSlot } from '@/src/components'
import { CrossMathBoard, NumberPad } from '@/src/components/game'
import {
	computeGameVerticalLayout,
	createGameState,
	gameReducer,
	GAME_BANNER_RESERVED_HEIGHT,
} from '@/src/features/game'
import {
	TUTORIAL_BLANK,
	TUTORIAL_PUZZLE,
	TUTORIAL_SOLUTION,
	advanceAfterEntry,
	advanceAfterSelect,
	advanceFromCrossing,
	getTutorialStep,
	type TutorialStepId,
} from '@/src/features/onboarding'
import { useAppProgress } from '@/src/features/progress'
import { hapticEntry, hapticSelection } from '@/src/features/feedback'
import { trackAnalyticsEvent } from '@/src/services/analytics'
import { useTheme } from '@/src/theme'

const HEADER_FALLBACK = 96

/**
 * Shared interactive onboarding — skippable, replayable, no ads / notifications.
 */
export function OnboardingScreen() {
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const { width: windowWidth, height: windowHeight } = useWindowDimensions()
	const progress = useAppProgress()
	const params = useLocalSearchParams<{ replay?: string }>()
	const isReplay =
		(Array.isArray(params.replay) ? params.replay[0] : params.replay) === '1'

	const [step, setStep] = useState<TutorialStepId>('select')
	const [state, dispatch] = useReducer(
		gameReducer,
		undefined,
		() =>
			createGameState({
				puzzle: TUTORIAL_PUZZLE,
				solution: TUTORIAL_SOLUTION,
				source: { kind: 'tutorial' },
				title: 'Обучение',
				subtitle: 'Мини-кроссворд',
				selected: null,
				showErrorsImmediately: true,
			}),
	)
	const [contentSize, setContentSize] = useState({
		width: Math.max(280, windowWidth - 32),
		height: Math.max(360, windowHeight - 160),
	})
	const [headerHeight, setHeaderHeight] = useState(HEADER_FALLBACK)

	const stepInfo = getTutorialStep(step)
	const bottomPad = insets.bottom + 8

	const vertical = useMemo(
		() =>
			computeGameVerticalLayout({
				availableWidth: contentSize.width,
				availableHeight: Math.max(200, contentSize.height),
				headerHeight,
				sectionGap: 8,
				bannerReservedHeight: GAME_BANNER_RESERVED_HEIGHT,
				bannerGap: 8,
			}),
		[contentSize.width, contentSize.height, headerHeight],
	)

	useEffect(() => {
		trackAnalyticsEvent('onboarding_started')
	}, [])

	const finish = useCallback(async (outcome: 'completed' | 'skipped') => {
		if (!isReplay) {
			await progress.updateSettings({ onboardingCompleted: true })
		}
		trackAnalyticsEvent(
			outcome === 'skipped' ? 'onboarding_skipped' : 'onboarding_completed',
		)
		router.replace('/')
	}, [isReplay, progress])

	const handleSkip = useCallback(() => {
		void finish('skipped')
	}, [finish])

	const handleSelect = useCallback(
		(coordinate: Parameters<typeof advanceAfterSelect>[1]) => {
			hapticSelection()
			dispatch({ type: 'SELECT_CELL', coordinate })
			setStep((prev) => advanceAfterSelect(prev, coordinate))
		},
		[],
	)

	const handleConfirm = useCallback(() => {
		if (!state.selected || state.draft === '') {
			dispatch({ type: 'CONFIRM' })
			return
		}
		const value = Number(state.draft)
		const coordinate = state.selected
		dispatch({ type: 'CONFIRM' })
		hapticEntry()
		if (Number.isSafeInteger(value)) {
			setStep((prev) => advanceAfterEntry(prev, coordinate, value))
		}
	}, [state.draft, state.selected])

	const coachCoordinate =
		step === 'select' || step === 'enter' || step === 'crossing'
			? TUTORIAL_BLANK
			: null

	const padEnabled = step === 'enter'

	return (
		<SafeAreaView
			style={[styles.safe, { backgroundColor: theme.colors.background }]}
			edges={['left', 'right', 'top']}
		>
			<View style={[styles.container, { paddingBottom: bottomPad }]}>
				<View
					style={styles.inner}
					onLayout={(event: LayoutChangeEvent) => {
						const { width, height } = event.nativeEvent.layout
						setContentSize((prev) =>
							prev.width === width && prev.height === height
								? prev
								: { width, height },
						)
					}}
				>
					<View
						style={styles.header}
						onLayout={(event: LayoutChangeEvent) => {
							const next = Math.ceil(event.nativeEvent.layout.height)
							setHeaderHeight((prev) => (prev === next ? prev : next))
						}}
					>
						<View style={styles.headerRow}>
							<Text
								style={{
									color: theme.colors.text,
									...theme.typography.title,
									flex: 1,
								}}
							>
								{stepInfo.title}
							</Text>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Пропустить обучение"
								onPress={handleSkip}
								hitSlop={8}
							>
								<Text
									style={{
										color: theme.colors.textSecondary,
										...theme.typography.caption,
									}}
								>
									Пропустить
								</Text>
							</Pressable>
						</View>
						<Text
							style={{
								color: theme.colors.textSecondary,
								...theme.typography.body,
								marginTop: 4,
							}}
						>
							{stepInfo.body}
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
							onSelectCell={handleSelect}
							coachCoordinate={coachCoordinate}
							forceRelated={step === 'crossing' || step === 'enter'}
						/>
					</View>

					{step === 'crossing' || step === 'done' ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								step === 'done' ? 'На главную' : 'Далее'
							}
							onPress={() => {
								if (step === 'crossing') {
									setStep(advanceFromCrossing(step))
									return
								}
								void finish('completed')
							}}
							style={({ pressed }) => [
								styles.cta,
								{
									backgroundColor: theme.colors.primary,
									opacity: pressed ? 0.85 : 1,
									minHeight: theme.touchTarget.min,
								},
							]}
						>
							<Text
								style={{
									color: theme.colors.textOnPrimary,
									...theme.typography.bodyStrong,
								}}
							>
								{step === 'done' ? 'На главную' : 'Далее'}
							</Text>
						</Pressable>
					) : (
						<View
							style={{
								height: vertical.controls.totalHeight,
								opacity: padEnabled ? 1 : 0.45,
							}}
							pointerEvents={padEnabled ? 'auto' : 'none'}
						>
							<NumberPad
								touchHeight={vertical.controls.touchHeight}
								rowGap={vertical.controls.rowGap}
								onDigit={(digit) => {
									hapticSelection()
									dispatch({ type: 'DIGIT', digit })
								}}
								onDelete={() => dispatch({ type: 'DELETE' })}
								onConfirm={handleConfirm}
							/>
						</View>
					)}

					<View style={{ height: vertical.bannerGap }} />
					<BannerSlot placement="training" />
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
	header: { gap: 2 },
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	boardArea: {
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	cta: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
})
