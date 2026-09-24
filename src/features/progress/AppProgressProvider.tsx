import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import {
	createDefaultPersistedState,
	loadPersistedAppState,
	savePersistedAppState,
	type PersistedActiveSession,
	type PersistedAppState,
	type PersistedDailyResult,
	type PersistedSettings,
	type PersistedTrackLevelResult,
} from '@/src/services/persistence'
import type { DifficultyTrack } from '@/src/core/crossmath/tracks'
import { formatLocalDateKey } from './dateKey'
import {
	withActiveSession,
	withDailyCompleted,
	withEndlessCompleted,
	withLastPlayedTrackLevel,
	withMultiplicationCompleted,
	withSettings,
	withTrackCompleted,
} from './mutations'
import { deriveAppStats, type AppStats } from './stats'
import { computeDailyStreak } from './streak'
import {
	applyDailyReminderPlan,
	getReminderPermissionStatus,
	requestReminderPermission,
	type ReminderPermission,
} from '@/src/features/reminder'

type AppProgressContextValue = {
	readonly ready: boolean
	readonly state: PersistedAppState
	readonly todayKey: string
	readonly stats: AppStats
	readonly streakCurrent: number
	readonly streakBest: number
	readonly reminderPermission: ReminderPermission
	readonly completeTrackLevel: (
		track: DifficultyTrack,
		result: PersistedTrackLevelResult,
	) => Promise<void>
	readonly completeDaily: (result: PersistedDailyResult) => Promise<void>
	readonly completeEndless: (payload: {
		elapsedMs: number
		mistakes: number
		hintsUsed: number
	}) => Promise<void>
	readonly completeMultiplication: (
		table: number | 'mixed',
		payload: { mistakes: number; hintsUsed: number },
	) => Promise<void>
	readonly saveActiveSession: (
		session: PersistedActiveSession | null,
	) => Promise<void>
	readonly updateSettings: (patch: Partial<PersistedSettings>) => Promise<void>
	readonly markTrackPlayed: (
		track: DifficultyTrack,
		level: number,
	) => Promise<void>
	readonly refreshReminder: () => Promise<void>
	readonly requestNotificationPermission: () => Promise<ReminderPermission>
}

const AppProgressContext = createContext<AppProgressContextValue | null>(null)

type ProviderProps = {
	readonly children: ReactNode
}

/**
 * Loads / persists CrossMath progress and reconciles the Daily reminder.
 */
