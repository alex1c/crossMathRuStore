/**
 * Build a GameState for track / daily / endless / multiplication / resume.
 */

import {
	deriveSeed,
	generateDailyPuzzle,
	generateEndlessPuzzle,
	generateMultiplicationTablePuzzle,
	loadTrackPuzzle,
	type MultiplicationTable,
} from '@/src/core/crossmath'
import { createTrackNumberBank } from '@/src/core/crossmath/numberBank'
import type { PersistedActiveSession } from '@/src/services/persistence'
import { createGameState, type GameState } from './gameReducer'
import { MULTI_DIGIT_DEV_FIXTURE } from './devFixture'
import { BANK_DUP_DEV_FIXTURE } from './bankFixture'
import {
	getGameSourceSubtitle,
	getGameSourceTitle,
	type GameSource,
} from './source'

export function createSessionFromSource(
	source: GameSource,
	options: {
		readonly showErrorsImmediately?: boolean
	} = {},
): GameState {
	if (source.kind === 'dev-fixture') {
		if (source.id === 'bank-dup') {
			return createGameState({
				puzzle: BANK_DUP_DEV_FIXTURE.puzzle,
				solution: BANK_DUP_DEV_FIXTURE.solution,
				source,
				title: getGameSourceTitle(source),
				subtitle: getGameSourceSubtitle(source),
				showErrorsImmediately: options.showErrorsImmediately,
				inputMode: 'bank',
				bankItems: BANK_DUP_DEV_FIXTURE.bankItems,
				bankSeed: 'dev-bank-dup',
			})
		}
		return createGameState({
			puzzle: MULTI_DIGIT_DEV_FIXTURE.puzzle,
			solution: MULTI_DIGIT_DEV_FIXTURE.solution,
			source,
			title: getGameSourceTitle(source),
			subtitle: getGameSourceSubtitle(source),
			showErrorsImmediately: options.showErrorsImmediately,
			inputMode: 'keypad',
		})
	}
	if (source.kind === 'tutorial') {
		throw new Error('tutorial sessions are created by OnboardingScreen')
	}
	if (source.kind === 'track') {
		const payload = loadTrackPuzzle(source.track, source.level)
		return createGameState({
			puzzle: payload.puzzle,
			solution: payload.solution,
			source: {
				...source,
				catalogVersion: payload.catalogVersion,
			},
			title: payload.title,
			subtitle: payload.subtitle,
			showErrorsImmediately: options.showErrorsImmediately,
			inputMode: payload.inputMode,
			bankItems: payload.bank?.items ?? [],
			bankSeed: payload.bankSeed,
		})
	}
	if (source.kind === 'daily') {
		const profiled = generateDailyPuzzle(source.dateKey, 'daily')
		return createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source,
			title: getGameSourceTitle(source),
			subtitle: getGameSourceSubtitle(source),
			showErrorsImmediately: options.showErrorsImmediately,
			inputMode: 'keypad',
		})
	}
	if (source.kind === 'multiplication') {
		const table = source.table as MultiplicationTable
		const seed = deriveSeed(
			'multiplication',
			String(source.table),
			source.sequence,
			'phase5.6',
		)
		const profiled = generateMultiplicationTablePuzzle(table, seed)
		return createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source,
			title: getGameSourceTitle(source),
			subtitle: getGameSourceSubtitle(source),
			showErrorsImmediately: options.showErrorsImmediately,
			inputMode: 'keypad',
		})
	}
	const profiled = generateEndlessPuzzle({
		completed: source.completedCount,
		streak: 0,
	})
	return createGameState({
		puzzle: profiled.generated.puzzle,
		solution: profiled.generated.solution,
		source,
		title: getGameSourceTitle(source),
		subtitle: getGameSourceSubtitle(source),
		showErrorsImmediately: options.showErrorsImmediately,
		inputMode: 'keypad',
	})
}

export function createSessionFromPersisted(
	session: PersistedActiveSession,
	options: {
		readonly showErrorsImmediately?: boolean
	} = {},
): GameState {
	const source = session.source as GameSource
	let bankItems = session.bankItems ?? []
	if (
		session.inputMode === 'bank' &&
		bankItems.length === 0 &&
		session.bankSeed
	) {
		bankItems = createTrackNumberBank(
			session.puzzle as never,
			session.solution,
			session.bankSeed,
		).items
	}
	return createGameState({
		puzzle: session.puzzle,
		solution: session.solution,
		source,
		title: session.title,
		subtitle: session.subtitle,
		entries: session.entries,
		selected: session.selected,
		mistakes: session.mistakes,
		hintsUsed: session.hintsUsed,
		hintedKeys: session.hintedKeys,
		showErrorsImmediately: options.showErrorsImmediately,
		inputMode: session.inputMode ?? 'keypad',
		bankItems,
		bankSeed: session.bankSeed ?? null,
	})
}
