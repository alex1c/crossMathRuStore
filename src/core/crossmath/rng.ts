/** Small deterministic PRNG. The core generation path never calls Math.random. */
export function deriveSeed(...parts: readonly (string | number)[]): number {
	let hash = 0x811c9dc5
	for (const part of parts) {
		const text = `${part}\u0000`
		for (let index = 0; index < text.length; index += 1) {
			hash ^= text.charCodeAt(index)
			hash = Math.imul(hash, 0x01000193)
		}
	}
	return hash >>> 0
}

export function seedToUint32(seed: string | number): number {
	return typeof seed === 'number' ? seed >>> 0 : deriveSeed(seed)
}

export class SeededRandom {
	private state: number

	public constructor(seed: string | number) {
		this.state = seedToUint32(seed) || 0x6d2b79f5
	}

	public next(): number {
		this.state = (this.state + 0x6d2b79f5) >>> 0
		let value = this.state
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
		return ((value ^ (value >>> 14)) >>> 0) / 0x100000000
	}

	public integer(minInclusive: number, maxInclusive: number): number {
		if (minInclusive > maxInclusive) {
			throw new Error('Random integer lower bound must not exceed upper bound')
		}
		return (
			minInclusive +
			Math.floor(this.next() * (maxInclusive - minInclusive + 1))
		)
	}

	public pick<T>(items: readonly T[]): T {
		if (items.length === 0) {
			throw new Error('Cannot pick from an empty collection')
		}
		return items[this.integer(0, items.length - 1)]
	}

	public shuffle<T>(items: readonly T[]): T[] {
		const result = [...items]
		for (let index = result.length - 1; index > 0; index -= 1) {
			const other = this.integer(0, index)
			const value = result[index]
			result[index] = result[other]
			result[other] = value
		}
		return result
	}
}