export function AppProgressProvider({ children }: ProviderProps) {
	const [ready, setReady] = useState(false)
	const [state, setState] = useState<PersistedAppState>(
		createDefaultPersistedState,
	)
	const [todayKey, setTodayKey] = useState(() => formatLocalDateKey())
	const [reminderPermission, setReminderPermission] =
		useState<ReminderPermission>('undetermined')
	const stateRef = useRef(state)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	const persist = useCallback(async (next: PersistedAppState) => {
		setState(next)
		stateRef.current = next
		try {
			await savePersistedAppState(next)
		} catch {
			// Storage failure must not crash gameplay.
		}
	}, [])

	const refreshReminder = useCallback(async () => {
		const current = stateRef.current
		const key = formatLocalDateKey()
		setTodayKey(key)
		const permission = await getReminderPermissionStatus()
		setReminderPermission(permission)
		await applyDailyReminderPlan({
			enabled: current.settings.dailyReminderEnabled,
			minutesFromMidnight: current.settings.dailyReminderMinutes,
			todayKey: key,
			todayCompleted: Boolean(current.daily.completions[key]),
			permission,
		})
	}, [])

	useEffect(() => {
		let cancelled = false
		void (async () => {
			const loaded = await loadPersistedAppState()
			if (cancelled) {
				return
			}
			setState(loaded)
			stateRef.current = loaded
			setReady(true)
			const permission = await getReminderPermissionStatus()
			if (cancelled) {
				return
			}
			setReminderPermission(permission)
			const key = formatLocalDateKey()
			setTodayKey(key)
			// Do not request permission on bootstrap. Only schedule if already
			// enabled AND permission already granted.
			await applyDailyReminderPlan({
				enabled: loaded.settings.dailyReminderEnabled,
				minutesFromMidnight: loaded.settings.dailyReminderMinutes,
				todayKey: key,
				todayCompleted: Boolean(loaded.daily.completions[key]),
				permission,
			})
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const completeTrackLevel = useCallback(
		async (track: DifficultyTrack, result: PersistedTrackLevelResult) => {
			const next = withTrackCompleted(stateRef.current, track, result)
			await persist(next)
			await refreshReminder()
		},
		[persist, refreshReminder],
	)

	const completeDaily = useCallback(
		async (result: PersistedDailyResult) => {
			const next = withDailyCompleted(stateRef.current, result)
			await persist(next)
			await refreshReminder()
		},
		[persist, refreshReminder],
	)

	const completeEndless = useCallback(
		async (payload: {
			elapsedMs: number
			mistakes: number
			hintsUsed: number
		}) => {
			const next = withEndlessCompleted(stateRef.current, payload)
			await persist(next)
		},
		[persist],
	)

	const completeMultiplication = useCallback(
		async (
			table: number | 'mixed',
			payload: { mistakes: number; hintsUsed: number },
		) => {
			const next = withMultiplicationCompleted(
				stateRef.current,
				table,
				payload,
			)
			await persist(next)
		},
		[persist],
	)

	const saveActiveSession = useCallback(
		async (session: PersistedActiveSession | null) => {
			const next = withActiveSession(stateRef.current, session)
			await persist(next)
		},
		[persist],
	)

	const updateSettings = useCallback(
		async (patch: Partial<PersistedSettings>) => {
			const next = withSettings(stateRef.current, patch)
			await persist(next)
			await refreshReminder()
		},
		[persist, refreshReminder],
	)

	const markTrackPlayed = useCallback(
		async (track: DifficultyTrack, level: number) => {
			if (stateRef.current.tracks[track].lastPlayedLevel === level) {
				return
			}
			const next = withLastPlayedTrackLevel(stateRef.current, track, level)
			await persist(next)
		},
		[persist],
	)

	const requestNotificationPermission = useCallback(async () => {
		const permission = await requestReminderPermission()
		setReminderPermission(permission)
		await refreshReminder()
		return permission
	}, [refreshReminder])

	const streak = useMemo(
		() =>
			computeDailyStreak(
				Object.keys(state.daily.completions),
				todayKey,
			),
		[state.daily.completions, todayKey],
	)
	const streakCurrent = streak.current
	const streakBest = streak.best

	const stats = useMemo(
		() => deriveAppStats(state, todayKey),
		[state, todayKey],
	)

	const value = useMemo<AppProgressContextValue>(
		() => ({
			ready,
			state,
			todayKey,
			stats,
			streakCurrent,
			streakBest,
			reminderPermission,
			completeTrackLevel,
			completeDaily,
			completeEndless,
			completeMultiplication,
			saveActiveSession,
			updateSettings,
			markTrackPlayed,
			refreshReminder,
			requestNotificationPermission,
		}),
		[
			ready,
			state,
			todayKey,
			stats,
			streakCurrent,
			streakBest,
			reminderPermission,
			completeTrackLevel,
			completeDaily,
			completeEndless,
			completeMultiplication,
			saveActiveSession,
			updateSettings,
			markTrackPlayed,
			refreshReminder,
			requestNotificationPermission,
		],
	)

	return (
		<AppProgressContext.Provider value={value}>
			{children}
		</AppProgressContext.Provider>
	)
}

export function useAppProgress(): AppProgressContextValue {
	const value = useContext(AppProgressContext)
	if (!value) {
		throw new Error('useAppProgress must be used within AppProgressProvider')
	}
	return value
}
