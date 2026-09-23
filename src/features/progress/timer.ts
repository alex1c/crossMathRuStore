/**
 * Active play timer — counts foreground time only.
 */

export type ActiveTimerState = {
	readonly accumulatedActiveMs: number
	/** null while backgrounded / paused. */
	readonly activeSegmentStartedAt: number | null
}

export function createActiveTimer(now: number = Date.now()): ActiveTimerState {
	return {
		accumulatedActiveMs: 0,
		activeSegmentStartedAt: now,
	}
}

export function pauseActiveTimer(
	timer: ActiveTimerState,
	now: number = Date.now(),
): ActiveTimerState {
	if (timer.activeSegmentStartedAt === null) {
		return timer
	}
	const delta = Math.max(0, now - timer.activeSegmentStartedAt)
	return {
		accumulatedActiveMs: timer.accumulatedActiveMs + delta,
		activeSegmentStartedAt: null,
	}
}

export function resumeActiveTimer(
	timer: ActiveTimerState,
	now: number = Date.now(),
): ActiveTimerState {
	if (timer.activeSegmentStartedAt !== null) {
		return timer
	}
	return {
		accumulatedActiveMs: timer.accumulatedActiveMs,
		activeSegmentStartedAt: now,
	}
}

export function getActiveElapsedMs(
	timer: ActiveTimerState,
	now: number = Date.now(),
): number {
	if (timer.activeSegmentStartedAt === null) {
		return timer.accumulatedActiveMs
	}
	return (
		timer.accumulatedActiveMs +
		Math.max(0, now - timer.activeSegmentStartedAt)
	)
}

export function hydrateActiveTimer(
	accumulatedActiveMs: number,
	now: number = Date.now(),
): ActiveTimerState {
	return {
		accumulatedActiveMs: Math.max(0, accumulatedActiveMs),
		activeSegmentStartedAt: now,
	}
}
