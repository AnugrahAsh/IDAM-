import { NOTIFICATIONS } from '../../data/seed'
import { NOW_MS } from '../../lib/clock'
import { withRead } from './readStore'

// ---------------------------------------------------------------------------
// What the notification centre holds.
//
// Three surfaces used to answer "how many are unread" three different ways:
// the header bell counted the seed flag and ignored read state entirely, the
// navigation badge counted only the seeded notifications, and the register
// counted seeded notifications plus the standing set plus anything published
// from Manage. They disagreed with each other on screen at the same moment.
//
// The composition now lives here, once, and all three read it.
// ---------------------------------------------------------------------------

/* Standing notices the platform raises for every tenant. They are part of the
   inbox, so they are part of the count. */
const STANDING = [
  ['Quarterly access review opens Monday', 'Reviewers receive their queues at 09:00. Undecided items escalate after five days.', 'high', 'Governance'],
  ['Connector credential rotation due', 'Three provisioning connectors hold credentials older than 90 days.', 'high', 'Security'],
  ['New joiner batch provisioned', 'Fourteen identities were created from the HR feed and are pending first sign-in.', 'info', 'Operations'],
  ['Dormant account sweep completed', 'The nightly sweep flagged accounts with no sign-in in the last 90 days.', 'info', 'Compliance'],
  ['Certificate expiry approaching', 'A federated signing certificate expires within 30 days. Rotate and republish the metadata.', 'critical', 'Platform'],
]

const stamp = (n) => {
  const d = new Date(NOW_MS - n * 86400000)
  return `${d.toISOString().slice(0, 10)} ${String(9 + (n % 9)).padStart(2, '0')}:${String((n * 13) % 60).padStart(2, '0')}`
}

/* Ids are positional and stable, because read state is recorded against them. */
export const SEED_ROWS = [
  ...NOTIFICATIONS.map((n, i) => ({
    id: i + 1,
    title: n.title,
    description: n.body,
    scheduleOn: n.ts,
    severity: n.severity,
    category: n.category,
    unread: n.unread,
  })),
  ...STANDING.map(([title, description, severity, category], i) => ({
    id: NOTIFICATIONS.length + i + 1,
    title,
    description,
    scheduleOn: stamp(i + 3),
    severity,
    category,
    unread: false,
  })),
]

/** Every row the inbox shows, with read state applied. */
export const inboxRows = (announcements = [], read) => withRead([...announcements, ...SEED_ROWS], read)

/** The one unread figure. The bell, the badge and the register all use it. */
export const unreadOf = (announcements = [], read) => inboxRows(announcements, read).filter((r) => r.unread)
