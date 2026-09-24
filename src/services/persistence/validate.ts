/**
 * Validate / migrate persisted JSON into PersistedAppState (schema v2).
 * Corrupt payloads fall back to defaults without throwing to callers.
 */

import type {
	LegacyPersistedCampaign,
	PersistedActiveSession,
	PersistedAppState,
	PersistedDaily,
	PersistedDailyResult,
	PersistedEndless,
	PersistedGameSource,
	PersistedMultiplicationProgress,
	PersistedSettings,
	PersistedStatsCounters,
	PersistedTrackLevelResult,
	PersistedTrackProgress,
	PersistedTracks,
} from './schema'
import {
	createDefaultPersistedState,
	createDefaultTrackProgress,
	createDefaultTracks,
	DEFAULT_REMINDER_MINUTES,
	migrateLegacyCampaignToTracks,
	PERSISTENCE_SCHEMA_VERSION,
	TRACK_LEVEL_COUNT,
} from './schema'
import {
	DIFFICULTY_TRACKS,
	isDifficultyTrack,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'

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

function parseTrackProgress(raw: unknown): PersistedTrackProgress {
	const defaults = createDefaultTrackProgress()
	if (!isObject(raw)) {
		return defaults
	}
	const completedLevels = Array.isArray(raw.completedLevels)
		? raw.completedLevels
				.filter(
					(item): item is number =>
						typeof item === 'number' &&
						Number.isInteger(item) &&
						item >= 1 &&
						item <= TRACK_LEVEL_COUNT,
				)
				.slice()
				.sort((a, b) => a - b)
		: []
	const results: Record<string, PersistedTrackLevelResult> = {}
	if (isObject(raw.results)) {
		for (const [key, value] of Object.entries(raw.results)) {
			if (!isObject(value)) {
				continue
			}
			const level = Math.floor(asFiniteNumber(value.level, Number(key)))
			if (!Number.isInteger(level) || level < 1 || level > TRACK_LEVEL_COUNT) {
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
	const maxCompleted =
		completedLevels.length > 0 ? Math.max(...completedLevels) : 0
	const highest = Math.min(
		TRACK_LEVEL_COUNT,
		Math.max(
			1,
			Math.floor(asFiniteNumber(raw.highestUnlockedLevel, 1)),
			maxCompleted > 0 ? Math.min(TRACK_LEVEL_COUNT, maxCompleted + 1) : 1,
			maxCompleted,
		),
	)
	const lastPlayedLevel =
		typeof raw.lastPlayedLevel === 'number' &&
		Number.isInteger(raw.lastPlayedLevel) &&
		raw.lastPlayedLevel >= 1 &&
		raw.lastPlayedLevel <= TRACK_LEVEL_COUNT
			? raw.lastPlayedLevel
			: null
	return {
		highestUnlockedLevel: highest,
		completedLevels,
		results,
		lastPlayedLevel,
	}
}

function parseTracks(raw: unknown): PersistedTracks {
	if (!isObject(raw)) {
		return createDefaultTracks()
	}
	const tracks = createDefaultTracks()
	const next: Record<DifficultyTrack, PersistedTrackProgress> = { ...tracks }
	for (const track of DIFFICULTY_TRACKS) {
		next[track] = parseTrackProgress(raw[track])
	}
	return next
}

function parseLegacyCampaign(raw: unknown): LegacyPersistedCampaign | null {
	if (!isObject(raw)) {
		return null
	}
	return {
		highestUnlockedLevel: Math.floor(
			asFiniteNumber(raw.highestUnlockedLevel, 1),
		),
		completedLevels: Array.isArray(raw.completedLevels)
			? raw.completedLevels.filter(
					(item): item is number =>
						typeof item === 'number' && Number.isInteger(item),
				)
			: [],
		results: isObject(raw.results)
			? (raw.results as LegacyPersistedCampaign['results'])
			: {},
		lastPlayedLevel:
			typeof raw.lastPlayedLevel === 'number' ? raw.lastPlayedLevel : null,
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

function parseMultiplication(raw: unknown): PersistedMultiplicationProgress {
	if (!isObject(raw)) {
		return createDefaultPersistedState().multiplication
	}
	const solvedByTable: Record<string, number> = {}
	if (isObject(raw.solvedByTable)) {
		for (const [key, value] of Object.entries(raw.solvedByTable)) {
			solvedByTable[key] = Math.max(0, Math.floor(asFiniteNumber(value, 0)))
		}
	}
	return {
		solvedByTable,
		totalSolved: Math.max(
			0,
			Math.floor(asFiniteNumber(raw.totalSolved, 0)),
		),
	}
}

/**
 * Settings parser.
 * Fresh defaults use reminder OFF. Explicit boolean from storage is preserved
 * (including legacy schema v1 where reminder defaulted ON).
 */
function parseSettings(
	raw: unknown,
	options: { readonly legacyReminderDefault?: boolean } = {},
): PersistedSettings {
	const defaults = createDefaultPersistedState().settings
	if (!isObject(raw)) {
		return defaults
	}
	const minutes = Math.floor(
		asFiniteNumber(raw.dailyReminderMinutes, DEFAULT_REMINDER_MINUTES),
	)
	const reminderFallback =
		options.legacyReminderDefault === true ? true : defaults.dailyReminderEnabled
	return {
		showErrorsImmediately: asBoolean(raw.showErrorsImmediately, true),
		dailyReminderEnabled: asBoolean(
			raw.dailyReminderEnabled,
			reminderFallback,
		),
		dailyReminderMinutes: Math.min(23 * 60 + 59, Math.max(0, minutes)),
		onboardingCompleted: asBoolean(raw.onboardingCompleted, false),
		bankTipSeen: asBoolean(raw.bankTipSeen, false),
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
	if (raw.kind === 'track') {
		const track = asString(raw.track, '')
		const level = Math.floor(asFiniteNumber(raw.level, 0))
		if (!isDifficultyTrack(track) || level < 1 || level > TRACK_LEVEL_COUNT) {
			return null
		}
		return {
			kind: 'track',
			track,
			level,
			catalogVersion:
				typeof raw.catalogVersion === 'string' ? raw.catalogVersion : null,
		}
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
	if (raw.kind === 'multiplication') {
		const tableRaw = raw.table
		const table =
			tableRaw === 'mixed'
				? 'mixed'
				: typeof tableRaw === 'number' &&
					  Number.isInteger(tableRaw) &&
					  tableRaw >= 2 &&
					  tableRaw <= 9
					? tableRaw
					: null
		const sequence = Math.max(0, Math.floor(asFiniteNumber(raw.sequence, 0)))
		if (table === null) {
			return null
		}
		return { kind: 'multiplication', table, sequence }
	}
	if (raw.kind === 'campaign') {
		const level = Math.floor(asFiniteNumber(raw.level, 0))
		if (!Number.isInteger(level) || level < 1) {
			return null
		}
		return { kind: 'campaign', level }
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
	// Legacy linear campaign sessions are incompatible with four-track gameplay.
	if (source.kind === 'campaign') {
		return null
	}
	if (!isObject(raw.puzzle) || !isObject(raw.solution)) {
		return null
	}
	const entries: Record<string, number | null> = {}
	if (isObject(raw.entries)) {
		for (const [key, value] of Object.entries(raw.entries)) {
			if (value === null) {
				entries[key] = null
			} else if (typeof value === 'number' && Number.isFinite(value)) {
				entries[key] = value
			}
		}
	}
	let selected = null
	if (isObject(raw.selected)) {
		const row = Math.floor(asFiniteNumber(raw.selected.row, NaN))
		const column = Math.floor(asFiniteNumber(raw.selected.column, NaN))
		if (Number.isInteger(row) && Number.isInteger(column)) {
			selected = { row, column }
		}
	}
	const inputMode =
		raw.inputMode === 'bank' || raw.inputMode === 'keypad'
			? raw.inputMode
			: source.kind === 'track' &&
				  (source.track === 'hard' || source.track === 'lobachevsky')
				? 'bank'
				: 'keypad'
	return {
		source,
		puzzle: raw.puzzle as PersistedActiveSession['puzzle'],
		solution: raw.solution as PersistedActiveSession['solution'],
		entries,
		selected,
		mistakes: Math.max(0, Math.floor(asFiniteNumber(raw.mistakes, 0))),
		hintsUsed: Math.max(0, Math.floor(asFiniteNumber(raw.hintsUsed, 0))),
		hintedKeys: isObject(raw.hintedKeys)
			? (raw.hintedKeys as Record<string, true>)
			: undefined,
		accumulatedActiveMs: Math.max(
			0,
			asFiniteNumber(raw.accumulatedActiveMs, 0),
		),
		status: 'playing',
		title: asString(raw.title, 'Игра'),
		subtitle: asString(raw.subtitle, ''),
		updatedAt: Math.max(0, asFiniteNumber(raw.updatedAt, Date.now())),
		inputMode,
		bankItems: Array.isArray(raw.bankItems)
			? (raw.bankItems as PersistedActiveSession['bankItems'])
			: undefined,
		bankSeed: typeof raw.bankSeed === 'string' ? raw.bankSeed : null,
	}
}

/**
 * Parse unknown storage JSON into a safe PersistedAppState (schema v2).
 *
 * Migration from schema v1:
 * - Daily / Endless / stats / onboarding preserved
 * - Reminder: explicit boolean preserved (legacy default was ON)
 * - Linear campaign 1–50 → Easy track; Hard/Lobachevsky fresh
 * - Active session kind=campaign cleared (incompatible)
 * - Daily/Endless/Multiplication active sessions kept when valid
 */
export function parsePersistedAppState(raw: unknown): PersistedAppState {
	const defaults = createDefaultPersistedState()
	if (!isObject(raw)) {
		return defaults
	}
	const schemaVersion = asFiniteNumber(raw.schemaVersion, 0)
	if (schemaVersion <= 0) {
		return defaults
	}

	if (schemaVersion === 1) {
		const tracks = migrateLegacyCampaignToTracks(parseLegacyCampaign(raw.campaign))
		const activeSession = parseActiveSession(raw.activeSession)
		return {
			schemaVersion: PERSISTENCE_SCHEMA_VERSION,
			tracks,
			daily: parseDaily(raw.daily),
			endless: parseEndless(raw.endless),
			multiplication: createDefaultPersistedState().multiplication,
			settings: parseSettings(raw.settings, { legacyReminderDefault: true }),
			activeSession,
			stats: parseStats(raw.stats),
		}
	}

	return {
		schemaVersion: PERSISTENCE_SCHEMA_VERSION,
		tracks: isObject(raw.tracks)
			? parseTracks(raw.tracks)
			: migrateLegacyCampaignToTracks(parseLegacyCampaign(raw.campaign)),
		daily: parseDaily(raw.daily),
		endless: parseEndless(raw.endless),
		multiplication: parseMultiplication(raw.multiplication),
		settings: parseSettings(raw.settings),
		activeSession: parseActiveSession(raw.activeSession),
		stats: parseStats(raw.stats),
	}
}
