import { useSyncExternalStore } from 'react'
import { REQUESTS } from '../../data/seed'
import { withAudit } from '../requests/data'

/**
 * The approval queue.
 *
 * The rows were the Approvals page's own `useState`, seeded from the demo data
 * on every mount — so a decision, and with it any revision an approver made to
 * the request, lasted exactly until they opened another screen. A level-2
 * approver arriving later found the request back at level 1, as requested,
 * with no trace of what level 1 had done to it. The rows live here now, the
 * way announcements, quick links and settings do, and survive navigation for
 * the length of the session.
 */

const listeners = new Set()
let state = REQUESTS.map(withAudit)

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getApprovalRows = () => state

export const writeApprovalRows = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

export const useApprovalRows = () => useSyncExternalStore(subscribe, getApprovalRows, getApprovalRows)
