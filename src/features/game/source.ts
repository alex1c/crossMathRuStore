/**
 * Campaign / mode labels and game-session source types.
 */

import {
	getTrackLabel,
	type DifficultyTrack,
} from '@/src/core/crossmath/tracks'

export type GameSourceKind =
	| 'track'
	| 'daily'
	| 'endless'
	| 'multiplication'
	| 'dev-fixture'
	| 'tutorial'

export type TrackGameSource = {
	readonly kind: 'track'
	readonly track: DifficultyTrack
	readonly level: number
	readonly catalogVersion?: string | null
}

export type DailyGameSource = {
	readonly kind: 'daily'
	readonly dateKey: string
}

export type EndlessGameSource = {
	readonly kind: 'endless'
	readonly completedCount: number
}

export type MultiplicationGameSource = {
	readonly kind: 'multiplication'
	readonly table: number | 'mixed'
	readonly sequence: number
}

export type DevFixtureGameSource = {
	readonly kind: 'dev-fixture'
	readonly id: 'multi-digit' | 'bank-dup'
}

export type TutorialGameSource = {
	readonly kind: 'tutorial'
}

export type GameSource =
	| TrackGameSource
	| DailyGameSource
	| EndlessGameSource
	| MultiplicationGameSource
	| DevFixtureGameSource
	| TutorialGameSource

/** Stable semantic identity for effects that receive route-created objects. */
export function getGameSourceIdentity(source: GameSource): string {
	switch (source.kind) {
		case 'track':
			return `track:${source.track}:${source.level}:${source.catalogVersion ?? ''}`
		case 'daily':
			return `daily:${source.dateKey}`
		case 'endless':
			return `endless:${source.completedCount}`
		case 'multiplication':
			return `multiplication:${source.table}:${source.sequence}`
		case 'dev-fixture':
			return `dev-fixture:${source.id}`
		case 'tutorial':
			return 'tutorial'
	}
}

export function getGameSourceTitle(source: GameSource): string {
	switch (source.kind) {
		case 'track':
			return `${getTrackLabel(source.track)} · уровень ${source.level}`
		case 'daily':
			return 'Кроссворд дня'
		case 'endless':
			return 'Бесконечная игра'
		case 'multiplication':
			return source.table === 'mixed'
				? 'Таблица умножения · смешанная'
				: `Таблица ×${source.table}`
		case 'dev-fixture':
			return source.id === 'bank-dup'
				? 'DEV bank fixture'
				: 'DEV multi-digit fixture'
		case 'tutorial':
			return 'Обучение'
	}
}

export function getGameSourceSubtitle(source: GameSource): string {
	switch (source.kind) {
		case 'track':
			return getTrackLabel(source.track)
		case 'daily':
			return source.dateKey
		case 'endless':
			return `Решено подряд: ${source.completedCount}`
		case 'multiplication':
			return source.table === 'mixed' ? 'Смешанная' : `×${source.table}`
		case 'dev-fixture':
			return 'DEV-only'
		case 'tutorial':
			return 'Мини-кроссворд'
	}
}

/** @deprecated old tier labels — do not use in production track UI */
export function getCampaignTierLabel(_level: number): string {
	return 'Кампания'
}
