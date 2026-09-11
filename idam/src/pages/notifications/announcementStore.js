import { useSyncExternalStore } from 'react'
import { ANNOUNCEMENTS } from '../comms/commsData'
import { severityLevel } from '../settings/settingsStore'

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

/* An announcement is authored against whatever severities the tenant has
   defined; the inbox files, counts and sorts on three steps. The mapping is
   part of the severity itself, held in Settings → Notification Management Setup, so a
   tenant that renames or adds one does not fall through to Info. */

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
    severity: severityLevel(a.severity),
    category: 'Announcements',
    unread: true,
    announcement: true,
  }))

export const usePublishedAnnouncements = () => publishedAnnouncements(useAnnouncements())
