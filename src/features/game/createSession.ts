/**
 * Build a GameState for campaign / daily / endless / resume flows.
 */

import {
	generateCampaignPuzzle,
	generateDailyPuzzle,
	generateEndlessPuzzle,
} from '@/src/core/crossmath'
import type { PersistedActiveSession } from '@/src/services/persistence'
import { createGameState, type GameState } from './gameReducer'
import { MULTI_DIGIT_DEV_FIXTURE } from './devFixture'
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
		return createGameState({
			puzzle: MULTI_DIGIT_DEV_FIXTURE.puzzle,
			solution: MULTI_DIGIT_DEV_FIXTURE.solution,
			source,
			title: getGameSourceTitle(source),
			subtitle: getGameSourceSubtitle(source),
			showErrorsImmediately: options.showErrorsImmediately,
		})
	}
	if (source.kind === 'campaign') {
		const profiled = generateCampaignPuzzle(source.level)
		return createGameState({
			puzzle: profiled.generated.puzzle,
			solution: profiled.generated.solution,
			source,
			title: getGameSourceTitle(source),
			subtitle: getGameSourceSubtitle(source),
			showErrorsImmediately: options.showErrorsImmediately,
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
	})
}

export function createSessionFromPersisted(
	session: PersistedActiveSession,
	options: {
		readonly showErrorsImmediately?: boolean
	} = {},
): GameState {
	const source: GameSource = session.source
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
		showErrorsImmediately: options.showErrorsImmediately,
	})
}
