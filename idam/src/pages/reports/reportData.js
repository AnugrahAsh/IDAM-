// Derived report datasets for the Reports centre.
// Everything is computed from the read-only demo seed so the numbers stay
// consistent with the rest of the console.

import {
  USERS, ORGS, GROUPS, APPLICATIONS, LOGS, SIGNIN_SERIES, DELIVERY_LOG,
} from '../../data/seed'

// The seed clock. Every stamp in the seed is generated backwards from this day.
export const TODAY = '2026-08-05'

export const dayOf = (ts) => String(ts || '').slice(0, 10)
export const timeOf = (ts) => String(ts || '').slice(11, 16)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const niceDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '—'
}

export const shiftDays = (iso, n) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  if (!m) return iso
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - n * 86400000)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (a, b) => {
  const pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(a || ''))
  const pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(b || ''))
  if (!pa || !pb) return null
  const ta = Date.UTC(Number(pa[1]), Number(pa[2]) - 1, Number(pa[3]))
  const tb = Date.UTC(Number(pb[1]), Number(pb[2]) - 1, Number(pb[3]))
  return Math.round((tb - ta) / 86400000)
}

const USER_BY_NAME = new Map(USERS.map((u) => [u.username, u]))
export const userByName = (name) => USER_BY_NAME.get(name) || null

const APP_NAMES = APPLICATIONS.map((a) => a.displayName)
export const APPLICATION_OPTIONS = APP_NAMES
export const ORG_OPTIONS = ORGS

// Entitlements that confer administrative or financially material rights.
const PRIVILEGED_GROUPS = new Set([
  'IT_DOMAIN_ADMIN', 'ENG_REPO_ADMIN', 'ENG_PROD_DEPLOY', 'HR_PAYROLL_RUN', 'FIN_AP_APPROVE',
])

// Deterministic entitlement model: which groups each identity holds. Standard
// entitlements are common; privileged ones are granted to a small minority.
export const groupsFor = (u) => GROUPS.filter((g, gi) => {
  if (PRIVILEGED_GROUPS.has(g.name)) return (u.id * 5 + gi * 3) % 17 === 0
  return (u.id * 3 + gi * 7) % 11 < 3
})

// Distinct values actually present in a dataset — keeps filter dropdowns honest.
export const optionsOf = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()

const FAIL_REASONS = [
  'Invalid credentials', 'Account locked', 'Expired password',
  'Unknown username', 'Second factor rejected', 'Blocked by network policy',
]
const RESET_CHANNELS = ['Self-service portal', 'Service desk', 'Administrative reset', 'Expiry-forced reset']
const CLIENTS = ['Web console', 'Mobile app', 'Desktop SSO agent', 'API client']

// ---------------------------------------------------------------- successful

