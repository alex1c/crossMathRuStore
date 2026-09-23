/**
 * Reserved sticky banner region for future RSYA placement.
 * No Ad SDK — only physical height reservation above the bottom inset.
 */

import { StyleSheet, Text, View } from 'react-native'
import { GAME_BANNER_RESERVED_HEIGHT } from '@/src/features/game/gameLayout'
import { useTheme } from '@/src/theme'

type GameBannerSlotProps = {
	readonly height?: number
}

/**
 * Sticky game banner slot. Production: empty reserved space.
 * DEV: subtle outline so QA can verify layout without fake ad copy.
 */
export function GameBannerSlot({
	height = GAME_BANNER_RESERVED_HEIGHT,
}: GameBannerSlotProps) {
	const theme = useTheme()

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				styles.slot,
				{
					height,
					borderColor: __DEV__ ? theme.colors.border : 'transparent',
				},
			]}
			testID="game-banner-slot"
		>
			{__DEV__ ? (
				<Text
					style={{
						color: theme.colors.textSecondary,
						fontSize: 10,
						opacity: 0.55,
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
