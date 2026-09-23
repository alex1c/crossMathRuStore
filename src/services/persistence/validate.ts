/**
 * Validate / normalize persisted JSON into PersistedAppState.
 * Corrupt payloads fall back to defaults without throwing to callers.
 */

import type {
	PersistedActiveSession,
	PersistedAppState,
	PersistedCampaign,
	PersistedCampaignLevelResult,
	PersistedDaily,
	PersistedDailyResult,
	PersistedEndless,
	PersistedGameSource,
	PersistedSettings,
	PersistedStatsCounters,
} from './schema'
import {
	createDefaultPersistedState,
	DEFAULT_REMINDER_MINUTES,
	PERSISTENCE_SCHEMA_VERSION,
} from './schema'

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asFiniteNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback
}

function parseCampaign(raw: unknown): PersistedCampaign {
	const defaults = createDefaultPersistedState().campaign
	if (!isObject(raw)) {
		return defaults
	}
	const highest = Math.min(
		250,
		Math.max(1, Math.floor(asFiniteNumber(raw.highestUnlockedLevel, 1))),
	)
	const completedLevels = Array.isArray(raw.completedLevels)
		? raw.completedLevels
				.filter((item): item is number =>
					typeof item === 'number' &&
					Number.isInteger(item) &&
					item >= 1 &&
					item <= 250,
				)
				.slice()
				.sort((a, b) => a - b)
		: []
	const results: Record<string, PersistedCampaignLevelResult> = {}
	if (isObject(raw.results)) {
		for (const [key, value] of Object.entries(raw.results)) {
			if (!isObject(value)) {
				continue
			}
			const level = Math.floor(asFiniteNumber(value.level, Number(key)))
			if (!Number.isInteger(level) || level < 1 || level > 250) {
				continue
			}
			results[String(level)] = {
				level,
				elapsedMs: Math.max(0, asFiniteNumber(value.elapsedMs, 0)),
				mistakes: Math.max(0, Math.floor(asFiniteNumber(value.mistakes, 0))),
				hintsUsed: Math.max(0, Math.floor(asFiniteNumber(value.hintsUsed, 0))),
				completedAt: Math.max(0, asFiniteNumber(value.completedAt, 0)),
			}
		}
	}
	const lastPlayedLevel =
		typeof raw.lastPlayedLevel === 'number' &&
		Number.isInteger(raw.lastPlayedLevel) &&
		raw.lastPlayedLevel >= 1 &&
		raw.lastPlayedLevel <= 250
			? raw.lastPlayedLevel
			: null
	return {
		highestUnlockedLevel: Math.max(
			highest,
			completedLevels.length > 0 ? Math.max(...completedLevels) : 1,
			1,
		),
		completedLevels,
		results,
		lastPlayedLevel,
	}
}

function parseDaily(raw: unknown): PersistedDaily {
	if (!isObject(raw) || !isObject(raw.completions)) {
		return createDefaultPersistedState().daily
	}
	const completions: Record<string, PersistedDailyResult> = {}
	for (const [dateKey, value] of Object.entries(raw.completions)) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !isObject(value)) {
			continue
		}
		completions[dateKey] = {
			dateKey,
			elapsedMs: Math.max(0, asFiniteNumber(value.elapsedMs, 0)),
			mistakes: Math.max(0, Math.floor(asFiniteNumber(value.mistakes, 0))),
			hintsUsed: Math.max(0, Math.floor(asFiniteNumber(value.hintsUsed, 0))),
			completedAt: Math.max(0, asFiniteNumber(value.completedAt, 0)),
		}
	}
	return { completions }
}

function parseEndless(raw: unknown): PersistedEndless {
	if (!isObject(raw)) {
		return createDefaultPersistedState().endless
	}
	const completedCount = Math.max(
		0,
		Math.floor(asFiniteNumber(raw.completedCount, 0)),
	)
	const bestCompletedCount = Math.max(
		completedCount,
		Math.floor(asFiniteNumber(raw.bestCompletedCount, completedCount)),
	)
	return { completedCount, bestCompletedCount }
}

function parseSettings(raw: unknown): PersistedSettings {
	if (!isObject(raw)) {
		return createDefaultPersistedState().settings
	}
	const minutes = Math.floor(
		asFiniteNumber(raw.dailyReminderMinutes, DEFAULT_REMINDER_MINUTES),
	)
	return {
		showErrorsImmediately: asBoolean(raw.showErrorsImmediately, true),
		dailyReminderEnabled: asBoolean(raw.dailyReminderEnabled, true),
		dailyReminderMinutes: Math.min(23 * 60 + 59, Math.max(0, minutes)),
	}
}

