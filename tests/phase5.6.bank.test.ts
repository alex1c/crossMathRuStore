import { remainingBankItems } from '@/src/core/crossmath/numberBank'
import { BANK_DUP_DEV_FIXTURE } from '@/src/features/game/bankFixture'

describe('Phase 5.6 remainingBankItems', () => {
	const initial = BANK_DUP_DEV_FIXTURE.bankItems

	it('consumes duplicate answer tokens by value multiplicity', () => {
		const afterOneFive = remainingBankItems(initial, {
			'0,0': 5,
		})
		expect(afterOneFive.filter((item) => item.value === 5)).toHaveLength(1)
		expect(afterOneFive.filter((item) => item.value === 4)).toHaveLength(1)

		const afterBothFives = remainingBankItems(initial, {
			'0,0': 5,
			'2,0': 5,
		})
		expect(afterBothFives.filter((item) => item.value === 5)).toHaveLength(0)
		expect(afterBothFives).toEqual([{ id: 'distractor-0', value: 4, kind: 'distractor' }])
	})

	it('returns consumed tokens when entries are cleared', () => {
		const placed = remainingBankItems(initial, { '0,0': 5, '2,0': 5 })
		expect(placed).toHaveLength(1)

		const restored = remainingBankItems(initial, {
			'0,0': null,
			'2,0': null,
		})
		expect(restored).toEqual([...initial])
	})

	it('ignores null entries and unrelated values', () => {
		const partial = remainingBankItems(initial, {
			'0,0': null,
			'9,9': 99,
		})
		expect(partial).toEqual([...initial])
	})
})
