import type { ReminderPermission } from './reconcile'

export function getReminderSettingsView(
	preferenceEnabled: boolean,
	permission: ReminderPermission,
) {
	const enabled = preferenceEnabled && permission === 'granted'
	return {
		enabled,
		showTimeControls: enabled,
		showPermissionHelp: preferenceEnabled && permission === 'denied',
	}
}

export function canEnableReminder(permission: ReminderPermission): boolean {
	return permission === 'granted'
}
