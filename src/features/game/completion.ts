/**
 * Pure helpers for completion-card presentation and campaign “next” CTA.
 */

import type { GameSource } from './source'

export type CompletionPresentation = {
	readonly headline: string
	readonly detail: string
	readonly nextLabel: string | null
	readonly showNext: boolean
}

/**
 * Build completion copy for campaign / daily / endless / tutorial.
 */
export function buildCompletionPresentation(input: {
	readonly source: GameSource
	readonly endlessCompletedCount?: number
	readonly dailyStreak?: number
	readonly campaignLevel?: number
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
	if (input.source.kind === 'dev-fixture') {
		return {
			headline: 'Готово!',
			detail: 'Fixture решён',
			nextLabel: null,
			showNext: false,
		}
	}
	const level = input.campaignLevel ?? input.source.level
	const hasNext = level < 250
	return {
		headline: 'Готово!',
		detail: `Уровень ${level} решён`,
		nextLabel: hasNext ? 'Следующий уровень' : null,
		showNext: hasNext,
	}
}
