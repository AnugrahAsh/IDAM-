import { useSyncExternalStore } from 'react'
import { USEFUL_LINKS } from '../../data/seed'
import { stamp } from '../shared/comms/commsData'

/**
 * The useful-links collection.
 *
 * Useful Links and Useful Links Management used to read two different arrays:
 * the consumer page rendered ten links while the management screen managed
 * four, so a link could be published to every identity and be invisible to the
 * administrator responsible for it. There is one collection now, and the
 * management screen is the authority over it — a link hidden there disappears
 * from the consumer page.
 */

const EXTRA = [
  ['https://docs.tanflow.com/api', 'API reference', 'REST endpoints for provisioning and reporting.', 'code'],
  ['https://trust.tanflow.com', 'Trust center', 'Certifications, sub-processors and security posture.', 'shield'],
  ['https://learn.tanflow.com', 'Training portal', 'Role-based courses for administrators and approvers.', 'file'],
  ['https://changelog.tanflow.com', 'Release notes', 'What shipped in each platform release.', 'activity'],
  ['https://community.tanflow.com', 'Community forum', 'Ask questions and share runbooks with other operators.', 'help'],
  ['https://tanflow.com/sla', 'Service level agreement', 'Availability targets and support response times.', 'file'],
]

const AGE = { 1: 412, 2: 305, 3: 268, 4: 151 }

const seed = () => [
  ...USEFUL_LINKS.map((l, i) => ({
    ...l,
    icon: 'link',
    status: 'Published',
    visibility: l.id === 4 ? 'Administrators' : 'All users',
    createdOn: stamp(AGE[l.id] != null ? AGE[l.id] : 90 + i * 30),
    createdBy: 'admin',
  })),
  ...EXTRA.map(([url, label, description, icon], i) => ({
    id: USEFUL_LINKS.length + i + 1,
    url,
    label,
    description,
    icon,
    order: USEFUL_LINKS.length + i + 1,
    status: i === 5 ? 'Hidden' : 'Published',
    visibility: i === 1 ? 'Administrators' : 'All users',
    createdOn: stamp(120 + i * 26),
    createdBy: 'admin',
  })),
]

const listeners = new Set()
let state = seed()

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const emit = () => listeners.forEach((l) => l())

export const getLinks = () => state

export const writeLinks = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

export const useLinks = () => useSyncExternalStore(subscribe, getLinks, getLinks)

/** What an identity actually sees: published links, in display order. */
export const publishedLinks = (list = state) => list
  .filter((l) => l.status !== 'Hidden')
  .slice()
  .sort((a, b) => (a.order || 0) - (b.order || 0))

export const usePublishedLinks = () => publishedLinks(useLinks())
