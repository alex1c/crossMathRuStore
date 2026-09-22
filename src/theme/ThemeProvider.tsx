import {
	createContext,
	useContext,
	useMemo,
	type ReactNode,
} from 'react'
import { useColorScheme as useSystemColorScheme } from 'react-native'
import {
	colors,
	radius,
	spacing,
	touchTarget,
	typography,
	type ColorSchemeName,
	type ThemeColors,
} from './tokens'

export type AppTheme = {
	scheme: ColorSchemeName
	colors: ThemeColors
	spacing: typeof spacing
	radius: typeof radius
	typography: typeof typography
	touchTarget: typeof touchTarget
}

const ThemeContext = createContext<AppTheme | null>(null)

type ThemeProviderProps = {
	children: ReactNode
	/** Optional override for tests / forced scheme. */
	forcedScheme?: ColorSchemeName
}

/**
 * Provides light/dark semantic tokens. Defaults to the system color scheme.
 * Architecture is ready for a future Settings preference override.
 */
export function ThemeProvider({
	children,
	forcedScheme,
}: ThemeProviderProps) {
	const systemScheme = useSystemColorScheme()
	const scheme: ColorSchemeName =
		forcedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light')

	const value = useMemo<AppTheme>(
		() => ({
			scheme,
			colors: colors[scheme],
			spacing,
			radius,
			typography,
			touchTarget,
		}),
		[scheme],
	)

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	)
}

/**
 * Access the active theme. Must be used under ThemeProvider.
 */
export function useTheme(): AppTheme {
	const theme = useContext(ThemeContext)
	if (!theme) {
		throw new Error('useTheme must be used within ThemeProvider')
	}
	return theme
}
