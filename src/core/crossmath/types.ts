/**
 * Public domain types for the pure CrossMath engine.
 *
 * The persisted puzzle is deliberately made from plain objects and arrays.
 * A coordinate that is absent from `grid.cells` is not a playable cell.
 */

export type ArithmeticOperator = 'add' | 'subtract' | 'multiply' | 'divide'
export type CrossMathOperator = ArithmeticOperator

export type CellCoordinate = {
	readonly row: number
	readonly column: number
}

export type EquationDirection = 'horizontal' | 'vertical'

export type NumberCell = {
	readonly kind: 'number'
	readonly coordinate: CellCoordinate
	readonly state: 'fixed' | 'blank'
	readonly value: number | null
}

export type OperatorCell = {
	readonly kind: 'operator'
	readonly coordinate: CellCoordinate
	readonly operator: ArithmeticOperator
}

export type EqualsCell = {
	readonly kind: 'equals'
	readonly coordinate: CellCoordinate
}

export type CrossMathCell = NumberCell | OperatorCell | EqualsCell
export type CrossMathCellKind = CrossMathCell['kind']

export type EquationCellCoordinates = readonly [
	CellCoordinate,
	CellCoordinate,
	CellCoordinate,
	CellCoordinate,
	CellCoordinate,
]

/**
 * Canonical equation representation. `cells` is ordered from left-to-right
 * or top-to-bottom and has the fixed shape number/operator/number/equals/number.
 * Number coordinates are derived from indexes 0, 2 and 4; they are not stored
 * a second time, so the representation cannot disagree with itself.
 */
export type Equation = {
	readonly id: string
	readonly direction: EquationDirection
	readonly cells: EquationCellCoordinates
	readonly operator: ArithmeticOperator
	readonly relation: 'equals'
}

export type PuzzleGrid = {
	readonly rows: number
	readonly columns: number
	readonly cells: readonly CrossMathCell[]
}

export type Puzzle = {
	readonly schemaVersion: 1
	readonly arithmetic: ArithmeticConfig
	readonly mode?: {
		readonly multiplicationTable?: MultiplicationTable
	}
	readonly grid: PuzzleGrid
	readonly equations: readonly Equation[]
}

export type PuzzleDefinition = Puzzle

export type NumberAssignment = {
	readonly coordinate: CellCoordinate
	readonly value: number
}

export type PuzzleSolution = {
	readonly values: readonly NumberAssignment[]
}

export type ArithmeticConfig = {
	readonly minValue: number
	readonly maxValue: number
}

export type PuzzleGenerationConfig = ArithmeticConfig & {
	readonly rows: number
	readonly columns: number
	readonly allowedOperations: readonly ArithmeticOperator[]
	readonly targetEquationCount: number
	readonly targetBlankCount?: number
	readonly blankRatio?: number
	readonly maxGenerationAttempts: number
	readonly generatorVersion: string
	readonly requireConnected: boolean
	readonly solverMaxNodes: number
	readonly multiplicationTable?: MultiplicationTable
}

export type SolverMetrics = {
	readonly nodesVisited: number
	readonly branchCount: number
	readonly propagationSteps: number
	readonly maxDepth: number
	readonly elapsedMs: number
}

export type SolverStatus =
	| 'no-solution'
	| 'unique'
	| 'multiple'
	| 'safety-limit'

export type SolverResult = {
	readonly status: SolverStatus
	readonly solutionCount: 0 | 1 | 2
	readonly solution?: PuzzleSolution
	readonly metrics: SolverMetrics
	readonly error?: string
}

export type SolutionCountResult = {
	readonly count: 0 | 1 | 2
	readonly status: 'complete' | 'safety-limit'
	readonly metrics: SolverMetrics
}

export type PuzzleStructureRequirements = {
	readonly requireHorizontalAndVertical?: boolean
	readonly requireCrossing?: boolean
	readonly requireConnected?: boolean
}

export type PuzzleValidationOptions = {
	readonly solution?: PuzzleSolution
	readonly arithmetic?: ArithmeticConfig
	readonly requirements?: PuzzleStructureRequirements
}

export type PuzzleValidationResult = {
	readonly valid: boolean
	readonly errors: readonly string[]
	readonly equationCount: number
	readonly numberCellCount: number
	readonly blankCount: number
	readonly crossingCount: number
	readonly connectedComponents: number
}

export type PuzzleMetadata = {
	readonly seed: string | number
	readonly generatorVersion: string
	readonly generationAttempts: number
	readonly equationCount: number
	readonly numberCellCount: number
	readonly blankCount: number
	readonly crossingCount: number
}

export type GeneratedPuzzle = {
	readonly puzzle: Puzzle
	readonly solution: PuzzleSolution
	readonly metadata: PuzzleMetadata
}

export type CrossMathEngine = {
	generate: (seed: string | number, config?: Partial<PuzzleGenerationConfig>) => GeneratedPuzzle
	solve: (puzzle: Puzzle, options?: { maxNodes?: number }) => SolverResult
	hasUniqueSolution: (puzzle: Puzzle, options?: { maxNodes?: number }) => boolean
}

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert'

export type DifficultyMetrics = {
	readonly blankCount: number
	readonly fixedClueCount: number
	readonly clueRatio: number
	readonly equationCount: number
	readonly crossingCount: number
	readonly connectedComponents: number
	readonly structuralDensity: number
	readonly initialForcedCells: number
	readonly forcedCellsByWave: readonly number[]
	readonly propagationWaves: number
	readonly longestForcedChain: number
	readonly unresolvedAfterLogic: number
	readonly averageCandidatesBeforeResolution: number
	readonly maxCandidatesBeforeResolution: number
	readonly ambiguityMoments: number
	readonly choiceWaves: number
	readonly operationMix: Readonly<Partial<Record<ArithmeticOperator, number>>>
	readonly multiplicationFrequency: number
	readonly divisionFrequency: number
	readonly numericRange: number
	readonly solverBranches: number
	readonly solverNodes: number
	readonly solverMaxDepth: number
}

export type DifficultyAnalysis = {
	readonly score: number
	readonly metrics: DifficultyMetrics
	readonly solver: SolverResult
	readonly logicSolved: boolean
}

export type DifficultyScoreRange = {
	readonly min: number
	readonly max: number
}

export type GenerationProfile = {
	readonly id: string
	readonly difficultyTier: DifficultyTier
	readonly scoreRange: DifficultyScoreRange
	readonly generatorVersion: string
	readonly config: Partial<PuzzleGenerationConfig>
	readonly maxCandidateAttempts: number
	readonly seed?: string | number
}

export type ProfiledPuzzle = {
	readonly generated: GeneratedPuzzle
	readonly analysis: DifficultyAnalysis
	readonly profile: GenerationProfile
	readonly candidateAttempts: number
}

export type DailyMode = 'daily' | 'daily-expert'
export type EndlessProgress = {
	readonly completed: number
	readonly streak: number
}
export type MultiplicationTable = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'mixed'

export type CalibrationProfileSummary = {
	readonly profile: DifficultyTier
	readonly accepted: number
	readonly attempts: number
	readonly generationFailures: number
	readonly invalid: number
	readonly nonUnique: number
	readonly safetyLimitHits: number
	readonly acceptanceRate: number
	readonly average: Readonly<Record<string, number>>
	readonly median: Readonly<Record<string, number>>
	readonly scoreMin: number
	readonly scoreMax: number
}
