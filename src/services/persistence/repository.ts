/**
 * AsyncStorage-backed persistence repository with serialized writes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PersistedAppState } from './schema'
import {
	createDefaultPersistedState,
	PERSISTENCE_STORAGE_KEY,
} from './schema'
import { parsePersistedAppState } from './validate'

export type KeyValueStorage = {
	getItem: (key: string) => Promise<string | null>
	setItem: (key: string, value: string) => Promise<void>
	removeItem?: (key: string) => Promise<void>
}

const defaultStorage: KeyValueStorage = AsyncStorage

let writeChain: Promise<void> = Promise.resolve()

/**
 * Load persisted app state. Corrupt / missing data yields defaults.
 */
export async function loadPersistedAppState(
	storage: KeyValueStorage = defaultStorage,
): Promise<PersistedAppState> {
	try {
		const raw = await storage.getItem(PERSISTENCE_STORAGE_KEY)
		if (!raw) {
			return createDefaultPersistedState()
		}
		const parsed: unknown = JSON.parse(raw)
		return parsePersistedAppState(parsed)
	} catch {
		return createDefaultPersistedState()
	}
}

/**
 * Persist app state. Writes are serialized to avoid destructive races.
 */
export async function savePersistedAppState(
	state: PersistedAppState,
	storage: KeyValueStorage = defaultStorage,
): Promise<void> {
	const payload = JSON.stringify(state)
	writeChain = writeChain
		.catch(() => undefined)
		.then(async () => {
			await storage.setItem(PERSISTENCE_STORAGE_KEY, payload)
		})
	await writeChain
}

/**
 * Test helper: clear persisted document.
 */
export async function clearPersistedAppState(
	storage: KeyValueStorage = defaultStorage,
): Promise<void> {
	if (storage.removeItem) {
		await storage.removeItem(PERSISTENCE_STORAGE_KEY)
		return
	}
	await storage.setItem(
		PERSISTENCE_STORAGE_KEY,
		JSON.stringify(createDefaultPersistedState()),
	)
}
