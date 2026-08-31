import { USERS } from '../../data/seed'
import { ago } from '../../lib/format'
import { sodFor } from './identityData'

// ---------------------------------------------------------------------------
// Identity posture
//
// The directory record says who someone is; this module says how risky they
// are. Every value here is derived from fields the record already carries, so
// a count in the header and the badge on a row can never disagree.
// ---------------------------------------------------------------------------

const parse = (stamp) => (stamp && stamp !== 'Never' ? Date.parse(`${stamp.replace(' ', 'T')}:00Z`) : null)

// The seed is a fixed snapshot; "now" is anchored to its most recent sign-in so
// relative times read the way they would against a live directory.
const NOW = USERS.reduce((m, u) => Math.max(m, parse(u.lastLogin) || 0), 0) + 2 * 60000

export const DORMANT_DAYS = 14

export const minutesSince = (u) => {
  const t = parse(u.lastLogin)
  return t == null ? null : Math.max(0, (NOW - t) / 60000)
}

export const lastActive = (u) => {
  const m = minutesSince(u)
  return m == null ? 'Never' : ago(m)
}

export const dormantDays = (u) => {
  const m = minutesSince(u)
  return m == null ? null : Math.floor(m / 1440)
}

export const isDormant = (u) => {
  const d = dormantDays(u)
  return d != null && d >= DORMANT_DAYS && u.status !== 'Disabled'
}

// Where the record is mastered. Service accounts are created by hand; everyone
// else is correlated from an upstream system of record.
export const SOURCES = ['Active Directory', 'Workday HR', 'Local']
export const sourceOf = (u) => {
  if (u.employeeType === 'Service Account') return 'Local'
  if (u.employeeType === 'Internal') return u.id % 3 === 0 ? 'Workday HR' : 'Active Directory'
  return u.id % 2 === 0 ? 'Active Directory' : 'Local'
}

// Elevated access: the titles and functions that carry administrative rights.
const PRIV_TITLES = ['Director', 'Architect']
export const isPrivileged = (u) => u.employeeType !== 'Service Account'
  && (PRIV_TITLES.includes(u.designation)
    || (u.department === 'IT Operations' && u.designation === 'Manager'))

const FACTORS = ['Passkey', 'TOTP', 'Push', 'Email OTP']

// Service accounts authenticate with a stored secret, so a second factor does
// not apply to them — that is a different state from a gap.
export const mfaOf = (u) => {
  if (u.employeeType === 'Service Account') return { state: 'na', factor: null }
  if (u.status === 'Pending') return { state: 'none', factor: null }
  if ((u.id * 7) % 8 === 0) return { state: 'none', factor: null }
  return { state: 'on', factor: FACTORS[(u.id * 3) % FACTORS.length] }
}

export const mfaGap = (u) => mfaOf(u).state === 'none'

// A composite score, so the badge can always explain itself.
export const riskOf = (u) => {
  const reasons = []
  let score = 0
  if (mfaGap(u)) { score += 3; reasons.push('No second factor enrolled') }
  if (isPrivileged(u)) { score += 2; reasons.push('Holds privileged access') }
  if (u.status === 'Locked') { score += 2; reasons.push('Account is locked') }
  const dormant = isDormant(u)
  if (dormant) { score += 2; reasons.push(`No sign-in for ${dormantDays(u)} days`) }
  const sod = sodFor(u).length
  if (sod) { score += 3; reasons.push(`${sod} segregation-of-duties ${sod === 1 ? 'violation' : 'violations'}`) }
  if (u.employeeType === 'Service Account') { score += 1; reasons.push('Non-human identity') }
  else if (u.employeeType !== 'Internal') { score += 1; reasons.push(`${u.employeeType} identity`) }
  if (!u.manager) { score += 1; reasons.push('No owner assigned') }

  const level = score >= 7 ? 'critical' : score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low'
  return { level, score, reasons: reasons.length ? reasons : ['No open findings'] }
}

export const RISK_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }

// Identities an administrator should be looking at today.
export const needsAttention = (u) => u.status === 'Locked'
  || u.status === 'Pending'
  || mfaGap(u)
  || isDormant(u)
  || RISK_ORDER[riskOf(u).level] >= 3
