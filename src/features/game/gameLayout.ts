/**
 * Pure vertical GameScreen allocation — header / board / controls / banner.
 * Guarantees keypad + reserved banner stay above the bottom inset.
 */

export type ControlMetrics = {
	/** Height of action-row and keypad buttons. */
	readonly touchHeight: number
	/** Vertical gap between control rows. */
	readonly rowGap: number
	/** Gap between action row and number pad. */
	readonly sectionGap: number
	/** Total height of action row + 4 keypad rows + gaps. */
	readonly totalHeight: number
}

export type GameVerticalLayoutInput = {
	/** Inner content width (already excluding horizontal page padding). */
	readonly availableWidth: number
	/**
	 * Inner content height available for header + board + controls + banner.
	 * Caller must already subtract bottom safe-area padding.
	 */
	readonly availableHeight: number
	/** Measured or estimated header/status block height. */
	readonly headerHeight: number
	/** Vertical gaps between header/board and board/controls. */
	readonly sectionGap?: number
	/**
	 * Reserved sticky banner height above the bottom inset.
	 * Must be part of the allocation — never appended after fitting.
	 */
	readonly bannerReservedHeight?: number
	/** Gap between controls and banner. */
	readonly bannerGap?: number
}

export type GameVerticalLayout = {
	readonly headerHeight: number
	readonly sectionGap: number
	readonly boardAreaWidth: number
	readonly boardAreaHeight: number
	readonly controls: ControlMetrics
	readonly bannerReservedHeight: number
	readonly bannerGap: number
	readonly completionMaxHeight: number
	readonly totalHeight: number
	readonly fits: boolean
	readonly fallback: 'none' | 'compact-controls' | 'minimum-board'
}

const ACTION_ROWS = 1
const PAD_ROWS = 4
const CONTROL_ROWS = ACTION_ROWS + PAD_ROWS

/** Comfortable defaults; shrink toward min under height pressure. */
export const CONTROL_TOUCH = {
	comfortable: 48,
	compact: 44,
	minimum: 40,
} as const

export const CONTROL_ROW_GAP = {
	comfortable: 8,
	compact: 6,
	minimum: 4,
} as const

/** Realistic sticky mobile banner reservation (no Ad SDK yet). */
export const GAME_BANNER_RESERVED_HEIGHT = 50

/**
 * Height of the secondary actions + number pad block for given metrics.
 */
export function computeControlsHeight(
	touchHeight: number,
	rowGap: number,
	sectionGap: number = rowGap,
): number {
	const gaps = sectionGap + Math.max(0, PAD_ROWS - 1) * rowGap
	return CONTROL_ROWS * touchHeight + gaps
}

function buildControlMetrics(
	touchHeight: number,
	rowGap: number,
): ControlMetrics {
	const sectionGap = rowGap
	return {
		touchHeight,
		rowGap,
		sectionGap,
		totalHeight: computeControlsHeight(touchHeight, rowGap, sectionGap),
	}
}

/**
 * Allocate GameScreen vertical space so keypad + banner never leave the viewport.
 * Priority: safe area (caller) → banner slot → compact controls → shrink board.
 */
export function computeGameVerticalLayout(
	input: GameVerticalLayoutInput,
): GameVerticalLayout {
	const sectionGap = input.sectionGap ?? 8
	const bannerReservedHeight = Math.max(
		0,
		Math.floor(input.bannerReservedHeight ?? GAME_BANNER_RESERVED_HEIGHT),
	)
	const bannerGap = bannerReservedHeight > 0 ? (input.bannerGap ?? 8) : 0
	const headerHeight = Math.max(0, Math.ceil(input.headerHeight))
	const boardAreaWidth = Math.max(0, Math.floor(input.availableWidth))
	const availableHeight = Math.max(0, Math.floor(input.availableHeight))

	const bannerBlock = bannerReservedHeight + bannerGap
	const gapsAroundBoard = sectionGap * 2
	const fixedSansControls =
		headerHeight + gapsAroundBoard + bannerBlock

	const candidates: { touch: number; gap: number }[] = [
		{ touch: CONTROL_TOUCH.comfortable, gap: CONTROL_ROW_GAP.comfortable },
		{ touch: CONTROL_TOUCH.compact, gap: CONTROL_ROW_GAP.compact },
		{ touch: CONTROL_TOUCH.minimum, gap: CONTROL_ROW_GAP.minimum },
	]

	const minBoard = 120
	const absoluteMinBoard = 80

	let chosen = buildControlMetrics(
		CONTROL_TOUCH.minimum,
		CONTROL_ROW_GAP.minimum,
	)
	let boardAreaHeight = 0
	let fallback: GameVerticalLayout['fallback'] = 'none'

	for (const candidate of candidates) {
		const controls = buildControlMetrics(candidate.touch, candidate.gap)
		const remaining =
			availableHeight - fixedSansControls - controls.totalHeight
		if (remaining >= minBoard) {
			chosen = controls
			boardAreaHeight = remaining
			fallback =
				candidate.touch < CONTROL_TOUCH.comfortable
					? 'compact-controls'
					: 'none'
			break
		}
		chosen = controls
		boardAreaHeight = remaining
		fallback = 'compact-controls'
	}

	if (boardAreaHeight < minBoard) {
		chosen = buildControlMetrics(
			CONTROL_TOUCH.minimum,
			CONTROL_ROW_GAP.minimum,
		)
		boardAreaHeight = Math.max(
			absoluteMinBoard,
			availableHeight - fixedSansControls - chosen.totalHeight,
		)
		fallback = 'minimum-board'
	}

	const totalHeight =
		headerHeight +
		gapsAroundBoard +
		boardAreaHeight +
		chosen.totalHeight +
		bannerBlock

	return {
		headerHeight,
		sectionGap,
		boardAreaWidth,
		boardAreaHeight,
		controls: chosen,
		bannerReservedHeight,
		bannerGap,
		completionMaxHeight: Math.max(
			chosen.totalHeight,
			boardAreaHeight * 0.55,
		),
		totalHeight,
		fits: totalHeight <= availableHeight + 1,
		fallback,
	}
}
