import { deriveSeed } from './rng'
import { analyzeDifficulty } from './difficulty'
import { generatePuzzle } from './generator'
import type {
	DailyMode,
	DifficultyTier,
	EndlessProgress,
	GenerationProfile,
	MultiplicationTable,
	ProfiledPuzzle,
	PuzzleGenerationConfig,
} from './types'

const GENERATOR_VERSION = 'v1'

const PROFILE_DEFINITIONS: Record<DifficultyTier, GenerationProfile> = {
	easy: {
		id: 'easy',
		difficultyTier: 'easy',
		scoreRange: { min: 0, max: 12 },
		generatorVersion: GENERATOR_VERSION,
		config: {
			rows: 9,
			columns: 9,
			minValue: 1,
			maxValue: 12,
			allowedOperations: ['add', 'subtract'],
			targetEquationCount: 3,
			targetBlankCount: 1,
			maxGenerationAttempts: 40,
			requireConnected: true,
			solverMaxNodes: 100_000,
		},
		maxCandidateAttempts: 12,
	},
	medium: {
		id: 'medium',
		difficultyTier: 'medium',
		scoreRange: { min: 14, max: 30 },
		generatorVersion: GENERATOR_VERSION,
		config: {
			rows: 11,
			columns: 11,
			minValue: 1,
			maxValue: 18,
			allowedOperations: ['add', 'subtract', 'multiply'],
			targetEquationCount: 5,
			targetBlankCount: 3,
			maxGenerationAttempts: 50,
			requireConnected: true,
			solverMaxNodes: 100_000,
		},
		maxCandidateAttempts: 20,
	},
	hard: {
		id: 'hard',
		difficultyTier: 'hard',
		scoreRange: { min: 28, max: 40 },
		generatorVersion: GENERATOR_VERSION,
		config: {
			rows: 13,
			columns: 13,
			minValue: 1,
			maxValue: 24,
			allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
			targetEquationCount: 6,
			targetBlankCount: 4,
			maxGenerationAttempts: 60,
			requireConnected: true,
			solverMaxNodes: 100_000,
		},
		maxCandidateAttempts: 30,
	},
	expert: {
		id: 'expert',
		difficultyTier: 'expert',
		scoreRange: { min: 36, max: 60 },
		generatorVersion: GENERATOR_VERSION,
		config: {
			rows: 15,
			columns: 15,
			minValue: 1,
			maxValue: 32,
			allowedOperations: ['add', 'subtract', 'multiply', 'divide'],
			targetEquationCount: 8,
			targetBlankCount: 6,
			maxGenerationAttempts: 80,
			requireConnected: true,
			solverMaxNodes: 100_000,
		},
		maxCandidateAttempts: 50,
	},
}

export class DifficultyGenerationError extends Error {
	public readonly code = 'DIFFICULTY_TARGET_NOT_REACHED'
	public readonly candidateAttempts: number

	public constructor(profile: GenerationProfile, candidateAttempts: number, lastError?: unknown) {
		super(
			`unable to generate ${profile.id} puzzle in ${candidateAttempts} bounded candidate attempts` +
			(lastError instanceof Error ? `: ${lastError.message}` : ''),
		)
		this.name = 'DifficultyGenerationError'
		this.candidateAttempts = candidateAttempts
	}
}

function cloneProfile(profile: GenerationProfile, overrides: Partial<GenerationProfile> = {}): GenerationProfile {
	return {
		...profile,
		...overrides,
		config: { ...profile.config, ...(overrides.config ?? {}) },
		scoreRange: { ...profile.scoreRange, ...(overrides.scoreRange ?? {}) },
	}
}

export function getDifficultyProfile(tier: DifficultyTier): GenerationProfile {
	return cloneProfile(PROFILE_DEFINITIONS[tier])
}

export function generatePuzzleForProfile(
	seed: string | number,
	profileOrTier: GenerationProfile | DifficultyTier,
	configOverrides: Partial<PuzzleGenerationConfig> = {},
): ProfiledPuzzle {
	const profile = typeof profileOrTier === 'string'
		? getDifficultyProfile(profileOrTier)
		: cloneProfile(profileOrTier)
	let lastError: unknown
	for (let attempt = 1; attempt <= profile.maxCandidateAttempts; attempt += 1) {
		const candidateSeed = deriveSeed(seed, profile.generatorVersion, profile.id, attempt)
		try {
			const generated = generatePuzzle(candidateSeed, {
				...profile.config,
				...configOverrides,
				generatorVersion: profile.generatorVersion,
			})
			const analysis = analyzeDifficulty(generated.puzzle)
			if (
				analysis.solver.status === 'unique' &&
				analysis.score >= profile.scoreRange.min &&
				analysis.score <= profile.scoreRange.max
			) {
				return { generated, analysis, profile, candidateAttempts: attempt }
			}
		} catch (error) {
			lastError = error
		}
	}
	throw new DifficultyGenerationError(profile, profile.maxCandidateAttempts, lastError)
}

