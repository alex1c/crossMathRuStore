/**
 * Production Lobachevsky catalog loader (pregenerated, no runtime search).
 */

import catalogJson from '@/src/data/crossmath/lobachevsky-v1.json'
import type { PuzzleSolution } from './types'
import type { HybridPuzzle } from './experimental'
import {
	assertTrackLevel,
	TRACK_LEVEL_COUNT,
} from './tracks'
import { createTrackNumberBank } from './numberBank'
import { countHybridSolutions } from './experimental'

export const LOBACHEVSKY_CATALOG_VERSION = 'lobachevsky-v1' as const

export type LobachevskyCatalogLevel = {
	readonly level: number
	readonly sourceLevel: number
	readonly puzzle: HybridPuzzle
	readonly solution: PuzzleSolution
}

export type LobachevskyCatalog = {
	readonly schemaVersion: 1
	readonly catalogVersion: typeof LOBACHEVSKY_CATALOG_VERSION
	readonly track: 'lobachevsky'
	readonly variant: 'hybrid'
	readonly generatorVersion: string
	readonly ordering: string
	readonly levels: readonly LobachevskyCatalogLevel[]
}

const catalog = catalogJson as LobachevskyCatalog

export function getLobachevskyCatalog(): LobachevskyCatalog {
	return catalog
}

export function getLobachevskyCatalogVersion(): string {
	return catalog.catalogVersion
}

/**
 * Instant catalog lookup — must not generate puzzles.
 */
export function loadLobachevskyLevel(level: number): LobachevskyCatalogLevel {
	assertTrackLevel(level)
	const entry = catalog.levels.find((item) => item.level === level)
	if (!entry) {
		throw new Error(`Lobachevsky catalog missing level ${level}`)
	}
	return entry
}

export function lobachevskyBankSeed(level: number): string {
	return `${LOBACHEVSKY_CATALOG_VERSION}-bank-${level}`
}

export function createLobachevskyBank(level: number) {
	const entry = loadLobachevskyLevel(level)
	return createTrackNumberBank(
		entry.puzzle,
		entry.solution,
		lobachevskyBankSeed(level),
	)
}

/**
 * Lightweight structural check used at startup / tests (no uniqueness solver).
 */
export function assertLobachevskyCatalogShape(): {
	readonly ok: boolean
	readonly levelCount: number
	readonly catalogVersion: string
} {
	const levels = catalog.levels
	const ids = levels.map((entry) => entry.level)
	const uniqueIds = new Set(ids)
	const ok =
		catalog.catalogVersion === LOBACHEVSKY_CATALOG_VERSION &&
		catalog.track === 'lobachevsky' &&
		catalog.variant === 'hybrid' &&
		levels.length === TRACK_LEVEL_COUNT &&
		uniqueIds.size === TRACK_LEVEL_COUNT &&
		ids.every((id) => id >= 1 && id <= TRACK_LEVEL_COUNT) &&
		levels.every(
			(entry) =>
				entry.puzzle?.schemaVersion === 1 &&
				Array.isArray(entry.puzzle.equations) &&
				Array.isArray(entry.solution?.values) &&
				entry.solution.values.length > 0,
		)
	return {
		ok,
		levelCount: levels.length,
		catalogVersion: catalog.catalogVersion,
	}
}

/**
 * Full uniqueness validation (test / build only — not on GameScreen open).
 */
export function validateLobachevskyCatalogUniqueness(options: {
	readonly maxNodes?: number
} = {}): {
	readonly valid: boolean
	readonly unique: number
	readonly invalid: number
	readonly nonUnique: number
	readonly safetyLimitHits: number
} {
	let unique = 0
	let nonUnique = 0
	let safetyLimitHits = 0
	let invalid = 0
	for (const entry of catalog.levels) {
		if (!entry.puzzle || !entry.solution) {
			invalid += 1
			continue
		}
		const solved = countHybridSolutions(entry.puzzle, 2, options)
		if (solved.status === 'safety-limit') {
			safetyLimitHits += 1
		} else if (solved.count === 1) {
			unique += 1
		} else {
			nonUnique += 1
		}
	}
	return {
		valid: invalid === 0 && nonUnique === 0 && safetyLimitHits === 0 && unique === TRACK_LEVEL_COUNT,
		unique,
		invalid,
		nonUnique,
		safetyLimitHits,
	}
}
