import type {
	CellCoordinate,
	CrossMathCell,
	Equation,
	EquationCellCoordinates,
	Puzzle,
} from './types'

export function coordinateKey(coordinate: CellCoordinate): string {
	return `${coordinate.row},${coordinate.column}`
}

export function coordinatesEqual(a: CellCoordinate, b: CellCoordinate): boolean {
	return a.row === b.row && a.column === b.column
}

export function equationNumberCoordinates(
	equation: Equation,
): readonly [CellCoordinate, CellCoordinate, CellCoordinate] {
	return [equation.cells[0], equation.cells[2], equation.cells[4]]
}

export function equationOperatorCoordinate(equation: Equation): CellCoordinate {
	return equation.cells[1]
}

export function equationEqualsCoordinate(equation: Equation): CellCoordinate {
	return equation.cells[3]
}

export function getCell(puzzle: Puzzle, coordinate: CellCoordinate): CrossMathCell | undefined {
	return puzzle.grid.cells.find(
		(cell) => coordinatesEqual(cell.coordinate, coordinate),
	)
}

export function coordinateIsInGrid(
	coordinate: CellCoordinate,
	rows: number,
	columns: number,
): boolean {
	return (
		Number.isInteger(coordinate.row) &&
		Number.isInteger(coordinate.column) &&
		coordinate.row >= 0 &&
		coordinate.row < rows &&
		coordinate.column >= 0 &&
		coordinate.column < columns
	)
}

export function equationPath(
	row: number,
	column: number,
	direction: Equation['direction'],
): EquationCellCoordinates {
	const deltaRow = direction === 'vertical' ? 1 : 0
	const deltaColumn = direction === 'horizontal' ? 1 : 0
	return [0, 1, 2, 3, 4].map((offset) => ({
		row: row + deltaRow * offset,
		column: column + deltaColumn * offset,
	})) as unknown as EquationCellCoordinates
}
