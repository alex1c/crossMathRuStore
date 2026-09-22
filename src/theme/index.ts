import { colors, type ColorSchemeName, type ThemeColors } from './tokens'

export {
	spacing,
	radius,
	typography,
	colors,
	touchTarget,
} from './tokens'
export type { ColorSchemeName, ThemeColors } from './tokens'
export { ThemeProvider, useTheme } from './ThemeProvider'
export type { AppTheme } from './ThemeProvider'

/**
 * Resolve the active palette without React context (pure helpers / tests).
 */
export function getThemeColors(
	scheme: ColorSchemeName = 'light',
): ThemeColors {
	return colors[scheme]
}
