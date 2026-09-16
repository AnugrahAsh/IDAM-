/** The one module the Notification Center is gated on, and the paths it owns. */
export const NOTIFICATION_MODULE = 'Notification Center'

/** Holding any one of these is what makes the Manage view reachable. */
export const WRITE_ANNOUNCEMENT = [
  'Add Notification', 'Modify Notification', 'Delete Notification', 'Change Status',
]

export const INBOX_PATH = '/iam/notifications'
export const MANAGE_PATH = '/iam/notifications/manage'
