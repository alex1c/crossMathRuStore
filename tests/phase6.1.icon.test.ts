/**
 * Phase 6.1 — icon asset static validation (PNG IHDR dimensions).
 */

import * as fs from 'fs'
import * as path from 'path'

/** Read width/height from a PNG file without image libraries. */
function readPngSize(filePath: string): { width: number; height: number } {
	const buffer = fs.readFileSync(filePath)
	if (buffer.length < 24) {
		throw new Error(`PNG too small: ${filePath}`)
	}
	const signature = buffer.subarray(0, 8).toString('hex')
	if (signature !== '89504e470d0a1a0a') {
		throw new Error(`Not a PNG: ${filePath}`)
	}
	const width = buffer.readUInt32BE(16)
	const height = buffer.readUInt32BE(20)
	return { width, height }
}

describe('Phase 6.1 icon assets', () => {
	const root = process.cwd()

	it('keeps a square readable master at assets/icon_gpt.png', () => {
		const master = path.join(root, 'assets', 'icon_gpt.png')
		expect(fs.existsSync(master)).toBe(true)
		const size = readPngSize(master)
		expect(size.width).toBe(size.height)
		expect(size.width).toBeGreaterThanOrEqual(512)
	})

	it('produces release-artifacts/icon-512.png at exactly 512x512', () => {
		const artifact = path.join(root, 'release-artifacts', 'icon-512.png')
		expect(fs.existsSync(artifact)).toBe(true)
		expect(readPngSize(artifact)).toEqual({ width: 512, height: 512 })
	})

	it('points Expo config at the integrated icon derivatives', () => {
		const appJsonPath = path.join(root, 'app.json')
		const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')) as {
			expo: {
				icon: string
				android: {
					adaptiveIcon: {
						foregroundImage: string
						backgroundImage: string
						backgroundColor: string
					}
				}
			}
		}
		expect(appJson.expo.icon).toBe('./assets/images/icon.png')
		expect(appJson.expo.android.adaptiveIcon.foregroundImage).toBe(
			'./assets/images/android-icon-foreground.png',
		)
		expect(appJson.expo.android.adaptiveIcon.backgroundImage).toBe(
			'./assets/images/android-icon-background.png',
		)
		expect(appJson.expo.android.adaptiveIcon.backgroundColor).toBe('#0097FE')

		for (const relative of [
			'assets/images/icon.png',
			'assets/images/android-icon-foreground.png',
			'assets/images/android-icon-background.png',
			'assets/images/android-icon-monochrome.png',
		]) {
			const full = path.join(root, relative)
			expect(fs.existsSync(full)).toBe(true)
			const size = readPngSize(full)
			expect(size.width).toBe(size.height)
			expect(size.width).toBeGreaterThanOrEqual(48)
		}
	})
})
