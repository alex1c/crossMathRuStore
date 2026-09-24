/**
 * Architectural reserved region for a future non-game banner.
 * Keeps layout ready for ads without shipping any Ad SDK or test IDs.
 */

import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/src/theme'

/** Physical reserved height for list / info screens (matches game banner). */
export const BANNER_SLOT_RESERVED_HEIGHT = 50

export type BannerPlacement =
	| 'home'
	| 'levels'
	| 'stats'
	| 'settings'
	| 'about'
	| 'training'
	| 'reminder'
	| 'game'

type BannerSlotProps = {
	/**
	 * Placement id for future ad wiring.
	 * No Ad SDK is integrated in Phase 5.
	 */
	placement: BannerPlacement
}

/**
 * Bottom-attached banner geometry contract for non-game screens.
 * Production: neutral empty slot. DEV: subtle outline/label only.
 */
export function BannerSlot({ placement }: BannerSlotProps) {
	const theme = useTheme()

	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				styles.slot,
				{
					height: BANNER_SLOT_RESERVED_HEIGHT,
					borderColor: __DEV__ ? theme.colors.border : 'transparent',
				},
			]}
			testID={`banner-slot-${placement}`}
		>
			{__DEV__ ? (
				<Text
					style={{
						color: theme.colors.textSecondary,
						fontSize: 10,
						opacity: 0.45,
					}}
				>
					banner
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	slot: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: __DEV__ ? StyleSheet.hairlineWidth : 0,
		overflow: 'hidden',
	},
})
