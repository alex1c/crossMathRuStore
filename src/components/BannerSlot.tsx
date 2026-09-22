import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/src/theme'

type BannerSlotProps = {
	/**
	 * Placement id for future ad wiring (Home, levels, stats, …).
	 * No Ad SDK is integrated in Phase 0.
	 */
	placement: 'home' | 'levels' | 'stats' | 'game'
}

/**
 * Architectural reserved region for a future non-game banner.
 * Keeps layout ready for ads without shipping any Ad SDK or test IDs.
 * Height stays zero until monetization phase enables a real banner.
 */
export function BannerSlot({ placement }: BannerSlotProps) {
	const theme = useTheme()

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[styles.slot, { borderColor: theme.colors.border }]}
			// placement retained for future wiring / analytics keys
			testID={`banner-slot-${placement}`}
		/>
	)
}

const styles = StyleSheet.create({
	slot: {
		minHeight: 0,
		height: 0,
		overflow: 'hidden',
	},
})
