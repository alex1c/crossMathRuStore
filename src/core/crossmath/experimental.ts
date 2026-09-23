/**
 * Phase 5.5 research surface.
 *
 * This module is intentionally additive: production campaign, persistence,
 * and GameScreen continue to use the binary Puzzle contract from types.ts.
 * Everything here is plain JSON-friendly data and can be removed or promoted
 * independently after the gameplay research decision.
 */

import { assertArithmeticConfig, evaluateArithmetic, operatorSymbol } from './arithmetic'
import { analyzeDifficulty } from './difficulty'
import { generatePuzzle } from './generator'
import { coordinateKey, equationNumberCoordinates, equationPath } from './model'
import { deriveSeed, SeededRandom } from './rng'
import { countSolutions } from './solver'
import { validatePuzzle } from './validator'
import type {
	ArithmeticConfig,
	ArithmeticOperator,
	CellCoordinate,
	CrossMathCell,
	Equation,
	GeneratedPuzzle,
	Puzzle,
	PuzzleGenerationConfig,
	PuzzleSolution,
	SolverResult,
} from './types'

export type ExperimentalTrack = 'easy' | 'medium' | 'hard' | 'lobachevsky'

export const EXPERIMENTAL_TRACK_LABELS: Readonly<Record<ExperimentalTrack, string>> = {
	easy: 'Просто',
	medium: 'Средне',
	hard: 'Сложно',
	lobachevsky: 'Лобачевский',
}

export const EXPERIMENTAL_GENERATOR_VERSION = 'phase5.5-binary-v1'

export type ExperimentalTrackProfile = {
	readonly id: string
	readonly track: ExperimentalTrack
	readonly label: string
	readonly levelWithinTrack: number
	readonly generatorVersion: string
	readonly scoreRange: { readonly min: number; readonly max: number }
	readonly minimumDensity: number
	readonly minimumCrossingRatio: number
	readonly config: Partial<PuzzleGenerationConfig>
	readonly maxCandidateAttempts: number
}

export type OccupiedDensityMetrics = {
	readonly occupiedCellCount: number
	readonly occupiedBoundingBoxArea: number
	readonly occupiedDensity: number
	readonly crossingCellCount: number
	readonly crossingRatio: number
	readonly numberCellCount: number
	readonly equationCount: number
}

export type ExperimentalTrackPuzzle = {
	readonly track: ExperimentalTrack
	readonly levelWithinTrack: number
	readonly profile: ExperimentalTrackProfile
	readonly generated: GeneratedPuzzle
	readonly analysis: ReturnType<typeof analyzeDifficulty>
	readonly density: OccupiedDensityMetrics
	readonly candidateAttempts: number
}

export type ExperimentalGenerationOptions = {
	readonly seed?: string | number
	readonly variant?: 'binary'
}

const LEVEL_LIMIT = 50

function levelProgress(level: number): number {
	return (level - 1) / (LEVEL_LIMIT - 1)
}

function integerProgress(base: number, growth: number, progress: number): number {
	return base + Math.floor(growth * progress)
}

/**
 * Returns the independent track definition. No track depends on another
 * track's progress or persistence state.
 */
export function getTrackProfile(
	track: ExperimentalTrack,
	levelWithinTrack: number,
	generatorVersion = EXPERIMENTAL_GENERATOR_VERSION,
): ExperimentalTrackProfile {
	if (!Number.isInteger(levelWithinTrack) || levelWithinTrack < 1 || levelWithinTrack > LEVEL_LIMIT) {
		throw new RangeError(`levelWithinTrack must be an integer from 1 to ${LEVEL_LIMIT}`)
	}
	const progress = levelProgress(levelWithinTrack)
	const common = {
		levelWithinTrack,
		generatorVersion,
		label: EXPERIMENTAL_TRACK_LABELS[track],
	}
	if (track === 'easy') {
		return {
			...common,
			id: `phase5.5-${track}-${levelWithinTrack}`,
			track,
			scoreRange: { min: 8, max: 40 },
			minimumDensity: 0.18,
			minimumCrossingRatio: 0.5,
			config: {
				rows: 9,
				columns: 9,
				minValue: 1,
				maxValue: 12,
				allowedOperations: ['add', 'subtract'],
				targetEquationCount: integerProgress(4, 1, progress),
				targetBlankCount: integerProgress(3, 2, progress),
				maxGenerationAttempts: 60,
				requireConnected: true,
				solverMaxNodes: 100_000,
			},
			maxCandidateAttempts: 24,
		}
	}
	if (track === 'medium') {
		return {
			...common,
			id: `phase5.5-${track}-${levelWithinTrack}`,
			track,
			scoreRange: { min: 18, max: 58 },
			minimumDensity: 0.2,
			minimumCrossingRatio: 0.55,
			config: {
				rows: 11,
				columns: 11,
				minValue: 1,
				maxValue: 18,
				allowedOperations: ['add', 'subtract', 'multiply'],
				targetEquationCount: integerProgress(5, 2, progress),
				targetBlankCount: integerProgress(5, 3, progress),
				maxGenerationAttempts: 70,
				requireConnected: true,
				solverMaxNodes: 100_000,
			},
			maxCandidateAttempts: 30,
		}
	}
	if (track === 'hard') {
		return {
			...common,
			id: `phase5.5-${track}-${levelWithinTrack}`,
			track,
			scoreRange: { min: 34, max: 78 },
			minimumDensity: 0.23,
			minimumCrossingRatio: 0.65,
			config: {
				rows: 13,
				columns: 13,
				minValue: 1,
				maxValue: 24,
				allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
				targetEquationCount: integerProgress(7, 3, progress),
				targetBlankCount: integerProgress(7, 5, progress),
				maxGenerationAttempts: 80,
				requireConnected: true,
				solverMaxNodes: 150_000,
			},
			maxCandidateAttempts: 40,
		}
	}
	return {
		...common,
		id: `phase5.5-${track}-${levelWithinTrack}`,
		track,
		scoreRange: { min: 42, max: 100 },
		minimumDensity: 0.22,
		minimumCrossingRatio: 0.68,
		config: {
			rows: 15,
			columns: 15,
			minValue: 1,
			maxValue: 24,
			allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
			targetEquationCount: integerProgress(8, 2, progress),
			targetBlankCount: integerProgress(7, 3, progress),
			maxGenerationAttempts: 120,
			requireConnected: true,
			solverMaxNodes: 200_000,
		},
		maxCandidateAttempts: 48,
	}
}

export function deriveTrackSeed(
	track: ExperimentalTrack,
	levelWithinTrack: number,
	generatorVersion = EXPERIMENTAL_GENERATOR_VERSION,
): number {
	getTrackProfile(track, levelWithinTrack, generatorVersion)
	return deriveSeed(track, levelWithinTrack, generatorVersion)
}

function densityOf(puzzle: Puzzle): OccupiedDensityMetrics {
	const cells = puzzle.grid.cells
	const rows = cells.map((cell) => cell.coordinate.row)
	const columns = cells.map((cell) => cell.coordinate.column)
	const minRow = rows.length === 0 ? 0 : Math.min(...rows)
	const maxRow = rows.length === 0 ? 0 : Math.max(...rows)
	const minColumn = columns.length === 0 ? 0 : Math.min(...columns)
	const maxColumn = columns.length === 0 ? 0 : Math.max(...columns)
	const occupiedBoundingBoxArea = Math.max(1, (maxRow - minRow + 1) * (maxColumn - minColumn + 1))
	const numberAppearances = new Map<string, number>()
	for (const equation of puzzle.equations) {
		for (const coordinate of equationNumberCoordinates(equation)) {
			const key = coordinateKey(coordinate)
			numberAppearances.set(key, (numberAppearances.get(key) ?? 0) + 1)
		}
	}
	const crossingCellCount = [...numberAppearances.values()].filter((count) => count > 1).length
	return {
		occupiedCellCount: cells.length,
		occupiedBoundingBoxArea,
		occupiedDensity: Math.round((cells.length / occupiedBoundingBoxArea) * 1000) / 1000,
		crossingCellCount,
		crossingRatio: Math.round((crossingCellCount / Math.max(1, puzzle.equations.length)) * 1000) / 1000,
		numberCellCount: cells.filter((cell) => cell.kind === 'number').length,
		equationCount: puzzle.equations.length,
	}
}

export function measureOccupiedDensity(puzzle: Puzzle): OccupiedDensityMetrics {
	return densityOf(puzzle)
}

export function generateTrackPuzzle(
	track: ExperimentalTrack,
	levelWithinTrack: number,
	options: ExperimentalGenerationOptions = {},
): ExperimentalTrackPuzzle {
	const profile = getTrackProfile(track, levelWithinTrack)
	const baseSeed = options.seed ?? deriveTrackSeed(track, levelWithinTrack, profile.generatorVersion)
	let lastError: unknown
	for (let attempt = 1; attempt <= profile.maxCandidateAttempts; attempt += 1) {
		const candidateSeed = deriveSeed(baseSeed, profile.id, attempt)
		try {
			const generated = generatePuzzle(candidateSeed, profile.config)
			const analysis = analyzeDifficulty(generated.puzzle)
			const density = densityOf(generated.puzzle)
			const accepted = analysis.solver.status === 'unique' &&
				analysis.score >= profile.scoreRange.min &&
				analysis.score <= profile.scoreRange.max &&
				density.occupiedDensity >= profile.minimumDensity &&
				density.crossingRatio >= profile.minimumCrossingRatio
			if (accepted) {
				return { track, levelWithinTrack, profile, generated, analysis, density, candidateAttempts: attempt }
			}
		} catch (error) {
			lastError = error
		}
	}
	throw new Error(
		`unable to generate ${track}/${levelWithinTrack} within ${profile.maxCandidateAttempts} bounded attempts` +
		(lastError instanceof Error ? `: ${lastError.message}` : ''),
	)
}

export type ExperimentalDailyMode = 'daily-standard' | 'daily-lobachevsky'

export function deriveDailyTrackSeed(
	dateKey: string,
	mode: ExperimentalDailyMode,
	generatorVersion = EXPERIMENTAL_GENERATOR_VERSION,
): number {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
		throw new Error('dateKey must be normalized as YYYY-MM-DD')
	}
	return deriveSeed(dateKey, generatorVersion, mode)
}

