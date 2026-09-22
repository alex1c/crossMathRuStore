import type {
	ArithmeticConfig,
	ArithmeticOperator,
} from './types'

export type ArithmeticEvaluation =
	| { readonly valid: true; readonly result: number }
	| { readonly valid: false; readonly reason: string }

export function isValueInRange(value: number, config: ArithmeticConfig): boolean {
	return (
		Number.isSafeInteger(value) &&
		value >= config.minValue &&
		value <= config.maxValue
	)
}

export function evaluateArithmetic(
	a: number,
	operator: ArithmeticOperator,
	b: number,
	config: ArithmeticConfig,
): ArithmeticEvaluation {
	if (!isValueInRange(a, config) || !isValueInRange(b, config)) {
		return { valid: false, reason: 'operand-out-of-range' }
	}

	let result: number
	switch (operator) {
		case 'add':
			result = a + b
			break
		case 'subtract':
			result = a - b
			break
		case 'multiply':
			result = a * b
			break
		case 'divide':
			if (b === 0) {
				return { valid: false, reason: 'division-by-zero' }
			}
			if (a % b !== 0) {
				return { valid: false, reason: 'non-integer-division' }
			}
			result = a / b
			break
	}

	if (!isValueInRange(result, config)) {
		return { valid: false, reason: 'result-out-of-range' }
	}
	return { valid: true, result }
}

export function operatorSymbol(operator: ArithmeticOperator): string {
	switch (operator) {
		case 'add':
			return '+'
		case 'subtract':
			return '−'
		case 'multiply':
			return '×'
		case 'divide':
			return '÷'
	}
}

export function assertArithmeticConfig(config: ArithmeticConfig): void {
	if (!Number.isSafeInteger(config.minValue) || !Number.isSafeInteger(config.maxValue)) {
		throw new Error('Arithmetic bounds must be safe integers')
	}
	if (config.minValue > config.maxValue) {
		throw new Error('Arithmetic minValue must not exceed maxValue')
	}
}

