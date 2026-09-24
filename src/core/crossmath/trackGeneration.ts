/**
 * Production track puzzle generation.
 * Easy/Medium: bounded binary. Hard: hybrid. Lobachevsky: catalog only.
 */

import { deriveSeed } from './rng'
import {
	generateTrackPuzzle,
	generateHybridPuzzle,
	analyzeHybridPuzzle,
	type ExperimentalTrackPuzzle,
	type GeneratedHybridPuzzle,
	type HybridPuzzle,
} from './experimental'
import type { Puzzle, PuzzleSolution } from './types'
import {
	assertTrackLevel,
	type DifficultyTrack,
	getTrackInputMode,
	TRACK_LABELS,
} from './tracks'
import {
	loadLobachevskyLevel,
	lobachevskyBankSeed,
	LOBACHEVSKY_CATALOG_VERSION,
} from './catalog'
import { createTrackNumberBank, type NumberBank } from './numberBank'
import {
	countHybridBlanks,
	measureHybridOccupiedDensity,
} from './hybrid'

export const TRACK_GENERATOR_VERSION = 'phase5.6-tracks-v1' as const

export type TrackPuzzlePayload = {
	readonly track: DifficultyTrack
	readonly level: number
	readonly puzzle: Puzzle | HybridPuzzle
	readonly solution: PuzzleSolution
	readonly inputMode: 'keypad' | 'bank'
	readonly bank: NumberBank | null
	readonly bankSeed: string | null
	readonly catalogVersion: string | null
	readonly generatorVersion: string
	readonly title: string
	readonly subtitle: string
	readonly metrics: {
		readonly equationCount: number
		readonly blankCount: number
		readonly score: number | null
		readonly occupiedDensity: number | null
		readonly loadMs: number
	}
}

function hardHybridConfig(level: number) {
	const progress = (level - 1) / 49
	return {
		rows: 13,
		columns: 13,
		minValue: 1,
		maxValue: 24,
		allowedOperations: ['add', 'subtract', 'multiply', 'divide'] as const,
		targetEquationCount: 3 + Math.floor(progress * 1),
		targetBinaryEquationCount: 3 + Math.floor(progress * 2),
		targetBlankCount: 7 + Math.floor(progress * 3),
		maxGenerationAttempts: 36,
		solverMaxNodes: 200_000,
	}
}

function fromBinaryTrack(
	track: 'easy' | 'medium',
	level: number,
	result: ExperimentalTrackPuzzle,
	loadMs: number,
): TrackPuzzlePayload {
	return {
		track,
		level,
		puzzle: result.generated.puzzle,
		solution: result.generated.solution,
		inputMode: 'keypad',
		bank: null,
		bankSeed: null,
		catalogVersion: null,
		generatorVersion: TRACK_GENERATOR_VERSION,
		title: `${TRACK_LABELS[track]} · уровень ${level}`,
		subtitle: TRACK_LABELS[track],
		metrics: {
			equationCount: result.generated.puzzle.equations.length,
			blankCount: result.analysis.metrics.blankCount,
			score: result.analysis.score,
			occupiedDensity: result.density.occupiedDensity,
			loadMs,
		},
	}
}

function fromHybrid(
	track: 'hard',
	level: number,
	result: GeneratedHybridPuzzle,
	loadMs: number,
): TrackPuzzlePayload {
	const analysis = analyzeHybridPuzzle(result.puzzle)
	const bankSeed = `${TRACK_GENERATOR_VERSION}-hard-${level}`
	const bank = createTrackNumberBank(result.puzzle, result.solution, bankSeed)
	return {
		track,
		level,
		puzzle: result.puzzle,
		solution: result.solution,
		inputMode: 'bank',
		bank,
		bankSeed,
		catalogVersion: null,
		generatorVersion: TRACK_GENERATOR_VERSION,
		title: `${TRACK_LABELS[track]} · уровень ${level}`,
		subtitle: TRACK_LABELS[track],
		metrics: {
			equationCount: result.puzzle.equations.length,
			blankCount: analysis.blankCount,
			score: analysis.score,
			occupiedDensity: analysis.density.occupiedDensity,
			loadMs,
		},
	}
}

/**
 * Load or generate a track campaign puzzle.
 * Lobachevsky is always a catalog lookup (no runtime search).
 */
export function loadTrackPuzzle(
	track: DifficultyTrack,
	level: number,
): TrackPuzzlePayload {
	assertTrackLevel(level)
	const started = Date.now()
	if (track === 'lobachevsky') {
		const entry = loadLobachevskyLevel(level)
		const bankSeed = lobachevskyBankSeed(level)
		const bank = createTrackNumberBank(entry.puzzle, entry.solution, bankSeed)
		const density = measureHybridOccupiedDensity(entry.puzzle)
		const blankCount = countHybridBlanks(entry.puzzle)
		return {
			track,
			level,
			puzzle: entry.puzzle,
			solution: entry.solution,
			inputMode: 'bank',
			bank,
			bankSeed,
			catalogVersion: LOBACHEVSKY_CATALOG_VERSION,
			generatorVersion: TRACK_GENERATOR_VERSION,
			title: `${TRACK_LABELS[track]} · уровень ${level}`,
			subtitle: TRACK_LABELS[track],
			metrics: {
				equationCount: entry.puzzle.equations.length,
				blankCount,
				score: null,
				occupiedDensity: density.occupiedDensity,
				loadMs: Date.now() - started,
			},
		}
	}
	if (track === 'hard') {
		const seed = deriveSeed(TRACK_GENERATOR_VERSION, 'hard-hybrid', level)
		const result = generateHybridPuzzle(seed, hardHybridConfig(level))
		return fromHybrid(track, level, result, Date.now() - started)
	}
	const result = generateTrackPuzzle(track, level, {
		seed: deriveSeed(TRACK_GENERATOR_VERSION, track, level),
	})
	return fromBinaryTrack(track, level, result, Date.now() - started)
}

export function getTrackInputModeForSource(
	track: DifficultyTrack,
): ReturnType<typeof getTrackInputMode> {
	return getTrackInputMode(track)
}