function withCampaignProgress(
	level: number,
	base: GenerationProfile,
	progress: number,
	): GenerationProfile {
	const baseline = base.config.targetBlankCount ?? 1
	const withinTierGrowth = base.difficultyTier === 'expert' ? 0 : 1
	return cloneProfile(base, {
		id: `campaign-${level}`,
		seed: deriveSeed('campaign', level, GENERATOR_VERSION),
		config: {
			targetBlankCount: baseline + Math.floor(progress * withinTierGrowth),
		},
	})
}

export function getCampaignGenerationProfile(level: number): GenerationProfile {
	if (!Number.isInteger(level) || level < 1 || level > 250) {
		throw new RangeError('campaign level must be an integer from 1 to 250')
	}
	const tierIndex = Math.floor((level - 1) / 50)
	const progress = ((level - 1) % 50) / 49
	if (tierIndex === 0) {
		return withCampaignProgress(level, getDifficultyProfile('easy'), progress)
	}
	if (tierIndex === 1) {
		return withCampaignProgress(level, getDifficultyProfile('medium'), progress)
	}
	if (tierIndex === 2) {
		return withCampaignProgress(level, cloneProfile(getDifficultyProfile('medium'), {
			id: 'campaign-adept',
			scoreRange: { min: 20, max: 36 },
			config: { targetEquationCount: 6, targetBlankCount: 3 },
		}), progress)
	}
	if (tierIndex === 3) {
		return withCampaignProgress(level, getDifficultyProfile('hard'), progress)
	}
	return withCampaignProgress(level, getDifficultyProfile('expert'), progress)
}

export function getDailyGenerationProfile(
	dateKey: string,
	mode: DailyMode = 'daily',
): GenerationProfile {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
		throw new Error('dateKey must be normalized as YYYY-MM-DD')
	}
	const seed = deriveSeed(dateKey, GENERATOR_VERSION, mode)
	if (mode === 'daily-expert') {
		return cloneProfile(getDifficultyProfile('expert'), {
			id: `daily-expert-${dateKey}`,
			seed,
			scoreRange: { min: 36, max: 60 },
			config: { targetBlankCount: 6 },
		})
	}
	return cloneProfile(getDifficultyProfile('medium'), {
		id: `daily-${dateKey}`,
		seed,
		scoreRange: { min: 14, max: 34 },
		config: { targetBlankCount: 2 + (seed % 3) },
	})
}

export function getEndlessGenerationProfile(progress: EndlessProgress): GenerationProfile {
	if (!Number.isInteger(progress.completed) || progress.completed < 0 || !Number.isInteger(progress.streak) || progress.streak < 0) {
		throw new RangeError('endless progress must contain non-negative integers')
	}
	const completed = progress.completed
	const tier: DifficultyTier = completed >= 60
		? 'expert'
		: completed >= 30
			? 'hard'
			: completed >= 10
				? 'medium'
				: 'easy'
	const base = getDifficultyProfile(tier)
	const targetBlankCount = tier === 'expert'
		? 6
		: tier === 'hard'
			? 3 + Math.min(1, Math.floor((completed - 30) / 20))
			: tier === 'medium'
				? 2 + Math.min(1, Math.floor((completed - 10) / 20))
				: 1 + Math.min(1, Math.floor(completed / 5))
	return cloneProfile(base, {
		id: `endless-${completed}-${progress.streak}`,
		seed: deriveSeed('endless', completed, progress.streak, GENERATOR_VERSION),
		config: { targetBlankCount },
	})
}

export function getMultiplicationTableGenerationProfile(
	table: MultiplicationTable,
): GenerationProfile {
	const label = String(table)
	return cloneProfile(getDifficultyProfile('medium'), {
		id: `multiplication-${label}`,
		scoreRange: { min: 14, max: 38 },
		config: {
			allowedOperations: ['multiply'],
			multiplicationTable: table,
			minValue: 1,
			maxValue: 24,
			targetEquationCount: 5,
			targetBlankCount: 3,
		},
	})
}

export function generateDailyPuzzle(dateKey: string, mode: DailyMode = 'daily'): ProfiledPuzzle {
	const profile = getDailyGenerationProfile(dateKey, mode)
	return generatePuzzleForProfile(profile.seed ?? dateKey, profile)
}

export function generateCampaignPuzzle(level: number): ProfiledPuzzle {
	const profile = getCampaignGenerationProfile(level)
	return generatePuzzleForProfile(profile.seed ?? level, profile)
}

export function generateEndlessPuzzle(progress: EndlessProgress): ProfiledPuzzle {
	const profile = getEndlessGenerationProfile(progress)
	return generatePuzzleForProfile(profile.seed ?? progress.completed, profile)
}

export function generateMultiplicationTablePuzzle(table: MultiplicationTable, seed: string | number): ProfiledPuzzle {
	const profile = getMultiplicationTableGenerationProfile(table)
	return generatePuzzleForProfile(seed, profile)
}
