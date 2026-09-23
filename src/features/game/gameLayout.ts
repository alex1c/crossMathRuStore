/**
 * Pure vertical GameScreen allocation — header / board / controls.
 * Guarantees controls (including the last keypad row) fit above the bottom inset.
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
	 * Inner content height available for header + board + controls.
	 * Caller must already subtract bottom safe-area padding.
	 */
	readonly availableHeight: number
	/** Measured or estimated header/status block height. */
	readonly headerHeight: number
	/** Vertical gaps between header/board and board/controls. */
	readonly sectionGap?: number
}

export type GameVerticalLayout = {
	readonly headerHeight: number
	readonly sectionGap: number
	readonly boardAreaWidth: number
	readonly boardAreaHeight: number
	readonly controls: ControlMetrics
	readonly completionMaxHeight: number
	readonly totalHeight: number
	readonly fits: boolean
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

/**
 * Height of the secondary actions + number pad block for given metrics.
 */
export function computeControlsHeight(
	touchHeight: number,
	rowGap: number,
	sectionGap: number = rowGap,
): number {
	// Gaps: sectionGap between action and pad, plus (PAD_ROWS - 1) pad gaps.
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
 * Allocate GameScreen vertical space so keypad never leaves the viewport.
 * Board receives the leftover height after fitted controls + header.
 */
export function computeGameVerticalLayout(
	input: GameVerticalLayoutInput,
): GameVerticalLayout {
	const sectionGap = input.sectionGap ?? 8
	const headerHeight = Math.max(0, Math.ceil(input.headerHeight))
	const boardAreaWidth = Math.max(0, Math.floor(input.availableWidth))
	const availableHeight = Math.max(0, Math.floor(input.availableHeight))

	const candidates: { touch: number; gap: number }[] = [
		{ touch: CONTROL_TOUCH.comfortable, gap: CONTROL_ROW_GAP.comfortable },
		{ touch: CONTROL_TOUCH.compact, gap: CONTROL_ROW_GAP.compact },
		{ touch: CONTROL_TOUCH.minimum, gap: CONTROL_ROW_GAP.minimum },
	]

	const minBoard = 120
	const gapsAroundBoard = sectionGap * 2

	let chosen = buildControlMetrics(
		CONTROL_TOUCH.minimum,
		CONTROL_ROW_GAP.minimum,
	)
	let boardAreaHeight = 0

	for (const candidate of candidates) {
		const controls = buildControlMetrics(candidate.touch, candidate.gap)
		const remaining =
			availableHeight - headerHeight - gapsAroundBoard - controls.totalHeight
		if (remaining >= minBoard) {
			chosen = controls
			boardAreaHeight = remaining
			break
		}
		chosen = controls
		boardAreaHeight = remaining
	}

	// Last resort: keep minimum controls, give board whatever remains (may be < minBoard).
	if (boardAreaHeight < minBoard) {
		chosen = buildControlMetrics(
			CONTROL_TOUCH.minimum,
			CONTROL_ROW_GAP.minimum,
		)
		boardAreaHeight = Math.max(
			80,
			availableHeight - headerHeight - gapsAroundBoard - chosen.totalHeight,
		)
	}

	const totalHeight =
		headerHeight +
		gapsAroundBoard +
		boardAreaHeight +
		chosen.totalHeight

	return {
		headerHeight,
		sectionGap,
		boardAreaWidth,
		boardAreaHeight,
		controls: chosen,
		// Completion replaces controls — allow at least control budget, cap to leftover.
		completionMaxHeight: Math.max(chosen.totalHeight, boardAreaHeight * 0.55),
		totalHeight,
		fits: totalHeight <= availableHeight + 1,
	}
}
