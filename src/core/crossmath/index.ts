/** Public, pure-TypeScript CrossMath API. */
import { generatePuzzle } from './generator'
import { hasUniqueSolution, solvePuzzle } from './solver'
import type { CrossMathEngine } from './types'

export type {
	ArithmeticConfig,
	ArithmeticOperator,
	CellCoordinate,
	CrossMathCell,
	CrossMathCellKind,
	CrossMathEngine,
	CrossMathOperator,
	CalibrationProfileSummary,
	DailyMode,
	DifficultyAnalysis,
	DifficultyMetrics,
	DifficultyScoreRange,
	DifficultyTier,
	EndlessProgress,
	Equation,
	EquationCellCoordinates,
	EquationDirection,
	EqualsCell,
	GeneratedPuzzle,
	NumberAssignment,
	NumberCell,
	OperatorCell,
	Puzzle,
	PuzzleDefinition,
	PuzzleGenerationConfig,
	PuzzleGrid,
	PuzzleMetadata,
	PuzzleSolution,
	PuzzleStructureRequirements,
	PuzzleValidationOptions,
	PuzzleValidationResult,
	GenerationProfile,
	MultiplicationTable,
	ProfiledPuzzle,
	SolutionCountResult,
	SolverMetrics,
	SolverResult,
	SolverStatus,
} from './types'

export {
	DEFAULT_GENERATION_CONFIG,
	PuzzleGenerationError,
	generatePuzzle,
} from './generator'
export { countSolutions, hasUniqueSolution, solvePuzzle } from './solver'
export { analyzeDifficulty } from './difficulty'
export { calibrateDifficultyProfile, calibrateDifficultyProfiles } from './calibration'
export {
	DifficultyGenerationError,
	generateCampaignPuzzle,
	generateDailyPuzzle,
	generateEndlessPuzzle,
	generateMultiplicationTablePuzzle,
	generatePuzzleForProfile,
	getCampaignGenerationProfile,
	getDailyGenerationProfile,
	getDifficultyProfile,
	getEndlessGenerationProfile,
	getMultiplicationTableGenerationProfile,
} from './profiles'
export { validatePuzzle } from './validator'
export { deriveSeed } from './rng'
export {
	evaluateArithmetic,
	isValueInRange,
	operatorSymbol,
} from './arithmetic'
export {
	coordinateKey,
	coordinatesEqual,
	getCell,
} from './model'

export function createCrossMathEngine(): CrossMathEngine {
	return {
		generate: generatePuzzle,
		solve: solvePuzzle,
		hasUniqueSolution,
	}
}
