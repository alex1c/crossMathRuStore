/**
 * Lightweight Expo haptics wrapper. Failures must never break gameplay.
 */

import * as Haptics from 'expo-haptics'

/**
 * Soft tap feedback for keypad / selection.
 */
export function hapticSelection(): void {
	try {
		void Haptics.selectionAsync()
	} catch {
		// Native haptic unavailable — ignore.
	}
}

/**
 * Confirmed entry / light impact.
 */
export function hapticEntry(): void {
	try {
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
	} catch {
		// Native haptic unavailable — ignore.
	}
}

/**
 * Soft error feedback (wrong entry when show-errors is on).
 */
export function hapticError(): void {
	try {
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
	} catch {
		// Native haptic unavailable — ignore.
	}
}

/**
 * Puzzle completion celebration.
 */
export function hapticSuccess(): void {
	try {
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
	} catch {
		// Native haptic unavailable — ignore.
	}
}