// Two complementary sources: explicit sign-in events recorded in the audit log,
// and the last successful sign-in held on every directory identity.
export const SUCCESSFUL_LOGINS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Sign-in succeeded').forEach((l) => {
    const u = userByName(l.actor)
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      name: u ? `${u.firstName} ${u.lastName}` : '—',
      email: u ? u.email : '—',
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
      client: CLIENTS[l.id % CLIENTS.length],
      ip: l.ip,
      outcome: l.outcome,
      source: 'Audit event',
    })
  })

  USERS.filter((u) => u.lastLogin).forEach((u) => {
    out.push({
      id: `usr-${u.id}`,
      ts: u.lastLogin,
      username: u.username,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      organization: u.organization,
      department: u.department,
      application: APP_NAMES[u.id % APP_NAMES.length],
      client: CLIENTS[u.id % CLIENTS.length],
      ip: `10.${u.id % 40}.${(u.id * 13) % 250}.${(u.id % 240) + 2}`,
      outcome: 'Allowed',
      source: 'Last sign-in',
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// Hourly success / failure profile straight from the seed series.
export const SIGNIN_PROFILE = SIGNIN_SERIES.map((p) => ({ ...p }))

// -------------------------------------------------------------------- failed

export const FAILED_LOGINS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Sign-in failed' || l.outcome === 'Denied').forEach((l) => {
    const u = userByName(l.actor)
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
      reason: FAIL_REASONS[l.id % FAIL_REASONS.length],
      attempts: 1 + (l.id % 4),
      ip: l.ip,
      outcome: l.outcome === 'Denied' ? 'Denied' : 'Failed',
    })
  })

  // Lockout-driven failures for identities the directory reports as locked.
  USERS.filter((u) => u.status === 'Locked').forEach((u) => {
    out.push({
      id: `lock-${u.id}`,
      ts: u.lastLogin,
      username: u.username,
      organization: u.organization,
      department: u.department,
      application: APP_NAMES[(u.id + 3) % APP_NAMES.length],
      reason: 'Account locked',
      attempts: 5 + (u.id % 3),
      ip: `10.${(u.id * 7) % 40}.${(u.id * 11) % 250}.${(u.id % 240) + 2}`,
      outcome: 'Denied',
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// --------------------------------------------------------------- user access

export const USER_ACCESS = USERS.map((u) => {
  const groups = groupsFor(u)
  return {
    id: u.id,
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    organization: u.organization,
    department: u.department,
    employeeType: u.employeeType,
    status: u.status,
    manager: u.manager || '—',
    groupCount: groups.length,
    groups: groups.map((g) => g.name).join(', ') || '—',
    applications: [...new Set(groups.map((g) => g.application))].join(', ') || '—',
    privileged: groups.some((g) => PRIVILEGED_GROUPS.has(g.name)),
    sodFlags: groups.reduce((a, g) => a + g.sodFlags, 0),
    lastLogin: u.lastLogin,
    ts: u.lastLogin,
  }
})

// ---------------------------------------------------------- locked / disabled

const LOCK_CAUSES = {
  Locked: 'Lockout threshold reached after repeated failed sign-ins',
  Disabled: 'Deactivated by the identity lifecycle process',
}

export const LOCKED_ACCOUNTS = USERS
  .filter((u) => u.status === 'Locked' || u.status === 'Disabled')
  .map((u) => ({
    id: u.id,
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    organization: u.organization,
    department: u.department,
    employeeType: u.employeeType,
    status: u.status,
    reason: LOCK_CAUSES[u.status],
    lastLogin: u.lastLogin,
    ts: u.lastLogin,
    dormantDays: daysBetween(dayOf(u.lastLogin), TODAY),
    entitlements: groupsFor(u).length,
  }))
  .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

// ------------------------------------------------------- password resets

export const PASSWORD_RESETS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Password reset').forEach((l) => {
    const u = userByName(l.actor)
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      channel: RESET_CHANNELS[l.id % RESET_CHANNELS.length],
      performedBy: l.actor === 'system' ? 'system' : l.id % 3 === 0 ? 'SHUBHAM_JAIN' : l.actor,
      outcome: l.outcome === 'Denied' ? 'Failed' : 'Completed',
      ip: l.ip,
    })
  })

  // Reset notices actually delivered to the identity.
  DELIVERY_LOG.filter((d) => d.event === 'password.set').forEach((d) => {
    const u = userByName(d.username)
    out.push({
      id: `del-${d.id}`,
      ts: d.ts,
      username: d.username,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      channel: d.channel === 'SMS' ? 'Self-service portal' : 'Service desk',
      performedBy: u ? u.username : 'system',
      outcome: d.status === 'Failed' ? 'Notice failed' : 'Completed',
      ip: `10.${d.id % 40}.${(d.id * 17) % 250}.${(d.id % 240) + 2}`,
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// ------------------------------------------------------------------ delivery

export const DELIVERY_REPORT = DELIVERY_LOG.map((d) => {
  const u = userByName(d.username)
  return {
    id: d.id,
    ts: d.ts,
    channel: d.channel,
    event: d.event,
    recipient: d.recipient,
    username: d.username,
    organization: u ? u.organization : '—',
    status: d.status,
    detail: d.detail,
  }
}).sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

// --------------------------------------------------------------- audit trail

const SIGNIN_ACTIONS = ['Sign-in succeeded', 'Sign-in failed']

export const AUDIT_TRAIL = LOGS
  .filter((l) => !SIGNIN_ACTIONS.includes(l.action))
  .map((l) => {
    const u = userByName(l.actor)
    return {
      id: l.id,
      ts: l.ts,
      level: l.level,
      category: l.category,
      actor: l.actor,
      organization: u ? u.organization : 'Platform',
      action: l.action,
      target: l.target,
      application: APP_NAMES.includes(l.target) ? l.target : '—',
      ip: l.ip,
      outcome: l.outcome,
    }
  })
  .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
