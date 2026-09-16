import { GROUPS, SOD_VIOLATIONS, USERS } from '../../data/seed'
import { NOW_MS } from '../../lib/clock'

export const BASE = '/iam/segregationofduties/rules'

export const RULE_TYPES = ['Anti-affinity', 'Affinity']

export const SEVERITIES = ['critical', 'high', 'medium', 'low']

export const FRAMEWORKS = ['SOX 404', 'ITGC', 'ISO 27001', 'SOC 2 Type II', 'GDPR', 'PCI DSS', 'Operational']

export const OWNERS = ['Finance', 'Engineering', 'Security', 'Human Resources', 'IT Operations', 'Compliance']

export const SCOPES = ['All organizations', 'Tanflow', 'Tanflow · Finance', 'Tanflow · Engineering', 'Tanflow · IT Ops', 'Privileged identities']

export const REMEDIATIONS = ['Revoke the later entitlement', 'Revoke the lower-privilege entitlement', 'Raise an approval task', 'Notify the entitlement owner only']

export const ENFORCEMENT = ['Detect and report', 'Detect and block new grants', 'Detect, block and auto-revoke']

/* A segregation-of-duties rule grades what an identity can do inside an
   application, so the combination is drawn from the application-group register
   rather than from every group in the tenant. */
export const APPLICATION_GROUPS = GROUPS.filter((g) => g.kind === 'Application')

export const GROUP_NAMES = APPLICATION_GROUPS.map((g) => g.name)


export const SOD_META = {
  1: { createdOn: '2025-09-12 11:40', createdBy: 'admin', modifiedOn: '2026-07-02 14:18', modifiedBy: 'priya.nair', scope: 'Tanflow · Finance', enforcement: 'Detect and block new grants', remediation: 'Revoke the later entitlement', grace: '5 days', autoRevoke: false, notify: true, ticket: 'CTRL-118', lastScan: '2026-08-05 01:00', mitigating: 'Dual authorisation on every payment batch above 50,000, reviewed monthly by the Finance controller.' },
  2: { createdOn: '2025-09-12 11:52', createdBy: 'admin', modifiedOn: '2026-05-21 09:04', modifiedBy: 'admin', scope: 'Tanflow · Finance', enforcement: 'Detect and block new grants', remediation: 'Revoke the lower-privilege entitlement', grace: '3 days', autoRevoke: false, notify: true, ticket: 'CTRL-119', lastScan: '2026-08-05 01:00', mitigating: 'Vendor master changes are re-keyed by a second operator before payment release.' },
  3: { createdOn: '2025-11-03 16:22', createdBy: 'shubham.jain', modifiedOn: '2026-06-14 10:35', modifiedBy: 'shubham.jain', scope: 'Tanflow · Engineering', enforcement: 'Detect and report', remediation: 'Raise an approval task', grace: '10 days', autoRevoke: false, notify: true, ticket: 'CTRL-204', lastScan: '2026-08-05 01:00', mitigating: 'Production deployments require a signed change record and a second approver in the pipeline.' },
  4: { createdOn: '2026-01-19 08:47', createdBy: 'vansh.makhija', modifiedOn: '2026-07-28 13:11', modifiedBy: 'vansh.makhija', scope: 'Privileged identities', enforcement: 'Detect, block and auto-revoke', remediation: 'Revoke the later entitlement', grace: '1 day', autoRevoke: true, notify: true, ticket: 'CTRL-311', lastScan: '2026-08-05 01:00', mitigating: 'SIEM administrator actions are written to an append-only log reviewed by Compliance.' },
  5: { createdOn: '2026-02-27 12:05', createdBy: 'admin', modifiedOn: '2026-04-09 15:44', modifiedBy: 'admin', scope: 'Tanflow · HR', enforcement: 'Detect and report', remediation: 'Notify the entitlement owner only', grace: '14 days', autoRevoke: false, notify: false, ticket: 'CTRL-402', lastScan: '2026-08-05 01:00', mitigating: 'Payroll runs are reconciled against the HR headcount extract before disbursement.' },
}

