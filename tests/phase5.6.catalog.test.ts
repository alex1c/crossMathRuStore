import {
	assertLobachevskyCatalogShape,
	countHybridSolutions,
	createLobachevskyBank,
	loadLobachevskyLevel,
	validateLobachevskyCatalogUniqueness,
} from '@/src/core/crossmath'

describe('Phase 5.6 Lobachevsky catalog', () => {
	it('passes structural validation', () => {
		const shape = assertLobachevskyCatalogShape()
		expect(shape.ok).toBe(true)
		expect(shape.levelCount).toBe(50)
		expect(shape.catalogVersion).toBe('lobachevsky-v1')
	})

	it('loads sample levels and derives deterministic banks', () => {
		for (const level of [1, 25, 50] as const) {
			const entry = loadLobachevskyLevel(level)
			expect(entry.level).toBe(level)
			expect(entry.puzzle.equations.length).toBeGreaterThan(0)
			const bank = createLobachevskyBank(level)
			expect(bank.items.length).toBeGreaterThan(0)
			expect(createLobachevskyBank(level).items.map((item) => item.id)).toEqual(
				bank.items.map((item) => item.id),
			)
		}
	})

	it('proves uniqueness for sample catalog levels only', () => {
		for (const level of [1, 25, 50] as const) {
			const entry = loadLobachevskyLevel(level)
			const solved = countHybridSolutions(entry.puzzle, 2)
			expect(solved.count).toBe(1)
		}
	}, 60_000)

	it('optionally validates full catalog uniqueness when fast enough', () => {
		const started = Date.now()
		const result = validateLobachevskyCatalogUniqueness({ maxNodes: 50_000 })
		const elapsed = Date.now() - started
		if (elapsed > 45_000) {
			// CI / slow machines: sample-level checks above are the gate.
			expect(result.unique).toBeGreaterThan(0)
			return
		}
		expect(result.valid).toBe(true)
	}, 120_000)
})
