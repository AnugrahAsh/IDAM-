/**
 * Campaign users — the data behind View Campaign › Items.
 *
 * Shaped like the recertification API: every user in a campaign carries the
 * data they had when the campaign started (`actual`) and, for each approval
 * level of the chain, what that level submitted (`mods[LEVEL]`), its remarks,
 * who certified it and when, and whether the level's notification went out.
 *
 * The diff rule is the one the API implies: the value at level n is compared
 * with level n-1, and level 0 is the original data. A level with no
 * submission yet has no values of its own and reads as its baseline.
 */

import { ATTRS, GROUPS, ORGS, SECTIONS, USERS } from '../../data/seed'
import { levelNames, reviewerAt, shiftDays, TODAY } from './data'

/* The attributes a recertification reviews, in the order the identity form
   shows them. Sections and labels are read from the schema, never retyped. */
const REVIEWED = [
  'firstName', 'lastName', 'email', 'mobileNo', 'employeeType', 'organization', 'manager',
  'empCode', 'designation', 'department', 'officeLevel', 'reportingEmpId',
  'country', 'state', 'city', 'region', 'businessUnit', 'costCenter',
]

export const ATTRIBUTE_META = REVIEWED
  .map((id) => ATTRS.find((a) => a.id === id))
  .filter(Boolean)
  .map((a) => ({
    id: a.id,
    label: a.label,
    section: a.section,
    sectionName: (SECTIONS.find((s) => s.id === a.section) || {}).name || a.section,
    sectionOrder: (SECTIONS.find((s) => s.id === a.section) || {}).order || 9,
    order: a.order,
  }))
  .sort((a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order)

export const GROUP_TYPES = [
  { id: 'application', label: 'Application Groups', kind: 'Application' },
  { id: 'access', label: 'Access Application Groups', kind: 'Access' },
  { id: 'sso', label: 'SSO Access Application Groups', kind: 'SSO' },
]

/** A level key as the API writes it, and as a person reads it. */
export const levelKey = (name) => String(name).trim().toUpperCase().replace(/\s+/g, '_')
export const levelLabel = (name) => String(name).trim().replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())

const isEmpty = (v) => v == null || String(v).trim() === '' || v === 'N/A'

/* Deterministic variation per user, so a campaign reads the same on every
   visit without a random generator. */
const hash = (...parts) => parts.join('|').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 2147483647, 7)

const EDITS = {
  department: ['Finance', 'Engineering', 'Operations', 'Human Resources', 'Sales'],
  designation: ['Senior Engineer', 'Manager', 'Lead', 'Analyst', 'Architect'],
  officeLevel: ['Corporate', 'Regional', 'Divisional', 'Branch'],
  city: ['Mumbai', 'Bengaluru', 'Pune', 'Dehradun', 'Delhi'],
  mobileNo: ['+91 9812341234', '+91 9876501234', '+91 9900112233'],
  costCenter: ['CC-1040', 'CC-2210', 'CC-3105'],
  organization: ORGS.slice(0, 6),
  manager: ['Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Sameer Verma'],
}
const EDITABLE = Object.keys(EDITS)

const REMARKS = [
  'Verified against HR records.',
  'Department corrected after the reorganisation.',
  'Reporting line updated to the new manager.',
  'No changes required — access is appropriate.',
  'Removed a stale group from the previous project.',
  'Location corrected; user relocated this quarter.',
]

const personalInfoOf = (u) => Object.fromEntries(ATTRIBUTE_META.map((a) => [a.id, u[a.id] == null ? '' : String(u[a.id])]))

const groupsOf = (u) => Object.fromEntries(GROUP_TYPES.map((t, ti) => {
  const pool = GROUPS.filter((g) => g.kind === t.kind)
  const count = 1 + (hash(u.username, t.id) % 3)
  const start = (u.id * (ti + 3)) % Math.max(1, pool.length)
  return [t.id, Array.from({ length: Math.min(count, pool.length) }, (_, k) => pool[(start + k) % pool.length])
    .map((g) => ({ id: g.id, name: g.name, application: g.application }))]
}))

/* What one level submits: the baseline it saw, with zero to two attribute
   edits and, sometimes, a group added or removed. */
function submissionFor(u, levelIndex, baseline) {
  const seed = hash(u.username, levelIndex)
  const personalInfo = { ...baseline.personalInfo }
  const edits = seed % 3
  for (let k = 0; k < edits; k += 1) {
    const attr = EDITABLE[(seed + k * 5) % EDITABLE.length]
    const options = EDITS[attr].filter((v) => v !== personalInfo[attr])
    personalInfo[attr] = options[(seed + k) % options.length]
  }
  const groups = Object.fromEntries(GROUP_TYPES.map((t) => [t.id, [...baseline.groups[t.id]]]))
  if (seed % 4 === 1) {
    const t = GROUP_TYPES[seed % GROUP_TYPES.length]
    const pool = GROUPS.filter((g) => g.kind === t.kind && !groups[t.id].some((x) => x.id === g.id))
    if (pool.length) {
      const g = pool[seed % pool.length]
      groups[t.id].push({ id: g.id, name: g.name, application: g.application })
    }
  } else if (seed % 4 === 2) {
    const t = GROUP_TYPES[(seed + 1) % GROUP_TYPES.length]
    if (groups[t.id].length > 1) groups[t.id] = groups[t.id].slice(1)
  }
  return { personalInfo, groups }
}

/**
 * The users of one campaign.
 *
 * How far each user has travelled along the chain follows the campaign's own
 * progress, spread across its users, so the Items table and the Overview's
 * progress figure tell the same story.
 */
