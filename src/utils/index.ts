/**
 * Shared pure helpers (no React Native dependency preferred).
 */

/**
 * Clamp a number into an inclusive range.
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}
