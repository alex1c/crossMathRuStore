/**
 * Bottom banner slot for non-game screens.
 * Reserved geometry is always 50px; real RSYA host loads when enabled.
 * Training/onboarding never loads a real ad.
 */

import { StyleSheet, Text, View } from 'react-native'
import { ADS_BANNER_RESERVED_HEIGHT, type BannerPlacement } from '@/src/config/ads'
import { ProductionBanner } from '@/src/components/ads/ProductionBanner'
import { useTheme } from '@/src/theme'

export { ADS_BANNER_RESERVED_HEIGHT as BANNER_SLOT_RESERVED_HEIGHT }
export type { BannerPlacement }

type BannerSlotProps = {
	readonly placement: BannerPlacement
}

/**
 * Bottom-attached banner geometry contract.
 * Real ads load for suitable placements; training stays empty reserved space.
 */
export function BannerSlot({ placement }: BannerSlotProps) {
	const theme = useTheme()
	const enabled = placement !== 'training'

	return (
		<View
			style={styles.wrap}
			testID={`banner-slot-${placement}`}
		>
			<ProductionBanner
				placement={placement}
				height={ADS_BANNER_RESERVED_HEIGHT}
				enabled={enabled}
			/>
			{__DEV__ && !enabled ? (
				<View
					pointerEvents="none"
					style={[
						styles.devOverlay,
						{ borderColor: theme.colors.border },
					]}
				>
					<Text
						style={{
							color: theme.colors.textSecondary,
							fontSize: 10,
							opacity: 0.45,
						}}
					>
						banner (no ad)
					</Text>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		height: ADS_BANNER_RESERVED_HEIGHT,
		position: 'relative',
	},
	devOverlay: {
		...StyleSheet.absoluteFill,
		alignItems: 'center',
		justifyContent: 'center',
		borderTopWidth: StyleSheet.hairlineWidth,
	},
})