export const DEFAULT_META = { createdOn: '2026-08-05 09:00', createdBy: 'admin', modifiedOn: '2026-08-05 09:00', modifiedBy: 'admin', scope: 'All organizations', enforcement: 'Detect and report', remediation: 'Raise an approval task', grace: '7 days', autoRevoke: false, notify: true, ticket: 'Not linked', lastScan: 'Never scanned', mitigating: 'No compensating control recorded.' }

export const metaFor = (r) => SOD_META[r.id] || DEFAULT_META


export const groupRecord = (name) => GROUPS.find((g) => g.name === name)

/**
 * The entitlement combination a rule grades, as one list.
 *
 * A rule used to be two named sides, which forced every combination into a
 * shape it rarely had: a toxic set of four entitlements had to be split into a
 * first side and a second side, and which one an entitlement landed on carried
 * no meaning. The combination is one set of application groups now — for an
 * anti-affinity rule, holding any two of them is the breach; for an affinity
 * rule, holding one and not the rest is.
 *
 * Rules written under the old shape are read forward rather than migrated:
 * their two sides flatten into the same list.
 */
export const combinationOf = (rule) => {
  if (Array.isArray(rule.sides) && rule.sides.length) return [...new Set(rule.sides.flat())]
  return [...new Set(rule.groups || [])]
}

export const ruleLabel = (rule) => combinationOf(rule).join(' + ')

