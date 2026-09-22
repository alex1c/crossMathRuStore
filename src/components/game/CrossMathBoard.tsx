import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CellCoordinate, CrossMathCell, Puzzle } from '@/src/core/crossmath'
import {
	coordinateKey,
	coordinatesEqual,
} from '@/src/core/crossmath'
import {
	DEFAULT_BOARD_SIZING,
	computeBoardLayout,
	findRelatedCoordinates,
	getBlankDisplayValue,
	isBlankShowingError,
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
 * Unified crossword grid driven by core coordinates (not separate equation strips).
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
			computeBoardLayout({
				availableWidth,
				availableHeight,
				rows: puzzle.grid.rows,
				columns: puzzle.grid.columns,
				gap: DEFAULT_BOARD_SIZING.gap,
				minCellSize: DEFAULT_BOARD_SIZING.minCellSize,
				maxCellSize: DEFAULT_BOARD_SIZING.maxCellSize,
			}),
		[
			availableWidth,
			availableHeight,
			puzzle.grid.rows,
			puzzle.grid.columns,
		],
	)

	const cellMap = useMemo(() => buildCellMap(puzzle), [puzzle])
	const related = useMemo(
		() => findRelatedCoordinates(puzzle, state.selected),
		[puzzle, state.selected],
	)

	const rows: BoardCellVisual[][] = []
	for (let row = 0; row < puzzle.grid.rows; row += 1) {
		const line: BoardCellVisual[] = []
		for (let column = 0; column < puzzle.grid.columns; column += 1) {
			const coordinate = { row, column }
			const key = coordinateKey(coordinate)
			const cell = cellMap.get(key)
			if (!cell) {
				line.push({ kind: 'absent' })
				continue
			}
			const selected =
				!!state.selected &&
				coordinatesEqual(state.selected, coordinate)
			const blankText =
				cell.kind === 'number' && cell.state === 'blank'
					? getBlankDisplayValue(state, coordinate)
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
					isBlankShowingError(state, coordinate),
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
			{rows.map((line, rowIndex) => (
				<View
					key={`row-${rowIndex}`}
					style={[styles.row, { gap: DEFAULT_BOARD_SIZING.gap }]}
				>
					{line.map((visual, columnIndex) => {
						const coordinate = {
							row: rowIndex,
							column: columnIndex,
						}
						return (
							<BoardCell
								key={`${rowIndex},${columnIndex}`}
								visual={visual}
								size={layout.cellSize}
								onPress={
									visual.kind === 'present' &&
									visual.interactive
										? () => onSelectCell(coordinate)
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
