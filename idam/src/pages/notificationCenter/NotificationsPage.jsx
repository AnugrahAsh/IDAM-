import './NotificationsPage.css'
import './NotificationManagementPage.css'
import NotificationInbox from './NotificationInbox'
import AnnouncementRegister from './AnnouncementRegister'

/**
 * The Notification Center.
 *
 * What used to be two navigation entries — Notifications and Notification
 * Management — is one page with two views. The inbox is what every identity
 * gets; `/manage` is the authoring surface, a full page of its own reached from
 * the Manage button in the inbox and gated on the role's permissions rather
 * than hidden in a menu an unprivileged operator can still click.
 */
export default function NotificationsPage({ segments = [] }) {
  if (segments[0] === 'manage') return <AnnouncementRegister segments={segments.slice(1)} />
  return <NotificationInbox />
}
