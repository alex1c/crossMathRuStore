/**
 * Sticky game banner region — reserved height + real RSYA host when available.
 */

import { StyleSheet, View } from 'react-native'
import { ADS_BANNER_RESERVED_HEIGHT } from '@/src/config/ads'
import { ProductionBanner } from '@/src/components/ads/ProductionBanner'
import { GAME_BANNER_RESERVED_HEIGHT } from '@/src/features/game/gameLayout'

type GameBannerSlotProps = {
	readonly height?: number
}

/**
 * Sticky game banner slot. Geometry always reserved; ad failure stays empty.
 */
export function GameBannerSlot({
	height = GAME_BANNER_RESERVED_HEIGHT,
}: GameBannerSlotProps) {
	return (
		<View style={[styles.slot, { height }]} testID="game-banner-slot">
			<ProductionBanner
				placement="game"
				height={height}
				enabled
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	slot: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		minHeight: ADS_BANNER_RESERVED_HEIGHT,
	},
})
