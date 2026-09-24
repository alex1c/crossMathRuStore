/**
 * Build production Lobachevsky catalog (v1) from research hybrid puzzles.
 * Orders levels by difficulty score ascending for progression.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import researchCatalog from '../docs/research/phase5.5b-lobachevsky-catalog.json'
import {
	analyzeHybridPuzzle,
	deriveAdvancedNumberBank,
	solveHybridPuzzle,
	type HybridPuzzle,
} from '../src/core/crossmath/experimental.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src', 'data', 'crossmath')
const outPath = join(outDir, 'lobachevsky-v1.json')

type ResearchLevel = {
	readonly level: number
	readonly puzzle: HybridPuzzle
}

const levels = (researchCatalog as { levels: ResearchLevel[] }).levels
const started = Date.now()
const solvedEntries: Array<{
	sourceLevel: number
	puzzle: HybridPuzzle
	solution: ReturnType<typeof solveHybridPuzzle>['solution']
	score: number
	blanks: number
	equations: number
	bankSize: number
}> = []

for (const entry of levels) {
	const solved = solveHybridPuzzle(entry.puzzle, { maxNodes: 200_000 })
	if (solved.status !== 'unique' || !solved.solution) {
		throw new Error(`Lobachevsky research level ${entry.level} not unique: ${solved.status}`)
	}
	const analysis = analyzeHybridPuzzle(entry.puzzle)
	const bank = deriveAdvancedNumberBank(entry.puzzle, solved.solution, {
		mode: 'distractors',
		seed: `lobachevsky-v1-src-${entry.level}`,
	})
	solvedEntries.push({
		sourceLevel: entry.level,
		puzzle: entry.puzzle,
		solution: solved.solution,
		score: analysis.score,
		blanks: analysis.blankCount,
		equations: entry.puzzle.equations.length,
		bankSize: bank.items.length,
	})
}

solvedEntries.sort(
	(a, b) =>
		a.score - b.score ||
		a.blanks - b.blanks ||
		a.equations - b.equations ||
		a.sourceLevel - b.sourceLevel,
)

const production = {
	schemaVersion: 1 as const,
	catalogVersion: 'lobachevsky-v1' as const,
	track: 'lobachevsky' as const,
	variant: 'hybrid' as const,
	generatorVersion: 'phase5.5b-hybrid-v1',
	ordering: 'score-asc-then-blanks-equations',
	levels: solvedEntries.map((entry, index) => ({
		level: index + 1,
		sourceLevel: entry.sourceLevel,
		puzzle: entry.puzzle,
		solution: entry.solution!,
	})),
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `${JSON.stringify(production)}\n`, 'utf8')

const bytes = Buffer.byteLength(JSON.stringify(production), 'utf8')
console.log(
	JSON.stringify(
		{
			outPath,
			bytes,
			count: production.levels.length,
			ms: Date.now() - started,
			scoreMin: solvedEntries[0]!.score,
			scoreMax: solvedEntries[49]!.score,
			levels: [1, 25, 50].map((level) => {
				const entry = solvedEntries[level - 1]!
				return {
					level,
					sourceLevel: entry.sourceLevel,
					score: entry.score,
					blanks: entry.blanks,
					equations: entry.equations,
					bankSize: entry.bankSize,
				}
			}),
		},
		null,
		2,
	),
)
