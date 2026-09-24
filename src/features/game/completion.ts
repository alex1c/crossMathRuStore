/**
 * Pure helpers for completion-card presentation.
 */

import type { GameSource } from './source'
import { getTrackLabel } from '@/src/core/crossmath/tracks'

export type CompletionPresentation = {
	readonly headline: string
	readonly detail: string
	readonly nextLabel: string | null
	readonly showNext: boolean
}

export function buildCompletionPresentation(input: {
	readonly source: GameSource
	readonly endlessCompletedCount?: number
	readonly dailyStreak?: number
}): CompletionPresentation {
	if (input.source.kind === 'tutorial') {
		return {
			headline: 'Готово!',
			detail: 'Обучение завершено',
			nextLabel: null,
			showNext: false,
		}
	}
	if (input.source.kind === 'endless') {
		const count = input.endlessCompletedCount ?? input.source.completedCount
		return {
			headline: 'Готово!',
			detail: `Решено подряд: ${count}`,
			nextLabel: 'Следующая задача',
			showNext: true,
		}
	}
	if (input.source.kind === 'daily') {
		const streak = input.dailyStreak ?? 0
		return {
			headline: 'Готово!',
			detail:
				streak > 0
					? `Сегодня решено · 🔥 ${streak} дн.`
					: 'Сегодняшний кроссворд решён',
			nextLabel: null,
			showNext: false,
		}
	}
	if (input.source.kind === 'multiplication') {
		const label =
			input.source.table === 'mixed'
				? 'Смешанная'
				: `Таблица ×${input.source.table}`
		return {
			headline: 'Готово!',
			detail: label,
			nextLabel: 'Ещё задача',
			showNext: true,
		}
	}
	if (input.source.kind === 'dev-fixture') {
		return {
			headline: 'Готово!',
			detail: 'Fixture решён',
			nextLabel: null,
			showNext: false,
		}
	}
	if (input.source.kind === 'track') {
		const hasNext = input.source.level < 50
		return {
			headline: 'Готово!',
			detail: `${getTrackLabel(input.source.track)}\nУровень ${input.source.level}`,
			nextLabel: hasNext ? 'Следующий уровень' : null,
			showNext: hasNext,
		}
	}
	return {
		headline: 'Готово!',
		detail: 'Решено',
		nextLabel: null,
		showNext: false,
	}
}
