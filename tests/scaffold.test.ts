import { createCrossMathEngine } from '@/src/core/crossmath'
import {
	DAILY_REMINDER_COPY,
	shouldShowDailyReminder,
} from '@/src/features/daily'
import { clamp } from '@/src/utils'
import { getThemeColors } from '@/src/theme'

describe('CrossMath application scaffold smoke', () => {
	it('exposes the production pure-TypeScript engine facade', () => {
		const engine = createCrossMathEngine()
		const generated = engine.generate('scaffold-seed', {
			targetEquationCount: 2,
			targetBlankCount: 1,
			maxGenerationAttempts: 20,
		})
		expect(generated.puzzle.equations).toHaveLength(2)
		expect(engine.hasUniqueSolution(generated.puzzle)).toBe(true)
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
