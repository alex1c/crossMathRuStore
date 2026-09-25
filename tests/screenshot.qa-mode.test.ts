import {
	ADS_BANNER_RESERVED_HEIGHT,
	getBannerAdUnitId,
	isScreenshotQaModeEnabled,
	PRODUCTION_AD_UNITS,
	YANDEX_DEMO_AD_UNITS,
} from '@/src/config/ads'
import { GAME_BANNER_RESERVED_HEIGHT } from '@/src/features/game/gameLayout'
import { getYandexAdsModule } from '@/src/services/ads/yandexAdapter'
import {
	maybeShowCompletionInterstitial,
	preloadInterstitial,
	resetInterstitialForTests,
} from '@/src/services/ads/interstitial'

jest.mock('@/src/services/ads/yandexAdapter', () => ({
	getYandexAdsModule: jest.fn(),
}))

const originalScreenshotQaEnv = process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE

afterEach(() => {
	resetInterstitialForTests()
	jest.clearAllMocks()
	if (originalScreenshotQaEnv === undefined) {
		delete process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE
	} else {
		process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE = originalScreenshotQaEnv
	}
})

describe('development screenshot QA mode', () => {
	it('keeps the normal DEV banner demo unit available when disabled', () => {
		process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE = '0'

		expect(isScreenshotQaModeEnabled()).toBe(false)
		expect(getBannerAdUnitId('home')).toBe(YANDEX_DEMO_AD_UNITS.banner)
	})

	it('suppresses DEV banner requests without changing either reserved height', () => {
		process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE = '1'

		expect(isScreenshotQaModeEnabled()).toBe(true)
		expect(getBannerAdUnitId('home')).toBe('')
		expect(getBannerAdUnitId('game')).toBe('')
		expect(ADS_BANNER_RESERVED_HEIGHT).toBe(50)
		expect(GAME_BANNER_RESERVED_HEIGHT).toBe(50)
	})

	it('cannot enable screenshot mode or alter production units in a release build', () => {
		process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE = '1'

		expect(isScreenshotQaModeEnabled(true)).toBe(false)
		expect(getBannerAdUnitId('game', true)).toBe(
			PRODUCTION_AD_UNITS.GAME_BANNER,
		)
		expect(getBannerAdUnitId('home', true)).toBe(
			PRODUCTION_AD_UNITS.HOME_BANNER,
		)
		expect(getBannerAdUnitId('stats', true)).toBe(
			PRODUCTION_AD_UNITS.STATS_BANNER,
		)
		expect(PRODUCTION_AD_UNITS.INTERSTITIAL_COMPLETION).toBe(
			'R-M-20110016-4',
		)
		expect(PRODUCTION_AD_UNITS.REWARDED_HINT).toBe('R-M-20110016-5')
	})

	it('does not preload or show an interstitial while capturing screenshots', async () => {
		process.env.EXPO_PUBLIC_SCREENSHOT_QA_MODE = '1'

		await preloadInterstitial()
		await expect(
			maybeShowCompletionInterstitial({ sourceKind: 'completion' }),
		).resolves.toBe(false)
		expect(getYandexAdsModule).not.toHaveBeenCalled()
	})
})
