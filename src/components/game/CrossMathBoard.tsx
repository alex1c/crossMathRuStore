import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CellCoordinate, CrossMathCell, Puzzle } from '@/src/core/crossmath'
import {
	coordinateKey,
	coordinatesEqual,
} from '@/src/core/crossmath'
import {
	DEFAULT_BOARD_SIZING,
	computeOccupiedBoardLayout,
	findRelatedCoordinates,
	getBlankDisplayValue,
	isBlankShowingError,
	toLogicalCoordinate,
	type GameState,
} from '@/src/features/game'
import { BoardCell, cellGlyph, type BoardCellVisual } from './BoardCell'

type CrossMathBoardProps = {
	readonly state: GameState
	readonly availableWidth: number
	readonly availableHeight: number
	readonly onSelectCell: (coordinate: CellCoordinate) => void
}

/**
 * Unified crossword grid.
 * Visual sizing uses the occupied bounding box; taps still emit logical coordinates.
 */
export function CrossMathBoard({
	state,
	availableWidth,
	availableHeight,
	onSelectCell,
}: CrossMathBoardProps) {
	const { puzzle } = state
	const layout = useMemo(
		() =>
			computeOccupiedBoardLayout(
				puzzle,
				availableWidth,
				availableHeight,
				DEFAULT_BOARD_SIZING,
			),
		[availableWidth, availableHeight, puzzle],
	)

	const cellMap = useMemo(() => buildCellMap(puzzle), [puzzle])
	const related = useMemo(
		() => findRelatedCoordinates(puzzle, state.selected),
		[puzzle, state.selected],
	)

	const rows: BoardCellVisual[][] = []
	for (let visualRow = 0; visualRow < layout.bounds.visualRows; visualRow += 1) {
		const line: BoardCellVisual[] = []
		for (
			let visualColumn = 0;
			visualColumn < layout.bounds.visualColumns;
			visualColumn += 1
		) {
			const logical = toLogicalCoordinate(
				{ row: visualRow, column: visualColumn },
				layout.bounds,
			)
			const key = coordinateKey(logical)
			const cell = cellMap.get(key)
			if (!cell) {
				line.push({ kind: 'absent' })
				continue
			}
			const selected =
				!!state.selected &&
				coordinatesEqual(state.selected, logical)
			const blankText =
				cell.kind === 'number' && cell.state === 'blank'
					? getBlankDisplayValue(state, logical)
					: ''
			const interactive =
				cell.kind === 'number' &&
				cell.state === 'blank' &&
				state.status === 'playing'
			line.push({
				kind: 'present',
				cell,
				displayText: cellGlyph(cell, blankText),
				selected,
				related: related.has(key),
				errored:
					cell.kind === 'number' &&
					cell.state === 'blank' &&
					isBlankShowingError(state, logical),
				interactive,
				accessibilityLabel: buildAccessibilityLabel(
					cell,
					blankText,
					selected,
				),
			})
		}
		rows.push(line)
	}

	return (
		<View
			style={[
				styles.board,
				{
					width: layout.boardWidth,
					height: layout.boardHeight,
					gap: DEFAULT_BOARD_SIZING.gap,
				},
			]}
		>
			{rows.map((line, visualRow) => (
				<View
					key={`row-${visualRow}`}
					style={[styles.row, { gap: DEFAULT_BOARD_SIZING.gap }]}
				>
					{line.map((visual, visualColumn) => {
						const logical = toLogicalCoordinate(
							{ row: visualRow, column: visualColumn },
							layout.bounds,
						)
						return (
							<BoardCell
								key={`${logical.row},${logical.column}`}
								visual={visual}
								size={layout.cellSize}
								onPress={
									visual.kind === 'present' &&
									visual.interactive
										? () => onSelectCell(logical)
										: undefined
								}
							/>
						)
					})}
				</View>
			))}
		</View>
	)
}

function buildCellMap(puzzle: Puzzle): Map<string, CrossMathCell> {
	const map = new Map<string, CrossMathCell>()
	for (const cell of puzzle.grid.cells) {
		map.set(coordinateKey(cell.coordinate), cell)
	}
	return map
}

function buildAccessibilityLabel(
	cell: CrossMathCell,
	blankText: string,
	selected: boolean,
): string {
	if (cell.kind === 'operator') {
		return `Оператор ${cellGlyph(cell, '')}`
	}
	if (cell.kind === 'equals') {
		return 'Знак равно'
	}
	if (cell.state === 'fixed') {
		return `Число ${cell.value}`
	}
	if (blankText === '') {
		return selected ? 'Пустая клетка, выбрана' : 'Пустая клетка'
	}
	return selected ? `Число ${blankText}, выбрано` : `Число ${blankText}`
}

const styles = StyleSheet.create({
	board: {
		alignSelf: 'center',
	},
	row: {
		flexDirection: 'row',
	},
})