export function seedCampaignUsers(c) {
  const chain = levelNames(c.levels)
  const keys = chain.map(levelKey)
  const closed = c.status !== 'Active'
  const population = USERS.filter((u, i) => (i * 7 + c.id * 3) % 3 !== 0).slice(0, 14 + (c.id % 3) * 2)

  return population.map((u, i) => {
    const actual = { personalInfo: personalInfoOf(u), groups: groupsOf(u) }
    const spread = (hash(u.username, c.id) % 100) / 100
    const reached = closed
      ? (spread < 0.85 ? keys.length : Math.floor(spread * keys.length))
      : Math.min(keys.length, Math.floor((c.progress / 100 + spread * 0.6 - 0.2) * (keys.length + 0.4)))
    const levels = {}
    let baseline = actual
    keys.forEach((key, li) => {
      const certified = li < Math.max(0, reached)
      const current = li === Math.max(0, reached)
      if (certified) {
        const submission = submissionFor(u, li, baseline)
        baseline = submission
        levels[key] = {
          mods: submission,
          remarks: REMARKS[hash(u.username, key) % REMARKS.length],
          certified: true,
          mailSent: true,
          certifiedBy: reviewerAt(li + 1, c),
          certifiedOn: shiftDays(TODAY, -((keys.length - li) * 2 + (i % 3))),
        }
      } else {
        levels[key] = {
          mods: null,
          remarks: '',
          certified: false,
          mailSent: current && !closed ? (hash(u.username, key, 'mail') % 5) !== 0 : false,
          certifiedBy: '',
          certifiedOn: '',
          notCertified: closed && current,
        }
      }
    })
    return {
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      department: u.department,
      organization: u.organization,
      manager: u.manager || '—',
      actual,
      levels,
    }
  })
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/** The data a level submitted, or its baseline when it has submitted nothing. */
export const dataAt = (user, keys, index) => {
  let data = user.actual
  for (let i = 0; i <= index && i < keys.length; i += 1) {
    const mods = user.levels[keys[i]]?.mods
    if (mods) data = mods
  }
  return data
}

const baselineFor = (user, keys, index) => (index <= 0 ? user.actual : dataAt(user, keys, index - 1))

export const changeType = (before, after) => {
  if (String(before ?? '') === String(after ?? '')) return 'unchanged'
  if (isEmpty(before) && !isEmpty(after)) return 'added'
  if (!isEmpty(before) && isEmpty(after)) return 'cleared'
  return 'modified'
}

/**
 * What one level changed for one user: every attribute with its before and
 * after, every group with whether it was added or removed, and the counts.
 */
export function computeLevelDiff(user, keys, index) {
  const before = baselineFor(user, keys, index)
  const own = user.levels[keys[index]]?.mods
  const after = own || before
  const attributes = ATTRIBUTE_META.map((a) => {
    const b = before.personalInfo[a.id]
    const v = after.personalInfo[a.id]
    return { ...a, before: b, after: v, type: changeType(b, v) }
  })
  const groups = Object.fromEntries(GROUP_TYPES.map((t) => {
    const was = before.groups[t.id] || []
    const now = after.groups[t.id] || []
    const wasIds = new Set(was.map((g) => g.id))
    const nowIds = new Set(now.map((g) => g.id))
    const rows = [
      ...now.map((g) => ({ ...g, change: wasIds.has(g.id) ? 'unchanged' : 'added' })),
      ...was.filter((g) => !nowIds.has(g.id)).map((g) => ({ ...g, change: 'removed' })),
    ]
    return [t.id, {
      rows,
      added: rows.filter((r) => r.change === 'added').length,
      removed: rows.filter((r) => r.change === 'removed').length,
    }]
  }))
  const attrChanges = attributes.filter((a) => a.type !== 'unchanged').length
  const groupChanges = GROUP_TYPES.reduce((n, t) => n + groups[t.id].added + groups[t.id].removed, 0)
  return { submitted: !!own, attributes, groups, counts: { attributes: attrChanges, groups: groupChanges, total: attrChanges + groupChanges } }
}

/** The state of a level for one user, as the table and the stepper read it. */
export function levelState(user, keys, index) {
  const lv = user.levels[keys[index]]
  if (lv.certified) return 'certified'
  if (lv.notCertified) return 'notCertified'
  const previousDone = index === 0 || user.levels[keys[index - 1]].certified
  if (previousDone) return 'pending'
  return 'notStarted'
}

export const STATE_META = {
  certified: { label: 'Certified', tone: 'ok', icon: 'checkC' },
  pending: { label: 'Pending', tone: 'warn', icon: 'clock' },
  notStarted: { label: 'Not started', tone: 'mut', icon: 'minus' },
  notCertified: { label: 'Not certified', tone: 'bad', icon: 'ban' },
}

/** One row of the Items table. */
export function summariseUser(user, keys) {
  const diffs = keys.map((_, i) => computeLevelDiff(user, keys, i))
  const states = keys.map((_, i) => levelState(user, keys, i))
  const currentIndex = states.findIndex((s) => s !== 'certified')
  return {
    ...user,
    name: `${user.firstName} ${user.lastName}`.trim(),
    diffs,
    states,
    attrChanges: diffs.reduce((n, d) => n + d.counts.attributes, 0),
    groupChanges: diffs.reduce((n, d) => n + d.counts.groups, 0),
    certifiedLevels: states.filter((s) => s === 'certified').length,
    currentIndex,
  }
}