function parseStats(raw: unknown): PersistedStatsCounters {
	if (!isObject(raw)) {
		return createDefaultPersistedState().stats
	}
	return {
		totalHintsUsed: Math.max(0, Math.floor(asFiniteNumber(raw.totalHintsUsed, 0))),
		totalMistakes: Math.max(0, Math.floor(asFiniteNumber(raw.totalMistakes, 0))),
		totalPuzzlesSolved: Math.max(
			0,
			Math.floor(asFiniteNumber(raw.totalPuzzlesSolved, 0)),
		),
	}
}

function parseSource(raw: unknown): PersistedGameSource | null {
	if (!isObject(raw) || typeof raw.kind !== 'string') {
		return null
	}
	if (raw.kind === 'campaign') {
		const level = Math.floor(asFiniteNumber(raw.level, 0))
		if (!Number.isInteger(level) || level < 1 || level > 250) {
			return null
		}
		return { kind: 'campaign', level }
	}
	if (raw.kind === 'daily') {
		const dateKey = asString(raw.dateKey, '')
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
			return null
		}
		return { kind: 'daily', dateKey }
	}
	if (raw.kind === 'endless') {
		const completedCount = Math.max(
			0,
			Math.floor(asFiniteNumber(raw.completedCount, 0)),
		)
		return { kind: 'endless', completedCount }
	}
	return null
}

function parseActiveSession(raw: unknown): PersistedActiveSession | null {
	if (!isObject(raw)) {
		return null
	}
	const source = parseSource(raw.source)
	if (!source) {
		return null
	}
	if (!isObject(raw.puzzle) || !isObject(raw.solution)) {
		return null
	}
	if (!isObject(raw.entries)) {
		return null
	}
	const entries: Record<string, number | null> = {}
	for (const [key, value] of Object.entries(raw.entries)) {
		if (value === null) {
			entries[key] = null
		} else if (typeof value === 'number' && Number.isFinite(value)) {
			entries[key] = value
		}
	}
	let selected = null as PersistedActiveSession['selected']
	if (isObject(raw.selected)) {
		const row = Math.floor(asFiniteNumber(raw.selected.row, -1))
		const column = Math.floor(asFiniteNumber(raw.selected.column, -1))
		if (row >= 0 && column >= 0) {
			selected = { row, column }
		}
	}
	return {
		source,
		puzzle: raw.puzzle as PersistedActiveSession['puzzle'],
		solution: raw.solution as PersistedActiveSession['solution'],
		entries,
		selected,
		mistakes: Math.max(0, Math.floor(asFiniteNumber(raw.mistakes, 0))),
		hintsUsed: Math.max(0, Math.floor(asFiniteNumber(raw.hintsUsed, 0))),
		accumulatedActiveMs: Math.max(
			0,
			asFiniteNumber(raw.accumulatedActiveMs, 0),
		),
		status: 'playing',
		title: asString(raw.title, 'Игра'),
		subtitle: asString(raw.subtitle, ''),
		updatedAt: Math.max(0, asFiniteNumber(raw.updatedAt, Date.now())),
	}
}

/**
 * Parse unknown storage JSON into a safe PersistedAppState.
 */
export function parsePersistedAppState(raw: unknown): PersistedAppState {
	const defaults = createDefaultPersistedState()
	if (!isObject(raw)) {
		return defaults
	}
	const schemaVersion = asFiniteNumber(raw.schemaVersion, 0)
	if (schemaVersion !== PERSISTENCE_SCHEMA_VERSION) {
		// Future migrations land here; unknown versions fall back safely.
		if (schemaVersion === 0) {
			return defaults
		}
		// Forward-compatible: try to read known fields, else defaults.
	}
	const campaign = parseCampaign(raw.campaign)
	// Ensure unlock covers completed progress.
	const maxCompleted =
		campaign.completedLevels.length > 0
			? Math.max(...campaign.completedLevels)
			: 0
	const highestUnlockedLevel = Math.min(
		250,
		Math.max(campaign.highestUnlockedLevel, maxCompleted + 1, 1),
	)
	return {
		schemaVersion: PERSISTENCE_SCHEMA_VERSION,
		campaign: { ...campaign, highestUnlockedLevel },
		daily: parseDaily(raw.daily),
		endless: parseEndless(raw.endless),
		settings: parseSettings(raw.settings),
		activeSession: parseActiveSession(raw.activeSession),
		stats: parseStats(raw.stats),
	}
}
