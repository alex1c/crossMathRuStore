/** @type {import('jest').Config} */
const config = {
	preset: 'jest-expo',
	setupFiles: ['<rootDir>/jest.setup.ts'],
	testMatch: ['**/tests/**/*.test.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
	},
	clearMocks: true,
}

module.exports = config
