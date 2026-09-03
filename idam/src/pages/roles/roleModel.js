import { useState } from 'react'
import { ROLE_PERMS, PERM_CATALOG, USERS, LOGS } from '../../data/seed'

export const EPOCH = Date.UTC(2026, 7, 5)

export const permsFor = (id) => ROLE_PERMS[id] || {}
export const countPerms = (perms) => Object.values(perms).reduce((a, p) => a + p.length, 0)
const reviewGap = (id) => (id * 53) % 220
export const reviewedOn = (id) => new Date(EPOCH - reviewGap(id) * 86400000).toISOString().slice(0, 10)
export const riskTag = (risk) => String(risk || '').charAt(0).toUpperCase() + String(risk || '').slice(1)
export const headTone = (risk) => ({ critical: 'bad', high: 'warn', medium: 'acc', low: 'mut' }[risk] || 'mut')
export const membersFor = (role) => USERS.filter((u) => (u.id + role.id) % 7 === 0)
export const eventsFor = (role) => LOGS.filter((l) => (l.id + role.id) % 9 === 0).slice(0, 7)

export const normalize = (perms) => JSON.stringify(
  Object.keys(perms).filter((k) => (perms[k] || []).length).sort().map((k) => [k, [...perms[k]].sort()]),
)

export const ASSIGNMENT_RULES = {
  1: [
    { id: 1, name: 'Break-glass elevation', source: 'Manual grant', condition: 'Dual approval by two platform owners', scope: 'Global', mode: 'Just-in-time · 4 hours', matched: 2, status: 'Active', evaluated: '2026-08-05 06:00' },
    { id: 2, name: 'Platform owner baseline', source: 'HR attribute', condition: "designation = 'Director' AND department = 'Security'", scope: 'Global', mode: 'Permanent', matched: 2, status: 'Under review', evaluated: '2026-08-04 01:00' },
  ],
  2: [
    { id: 1, name: 'Finance approver delegation', source: 'Dynamic policy', condition: "department = 'Finance' AND officeLevel IN ('Corporate','Regional')", scope: 'Tanflow · Finance', mode: 'Permanent', matched: 21, status: 'Active', evaluated: '2026-08-05 03:00' },
    { id: 2, name: 'Quarter-end approval cover', source: 'Access request', condition: 'Approval chain · Manager → Resource Owner', scope: 'Tanflow · Finance', mode: 'Time-boxed · 30 days', matched: 5, status: 'Active', evaluated: '2026-08-04 11:00' },
  ],
  3: [
    { id: 1, name: 'External audit engagement', source: 'Manual grant', condition: "employeeType = 'External' AND engagement = 'SOX 404'", scope: 'Global', mode: 'Time-boxed · 90 days', matched: 6, status: 'Active', evaluated: '2026-08-01 09:00' },
    { id: 2, name: 'Compliance analyst baseline', source: 'Dynamic policy', condition: "department = 'Compliance'", scope: 'Global', mode: 'Permanent', matched: 3, status: 'Active', evaluated: '2026-08-05 03:00' },
  ],
  4: [
    { id: 1, name: 'Helpdesk rota', source: 'Dynamic policy', condition: "department = 'Support' AND designation LIKE 'Analyst%'", scope: 'Global', mode: 'Permanent', matched: 15, status: 'Active', evaluated: '2026-08-05 03:00' },
    { id: 2, name: 'Out-of-hours cover', source: 'Scheduler', condition: 'helpdeskRotaQueue · 0 20 * * *', scope: 'Global', mode: 'Time-boxed · 12 hours', matched: 3, status: 'Active', evaluated: '2026-08-04 20:00' },
  ],
  5: [
    { id: 1, name: 'Connector engineering', source: 'Dynamic policy', condition: "department = 'IT Operations' AND designation IN ('Engineer','Architect')", scope: 'Applications', mode: 'Permanent', matched: 6, status: 'Active', evaluated: '2026-08-05 03:00' },
  ],
  6: [
    { id: 1, name: 'Application ownership', source: 'Application record', condition: 'applications.owner = identity', scope: 'Delegated', mode: 'Permanent', matched: 31, status: 'Active', evaluated: '2026-08-05 04:00' },
  ],
  7: [
    { id: 1, name: 'Directory baseline', source: 'Dynamic policy', condition: "status = 'Active'", scope: 'Global', mode: 'Permanent', matched: 3892, status: 'Active', evaluated: '2026-08-05 03:00' },
  ],
}

export const SOURCE_ICON = {
  'Dynamic policy': 'policy',
  'Access request': 'request',
  'Manual grant': 'user',
  'HR attribute': 'building',
  Scheduler: 'clock',
  'Application record': 'apps',
}

export const CHAIN = [
  { id: 1, t: 'HR attribute sync', s: 'Workday delivers the joiner record and its organizational attributes.', tone: 'var(--s1)' },
  { id: 2, t: 'Dynamic policy evaluation', s: 'Policies award the role when their condition matches. Runs every six hours.', tone: 'var(--accent)' },
  { id: 3, t: 'Access request approval', s: 'Anything policy does not award must be requested and approved.', tone: 'var(--warn-core)' },
  { id: 4, t: 'Manual grant', s: 'Administrator assignment. Always recorded against the granting operator.', tone: 'var(--bad)' },
]

/**
 * Single source of truth for membership: the derived member list.
 * `members` is always the length of `memberIds`, so the detail header fact,
 * the Members tab badge and the Members table can never disagree. The seed
 * `members` number is deliberately dropped — it cannot be reconciled with a
 * directory of only USERS.length identities.
 */
export const decorate = (r) => {
  const perms = permsFor(r.id)
  const memberIds = membersFor(r).map((u) => u.id)
  return {
    ...r,
    perms,
    memberIds,
    members: memberIds.length,
    type: r.system ? 'System' : 'Custom',
    permCount: countPerms(perms),
    moduleCount: Object.keys(perms).length,
    reviewedOn: r.id % 3 === 1 ? null : reviewedOn(r.id),
  }
}

/**
 * Assignment rules scaled to the role's real holder count, so the per-rule
 * "Identities" column and the coverage totals stay inside the member list
 * instead of quoting the unreconcilable seed numbers.
 */
export const rulesFor = (role, memberCount) => {
  const rules = ASSIGNMENT_RULES[role.id] || []
  if (!rules.length) return []
  const weight = rules.reduce((a, r) => a + r.matched, 0) || rules.length
  let left = Math.max(0, memberCount)
  return rules.map((r) => {
    const share = Math.min(left, Math.round(memberCount * ((r.matched || 1) / weight)))
    left -= share
    return { ...r, matched: share }
  })
}

export function usePermDraft(initialPerms) {
  const [perms, setPerms] = useState(initialPerms)

  const toggle = (mod, perm) => setPerms((p) => {
    const held = p[mod] || []
    const next = held.includes(perm) ? held.filter((x) => x !== perm) : [...held, perm]
    const out = { ...p }
    if (next.length) out[mod] = next
    else delete out[mod]
    return out
  })

  const setModule = (mod, on) => setPerms((p) => {
    const out = { ...p }
    if (on) {
      const m = PERM_CATALOG.find((x) => x.name === mod)
      if (m) out[mod] = m.perms.slice()
    } else {
      delete out[mod]
    }
    return out
  })

  return { perms, setPerms, toggle, setModule }
}
