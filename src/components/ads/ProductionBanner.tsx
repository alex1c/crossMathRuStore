/**
 * Production banner host inside a fixed reserved-height slot.
 * No-fill / errors leave the reserved geometry empty — never collapse layout.
 */

import { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import {
	ADS_BANNER_RESERVED_HEIGHT,
	getBannerAdUnitId,
	type BannerPlacement,
} from '@/src/config/ads'
import { getYandexAdsModule } from '@/src/services/ads'
import { trackAnalyticsEvent } from '@/src/services/analytics'

type ProductionBannerProps = {
	readonly placement: BannerPlacement
	readonly height?: number
	/** When false, never load a real ad (onboarding/training). */
	readonly enabled?: boolean
}

type SizedBanner = {
	readonly adUnitId: string
	readonly size: unknown
}

/**
 * Hosts a sticky Yandex banner inside reserved geometry.
 * Parent must already allocate height — this component never grows layout.
 */
export function ProductionBanner({
	placement,
	height = ADS_BANNER_RESERVED_HEIGHT,
	enabled = true,
}: ProductionBannerProps) {
	const [bannerSize, setBannerSize] = useState<SizedBanner | null>(null)
	const [failedUnitId, setFailedUnitId] = useState<string | null>(null)
	const adUnitId = enabled ? getBannerAdUnitId(placement) : ''
	const yandex = adUnitId ? getYandexAdsModule() : null
	const BannerView = yandex?.BannerView
	const failed = failedUnitId === adUnitId && adUnitId.length > 0
	const resolvedSize =
		bannerSize && bannerSize.adUnitId === adUnitId ? bannerSize.size : null

	useEffect(() => {
		if (!adUnitId || !yandex || Platform.OS === 'web') {
			return
		}
		let cancelled = false
		void yandex.BannerAdSize.stickySize(320)
			.then((size) => {
				if (!cancelled) {
					setBannerSize({ adUnitId, size })
				}
			})
			.catch(() => {
				if (!cancelled) {
					setFailedUnitId(adUnitId)
				}
			})
		return () => {
			cancelled = true
		}
	}, [adUnitId, yandex])

	const handleFailed = useCallback(() => {
		setFailedUnitId(adUnitId)
		trackAnalyticsEvent('banner_load_error', { placement })
	}, [adUnitId, placement])

	const canRender =
		Boolean(adUnitId) &&
		Boolean(BannerView) &&
		Boolean(resolvedSize) &&
		!failed &&
		Platform.OS !== 'web'

	return (
		<View
			style={[styles.slot, { height }]}
			pointerEvents={canRender ? 'box-none' : 'none'}
			testID={`production-banner-${placement}`}
		>
			{canRender && BannerView ? (
				<BannerView
					size={resolvedSize as never}
					adRequest={{ adUnitId }}
					onAdFailedToLoad={handleFailed}
					style={styles.banner}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	slot: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	banner: {
		width: 320,
		height: ADS_BANNER_RESERVED_HEIGHT,
	},
})
