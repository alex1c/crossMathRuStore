/**
 * Campaign / mode labels and game-session source types for the reusable game screen.
 */

export type GameSourceKind =
	| 'campaign'
	| 'daily'
	| 'daily-expert'
	| 'endless'
	| 'multiplication'

export type CampaignGameSource = {
	readonly kind: 'campaign'
	readonly level: number
}

export type GameSource = CampaignGameSource

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
	if (source.kind === 'campaign') {
		return `Уровень ${source.level}`
	}
	return 'Игра'
}
