import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import {
	SafeAreaView,
	type Edge,
} from 'react-native-safe-area-context'
import { useTheme } from '@/src/theme'

type ScreenProps = {
	title?: string
	subtitle?: string
	children?: ReactNode
	/** When true, content scrolls; bottom safe-area still applies. */
	scroll?: boolean
	/** Safe-area edges; bottom is included by default for CTA clearance. */
	edges?: readonly Edge[]
	/**
	 * Optional reserved footer (e.g. future Home banner).
	 * Kept outside the scroll body so ads never compete with CTAs.
	 */
	footer?: ReactNode
}

/**
 * Shared screen shell with real safe-area insets (no fixed paddingBottom hacks).
 * Important CTAs must live inside this shell, not flush to the gesture zone.
 */
export function Screen({
	title,
	subtitle,
	children,
	scroll = false,
	edges = ['top', 'right', 'left', 'bottom'],
	footer,
}: ScreenProps) {
	const theme = useTheme()
	const styles = createStyles(theme)

	const header =
		title || subtitle ? (
			<View style={styles.header}>
				{title ? <Text style={styles.title}>{title}</Text> : null}
				{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
			</View>
		) : null

	const body = scroll ? (
		<ScrollView
			style={styles.flex}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			{header}
			{children}
		</ScrollView>
	) : (
		<View style={styles.body}>
			{header}
			<View style={styles.flex}>{children}</View>
		</View>
	)

	return (
		<SafeAreaView style={styles.safe} edges={edges}>
			<View style={styles.container}>
				{body}
				{footer ? <View style={styles.footer}>{footer}</View> : null}
			</View>
		</SafeAreaView>
	)
}

function createStyles(theme: ReturnType<typeof useTheme>) {
	return StyleSheet.create({
		safe: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		container: {
			flex: 1,
			paddingHorizontal: theme.spacing.lg,
			paddingTop: theme.spacing.md,
			paddingBottom: theme.spacing.md,
		},
		body: {
			flex: 1,
		},
		flex: {
			flex: 1,
		},
		scrollContent: {
			flexGrow: 1,
			paddingBottom: theme.spacing.md,
		},
		header: {
			marginBottom: theme.spacing.lg,
		},
		title: {
			...theme.typography.display,
			color: theme.colors.text,
		},
		subtitle: {
			...theme.typography.body,
			color: theme.colors.textSecondary,
			marginTop: theme.spacing.xs,
		},
		footer: {
			marginTop: theme.spacing.sm,
		},
	})
}
