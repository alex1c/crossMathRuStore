/**
 * CrossMath pure TypeScript core.
 *
 * Keep this folder independent from React Native APIs.
 * Phase 1 will add generator + solver + Jest stress tests here.
 */

export type {
	CrossMathOperator,
	CrossMathCellKind,
	CrossMathCell,
	CrossMathPuzzle,
	CrossMathEngine,
} from './types'
export { createCrossMathEngine } from './types'