/** How a list of entitlements reads in a sentence. */
export const listLabel = (list) => (list.length <= 1
  ? (list[0] || 'nothing')
  : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`)

/**
 * Two rules clash when they both grade the same pair.
 *
 * Sharing one entitlement is normal — an entitlement can be toxic against
 * several others. Sharing two means the identical breach is written to the
 * register twice, once under each rule.
 */
export const combinationsOverlap = (a, b) => a.filter((g) => b.includes(g)).length >= 2

export const applicationOf = (name) => {
  const g = groupRecord(name)
  return g ? g.application : 'Unmapped'
}

export const BREACH_LOAD = SOD_VIOLATIONS.reduce((acc, v) => {
  String(v.groups).split(' + ').forEach((n) => { acc[n] = (acc[n] || 0) + 1 })
  return acc
}, {})

export const MEMBERS = Object.fromEntries(GROUPS.map((g) => [g.name, Math.max(g.members, BREACH_LOAD[g.name] || 0)]))

export const memberCount = (name) => MEMBERS[name] || 0


export const userFor = (v) => USERS.find((u) => u.id === v.userId)

export const AGE_BUCKETS = [
  { label: '0–7 days', test: (a) => a <= 7 },
  { label: '8–14 days', test: (a) => a > 7 && a <= 14 },
  { label: '15–21 days', test: (a) => a > 14 && a <= 21 },
  { label: 'Over 21 days', test: (a) => a > 21 },
]


export const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/

export const parseStamp = (s) => {
  const m = STAMP_RE.exec(String(s || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Math.abs(Number(m[4])) % 24, Math.abs(Number(m[5])) % 60)
}

export const fmtStamp = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')

/* Re-exported rather than redeclared: this module used to carry its own copy of
   the instant, and two copies is one too many for a figure every scan history
   on this page is measured against. */
export { NOW_MS }


export const scanHistory = (rule, open) => {
  const meta = metaFor(rule)
  const anchor = parseStamp(meta.lastScan) || NOW_MS
  return Array.from({ length: 10 }, (_, i) => {
    const started = anchor - i * 86400000
    const failed = (rule.id * 3 + i) % 11 === 0
    const detected = failed ? 0 : (rule.id + i) % 3 === 0 ? 1 : 0
    const cleared = failed ? 0 : (rule.id * 2 + i) % 4 === 0 ? 1 : 0
    return {
      id: `${rule.id}-${i}`,
      scanId: `SCAN-${8600 - rule.id * 15 - i}`,
      started: fmtStamp(started),
      trigger: i % 5 === 2 ? 'Manual · admin' : 'Scheduler · nightly policy sweep',
      identities: USERS.length,
      pairs: combinationOf(rule).reduce((a, g) => a + memberCount(g), 0),
      detected,
      cleared,
      standing: Math.max(0, open + i * ((rule.id % 2) ? 0 : 1) - i),
      status: failed ? 'Failed' : 'Succeeded',
      durationMs: 4200 + ((rule.id * 733 + i * 419) % 26000),
    }
  })
}


export const changeLog = (rule) => {
  const meta = metaFor(rule)
  return [
    { id: 1, tone: 'acc', icon: 'edit', title: 'Enforcement changed', body: `Set to ${meta.enforcement}. Remediation action is ${meta.remediation.toLowerCase()}.`, ts: meta.modifiedOn, actor: meta.modifiedBy },
    { id: 2, tone: rule.severity === 'critical' ? 'bad' : 'warn', icon: 'warn', title: `Severity set to ${rule.severity}`, body: 'Breaches at this grade are reported to the audit committee.', ts: meta.modifiedOn, actor: meta.modifiedBy },
    { id: 3, tone: 'acc', icon: 'sod', title: 'Entitlement combination defined', body: `${ruleLabel(rule)} declared ${rule.type.toLowerCase()}.`, ts: meta.createdOn, actor: meta.createdBy },
    { id: 4, tone: 'ok', icon: 'plus', title: 'Rule created', body: `Raised against ${meta.scope}.`, ts: meta.createdOn, actor: meta.createdBy },
  ]
}


export const violationTone = (s) => (s === 'Open' ? 'bad' : s === 'Remediating' ? 'warn' : 'viol')



// ---------------------------------------------------------------------------
// Exceptions
//
// Who, right now, does not satisfy the rule. For an anti-affinity rule that is
// an identity holding two or more of the combination; for an affinity rule it
// is an identity holding some of it but not all — a partial set is exactly what
// an affinity rule exists to forbid.
//
// The row is one identity and one column per entitlement in the combination, so
// the answer to "which half of this do they have" is on the row rather than a
// click away.
// ---------------------------------------------------------------------------

/* Deterministic rather than random: the same identity holds the same
   entitlements on every render, so the register, the breach count and this tab
   cannot disagree with each other.
   
   Mixed rather than summed. A running total of character codes is linear, so
   three entitlements whose names happen to be congruent mod 3 — which
   FIN_GL_POST, FIN_AP_APPROVE and FIN_PAYMENT_RELEASE are — answered
   identically for every identity, and a table whose whole purpose is showing
   which half of a combination someone holds rendered a solid block of ticks. */
const holdsEntitlement = (user, group) => {
  let h = 2166136261
  const key = `${user.username}:${group}`
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 5) > 1
}

/** Whether an identity breaches the rule, given what it holds. */
export const breaches = (rule, held) => {
  const on = held.filter(Boolean).length
  if (rule.type === 'Affinity') return on > 0 && on < held.length
  return on >= 2
}

/**
 * The exception register for a rule.
 *
 * Columns come from the rule's own combination, not from the keys of whatever
 * rows came back. The reference implementation derives them from the response,
 * so a rule with no exceptions renders a table with the entitlement columns
 * missing entirely — the one case where a reader most needs to see what was
 * evaluated.
 */
export const exceptionColumns = (rule) => combinationOf(rule)

export const exceptionsFor = (rule) => {
  const groups = combinationOf(rule)
  if (groups.length < 2) return []
  return USERS
    .map((u) => {
      const held = groups.map((g) => holdsEntitlement(u, g))
      return { id: u.id, username: u.username, department: u.department, held, groups }
    })
    .filter((row) => breaches(rule, row.held))
    .map((row) => ({
      ...row,
      // The shape the register reads: one key per entitlement, TRUE or FALSE.
      ...Object.fromEntries(row.groups.map((g, i) => [g, row.held[i] ? 'TRUE' : 'FALSE'])),
    }))
}
