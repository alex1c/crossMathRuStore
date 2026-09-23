import {
	createDefaultPersistedState,
	parsePersistedAppState,
	type KeyValueStorage,
	loadPersistedAppState,
	savePersistedAppState,
} from '@/src/services/persistence'
import {
	applyCampaignCompletion,
	getCampaignLevelStatus,
	withCampaignCompleted,
	withDailyCompleted,
	withEndlessCompleted,
	withActiveSession,
} from '@/src/features/progress'
import { createSessionFromSource, createGameState, gameReducer } from '@/src/features/game'
import { generateCampaignPuzzle } from '@/src/core/crossmath'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
	const map = { ...initial }
	return {
		async getItem(key) {
			return map[key] ?? null
		},
		async setItem(key, value) {
			map[key] = value
		},
		async removeItem(key) {
			delete map[key]
		},
	}
}

describe('campaign unlock', () => {
	it('starts with level 1 unlocked and level 2 locked', () => {
		const state = createDefaultPersistedState()
		expect(
			getCampaignLevelStatus(1, state.campaign.highestUnlockedLevel, []),
		).toBe('unlocked')
		expect(
			getCampaignLevelStatus(2, state.campaign.highestUnlockedLevel, []),
		).toBe('locked')
	})

	it('completing level 1 unlocks level 2 and allows replay', () => {
		const next = applyCampaignCompletion(1, [], 1)
		expect(next.completedLevels).toEqual([1])
		expect(next.highestUnlockedLevel).toBe(2)
		expect(getCampaignLevelStatus(1, next.highestUnlockedLevel, next.completedLevels)).toBe(
			'completed',
		)
		expect(getCampaignLevelStatus(2, next.highestUnlockedLevel, next.completedLevels)).toBe(
			'unlocked',
		)
	})

	it('handles level 250 boundary', () => {
		const next = applyCampaignCompletion(250, [249], 250)
		expect(next.highestUnlockedLevel).toBe(250)
		expect(next.completedLevels).toContain(250)
	})

	it('persists campaign completion across reload', async () => {
		const storage = memoryStorage()
		let state = createDefaultPersistedState()
		state = withCampaignCompleted(state, {
			level: 1,
			elapsedMs: 1200,
			mistakes: 0,
			hintsUsed: 0,
			completedAt: 100,
		})
		await savePersistedAppState(state, storage)
		const loaded = await loadPersistedAppState(storage)
		expect(loaded.campaign.completedLevels).toEqual([1])
		expect(loaded.campaign.highestUnlockedLevel).toBe(2)
	})
})

describe('active session persistence', () => {
	it('saves and restores entries / mistakes / hints / elapsed', async () => {
		const storage = memoryStorage()
		const profiled = generateCampaignPuzzle(1)
		const blank = profiled.generated.puzzle.grid.cells.find(
			(cell) => cell.kind === 'number' && cell.state === 'blank',
		)
		expect(blank).toBeTruthy()
		const key = `${blank!.coordinate.row},${blank!.coordinate.column}`
		let state = createDefaultPersistedState()
		state = withActiveSession(state, {
			source: { kind: 'campaign', level: 1 },
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			entries: { [key]: 7 },
			selected: blank!.coordinate,
			mistakes: 2,
			hintsUsed: 1,
			accumulatedActiveMs: 4500,
			status: 'playing',
			title: 'Уровень 1',
			subtitle: 'Новичок',
			updatedAt: 1,
		})
		await savePersistedAppState(state, storage)
		const loaded = await loadPersistedAppState(storage)
		expect(loaded.activeSession?.entries[key]).toBe(7)
		expect(loaded.activeSession?.mistakes).toBe(2)
		expect(loaded.activeSession?.hintsUsed).toBe(1)
		expect(loaded.activeSession?.accumulatedActiveMs).toBe(4500)
	})

	it('falls back safely on corrupt JSON', async () => {
		const storage = memoryStorage({ 'crossmath.app.v1': '{not-json' })
		const loaded = await loadPersistedAppState(storage)
		expect(loaded.campaign.highestUnlockedLevel).toBe(1)
		expect(loaded.activeSession).toBeNull()
	})

	it('parsePersistedAppState ignores broken active sessions', () => {
		const parsed = parsePersistedAppState({
			schemaVersion: 1,
			activeSession: { source: { kind: 'campaign' } },
		})
		expect(parsed.activeSession).toBeNull()
	})
})

describe('session factory', () => {
	it('creates campaign / daily / endless sessions', () => {
		const campaign = createSessionFromSource({ kind: 'campaign', level: 1 })
		expect(campaign.source.kind).toBe('campaign')
		const daily = createSessionFromSource({
			kind: 'daily',
			dateKey: '2026-09-23',
		})
		expect(daily.source.kind).toBe('daily')
		const endless = createSessionFromSource({
			kind: 'endless',
			completedCount: 0,
		})
		expect(endless.source.kind).toBe('endless')
	})

	it('fixed cells cannot be selected for editing', () => {
		const state = createSessionFromSource({ kind: 'campaign', level: 1 })
		const fixed = state.puzzle.grid.cells.find(
			(cell) => cell.kind === 'number' && cell.state === 'fixed',
		)
		expect(fixed).toBeTruthy()
		const next = gameReducer(state, {
			type: 'SELECT_CELL',
			coordinate: fixed!.coordinate,
		})
		expect(next.selected).toBeNull()
	})
})

describe('daily + endless mutations', () => {
	it('records daily completion without destroying first result on replay', () => {
		const first = withDailyCompleted(createDefaultPersistedState(), {
			dateKey: '2026-09-23',
			elapsedMs: 1000,
			mistakes: 0,
			hintsUsed: 0,
			completedAt: 10,
		})
		const replay = withDailyCompleted(first, {
			dateKey: '2026-09-23',
			elapsedMs: 5000,
			mistakes: 3,
			hintsUsed: 2,
			completedAt: 20,
		})
		expect(replay.daily.completions['2026-09-23']?.elapsedMs).toBe(1000)
		expect(replay.stats.totalPuzzlesSolved).toBe(1)
	})

	it('increments endless completedCount and clears active session', () => {
		let state = createDefaultPersistedState()
		state = withActiveSession(state, {
			source: { kind: 'endless', completedCount: 0 },
			puzzle: generateCampaignPuzzle(1).generated.puzzle,
			solution: generateCampaignPuzzle(1).generated.solution,
			entries: {},
			selected: null,
			mistakes: 0,
			hintsUsed: 0,
			accumulatedActiveMs: 0,
			status: 'playing',
			title: 'Бесконечная игра',
			subtitle: '',
			updatedAt: 1,
		})
		state = withEndlessCompleted(state, {
			elapsedMs: 100,
			mistakes: 0,
			hintsUsed: 0,
		})
		expect(state.endless.completedCount).toBe(1)
		expect(state.activeSession).toBeNull()
	})
})

describe('createGameState hydration', () => {
	it('restores supplied entries', () => {
		const profiled = generateCampaignPuzzle(1)
		const blank = profiled.generated.puzzle.grid.cells.find(
			(cell) => cell.kind === 'number' && cell.state === 'blank',
		)!
		const key = `${blank.coordinate.row},${blank.coordinate.column}`
		const state = createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source: { kind: 'campaign', level: 1 },
			title: 't',
			subtitle: 's',
			entries: { [key]: 5 },
			mistakes: 1,
			hintsUsed: 2,
		})
		expect(state.entries[key]).toBe(5)
		expect(state.mistakes).toBe(1)
		expect(state.hintsUsed).toBe(2)
	})
})
