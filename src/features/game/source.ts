/**
 * Campaign / mode labels and game-session source types for the reusable game screen.
 */

export type GameSourceKind =
	| 'campaign'
	| 'daily'
	| 'endless'
	| 'dev-fixture'

export type CampaignGameSource = {
	readonly kind: 'campaign'
	readonly level: number
}

export type DailyGameSource = {
	readonly kind: 'daily'
	readonly dateKey: string
}

export type EndlessGameSource = {
	readonly kind: 'endless'
	readonly completedCount: number
}

export type DevFixtureGameSource = {
	readonly kind: 'dev-fixture'
	readonly id: 'multi-digit'
}

export type GameSource =
	| CampaignGameSource
	| DailyGameSource
	| EndlessGameSource
	| DevFixtureGameSource

/** Russian display labels for campaign 1..250 tier bands (50 levels each). */
const CAMPAIGN_TIER_LABELS = [
	'Новичок',
	'Любитель',
	'Знаток',
	'Мастер',
	'Эксперт',
] as const

/**
 * Human-readable campaign tier for the game header.
 */
export function getCampaignTierLabel(level: number): string {
	if (!Number.isInteger(level) || level < 1 || level > 250) {
		return 'Кампания'
	}
	const tierIndex = Math.min(
		CAMPAIGN_TIER_LABELS.length - 1,
		Math.floor((level - 1) / 50),
	)
	return CAMPAIGN_TIER_LABELS[tierIndex]
}

/**
 * Title shown in the game header for the active source.
 */
export function getGameSourceTitle(source: GameSource): string {
	switch (source.kind) {
		case 'campaign':
			return `Уровень ${source.level}`
		case 'daily':
			return 'Кроссворд дня'
		case 'endless':
			return 'Бесконечная игра'
		case 'dev-fixture':
			return 'DEV multi-digit fixture'
	}
}

/**
 * Subtitle for the active source.
 */
export function getGameSourceSubtitle(source: GameSource): string {
	switch (source.kind) {
		case 'campaign':
			return getCampaignTierLabel(source.level)
		case 'daily':
			return source.dateKey
		case 'endless':
			return `Решено подряд: ${source.completedCount}`
		case 'dev-fixture':
			return 'DEV-only: 12 + 6 = 18'
	}
}
