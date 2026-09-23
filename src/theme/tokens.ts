/**
 * Centralized design tokens for CrossMath.
 * Screens must use semantic tokens — never hard-code palette hex values.
 */

export const spacing = {
	xxs: 4,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
} as const

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
} as const

export const typography = {
	display: {
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '700' as const,
	},
	title: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '700' as const,
	},
	subtitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '600' as const,
	},
	body: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '400' as const,
	},
	bodyStrong: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '600' as const,
	},
	caption: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500' as const,
	},
	label: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: '600' as const,
	},
} as const

/**
 * Semantic color tokens for light and dark schemes.
 * Includes CrossMath-specific cell / operator colors for Phase 1+ board UI.
 */
export const colors = {
	light: {
		background: '#F4F7FB',
		surface: '#FFFFFF',
		primary: '#2F6FED',
		text: '#1A2B3C',
		textSecondary: '#5A6B7C',
		textOnPrimary: '#FFFFFF',
		border: '#D8E0E8',
		success: '#1FA97A',
		error: '#D64545',
		errorSoft: '#FDECEC',
		selectedCell: '#D6E6FF',
		relatedCell: '#EEF3FA',
		hintedCell: '#E8F8F0',
		fixedNumber: '#0F1B2A',
		userNumber: '#2F6FED',
		operator: '#5A6B7C',
		equation: '#1A2B3C',
	},
	dark: {
		background: '#121820',
		surface: '#1C2430',
		primary: '#5B8FF9',
		text: '#F1F5F9',
		textSecondary: '#94A3B8',
		textOnPrimary: '#0B1220',
		border: '#334155',
		success: '#34D399',
		error: '#F87171',
		errorSoft: '#3A1F1F',
		selectedCell: '#243B63',
		relatedCell: '#1A2738',
		hintedCell: '#1A3328',
		fixedNumber: '#F8FAFC',
		userNumber: '#93C5FD',
		operator: '#94A3B8',
		equation: '#F1F5F9',
	},
} as const

export type ColorSchemeName = 'light' | 'dark'

/** Semantic palette shape shared by light/dark token sets. */
export type ThemeColors = {
	background: string
	surface: string
	primary: string
	text: string
	textSecondary: string
	textOnPrimary: string
	border: string
	success: string
	error: string
	errorSoft: string
	selectedCell: string
	relatedCell: string
	hintedCell: string
	fixedNumber: string
	userNumber: string
	operator: string
	equation: string
}

export const touchTarget = {
	min: 48,
} as const
