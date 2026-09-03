import { useSyncExternalStore } from 'react'
import { ANNOUNCEMENTS } from '../comms/commsData'

/**
 * The announcement collection behind the Notification Center.
 *
 * The inbox and the Manage view are two views of one page now, so they read one
 * store rather than each holding their own copy: publishing an announcement in
 * Manage puts it in the inbox on the next render, and deleting it takes it back
 * out. This is the same arrangement the Quick Links store already uses.
 */

const listeners = new Set()
let state = ANNOUNCEMENTS.map((a) => ({ ...a }))

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getAnnouncements = () => state

export const writeAnnouncements = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

export const useAnnouncements = () => useSyncExternalStore(subscribe, getAnnouncements, getAnnouncements)

/** Announcement severities are authored on a four-step scale; the inbox reads three. */
const INBOX_SEVERITY = { info: 'info', warn: 'high', high: 'high', critical: 'critical' }

/**
 * What an identity actually sees: published announcements, newest first,
 * shaped like every other row in the inbox.
 */
export const publishedAnnouncements = (list = state) => list
  .filter((a) => a.status === 'Published')
  .slice()
  .sort((a, b) => String(b.scheduleOn).localeCompare(String(a.scheduleOn)))
  .map((a) => ({
    id: `ann-${a.id}`,
    title: a.title,
    description: a.description,
    scheduleOn: a.scheduleOn,
    severity: INBOX_SEVERITY[a.severity] || 'info',
    category: 'Announcements',
    unread: true,
    announcement: true,
  }))

export const usePublishedAnnouncements = () => publishedAnnouncements(useAnnouncements())
