import * as fs from 'fs'
import * as path from 'path'
import {
	PRIVACY_POLICY_LABEL,
	PRIVACY_POLICY_URL,
} from '@/src/constants/privacyPolicy'

describe('CrossMath privacy policy integration', () => {
	const root = process.cwd()

	it('centralizes the public GitHub Pages URL', () => {
		expect(PRIVACY_POLICY_URL).toBe(
			'https://alex1c.github.io/crossMathRuStore/',
		)
		expect(PRIVACY_POLICY_LABEL).toBe('Политика конфиденциальности')
	})

	it('links the About screen to the policy and keeps the other apps link', () => {
		const about = fs.readFileSync(
			path.join(root, 'src', 'screens', 'AboutScreen.tsx'),
			'utf8',
		)
		expect(about).toContain('PRIVACY_POLICY_URL')
		expect(about).toContain('PRIVACY_POLICY_LABEL')
		expect(about).toContain('OTHER_OUR_APPS_URL')
		expect(about).toContain('OTHER_OUR_APPS_LABEL')
	})

	it('publishes a Russian policy without credentials or internal service IDs', () => {
		const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8')
		expect(html).toContain('<html lang="ru">')
		expect(html).toContain('Математический кроссворд')
		expect(html).toContain('com.calculatorplatform.crossmath')
		expect(html).toContain('rustore-alex1c@yandex.ru')
		expect(html).not.toContain('2f9a4c33-9a81-4dfd-b4ff-9c8a8206353f')
		expect(html).not.toMatch(/R-M-20110016-[1-5]/)
		expect(html).not.toMatch(/PLACEHOLDER|TODO|YOUR_[A-Z_]+/)
		expect(html).not.toMatch(/storePassword|keyPassword|\.jks/i)
		expect(html).not.toMatch(/<script\b|google-analytics|gtag\(|googletagmanager/i)
	})
})
