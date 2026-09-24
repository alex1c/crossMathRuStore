/**
 * One-shot Phase 5.6 representative track timing audit (not a jest suite).
 */
import { loadTrackPuzzle } from '../src/core/crossmath/trackGeneration'
import { generateMultiplicationTablePuzzle } from '../src/core/crossmath'

const tracks = ['easy', 'medium', 'hard', 'lobachevsky'] as const
const levels = [1, 25, 50] as const

for (const track of tracks) {
	for (const level of levels) {
		const started = Date.now()
		const payload = loadTrackPuzzle(track, level)
		const ms = Date.now() - started
		const puzzle = payload.puzzle
		const occupied = {
			rows: puzzle.grid.rows,
			columns: puzzle.grid.columns,
		}
		// eslint-disable-next-line no-console
		console.log(
			JSON.stringify({
				track,
				level,
				loadMs: ms,
				metricsLoadMs: payload.metrics.loadMs,
				equations: payload.metrics.equationCount,
				blanks: payload.metrics.blankCount,
				density: payload.metrics.occupiedDensity,
				score: payload.metrics.score,
				inputMode: payload.inputMode,
				bankSize: payload.bank?.items.length ?? 0,
				grid: occupied,
				catalogVersion: payload.catalogVersion,
			}),
		)
	}
}

for (const table of [2, 7, 'mixed'] as const) {
	const started = Date.now()
	const profiled = generateMultiplicationTablePuzzle(table, `audit-${table}`)
	const ms = Date.now() - started
	const blanks = profiled.generated.puzzle.grid.cells.filter(
		(cell) => cell.kind === 'number' && cell.state === 'blank',
	).length
	// eslint-disable-next-line no-console
	console.log(
		JSON.stringify({
			mode: 'multiplication',
			table,
			loadMs: ms,
			equations: profiled.generated.puzzle.equations.length,
			blanks,
		}),
	)
}
