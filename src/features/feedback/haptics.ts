/**
 * Lightweight Expo haptics wrapper. Failures must never break gameplay.
 */

import * as Haptics from 'expo-haptics'

/** Haptics are optional feedback: ignore unavailable APIs and native failures. */
function runHaptic(action: () => Promise<void>): void {
	try {
		void Promise.resolve(action()).catch(() => {
			// Native haptic unavailable or rejected; gameplay continues silently.
		})
	} catch {
		// Some platforms throw before returning a Promise.
	}
}

/**
 * Soft tap feedback for keypad / selection.
 */
export function hapticSelection(): void {
	runHaptic(() => Haptics.selectionAsync())
}

/**
 * Confirmed entry / light impact.
 */
export function hapticEntry(): void {
	runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/**
 * Soft error feedback (wrong entry when show-errors is on).
 */
export function hapticError(): void {
	runHaptic(() =>
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
	)
}

/**
 * Puzzle completion celebration.
 */
export function hapticSuccess(): void {
	runHaptic(() =>
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
	)
}