export function generateDailyTrackPuzzle(
	dateKey: string,
	mode: ExperimentalDailyMode = 'daily-standard',
): ExperimentalTrackPuzzle {
	const track: ExperimentalTrack = mode === 'daily-lobachevsky' ? 'lobachevsky' : 'medium'
	const seed = deriveDailyTrackSeed(dateKey, mode)
	return generateTrackPuzzle(track, 25, { seed })
}

export type NumberBankMode = 'exact' | 'distractors'

export type NumberBankItem = {
	readonly id: string
	readonly value: number
	readonly kind: 'answer' | 'distractor'
}

export type NumberBank = {
	readonly mode: NumberBankMode
	readonly items: readonly NumberBankItem[]
	readonly missingValues: readonly number[]
	readonly duplicateValueCounts: Readonly<Record<string, number>>
}

function countValues(values: readonly number[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {}
	for (const value of values) {
		counts[String(value)] = (counts[String(value)] ?? 0) + 1
	}
	return counts
}

function missingSolutionValues(puzzle: Puzzle, solution: PuzzleSolution): number[] {
	const blankKeys = new Set(
		puzzle.grid.cells
			.filter((cell) => cell.kind === 'number' && cell.state === 'blank')
			.map((cell) => coordinateKey(cell.coordinate)),
	)
	return solution.values
		.filter((assignment) => blankKeys.has(coordinateKey(assignment.coordinate)))
		.map((assignment) => assignment.value)
}

function plausibleDistractorValues(puzzle: Puzzle, missing: readonly number[], count: number, seed: string | number): number[] {
	const missingSet = new Set(missing)
	const source = puzzle.grid.cells
		.filter((cell): cell is Extract<CrossMathCell, { kind: 'number' }> => cell.kind === 'number' && cell.value !== null)
		.map((cell) => cell.value as number)
	const candidates = new Set<number>()
	for (const value of source) {
		for (const delta of [-2, -1, 1, 2]) {
			const candidate = value + delta
			if (candidate >= puzzle.arithmetic.minValue && candidate <= puzzle.arithmetic.maxValue && !missingSet.has(candidate)) {
				candidates.add(candidate)
			}
		}
	}
	const random = new SeededRandom(seed)
	return random.shuffle([...candidates]).slice(0, Math.max(0, count))
}

export function deriveNumberBank(
	puzzle: Puzzle,
	solution: PuzzleSolution,
	options: { readonly mode?: NumberBankMode; readonly distractorCount?: number; readonly seed?: string | number } = {},
): NumberBank {
	const mode = options.mode ?? 'exact'
	const missingValues = missingSolutionValues(puzzle, solution)
	const items: NumberBankItem[] = missingValues.map((value, index) => ({
		id: `answer-${index}`,
		value,
		kind: 'answer',
	}))
	if (mode === 'distractors') {
		const values = plausibleDistractorValues(
			puzzle,
			missingValues,
			options.distractorCount ?? Math.min(3, Math.max(1, Math.floor(missingValues.length / 3))),
			options.seed ?? 'phase5.5-bank',
		)
		for (const [index, value] of values.entries()) {
			items.push({ id: `distractor-${index}`, value, kind: 'distractor' })
		}
	}
	return {
		mode,
		items,
		missingValues,
		duplicateValueCounts: countValues(missingValues),
	}
}

export type NumberBankAnalysis = {
	readonly bankItemCount: number
	readonly answerItemCount: number
	readonly distractorItemCount: number
	readonly duplicateAnswerValues: number
	readonly averageCompatibleValuesPerBlank: number
	readonly singleCompatibleBlankCount: number
	readonly initialCompatibleValueCounts: readonly number[]
	readonly averageInitialCompatibleValuesPerBlank: number
	readonly singleInitialCompatibleBlankCount: number
}

function withBlankFixed(puzzle: Puzzle, coordinate: CellCoordinate, value: number): Puzzle {
	return {
		...puzzle,
		grid: {
			...puzzle.grid,
			cells: puzzle.grid.cells.map((cell) => {
				if (cell.kind !== 'number' || coordinateKey(cell.coordinate) !== coordinateKey(coordinate)) {
					return cell
				}
				return { ...cell, state: 'fixed', value }
			}),
		},
	}
}

function initialBankCompatibleCounts(
	puzzle: HybridPuzzle,
	values: readonly number[],
): readonly number[] {
	const baseDomains = hybridDomains(puzzle)
	const blanks = puzzle.grid.cells.filter((cell) => cell.kind === 'number' && cell.state === 'blank')
	return blanks.map((blank) => values.filter((value) => {
		const domains = cloneDomains(baseDomains)
		domains.set(coordinateKey(blank.coordinate), new Set([value]))
		return puzzle.equations.every((equation) => {
			const coordinates = hybridNumberCoordinates(equation)
			const index = coordinates.findIndex((coordinate) => coordinateKey(coordinate) === coordinateKey(blank.coordinate))
			if (index < 0) return true
			const supports = hybridSupports(puzzle, equation, domains)
			return supports !== undefined && supports[index].has(value)
		})
	}).length)
}

export function analyzeNumberBank(
	puzzle: Puzzle,
	bank: NumberBank,
	options: { readonly maxNodes?: number } = {},
): NumberBankAnalysis {
	const values = [...new Set(bank.items.map((item) => item.value))]
	const blanks = puzzle.grid.cells.filter((cell) => cell.kind === 'number' && cell.state === 'blank')
	const compatibleCounts = blanks.map((blank) => values.filter((value) =>
		countSolutions(withBlankFixed(puzzle, blank.coordinate, value), 1, options).count > 0,
	).length)
	const total = compatibleCounts.reduce((sum, value) => sum + value, 0)
	const initialCompatibleValueCounts = initialBankCompatibleCounts(puzzle as HybridPuzzle, values)
	const initialTotal = initialCompatibleValueCounts.reduce((sum, value) => sum + value, 0)
	return {
		bankItemCount: bank.items.length,
		answerItemCount: bank.items.filter((item) => item.kind === 'answer').length,
		distractorItemCount: bank.items.filter((item) => item.kind === 'distractor').length,
		duplicateAnswerValues: Object.values(bank.duplicateValueCounts).filter((count) => count > 1).length,
		averageCompatibleValuesPerBlank: blanks.length === 0 ? 0 : Math.round((total / blanks.length) * 100) / 100,
		singleCompatibleBlankCount: compatibleCounts.filter((count) => count === 1).length,
		initialCompatibleValueCounts,
		averageInitialCompatibleValuesPerBlank: blanks.length === 0 ? 0 : Math.round((initialTotal / blanks.length) * 100) / 100,
		singleInitialCompatibleBlankCount: initialCompatibleValueCounts.filter((count) => count === 1).length,
	}
}

export type BinaryCeilingAuditRow = {
	readonly label: string
	readonly targetEquationCount: number
	readonly targetBlankCount: number
	readonly samples: number
	readonly accepted: number
	readonly generationFailures: number
	readonly medianScore: number
	readonly medianDensity: number
	readonly medianPropagationWaves: number
	readonly medianUnresolvedAfterLogic: number
	readonly medianBranches: number
}

export type ExperimentalCalibrationSummary = {
	readonly track: ExperimentalTrack
	readonly requestedAccepted: number
	readonly accepted: number
	readonly attempts: number
	readonly generationFailures: number
	readonly invalid: number
	readonly nonUnique: number
	readonly safetyLimitHits: number
	readonly acceptanceRate: number
	readonly average: Readonly<Record<string, number>>
	readonly median: Readonly<Record<string, number>>
}

function median(values: readonly number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/**
 * Bounded binary-only ceiling audit. It is intentionally not run at app
 * startup; research scripts/tests can request 25, 100, or 500 samples.
 */
export function auditBinaryCeiling(
	samples = 25,
	seedPrefix = 'phase5.5-binary-ceiling',
): readonly BinaryCeilingAuditRow[] {
	const targets = [
		{ label: 'hard-dense', targetEquationCount: 8, targetBlankCount: 8, rows: 13, columns: 13 },
		{ label: 'lobachevsky-binary', targetEquationCount: 11, targetBlankCount: 12, rows: 15, columns: 15 },
	]
	return targets.map((target) => {
		const scores: number[] = []
		const densities: number[] = []
		const waves: number[] = []
		const unresolved: number[] = []
		const branches: number[] = []
		let accepted = 0
		for (let index = 0; index < samples; index += 1) {
			try {
				const generated = generatePuzzle(deriveSeed(seedPrefix, target.label, index), {
					rows: target.rows,
					columns: target.columns,
					minValue: 1,
					maxValue: 24,
					allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
					targetEquationCount: target.targetEquationCount,
					targetBlankCount: target.targetBlankCount,
					maxGenerationAttempts: 90,
					generatorVersion: EXPERIMENTAL_GENERATOR_VERSION,
					requireConnected: true,
					solverMaxNodes: 200_000,
				})
				const analysis = analyzeDifficulty(generated.puzzle)
				const density = densityOf(generated.puzzle)
				accepted += 1
				scores.push(analysis.score)
				densities.push(density.occupiedDensity)
				waves.push(analysis.metrics.propagationWaves)
				unresolved.push(analysis.metrics.unresolvedAfterLogic)
				branches.push(analysis.metrics.solverBranches)
			} catch {
				// Failure is part of the bounded acceptance-rate measurement.
			}
		}
		return {
			label: target.label,
			targetEquationCount: target.targetEquationCount,
			targetBlankCount: target.targetBlankCount,
			samples,
			accepted,
			generationFailures: samples - accepted,
			medianScore: median(scores),
			medianDensity: median(densities),
			medianPropagationWaves: median(waves),
			medianUnresolvedAfterLogic: median(unresolved),
			medianBranches: median(branches),
		}
	})
}

function numericSummary(rows: readonly Record<string, number>[]): {
	readonly average: Readonly<Record<string, number>>
	readonly median: Readonly<Record<string, number>>
} {
	const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
	const average: Record<string, number> = {}
	const medians: Record<string, number> = {}
	for (const key of keys) {
		const values = rows.map((row) => row[key]).filter((value): value is number => value !== undefined)
		average[key] = values.length === 0 ? 0 : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
		medians[key] = median(values)
	}
	return { average, median: medians }
}

/**
 * Bounded corpus runner for research scripts. The default is the requested
 * 500 accepted-puzzle target per track; callers may lower it for a quick local
 * smoke run. It returns summaries only and never writes files or persistence.
 */
export function calibrateExperimentalTracks(
	requestedAccepted = 500,
	seedPrefix = 'phase5.5-calibration',
): readonly ExperimentalCalibrationSummary[] {
	if (!Number.isInteger(requestedAccepted) || requestedAccepted < 1) {
		throw new RangeError('requestedAccepted must be a positive integer')
	}
	return (['easy', 'medium', 'hard', 'lobachevsky'] as const).map((track) => {
		const rows: Record<string, number>[] = []
		let attempts = 0
		let generationFailures = 0
		let accepted = 0
		const maxAttempts = requestedAccepted * 20
		while (accepted < requestedAccepted && attempts < maxAttempts) {
			const level = (attempts % LEVEL_LIMIT) + 1
			const startedAt = Date.now()
			attempts += 1
			try {
				const result = generateTrackPuzzle(track, level, {
					seed: deriveSeed(seedPrefix, track, attempts),
				})
				accepted += 1
				rows.push({
					equations: result.density.equationCount,
					blanks: result.analysis.metrics.blankCount,
					occupiedDensity: result.density.occupiedDensity,
					crossings: result.density.crossingCellCount,
					crossingRatio: result.density.crossingRatio,
					initialForced: result.analysis.metrics.initialForcedCells,
					propagationWaves: result.analysis.metrics.propagationWaves,
					ambiguity: result.analysis.metrics.ambiguityMoments,
					unresolvedAfterLogic: result.analysis.metrics.unresolvedAfterLogic,
					branches: result.analysis.metrics.solverBranches,
					nodes: result.analysis.metrics.solverNodes,
					maxDepth: result.analysis.metrics.solverMaxDepth,
					score: result.analysis.score,
					generationTimeMs: Date.now() - startedAt,
				})
			} catch {
				generationFailures += 1
			}
		}
		const summary = numericSummary(rows)
		return {
			track,
			requestedAccepted,
			accepted,
			attempts,
			generationFailures,
			invalid: 0,
			nonUnique: 0,
			safetyLimitHits: 0,
			acceptanceRate: attempts === 0 ? 0 : Math.round((accepted / attempts) * 10000) / 10000,
			average: summary.average,
			median: summary.median,
		}
	})
}

export function renderPuzzleAscii(puzzle: Puzzle, solution?: PuzzleSolution): string {
	const solutionValues = new Map((solution?.values ?? []).map((assignment) => [coordinateKey(assignment.coordinate), assignment.value]))
	const cells = new Map(puzzle.grid.cells.map((cell) => [coordinateKey(cell.coordinate), cell]))
	const lines: string[] = []
	for (let row = 0; row < puzzle.grid.rows; row += 1) {
		const symbols: string[] = []
		for (let column = 0; column < puzzle.grid.columns; column += 1) {
			const coordinate = { row, column }
			const cell = cells.get(coordinateKey(coordinate))
			if (!cell) {
				symbols.push(' ')
			} else if (cell.kind === 'number') {
				const value = cell.state === 'blank' ? solutionValues.get(coordinateKey(coordinate)) : cell.value
				symbols.push(value === undefined || value === null ? '□' : String(value))
			} else if (cell.kind === 'operator') {
				symbols.push(operatorSymbol(cell.operator))
			} else {
				symbols.push('=')
			}
		}
		lines.push(symbols.join(' '))
	}
	return lines.join('\n')
}

export function validateExperimentalTrackPuzzle(result: ExperimentalTrackPuzzle): boolean {
	return validatePuzzle(result.generated.puzzle, {
		solution: result.generated.solution,
		requirements: {
			requireHorizontalAndVertical: true,
			requireCrossing: true,
			requireConnected: true,
		},
	}).valid && result.analysis.solver.status === 'unique'
}

export type ExpressionDirection = 'horizontal' | 'vertical'

export type ExpressionEquation = {
	readonly id: string
	readonly direction: ExpressionDirection
	/** Ordered number/operator/equals tokens. Number tokens are at even indexes. */
	readonly cells: readonly CellCoordinate[]
	readonly operators: readonly ArithmeticOperator[]
	readonly relation: 'equals'
}

export type ExpressionPuzzle = {
	readonly schemaVersion: 1
	readonly arithmetic: ArithmeticConfig
	readonly grid: {
		readonly rows: number
		readonly columns: number
		readonly cells: readonly CrossMathCell[]
	}
	readonly equations: readonly ExpressionEquation[]
}

export type ExpressionEvaluation =
	| { readonly valid: true; readonly result: number; readonly steps: readonly number[] }
	| { readonly valid: false; readonly reason: string }

export type ExpressionSolution = PuzzleSolution

export type HybridEquation = Equation | ExpressionEquation

export type HybridPuzzle = {
	readonly schemaVersion: 1
	readonly arithmetic: ArithmeticConfig
	readonly grid: {
		readonly rows: number
		readonly columns: number
		readonly cells: readonly CrossMathCell[]
	}
	readonly equations: readonly HybridEquation[]
}

export type GeneratedHybridPuzzle = {
	readonly puzzle: HybridPuzzle
	readonly solution: PuzzleSolution
	readonly generationAttempts: number
}

/**
 * Evaluates A op B op C ... using conventional precedence and left
 * associativity. Every intermediate result is checked as an integer inside
 * the configured range, so division never leaks a floating-point value.
 */
export function evaluateExpression(
	operands: readonly number[],
	operators: readonly ArithmeticOperator[],
	config: ArithmeticConfig,
): ExpressionEvaluation {
	assertArithmeticConfig(config)
	if (operands.length < 2 || operators.length !== operands.length - 1) {
		return { valid: false, reason: 'expression-shape' }
	}
	if (operands.some((operand) => !Number.isSafeInteger(operand) || !isValueInArithmeticRange(operand, config))) {
		return { valid: false, reason: 'operand-out-of-range' }
	}
	const values = [...operands]
	const ops = [...operators]
	const steps: number[] = []
	const precedence: ArithmeticOperator[] = ['multiply', 'divide']
	for (const highPrecedence of precedence) {
		let index = 0
		while (index < ops.length) {
			if (ops[index] !== highPrecedence) {
				index += 1
				continue
			}
			const evaluation = evaluateArithmetic(values[index], ops[index], values[index + 1], config)
			if (!evaluation.valid) return evaluation
			values.splice(index, 2, evaluation.result)
			ops.splice(index, 1)
			steps.push(evaluation.result)
		}
	}
	while (ops.length > 0) {
		const evaluation = evaluateArithmetic(values[0], ops[0], values[1], config)
		if (!evaluation.valid) return evaluation
		values.splice(0, 2, evaluation.result)
		ops.splice(0, 1)
		steps.push(evaluation.result)
	}
	return { valid: true, result: values[0], steps }
}

function isValueInArithmeticRange(value: number, config: ArithmeticConfig): boolean {
	return Number.isSafeInteger(value) && value >= config.minValue && value <= config.maxValue
}

function expressionNumberCoordinates(equation: ExpressionEquation): readonly CellCoordinate[] {
	return equation.cells.filter((_, index) => index % 2 === 0 && index !== equation.cells.length - 1)
}

function expressionResultCoordinate(equation: ExpressionEquation): CellCoordinate {
	return equation.cells[equation.cells.length - 1]
}

function expressionTokenKind(index: number, length: number): CrossMathCell['kind'] {
	if (index === length - 2) return 'equals'
	return index % 2 === 0 ? 'number' : 'operator'
}

function validateExpressionPuzzle(puzzle: ExpressionPuzzle): string[] {
	const errors: string[] = []
	const cells = new Map(puzzle.grid.cells.map((cell) => [coordinateKey(cell.coordinate), cell]))
	for (const equation of puzzle.equations) {
		if (equation.cells.length < 7 || equation.cells.length % 2 === 0) {
			errors.push(`${equation.id} has invalid token length`)
			continue
		}
		if (equation.operators.length !== (equation.cells.length - 3) / 2) {
			errors.push(`${equation.id} has invalid operator length`)
		}
		for (let index = 0; index < equation.cells.length; index += 1) {
			const coordinate = equation.cells[index]
			const cell = cells.get(coordinateKey(coordinate))
			if (!cell) {
				errors.push(`${equation.id} references absent cell ${coordinateKey(coordinate)}`)
				continue
			}
			const expected = expressionTokenKind(index, equation.cells.length)
			if (cell.kind !== expected) errors.push(`${equation.id} has wrong token kind at ${index}`)
			if (index > 0) {
				const previous = equation.cells[index - 1]
				const rowDelta = coordinate.row - previous.row
				const columnDelta = coordinate.column - previous.column
				const contiguous = equation.direction === 'horizontal'
					? rowDelta === 0 && columnDelta === 1
					: rowDelta === 1 && columnDelta === 0
				if (!contiguous) errors.push(`${equation.id} is not contiguous`)
			}
		}
	}
	return [...new Set(errors)]
}

function expressionDomains(puzzle: ExpressionPuzzle): Map<string, Set<number>> {
	const domains = new Map<string, Set<number>>()
	for (const cell of puzzle.grid.cells) {
		if (cell.kind !== 'number') continue
		const values = cell.state === 'fixed' && cell.value !== null
			? new Set([cell.value])
			: new Set(Array.from({ length: puzzle.arithmetic.maxValue - puzzle.arithmetic.minValue + 1 }, (_, index) => puzzle.arithmetic.minValue + index))
		domains.set(coordinateKey(cell.coordinate), values)
	}
	return domains
}

function cloneExpressionDomains(domains: Map<string, Set<number>>): Map<string, Set<number>> {
	return new Map([...domains.entries()].map(([key, values]) => [key, new Set(values)]))
}

function propagateExpressions(
	puzzle: ExpressionPuzzle,
	domains: Map<string, Set<number>>,
	metrics: { propagationSteps: number },
): boolean {
	let changed = true
	while (changed) {
		changed = false
		for (const equation of puzzle.equations) {
			const coordinates = [...expressionNumberCoordinates(equation), expressionResultCoordinate(equation)]
			const equationDomains = coordinates.map((coordinate) => domains.get(coordinateKey(coordinate)))
			if (equationDomains.some((domain) => !domain)) return false
			const supports = equationDomains.map(() => new Set<number>())
			const values = equationDomains as Set<number>[]
			const visit = (index: number, operands: number[]): void => {
				if (index === values.length - 1) {
					const evaluation = evaluateExpression(operands, equation.operators, puzzle.arithmetic)
					if (evaluation.valid && values[index].has(evaluation.result)) {
						operands.forEach((value, operandIndex) => supports[operandIndex].add(value))
						supports[index].add(evaluation.result)
					}
					return
				}
				for (const value of values[index]) visit(index + 1, [...operands, value])
			}
			visit(0, [])
			metrics.propagationSteps += 1
			for (let index = 0; index < values.length; index += 1) {
				for (const value of values[index]) {
					if (!supports[index].has(value)) {
						values[index].delete(value)
						changed = true
					}
				}
				if (values[index].size === 0) return false
			}
		}
	}
	return true
}

function expressionSolutionFromDomains(puzzle: ExpressionPuzzle, domains: Map<string, Set<number>>): ExpressionSolution {
	return {
		values: puzzle.grid.cells.flatMap((cell) => {
			if (cell.kind !== 'number') return []
			const values = domains.get(coordinateKey(cell.coordinate))
			const value = values && values.size === 1 ? [...values][0] : undefined
			return value === undefined ? [] : [{ coordinate: cell.coordinate, value }]
		}),
	}
}

export function countExpressionSolutions(
	puzzle: ExpressionPuzzle,
	limit = 2,
	options: { readonly maxNodes?: number } = {},
): { readonly count: 0 | 1 | 2; readonly status: 'complete' | 'safety-limit'; readonly metrics: { readonly nodesVisited: number; readonly propagationSteps: number; readonly maxDepth: number } } {
	const errors = validateExpressionPuzzle(puzzle)
	if (errors.length > 0) return { count: 0, status: 'complete', metrics: { nodesVisited: 0, propagationSteps: 0, maxDepth: 0 } }
	const maxNodes = Math.max(1, options.maxNodes ?? 100_000)
	const requestedLimit = Math.max(1, Math.min(2, Math.floor(limit)))
	const metrics = { nodesVisited: 0, propagationSteps: 0, maxDepth: 0 }
	let count = 0
	let limited = false
	const search = (domains: Map<string, Set<number>>, depth: number): void => {
		if (limited || count >= requestedLimit) return
		metrics.nodesVisited += 1
		metrics.maxDepth = Math.max(metrics.maxDepth, depth)
		if (metrics.nodesVisited > maxNodes) {
			limited = true
			return
		}
		const next = cloneExpressionDomains(domains)
		if (!propagateExpressions(puzzle, next, metrics)) return
		let branchKey: string | undefined
		let smallest = Number.POSITIVE_INFINITY
		for (const [key, values] of next) {
			if (values.size > 1 && values.size < smallest) {
				branchKey = key
				smallest = values.size
			}
		}
		if (!branchKey) {
			count += 1
			return
		}
		for (const value of next.get(branchKey) as Set<number>) {
			const branch = cloneExpressionDomains(next)
			branch.set(branchKey, new Set([value]))
			search(branch, depth + 1)
			if (limited || count >= requestedLimit) return
		}
	}
	search(expressionDomains(puzzle), 0)
	return {
		count: Math.min(2, count) as 0 | 1 | 2,
		status: limited ? 'safety-limit' : 'complete',
		metrics,
	}
}

export function solveExpressionPuzzle(
	puzzle: ExpressionPuzzle,
	options: { readonly maxNodes?: number } = {},
): SolverResult {
	const count = countExpressionSolutions(puzzle, 2, options)
	let solution: ExpressionSolution | undefined
	if (count.count > 0 && count.status === 'complete') {
		const domains = expressionDomains(puzzle)
		const find = (current: Map<string, Set<number>>): void => {
			if (solution) return
			const next = cloneExpressionDomains(current)
			const local = { propagationSteps: 0 }
			if (!propagateExpressions(puzzle, next, local)) return
			const key = [...next.entries()].find(([, values]) => values.size > 1)?.[0]
			if (!key) {
				solution = expressionSolutionFromDomains(puzzle, next)
				return
			}
			for (const value of next.get(key) as Set<number>) {
				const branch = cloneExpressionDomains(next)
				branch.set(key, new Set([value]))
				find(branch)
				if (solution) return
			}
		}
		find(domains)
	}
	const status = count.status === 'safety-limit'
		? 'safety-limit'
		: count.count === 0 ? 'no-solution' : count.count === 1 ? 'unique' : 'multiple'
	return {
		status,
		solutionCount: count.count,
		solution,
		metrics: {
			nodesVisited: count.metrics.nodesVisited,
			branchCount: Math.max(0, count.metrics.nodesVisited - 1),
			propagationSteps: count.metrics.propagationSteps,
			maxDepth: count.metrics.maxDepth,
			elapsedMs: 0,
		},
		error: status === 'safety-limit' ? 'expression solver maxNodes safety limit exceeded' : undefined,
	}
}

function isExpressionEquation(equation: HybridEquation): equation is ExpressionEquation {
	return equation.cells.length > 5
}

function hybridNumberCoordinates(equation: HybridEquation): readonly CellCoordinate[] {
	return isExpressionEquation(equation)
		? [...expressionNumberCoordinates(equation), expressionResultCoordinate(equation)]
		: equationNumberCoordinates(equation)
}

function validateHybridPuzzle(puzzle: HybridPuzzle): string[] {
	const errors: string[] = []
	const binary = puzzle.equations.filter((equation): equation is Equation => !isExpressionEquation(equation))
	const expressions = puzzle.equations.filter(isExpressionEquation)
	if (binary.length > 0) {
		const result = validatePuzzle({
			schemaVersion: 1,
			arithmetic: puzzle.arithmetic,
			grid: puzzle.grid,
			equations: binary,
		})
		errors.push(...result.errors)
	}
	if (expressions.length > 0) {
		errors.push(...validateExpressionPuzzle({
			schemaVersion: 1,
			arithmetic: puzzle.arithmetic,
			grid: puzzle.grid,
			equations: expressions,
		}))
	}
	if (puzzle.equations.length === 0) errors.push('hybrid puzzle must contain at least one equation')
	return [...new Set(errors)]
}

function hybridDomains(puzzle: HybridPuzzle): Map<string, Set<number>> {
	const domains = new Map<string, Set<number>>()
	for (const cell of puzzle.grid.cells) {
		if (cell.kind !== 'number') continue
		const values = cell.state === 'fixed' && cell.value !== null
			? new Set([cell.value])
			: new Set(Array.from({ length: puzzle.arithmetic.maxValue - puzzle.arithmetic.minValue + 1 }, (_, index) => puzzle.arithmetic.minValue + index))
		domains.set(coordinateKey(cell.coordinate), values)
	}
	return domains
}

function hybridSupports(
	puzzle: HybridPuzzle,
	equation: HybridEquation,
	domains: Map<string, Set<number>>,
): Set<number>[] | undefined {
	const coordinates = hybridNumberCoordinates(equation)
	const values = coordinates.map((coordinate) => domains.get(coordinateKey(coordinate)))
	if (values.some((domain) => !domain)) return undefined
	const supports = values.map(() => new Set<number>())
	const equationDomains = values as Set<number>[]
	if (!isExpressionEquation(equation)) {
		for (const first of equationDomains[0]) {
			for (const second of equationDomains[1]) {
				const evaluation = evaluateArithmetic(first, equation.operator, second, puzzle.arithmetic)
				if (evaluation.valid && equationDomains[2].has(evaluation.result)) {
					supports[0].add(first)
					supports[1].add(second)
					supports[2].add(evaluation.result)
				}
			}
		}
		return supports
	}
	const visit = (index: number, operands: number[]): void => {
		if (index === equationDomains.length - 1) {
			const evaluation = evaluateExpression(operands, equation.operators, puzzle.arithmetic)
			if (evaluation.valid && equationDomains[index].has(evaluation.result)) {
				operands.forEach((value, operandIndex) => supports[operandIndex].add(value))
				supports[index].add(evaluation.result)
			}
			return
		}
		for (const value of equationDomains[index]) visit(index + 1, [...operands, value])
	}
	visit(0, [])
	return supports
}

function propagateHybrid(
	puzzle: HybridPuzzle,
	domains: Map<string, Set<number>>,
	metrics: { propagationSteps: number },
): boolean {
	let changed = true
	while (changed) {
		changed = false
		for (const equation of puzzle.equations) {
			const coordinates = hybridNumberCoordinates(equation)
			const supports = hybridSupports(puzzle, equation, domains)
			if (!supports) return false
			metrics.propagationSteps += 1
			for (let index = 0; index < coordinates.length; index += 1) {
				const domain = domains.get(coordinateKey(coordinates[index])) as Set<number>
				for (const value of domain) {
					if (!supports[index].has(value)) {
						domain.delete(value)
						changed = true
					}
				}
				if (domain.size === 0) return false
			}
		}
	}
	return true
}

function cloneDomains(domains: Map<string, Set<number>>): Map<string, Set<number>> {
	return new Map([...domains.entries()].map(([key, values]) => [key, new Set(values)]))
}

export type HybridSolutionCountResult = {
	readonly count: 0 | 1 | 2
	readonly status: 'complete' | 'safety-limit'
	readonly metrics: {
		readonly nodesVisited: number
		readonly propagationSteps: number
		readonly maxDepth: number
	}
}

export function countHybridSolutions(
	puzzle: HybridPuzzle,
	limit = 2,
	options: { readonly maxNodes?: number } = {},
): HybridSolutionCountResult {
	if (validateHybridPuzzle(puzzle).length > 0) {
		return { count: 0, status: 'complete', metrics: { nodesVisited: 0, propagationSteps: 0, maxDepth: 0 } }
	}
	const maxNodes = Math.max(1, options.maxNodes ?? 100_000)
	const requestedLimit = Math.max(1, Math.min(2, Math.floor(limit)))
	const metrics = { nodesVisited: 0, propagationSteps: 0, maxDepth: 0 }
	let count = 0
	let safetyLimit = false
	const search = (domains: Map<string, Set<number>>, depth: number): void => {
		if (safetyLimit || count >= requestedLimit) return
		metrics.nodesVisited += 1
		metrics.maxDepth = Math.max(metrics.maxDepth, depth)
		if (metrics.nodesVisited > maxNodes) {
			safetyLimit = true
			return
		}
		const next = cloneDomains(domains)
		if (!propagateHybrid(puzzle, next, metrics)) return
		let branchKey: string | undefined
		let smallest = Number.POSITIVE_INFINITY
		for (const [key, values] of next) {
			if (values.size > 1 && values.size < smallest) {
				branchKey = key
				smallest = values.size
			}
		}
		if (!branchKey) {
			count += 1
			return
		}
		for (const value of next.get(branchKey) as Set<number>) {
			const branch = cloneDomains(next)
			branch.set(branchKey, new Set([value]))
			search(branch, depth + 1)
			if (safetyLimit || count >= requestedLimit) return
		}
	}
	search(hybridDomains(puzzle), 0)
	return {
		count: Math.min(2, count) as 0 | 1 | 2,
		status: safetyLimit ? 'safety-limit' : 'complete',
		metrics,
	}
}

function solutionFromDomains(puzzle: HybridPuzzle, domains: Map<string, Set<number>>): PuzzleSolution {
	return {
		values: puzzle.grid.cells.flatMap((cell) => {
			if (cell.kind !== 'number') return []
			const values = domains.get(coordinateKey(cell.coordinate))
			const value = values && values.size === 1 ? [...values][0] : undefined
			return value === undefined ? [] : [{ coordinate: cell.coordinate, value }]
		}),
	}
}

export function solveHybridPuzzle(
	puzzle: HybridPuzzle,
	options: { readonly maxNodes?: number } = {},
): SolverResult {
	const count = countHybridSolutions(puzzle, 2, options)
	let solution: PuzzleSolution | undefined
	if (count.count > 0 && count.status === 'complete') {
		const find = (domains: Map<string, Set<number>>): void => {
			if (solution) return
			const next = cloneDomains(domains)
			if (!propagateHybrid(puzzle, next, { propagationSteps: 0 })) return
			const key = [...next.entries()].find(([, values]) => values.size > 1)?.[0]
			if (!key) {
				solution = solutionFromDomains(puzzle, next)
				return
			}
			for (const value of next.get(key) as Set<number>) {
				const branch = cloneDomains(next)
				branch.set(key, new Set([value]))
				find(branch)
				if (solution) return
			}
		}
		find(hybridDomains(puzzle))
	}
	const status = count.status === 'safety-limit'
		? 'safety-limit'
		: count.count === 0 ? 'no-solution' : count.count === 1 ? 'unique' : 'multiple'
	return {
		status,
		solutionCount: count.count,
		solution,
		metrics: {
			nodesVisited: count.metrics.nodesVisited,
			branchCount: Math.max(0, count.metrics.nodesVisited - 1),
			propagationSteps: count.metrics.propagationSteps,
			maxDepth: count.metrics.maxDepth,
			elapsedMs: 0,
		},
		error: status === 'safety-limit' ? 'hybrid solver maxNodes safety limit exceeded' : undefined,
	}
}

type ExpressionTuple = {
	readonly operators: readonly ArithmeticOperator[]
	readonly operands: readonly number[]
	readonly result: number
}

type ExpressionStructure = {
	readonly equations: ExpressionEquation[]
	readonly cells: Map<string, CrossMathCell>
	readonly assignments: Map<string, number>
}

function expressionPath(row: number, column: number, direction: ExpressionDirection, tokenCount = 7): CellCoordinate[] {
	const deltaRow = direction === 'vertical' ? 1 : 0
	const deltaColumn = direction === 'horizontal' ? 1 : 0
	return Array.from({ length: tokenCount }, (_, offset) => ({
		row: row + deltaRow * offset,
		column: column + deltaColumn * offset,
	}))
}

function expressionTuples(config: ArithmeticConfig, operators: readonly ArithmeticOperator[]): ExpressionTuple[] {
	const tuples: ExpressionTuple[] = []
	for (let a = config.minValue; a <= config.maxValue; a += 1) {
		for (let b = config.minValue; b <= config.maxValue; b += 1) {
			for (let c = config.minValue; c <= config.maxValue; c += 1) {
				const evaluation = evaluateExpression([a, b, c], operators, config)
				if (evaluation.valid) tuples.push({ operators, operands: [a, b, c], result: evaluation.result })
			}
		}
	}
	return tuples
}

function addExpressionEquation(structure: ExpressionStructure, equation: ExpressionEquation, tuple: ExpressionTuple, anchorIndex?: number): void {
	structure.equations.push(equation)
	for (let index = 0; index < equation.cells.length; index += 1) {
		const coordinate = equation.cells[index]
		const key = coordinateKey(coordinate)
		if (index === equation.cells.length - 2) {
			structure.cells.set(key, { kind: 'equals', coordinate })
		} else if (index % 2 === 1) {
			structure.cells.set(key, { kind: 'operator', coordinate, operator: tuple.operators[(index - 1) / 2] })
		} else {
			const numberIndex = index / 2
			const value = numberIndex === tuple.operands.length ? tuple.result : tuple.operands[numberIndex]
			if (anchorIndex !== numberIndex || !structure.assignments.has(key)) {
				structure.assignments.set(key, value)
				structure.cells.set(key, { kind: 'number', coordinate, state: 'fixed', value })
			}
		}
	}
}

function createExpressionPuzzle(config: LongExpressionGenerationConfig, structure: ExpressionStructure, blankKeys: ReadonlySet<string>): ExpressionPuzzle {
	const cells: CrossMathCell[] = [...structure.cells.values()].map((cell): CrossMathCell => {
		if (cell.kind !== 'number' || !blankKeys.has(coordinateKey(cell.coordinate))) return cell
		return { ...cell, state: 'blank', value: null }
	}).sort((a, b) => a.coordinate.row - b.coordinate.row || a.coordinate.column - b.coordinate.column)
	return {
		schemaVersion: 1,
		arithmetic: { minValue: config.minValue, maxValue: config.maxValue },
		grid: { rows: config.rows, columns: config.columns, cells },
		equations: structure.equations,
	}
}

export type LongExpressionGenerationConfig = ArithmeticConfig & {
	readonly rows: number
	readonly columns: number
	readonly allowedOperations: readonly ArithmeticOperator[]
	readonly targetEquationCount: number
	readonly targetBlankCount: number
	readonly maxGenerationAttempts: number
	readonly solverMaxNodes: number
}

export type GeneratedExpressionPuzzle = {
	readonly puzzle: ExpressionPuzzle
	readonly solution: ExpressionSolution
	readonly generationAttempts: number
}

export const DEFAULT_LONG_EXPRESSION_CONFIG: LongExpressionGenerationConfig = {
	rows: 15,
	columns: 15,
	minValue: 1,
	maxValue: 18,
	allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
	targetEquationCount: 5,
	targetBlankCount: 8,
	maxGenerationAttempts: 40,
	solverMaxNodes: 100_000,
}

export function generateLongExpressionPuzzle(
	seed: string | number,
	configOverrides: Partial<LongExpressionGenerationConfig> = {},
): GeneratedExpressionPuzzle {
	const config = { ...DEFAULT_LONG_EXPRESSION_CONFIG, ...configOverrides }
	assertArithmeticConfig(config)
	const random = new SeededRandom(deriveSeed(seed, 'phase5.5-long-expression-v1'))
	const operationPairs = config.allowedOperations.flatMap((first) => config.allowedOperations.map((second) => [first, second] as const))
	for (let generationAttempt = 1; generationAttempt <= config.maxGenerationAttempts; generationAttempt += 1) {
		const structure: ExpressionStructure = { equations: [], cells: new Map(), assignments: new Map() }
		const firstOperators = random.pick(operationPairs)
		const firstTuple = random.pick(expressionTuples(config, firstOperators))
		const firstDirection: ExpressionDirection = 'horizontal'
		const firstRow = random.integer(0, config.rows - 1)
		const firstColumn = random.integer(0, config.columns - 7)
		addExpressionEquation(structure, {
			id: 'expression-0', direction: firstDirection, cells: expressionPath(firstRow, firstColumn, firstDirection), operators: firstOperators, relation: 'equals',
		}, firstTuple)
		let budget = Math.max(500, config.targetEquationCount * 500)
		while (structure.equations.length < config.targetEquationCount && budget > 0) {
			budget -= 1
			const parent = random.pick(structure.equations)
			const parentNumbers = expressionNumberCoordinates(parent)
			const anchorIndex = random.integer(0, parentNumbers.length)
			const anchor = anchorIndex === parentNumbers.length ? expressionResultCoordinate(parent) : parentNumbers[anchorIndex]
			const direction: ExpressionDirection = parent.direction === 'horizontal' ? 'vertical' : 'horizontal'
			const startRow = anchor.row - (direction === 'vertical' ? anchorIndex * 2 : 0)
			const startColumn = anchor.column - (direction === 'horizontal' ? anchorIndex * 2 : 0)
			const path = expressionPath(startRow, startColumn, direction)
			if (!path.every((coordinate) => coordinate.row >= 0 && coordinate.row < config.rows && coordinate.column >= 0 && coordinate.column < config.columns)) continue
			const operators = random.pick(operationPairs)
			const anchorValue = structure.assignments.get(coordinateKey(anchor))
			const tupleCandidates = expressionTuples(config, operators).filter((tuple) => {
				const value = anchorIndex === parentNumbers.length ? tuple.result : tuple.operands[anchorIndex]
				return value === anchorValue && path.every((coordinate, index) => {
					const existing = structure.cells.get(coordinateKey(coordinate))
					if (!existing) return true
					if (index === path.length - 2) return existing.kind === 'equals'
					if (index % 2 === 1) return existing.kind === 'operator' && existing.operator === tuple.operators[(index - 1) / 2]
					const numberIndex = index / 2
					const valueAtCell = numberIndex === tuple.operands.length ? tuple.result : tuple.operands[numberIndex]
					return existing.kind === 'number' && structure.assignments.get(coordinateKey(coordinate)) === valueAtCell
				})
			})
			if (tupleCandidates.length === 0) continue
			const tuple = random.pick(tupleCandidates)
			addExpressionEquation(structure, {
				id: `expression-${structure.equations.length}`,
				direction,
				cells: path,
				operators,
				relation: 'equals',
			}, tuple, anchorIndex)
		}
		if (structure.equations.length < config.targetEquationCount) continue
		const solutionValues: PuzzleSolution = {
			values: [...structure.assignments.entries()].map(([key, value]) => {
				const [row, column] = key.split(',').map(Number)
				return { coordinate: { row, column }, value }
			}),
		}
		const blankKeys = new Set<string>()
		for (const assignment of random.shuffle(solutionValues.values)) {
			if (blankKeys.size >= Math.min(config.targetBlankCount, solutionValues.values.length - 1)) break
			blankKeys.add(coordinateKey(assignment.coordinate))
			const candidate = createExpressionPuzzle(config, structure, blankKeys)
			const count = countExpressionSolutions(candidate, 2, { maxNodes: config.solverMaxNodes })
			if (count.status !== 'complete' || count.count !== 1) blankKeys.delete(coordinateKey(assignment.coordinate))
		}
		if (blankKeys.size < Math.min(config.targetBlankCount, solutionValues.values.length - 1)) continue
		const puzzle = createExpressionPuzzle(config, structure, blankKeys)
		const count = countExpressionSolutions(puzzle, 2, { maxNodes: config.solverMaxNodes })
		if (count.status === 'complete' && count.count === 1) return { puzzle, solution: solutionValues, generationAttempts: generationAttempt }
	}
	throw new Error(`unable to generate long-expression puzzle after ${config.maxGenerationAttempts} bounded attempts`)
}

export type HybridGenerationConfig = LongExpressionGenerationConfig & {
	readonly targetBinaryEquationCount: number
	readonly binaryAllowedOperations: readonly ArithmeticOperator[]
}

export const DEFAULT_HYBRID_GENERATION_CONFIG: HybridGenerationConfig = {
	...DEFAULT_LONG_EXPRESSION_CONFIG,
	targetEquationCount: 3,
	targetBlankCount: 7,
	targetBinaryEquationCount: 3,
	binaryAllowedOperations: ['add', 'subtract', 'multiply', 'divide'],
	maxGenerationAttempts: 30,
}

type BinaryTriple = { readonly operator: ArithmeticOperator; readonly a: number; readonly b: number; readonly c: number }

function binaryTriples(config: ArithmeticConfig, operations: readonly ArithmeticOperator[]): BinaryTriple[] {
	const triples: BinaryTriple[] = []
	for (const operator of operations) {
		for (let a = config.minValue; a <= config.maxValue; a += 1) {
			for (let b = config.minValue; b <= config.maxValue; b += 1) {
				const evaluation = evaluateArithmetic(a, operator, b, config)
				if (evaluation.valid) triples.push({ operator, a, b, c: evaluation.result })
			}
		}
	}
	return triples
}

function assignmentsMap(solution: PuzzleSolution): Map<string, number> {
	return new Map(solution.values.map((assignment) => [coordinateKey(assignment.coordinate), assignment.value]))
}

function fixedHybridCells(puzzle: ExpressionPuzzle, solution: PuzzleSolution): Map<string, CrossMathCell> {
	const values = assignmentsMap(solution)
	return new Map(puzzle.grid.cells.map((cell) => {
		if (cell.kind !== 'number') return [coordinateKey(cell.coordinate), cell] as const
		return [coordinateKey(cell.coordinate), { ...cell, state: 'fixed', value: values.get(coordinateKey(cell.coordinate)) ?? cell.value } as CrossMathCell] as const
	}))
}

function canPlaceBinary(
	path: readonly CellCoordinate[],
	triple: BinaryTriple,
	cells: Map<string, CrossMathCell>,
	assignments: Map<string, number>,
): boolean {
	return path.every((coordinate, index) => {
		const existing = cells.get(coordinateKey(coordinate))
		if (!existing) return true
		if (index === 1) return existing.kind === 'operator' && existing.operator === triple.operator
		if (index === 3) return existing.kind === 'equals'
		const value = index === 0 ? triple.a : index === 2 ? triple.b : triple.c
		return existing.kind === 'number' && assignments.get(coordinateKey(coordinate)) === value
	})
}

function addBinaryEquationToHybrid(
	cells: Map<string, CrossMathCell>,
	assignments: Map<string, number>,
	equations: HybridEquation[],
	equationIndex: number,
	path: readonly CellCoordinate[],
	triple: BinaryTriple,
): void {
	const equation: Equation = {
		id: `hybrid-binary-${equationIndex}`,
		direction: path[0].row === path[1].row ? 'horizontal' : 'vertical',
		cells: path as Equation['cells'],
		operator: triple.operator,
		relation: 'equals',
	}
	equations.push(equation)
	for (let index = 0; index < path.length; index += 1) {
		const coordinate = path[index]
		const key = coordinateKey(coordinate)
		if (index === 1) cells.set(key, { kind: 'operator', coordinate, operator: triple.operator })
		else if (index === 3) cells.set(key, { kind: 'equals', coordinate })
		else {
			const value = index === 0 ? triple.a : index === 2 ? triple.b : triple.c
			assignments.set(key, value)
			cells.set(key, { kind: 'number', coordinate, state: 'fixed', value })
		}
	}
}

function createHybridPuzzle(
	config: HybridGenerationConfig,
	cells: Map<string, CrossMathCell>,
	equations: readonly HybridEquation[],
	blankKeys: ReadonlySet<string>,
): HybridPuzzle {
	return {
		schemaVersion: 1,
		arithmetic: { minValue: config.minValue, maxValue: config.maxValue },
		grid: {
			rows: config.rows,
			columns: config.columns,
			cells: [...cells.values()].map((cell): CrossMathCell => {
				if (cell.kind !== 'number' || !blankKeys.has(coordinateKey(cell.coordinate))) return cell
				return { ...cell, state: 'blank', value: null }
			}).sort((left, right) => left.coordinate.row - right.coordinate.row || left.coordinate.column - right.coordinate.column),
		},
		equations,
	}
}

export function generateHybridPuzzle(
	seed: string | number,
	configOverrides: Partial<HybridGenerationConfig> = {},
): GeneratedHybridPuzzle {
	const config = { ...DEFAULT_HYBRID_GENERATION_CONFIG, ...configOverrides }
	assertArithmeticConfig(config)
	if (!Number.isInteger(config.targetBinaryEquationCount) || config.targetBinaryEquationCount < 1) {
		throw new Error('targetBinaryEquationCount must be positive')
	}
	const random = new SeededRandom(deriveSeed(seed, 'phase5.5-hybrid-v1'))
	const triples = binaryTriples(config, config.binaryAllowedOperations)
	for (let generationAttempt = 1; generationAttempt <= config.maxGenerationAttempts; generationAttempt += 1) {
		try {
			const long = generateLongExpressionPuzzle(deriveSeed(seed, 'long', generationAttempt), {
				...config,
				targetBlankCount: 0,
			})
			const cells = fixedHybridCells(long.puzzle, long.solution)
			const assignments = assignmentsMap(long.solution)
			const equations: HybridEquation[] = [...long.puzzle.equations]
			let binaryIndex = 0
			let budget = Math.max(500, config.targetBinaryEquationCount * 500)
			while (binaryIndex < config.targetBinaryEquationCount && budget > 0) {
				budget -= 1
				const parent = random.pick(equations)
				const anchors = hybridNumberCoordinates(parent)
				const anchor = random.pick(anchors)
				const anchorIndex = random.integer(0, 2)
				const direction = parent.direction === 'horizontal' ? 'vertical' : 'horizontal'
				const startRow = anchor.row - (direction === 'vertical' ? anchorIndex : 0)
				const startColumn = anchor.column - (direction === 'horizontal' ? anchorIndex : 0)
				const path = equationPath(startRow, startColumn, direction)
				if (!path.every((coordinate) => coordinate.row >= 0 && coordinate.row < config.rows && coordinate.column >= 0 && coordinate.column < config.columns)) continue
				const anchorValue = assignments.get(coordinateKey(anchor))
				const candidates = triples.filter((triple) => {
					const value = anchorIndex === 0 ? triple.a : anchorIndex === 1 ? triple.b : triple.c
					return value === anchorValue && canPlaceBinary(path, triple, cells, assignments)
				})
				if (candidates.length === 0) continue
				addBinaryEquationToHybrid(cells, assignments, equations, binaryIndex, path, random.pick(candidates))
				binaryIndex += 1
			}
			if (binaryIndex < config.targetBinaryEquationCount) continue
			const solution: PuzzleSolution = {
				values: [...assignments.entries()].map(([key, value]) => {
					const [row, column] = key.split(',').map(Number)
					return { coordinate: { row, column }, value }
				}),
			}
			const blankKeys = new Set<string>()
			const target = Math.min(config.targetBlankCount, solution.values.length - 1)
			for (const assignment of random.shuffle(solution.values)) {
				if (blankKeys.size >= target) break
				const key = coordinateKey(assignment.coordinate)
				blankKeys.add(key)
				const candidate = createHybridPuzzle(config, cells, equations, blankKeys)
				const count = countHybridSolutions(candidate, 2, { maxNodes: config.solverMaxNodes })
				if (count.status !== 'complete' || count.count !== 1) blankKeys.delete(key)
			}
			if (blankKeys.size < target) continue
			const puzzle = createHybridPuzzle(config, cells, equations, blankKeys)
			const count = countHybridSolutions(puzzle, 2, { maxNodes: config.solverMaxNodes })
			if (count.status === 'complete' && count.count === 1) return { puzzle, solution, generationAttempts: generationAttempt }
		} catch {
			// A failed long-expression base or placement is a bounded candidate failure.
		}
	}
	throw new Error(`unable to generate hybrid puzzle after ${config.maxGenerationAttempts} bounded attempts`)
}

export type AdvancedDifficultyAnalysis = {
	readonly score: number
	readonly density: OccupiedDensityMetrics
	readonly blankCount: number
	readonly initialForcedCells: number
	readonly forcedCellsByWave: readonly number[]
	readonly propagationWaves: number
	readonly unresolvedAfterLogic: number
	readonly averageCandidatesBeforeResolution: number
	readonly maxCandidatesBeforeResolution: number
	readonly ambiguityMoments: number
	readonly solver: SolverResult
}

function mixedDensity(
	puzzle: { readonly grid: { readonly rows: number; readonly columns: number; readonly cells: readonly CrossMathCell[] }; readonly equations: readonly HybridEquation[] },
): OccupiedDensityMetrics {
	const cells = puzzle.grid.cells
	const rows = cells.map((cell) => cell.coordinate.row)
	const columns = cells.map((cell) => cell.coordinate.column)
	const minRow = rows.length === 0 ? 0 : Math.min(...rows)
	const maxRow = rows.length === 0 ? 0 : Math.max(...rows)
	const minColumn = columns.length === 0 ? 0 : Math.min(...columns)
	const maxColumn = columns.length === 0 ? 0 : Math.max(...columns)
	const area = Math.max(1, (maxRow - minRow + 1) * (maxColumn - minColumn + 1))
	const appearances = new Map<string, number>()
	for (const equation of puzzle.equations) {
		for (const coordinate of hybridNumberCoordinates(equation)) {
			const key = coordinateKey(coordinate)
			appearances.set(key, (appearances.get(key) ?? 0) + 1)
		}
	}
	const crossingCellCount = [...appearances.values()].filter((count) => count > 1).length
	return {
		occupiedCellCount: cells.length,
		occupiedBoundingBoxArea: area,
		occupiedDensity: Math.round((cells.length / area) * 1000) / 1000,
		crossingCellCount,
		crossingRatio: Math.round((crossingCellCount / Math.max(1, puzzle.equations.length)) * 1000) / 1000,
		numberCellCount: cells.filter((cell) => cell.kind === 'number').length,
		equationCount: puzzle.equations.length,
	}
}

function oneHybridPropagationWave(puzzle: HybridPuzzle, domains: Map<string, Set<number>>): boolean {
	let changed = false
	for (const equation of puzzle.equations) {
		const coordinates = hybridNumberCoordinates(equation)
		const supports = hybridSupports(puzzle, equation, domains)
		if (!supports) return false
		for (let index = 0; index < coordinates.length; index += 1) {
			const domain = domains.get(coordinateKey(coordinates[index])) as Set<number>
			for (const value of domain) {
				if (!supports[index].has(value)) {
					domain.delete(value)
					changed = true
				}
			}
			if (domain.size === 0) return false
		}
	}
	return changed
}

function advancedScore(
	blankCount: number,
	initialForced: number,
	waves: number,
	averageCandidates: number,
	unresolved: number,
	density: OccupiedDensityMetrics,
	solver: SolverResult,
): number {
	const blankPressure = Math.min(1, blankCount / 14)
	const deductionPressure = blankCount === 0 ? 0 : 1 - initialForced / blankCount
	const wavePressure = Math.min(1, Math.max(0, waves - 1) / 6)
	const ambiguityPressure = Math.min(1, Math.max(0, averageCandidates - 1) / 10)
	const unresolvedPressure = blankCount === 0 ? 0 : unresolved / blankCount
	const structurePressure = Math.min(1, density.crossingRatio) * 0.5 + Math.min(1, density.occupiedDensity / 0.35) * 0.5
	const searchPressure = Math.min(1, Math.log2(Math.max(1, solver.metrics.nodesVisited)) / 8)
	return Math.round(Math.min(100, (
		blankPressure * 18 + deductionPressure * 20 + wavePressure * 18 + ambiguityPressure * 20 +
		unresolvedPressure * 10 + structurePressure * 10 + searchPressure * 4
	)) * 100) / 100
}

export function analyzeHybridPuzzle(puzzle: HybridPuzzle): AdvancedDifficultyAnalysis {
	const errors = validateHybridPuzzle(puzzle)
	if (errors.length > 0) throw new Error(`cannot analyze invalid hybrid puzzle: ${errors.join('; ')}`)
	const blankKeys = new Set(puzzle.grid.cells.filter((cell) => cell.kind === 'number' && cell.state === 'blank').map((cell) => coordinateKey(cell.coordinate)))
	const domains = hybridDomains(puzzle)
	const forcedCellsByWave: number[] = []
	let ambiguityMoments = 0
	let candidateTotal = 0
	let candidateCount = 0
	let maxCandidates = 0
	while (true) {
		for (const key of blankKeys) {
			const size = domains.get(key)?.size ?? 0
			if (size > 1) {
				ambiguityMoments += 1
				candidateTotal += size
				candidateCount += 1
				maxCandidates = Math.max(maxCandidates, size)
			}
		}
		const before = new Map([...domains.entries()].map(([key, values]) => [key, values.size]))
		const changed = oneHybridPropagationWave(puzzle, domains)
		const newlyForced = [...blankKeys].filter((key) => (before.get(key) ?? 0) > 1 && (domains.get(key)?.size ?? 0) === 1).length
		if (newlyForced > 0) forcedCellsByWave.push(newlyForced)
		if (!changed || forcedCellsByWave.length > blankKeys.size + 1) break
	}
	const unresolved = [...blankKeys].filter((key) => (domains.get(key)?.size ?? 0) > 1).length
	const solver = solveHybridPuzzle(puzzle)
	const density = mixedDensity(puzzle)
	return {
		score: advancedScore(blankKeys.size, forcedCellsByWave[0] ?? 0, forcedCellsByWave.length, candidateCount === 0 ? 0 : candidateTotal / candidateCount, unresolved, density, solver),
		density,
		blankCount: blankKeys.size,
		initialForcedCells: forcedCellsByWave[0] ?? 0,
		forcedCellsByWave,
		propagationWaves: forcedCellsByWave.length,
		unresolvedAfterLogic: unresolved,
		averageCandidatesBeforeResolution: candidateCount === 0 ? 0 : Math.round((candidateTotal / candidateCount) * 100) / 100,
		maxCandidatesBeforeResolution: maxCandidates,
		ambiguityMoments,
		solver,
	}
}

export type AdvancedNumberBankPuzzle = ExpressionPuzzle | HybridPuzzle

function withAdvancedBlankFixed(
	puzzle: AdvancedNumberBankPuzzle,
	coordinate: CellCoordinate,
	value: number,
): AdvancedNumberBankPuzzle {
	return {
		...puzzle,
		grid: {
			...puzzle.grid,
			cells: puzzle.grid.cells.map((cell) => {
				if (cell.kind !== 'number' || coordinateKey(cell.coordinate) !== coordinateKey(coordinate)) return cell
				return { ...cell, state: 'fixed', value }
			}),
		},
	}
}

export function countAdvancedSolutions(
	puzzle: AdvancedNumberBankPuzzle,
	options: { readonly maxNodes?: number },
): { readonly count: 0 | 1 | 2; readonly status: 'complete' | 'safety-limit' } {
	if (puzzle.equations.some((equation) => !isExpressionEquation(equation))) {
		return countHybridSolutions(puzzle as HybridPuzzle, 1, options)
	}
	return countExpressionSolutions(puzzle as ExpressionPuzzle, 1, options)
}

export function deriveAdvancedNumberBank(
	puzzle: AdvancedNumberBankPuzzle,
	solution: PuzzleSolution,
	options: { readonly mode?: NumberBankMode; readonly distractorCount?: number; readonly seed?: string | number } = {},
): NumberBank {
	return deriveNumberBank(puzzle as Puzzle, solution, options)
}

export function analyzeAdvancedNumberBank(
	puzzle: AdvancedNumberBankPuzzle,
	bank: NumberBank,
	options: { readonly maxNodes?: number } = {},
): NumberBankAnalysis {
	const values = [...new Set(bank.items.map((item) => item.value))]
	const blanks = puzzle.grid.cells.filter((cell) => cell.kind === 'number' && cell.state === 'blank')
	const compatibleCounts = blanks.map((blank) => values.filter((value) =>
		countAdvancedSolutions(withAdvancedBlankFixed(puzzle, blank.coordinate, value), options).count > 0,
	).length)
	const total = compatibleCounts.reduce((sum, value) => sum + value, 0)
	const initialCompatibleValueCounts = initialBankCompatibleCounts(puzzle as HybridPuzzle, values)
	const initialTotal = initialCompatibleValueCounts.reduce((sum, value) => sum + value, 0)
	return {
		bankItemCount: bank.items.length,
		answerItemCount: bank.items.filter((item) => item.kind === 'answer').length,
		distractorItemCount: bank.items.filter((item) => item.kind === 'distractor').length,
		duplicateAnswerValues: Object.values(bank.duplicateValueCounts).filter((count) => count > 1).length,
		averageCompatibleValuesPerBlank: blanks.length === 0 ? 0 : Math.round((total / blanks.length) * 100) / 100,
		singleCompatibleBlankCount: compatibleCounts.filter((count) => count === 1).length,
		initialCompatibleValueCounts,
		averageInitialCompatibleValuesPerBlank: blanks.length === 0 ? 0 : Math.round((initialTotal / blanks.length) * 100) / 100,
		singleInitialCompatibleBlankCount: initialCompatibleValueCounts.filter((count) => count === 1).length,
	}
}

export type PregeneratedCampaignEntry = {
	readonly level: number
	readonly puzzle: Puzzle | HybridPuzzle
	readonly solution: PuzzleSolution
	readonly metrics: {
		readonly score: number
		readonly density: OccupiedDensityMetrics
		readonly generationMs: number
		readonly jsonBytes: number
	}
}

export type PregeneratedCampaignCatalog = {
	readonly schemaVersion: 1
	readonly track: ExperimentalTrack
	readonly variant: 'binary' | 'hybrid'
	readonly generatorVersion: string
	readonly requestedLevels: number
	readonly generatedLevels: number
	readonly entries: readonly PregeneratedCampaignEntry[]
	readonly failures: readonly { readonly level: number; readonly error: string }[]
	readonly totalGenerationMs: number
	readonly averagePuzzleJsonBytes: number
	readonly stoppedReason?: 'time-budget'
}

export type CampaignCatalogOptions = {
	readonly levels?: readonly number[]
	readonly maxTotalMs?: number
	readonly seedPrefix?: string
	readonly variant?: 'binary' | 'hybrid'
}

export function buildPregeneratedCampaignCatalog(
	track: ExperimentalTrack,
	options: CampaignCatalogOptions = {},
): PregeneratedCampaignCatalog {
	const levels = options.levels ?? Array.from({ length: LEVEL_LIMIT }, (_, index) => index + 1)
	const variant = options.variant ?? 'binary'
	const startedAt = Date.now()
	const entries: PregeneratedCampaignEntry[] = []
	const failures: { level: number; error: string }[] = []
	let stoppedReason: 'time-budget' | undefined
	for (const level of levels) {
		if (options.maxTotalMs !== undefined && Date.now() - startedAt >= options.maxTotalMs) {
			stoppedReason = 'time-budget'
			break
		}
		const levelStartedAt = Date.now()
		try {
			const seed = deriveSeed(options.seedPrefix ?? 'phase5.5b-catalog', track, level, variant)
			if (variant === 'hybrid') {
				const result = generateHybridPuzzle(seed, {
					rows: 15,
					columns: 15,
					minValue: 1,
					maxValue: 24,
					allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
					targetEquationCount: 4,
					targetBinaryEquationCount: 4,
					targetBlankCount: 9,
					maxGenerationAttempts: 30,
					solverMaxNodes: 200_000,
				})
				const puzzleJson = JSON.stringify(result.puzzle)
				entries.push({
					level,
					puzzle: result.puzzle,
					solution: result.solution,
					metrics: {
						score: analyzeHybridPuzzle(result.puzzle).score,
						density: analyzeHybridPuzzle(result.puzzle).density,
						generationMs: Date.now() - levelStartedAt,
						jsonBytes: Buffer.byteLength(puzzleJson, 'utf8'),
					},
				})
			} else {
				const result = generateTrackPuzzle(track, level, { seed })
				const puzzleJson = JSON.stringify(result.generated.puzzle)
				entries.push({
					level,
					puzzle: result.generated.puzzle,
					solution: result.generated.solution,
					metrics: {
						score: result.analysis.score,
						density: result.density,
						generationMs: Date.now() - levelStartedAt,
						jsonBytes: Buffer.byteLength(puzzleJson, 'utf8'),
					},
				})
			}
		} catch (error) {
			failures.push({ level, error: error instanceof Error ? error.message : String(error) })
		}
	}
	const totalGenerationMs = Date.now() - startedAt
	return {
		schemaVersion: 1,
		track,
		variant,
		generatorVersion: variant === 'hybrid' ? 'phase5.5b-hybrid-v1' : EXPERIMENTAL_GENERATOR_VERSION,
		requestedLevels: levels.length,
		generatedLevels: entries.length,
		entries,
		failures,
		totalGenerationMs,
		averagePuzzleJsonBytes: entries.length === 0 ? 0 : Math.round(entries.reduce((sum, entry) => sum + entry.metrics.jsonBytes, 0) / entries.length),
		...(stoppedReason === undefined ? {} : { stoppedReason }),
	}
}

export type CatalogValidationReport = {
	readonly valid: boolean
	readonly levelsChecked: number
	readonly unique: number
	readonly invalid: number
	readonly nonUnique: number
	readonly safetyLimitHits: number
}

export function validatePregeneratedCampaignCatalog(
	catalog: PregeneratedCampaignCatalog,
	options: { readonly maxNodes?: number } = {},
): CatalogValidationReport {
	let invalid = 0
	let unique = 0
	let nonUnique = 0
	let safetyLimitHits = 0
	for (const entry of catalog.entries) {
		const isHybrid = entry.puzzle.equations.some((equation) => equation.cells.length > 5)
		const validation = isHybrid ? { valid: validateHybridPuzzle(entry.puzzle as HybridPuzzle).length === 0 } : validatePuzzle(entry.puzzle as Puzzle, {
			requirements: { requireHorizontalAndVertical: true, requireCrossing: true, requireConnected: true },
		})
		if (!validation.valid) {
			invalid += 1
			continue
		}
		const solved = isHybrid
			? countHybridSolutions(entry.puzzle as HybridPuzzle, 2, options)
			: countSolutions(entry.puzzle as Puzzle, 2, options)
		if (solved.status === 'safety-limit') safetyLimitHits += 1
		else if (solved.count === 1) unique += 1
		else nonUnique += 1
	}
	return {
		valid: invalid === 0 && nonUnique === 0 && safetyLimitHits === 0,
		levelsChecked: catalog.entries.length,
		unique,
		invalid,
		nonUnique,
		safetyLimitHits,
	}
}

export function serializePregeneratedCampaignCatalog(catalog: PregeneratedCampaignCatalog): string {
	// Runtime campaign payload intentionally excludes timing/score metadata and
	// the generator's private solution. This keeps the release catalog compact
	// and byte-for-byte reproducible across build machines.
	return `${JSON.stringify({
		schemaVersion: catalog.schemaVersion,
		track: catalog.track,
		variant: catalog.variant,
		generatorVersion: catalog.generatorVersion,
		levels: catalog.entries.map((entry) => ({ level: entry.level, puzzle: entry.puzzle })),
	})}\n`
}

export function analyzeExpressionPuzzle(puzzle: ExpressionPuzzle): AdvancedDifficultyAnalysis {
	const hybrid: HybridPuzzle = { ...puzzle, equations: puzzle.equations }
	return analyzeHybridPuzzle(hybrid)
}

export type AdvancedCandidateKind = 'binary' | 'long' | 'hybrid'

export type AdvancedCandidateSummary = {
	readonly kind: AdvancedCandidateKind
	readonly requested: number
	readonly accepted: number
	readonly failures: number
	readonly acceptanceRate: number
	readonly medianGenerationMs: number
	readonly p90GenerationMs: number
	readonly maxGenerationMs: number
	readonly medianScore: number
	readonly medianDensity: number
	readonly medianEquationCount: number
	readonly medianBlankCount: number
	readonly medianPropagationWaves: number
	readonly medianAmbiguityMoments: number
	readonly medianCrossings: number
	readonly medianSolverNodes: number
}

export type AdvancedComparisonReport = {
	readonly generatorVersion: string
	readonly requestedPerCandidate: number
	readonly summaries: readonly AdvancedCandidateSummary[]
}

function percentile(values: readonly number[], fraction: number): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0
}

export function compareAdvancedCandidates(
	requestedPerCandidate = 20,
	seedPrefix = 'phase5.5b-advanced',
): AdvancedComparisonReport {
	if (!Number.isInteger(requestedPerCandidate) || requestedPerCandidate < 1) {
		throw new RangeError('requestedPerCandidate must be a positive integer')
	}
	const kinds: readonly AdvancedCandidateKind[] = ['binary', 'long', 'hybrid']
	const summaries = kinds.map((kind) => {
		const times: number[] = []
		const scores: number[] = []
		const densities: number[] = []
		const equations: number[] = []
		const blanks: number[] = []
		const waves: number[] = []
		const ambiguities: number[] = []
		const crossings: number[] = []
		const nodes: number[] = []
		let accepted = 0
		for (let index = 0; index < requestedPerCandidate; index += 1) {
			const startedAt = Date.now()
			try {
				const seed = deriveSeed(seedPrefix, kind, index)
				let analysis: AdvancedDifficultyAnalysis
				if (kind === 'binary') {
					const result = generateTrackPuzzle('lobachevsky', 1, { seed })
					analysis = {
						score: result.analysis.score,
						density: result.density,
						blankCount: result.analysis.metrics.blankCount,
						initialForcedCells: result.analysis.metrics.initialForcedCells,
						forcedCellsByWave: result.analysis.metrics.forcedCellsByWave,
						propagationWaves: result.analysis.metrics.propagationWaves,
						unresolvedAfterLogic: result.analysis.metrics.unresolvedAfterLogic,
						averageCandidatesBeforeResolution: result.analysis.metrics.averageCandidatesBeforeResolution,
						maxCandidatesBeforeResolution: result.analysis.metrics.maxCandidatesBeforeResolution,
						ambiguityMoments: result.analysis.metrics.ambiguityMoments,
						solver: result.analysis.solver,
					}
				} else if (kind === 'long') {
					const result = generateLongExpressionPuzzle(seed, { targetEquationCount: 5, targetBlankCount: 8 })
					analysis = analyzeExpressionPuzzle(result.puzzle)
				} else {
					const result = generateHybridPuzzle(seed, { targetEquationCount: 3, targetBinaryEquationCount: 3, targetBlankCount: 8 })
					analysis = analyzeHybridPuzzle(result.puzzle)
				}
				accepted += 1
				const elapsed = Date.now() - startedAt
				times.push(elapsed)
				scores.push(analysis.score)
				densities.push(analysis.density.occupiedDensity)
				equations.push(analysis.density.equationCount)
				blanks.push(analysis.blankCount)
				waves.push(analysis.propagationWaves)
				ambiguities.push(analysis.ambiguityMoments)
				crossings.push(analysis.density.crossingCellCount)
				nodes.push(analysis.solver.metrics.nodesVisited)
			} catch {
				// Candidate failure is reported in the acceptance rate.
			}
		}
		return {
			kind,
			requested: requestedPerCandidate,
			accepted,
			failures: requestedPerCandidate - accepted,
			acceptanceRate: Math.round((accepted / requestedPerCandidate) * 10000) / 10000,
			medianGenerationMs: median(times),
			p90GenerationMs: percentile(times, 0.9),
			maxGenerationMs: times.length === 0 ? 0 : Math.max(...times),
			medianScore: median(scores),
			medianDensity: median(densities),
			medianEquationCount: median(equations),
			medianBlankCount: median(blanks),
			medianPropagationWaves: median(waves),
			medianAmbiguityMoments: median(ambiguities),
			medianCrossings: median(crossings),
			medianSolverNodes: median(nodes),
		}
	})
	return { generatorVersion: 'phase5.5b-advanced-v1', requestedPerCandidate, summaries }
}

export function renderExpressionPuzzleAscii(puzzle: ExpressionPuzzle, solution?: ExpressionSolution): string {
	const solutionValues = new Map((solution?.values ?? []).map((assignment) => [coordinateKey(assignment.coordinate), assignment.value]))
	const cells = new Map(puzzle.grid.cells.map((cell) => [coordinateKey(cell.coordinate), cell]))
	const lines: string[] = []
	for (let row = 0; row < puzzle.grid.rows; row += 1) {
		const symbols: string[] = []
		for (let column = 0; column < puzzle.grid.columns; column += 1) {
			const coordinate = { row, column }
			const cell = cells.get(coordinateKey(coordinate))
			if (!cell) symbols.push(' ')
			else if (cell.kind === 'number') {
				const value = cell.state === 'blank' ? solutionValues.get(coordinateKey(coordinate)) : cell.value
				symbols.push(value === undefined || value === null ? '□' : String(value))
			} else if (cell.kind === 'operator') symbols.push(operatorSymbol(cell.operator))
			else symbols.push('=')
		}
		lines.push(symbols.join(' '))
	}
	return lines.join('\n')
}

export function renderHybridPuzzleAscii(puzzle: HybridPuzzle, solution?: PuzzleSolution): string {
	return renderExpressionPuzzleAscii(puzzle as ExpressionPuzzle, solution)
}
