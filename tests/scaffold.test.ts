import { createCrossMathEngine } from '@/src/core/crossmath'
import {
	DAILY_REMINDER_COPY,
	shouldShowDailyReminder,
} from '@/src/features/daily'
import { clamp } from '@/src/utils'
import { getThemeColors } from '@/src/theme'

describe('Phase 0 scaffold smoke', () => {
	it('exposes a stub CrossMath engine that is not implemented yet', () => {
		const engine = createCrossMathEngine()
		expect(() => engine.generate('seed')).toThrow(/Phase 1/)
	})

	it('keeps daily reminder domain helpers ready', () => {
		expect(DAILY_REMINDER_COPY).toBe('Кроссворд дня ждёт')
		expect(
			shouldShowDailyReminder({
				dateKey: '2026-09-22',
				status: 'solved',
			}),
		).toBe(false)
		expect(
			shouldShowDailyReminder({
				dateKey: '2026-09-22',
				status: 'available',
			}),
		).toBe(true)
	})

	it('provides light and dark theme tokens', () => {
		const light = getThemeColors('light')
		const dark = getThemeColors('dark')
		expect(light.background).toBeTruthy()
		expect(dark.selectedCell).toBeTruthy()
		expect(light.operator).toBeTruthy()
		expect(dark.equation).toBeTruthy()
	})

	it('exports clamp utility', () => {
		expect(clamp(5, 0, 3)).toBe(3)
		expect(clamp(-1, 0, 3)).toBe(0)
	})
})
