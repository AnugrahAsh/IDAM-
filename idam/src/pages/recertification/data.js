import { num } from '../../lib/format'
import {
  CAMPAIGNS, CERT_ITEMS, APPLICATIONS, ORGS, DEPARTMENTS, LOCATIONS, LOOKUPS, GROUPS,
} from '../../data/seed'

export const TODAY = '2026-08-05 09:00'
const TODAY_MS = Date.UTC(2026, 7, 5, 9, 0)
const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/

const parseStamp = (v) => {
  const m = STAMP_RE.exec(String(v || ''))
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) % 24, Number(m[5]) % 60) : null
}
const fmtStamp = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')

export const shiftDays = (v, d) => {
  const b = parseStamp(v)
  return b == null ? '—' : fmtStamp(b + d * 86400000)
}
export const shiftHours = (v, h) => {
  const b = parseStamp(v)
  return b == null ? '—' : fmtStamp(b + h * 3600000)
}
export const elapsedDays = (v) => {
  const b = parseStamp(v)
  return b == null ? 1 : Math.max(1, Math.round((TODAY_MS - b) / 86400000))
}

export const CHAINS = [
  'Manager → Resource Owner → Auditor',
  'Manager → Security',
  'Manager → Auditor',
  'Resource Owner → Security',
  'Manager → Resource Owner → Security → Auditor',
]
export const AUDITORS = ['Vansh Makhija', 'Shubham Jain', 'Priya Nair', 'Elena Ferrer']
export const WINDOWS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
  { value: 45, label: '45 days' },
]
export const LEVEL_ROLES = ['Line manager', 'Resource owner', 'Security review', 'Auditor', 'Data owner', 'Delegated reviewer']
export const LEVEL_HELP = {
  'Line manager': 'The identity’s manager confirms the entitlement is still needed for the role.',
  'Resource owner': 'The application owner confirms the grant is appropriate on their target.',
  'Security review': 'Security reviews privileged grants and anything carrying an open conflict.',
  Auditor: 'The auditor signs the attestation statement and seals the evidence pack.',
  'Data owner': 'The data owner confirms access to the classified data set behind the entitlement.',
  'Delegated reviewer': 'A named delegate reviews on behalf of an absent primary reviewer.',
}
export const REMINDERS = ['Daily', 'Every 2 days', 'Weekly', 'Never']
export const START_MODES = ['Start immediately', 'Start on the next scheduler run', 'Start at the beginning of next month']
export const UNDECIDED_MODES = ['Record as not reviewed', 'Auto-certify', 'Auto-revoke']

export const REVIEWER_POOL = [
  { id: 1, name: 'Priya Nair', role: 'Line manager', remit: 'Finance · direct reports', level: 1 },
  { id: 2, name: 'Rohan Mehta', role: 'Line manager', remit: 'Engineering · direct reports', level: 1 },
  { id: 3, name: 'Ananya Iyer', role: 'Resource owner', remit: 'Oracle ERP', level: 2 },
  { id: 4, name: 'Sameer Verma', role: 'Resource owner', remit: 'Core Banking (DB2)', level: 2 },
  { id: 5, name: 'Elena Ferrer', role: 'Security review', remit: 'Privileged entitlements', level: 3 },
  { id: 6, name: 'Vansh Makhija', role: 'Auditor', remit: 'Sign-off and evidence', level: 3 },
]

const RUNNING = CAMPAIGNS.filter((c) => c.status === 'Active')
const CONTROL_MAP = {
  1: ['SOX 404 · access to financial reporting', 'ISO 27001 · A.5.18 access rights'],
  2: ['ISO 27001 · A.8.2 privileged access', 'SOC 2 · CC6.3 logical access provisioning'],
  3: ['SOX 404 · quarterly user access review', 'SOC 2 · CC6.1 logical access controls'],
  4: ['ISO 27001 · A.5.18 access rights'],
}

const describe = (c) => `${c.status === 'Closed' ? 'Closed' : 'In-flight'} attestation of ${num(c.items)} entitlements across ${c.scope}, routed through ${c.levels.toLowerCase()} and signed off by ${c.auditor}.`

export const SEED_CAMPAIGNS = CAMPAIGNS.map((c) => ({
  ...c,
  description: describe(c),
  createdOn: c.started,
  closesOn: shiftDays(TODAY, c.status === 'Active' ? c.dueIn : 0),
  reminders: 'Every 2 days',
  undecided: 'Record as not reviewed',
  controls: CONTROL_MAP[c.id] || [],
}))

export const SEED_ITEMS = CERT_ITEMS.map((item, i) => ({
  ...item,
  campaignId: RUNNING[i % RUNNING.length].id,
  reviewer: REVIEWER_POOL[i % REVIEWER_POOL.length].name,
  reviewerLevel: REVIEWER_POOL[i % REVIEWER_POOL.length].level,
  grantedOn: shiftDays(TODAY, -(70 + ((i * 23) % 460))),
  source: ['Access request', 'Dynamic policy', 'Directory import', 'Birthright bundle'][i % 4],
  decidedOn: '',
  decidedBy: '',
}))

export const nameOf = (username) => {
  const parts = String(username).split('_')
  return { first: parts[0] || username, last: parts[1] || '' }
}
export const daysIdle = (label) => {
  const n = parseInt(label, 10)
  return Number.isNaN(n) ? 0 : n
}
export const levelNames = (levels) => String(levels).split('→').map((s) => s.trim()).filter(Boolean)
export const levelCount = (levels) => levelNames(levels).length

export const reviewersFor = (c) => {
  const weights = [0.26, 0.2, 0.17, 0.15, 0.12, 0.1]
  const pace = [1.24, 1.06, 0.88, 1.14, 0.58, 0.32]
  const assigned = weights.map((w) => Math.round(c.items * w))
  assigned[assigned.length - 1] = Math.max(0, c.items - assigned.slice(0, -1).reduce((a, b) => a + b, 0))
  const ratio = c.items ? c.decided / c.items : 0
  const decided = assigned.map((a, i) => Math.max(0, Math.min(a, Math.round(a * ratio * pace[i]))))
  let drift = c.decided - decided.reduce((a, b) => a + b, 0)
  for (let i = 0; i < decided.length && drift !== 0; i += 1) {
    const room = drift > 0 ? assigned[i] - decided[i] : decided[i]
    const step = drift > 0 ? Math.min(room, drift) : -Math.min(room, -drift)
    decided[i] += step
    drift -= step
  }
  return REVIEWER_POOL.map((p, i) => ({
    ...p,
    assigned: assigned[i],
    decided: decided[i],
    remaining: assigned[i] - decided[i],
    progress: assigned[i] ? Math.round((decided[i] / assigned[i]) * 100) : 0,
    lastActive: shiftHours(TODAY, -(3 + i * 11)),
    escalated: c.status === 'Active' && assigned[i] > 0 && decided[i] / Math.max(1, assigned[i]) < 0.4,
  }))
}

export const projectionFor = (c) => {
  const elapsed = elapsedDays(c.started)
  const rate = c.decided / elapsed
  const left = Math.max(0, c.items - c.decided)
  if (c.status !== 'Active') return { rate: Math.round(rate), needed: 0, verdict: 'closed' }
  if (rate <= 0) return { rate: 0, needed: 0, verdict: 'stalled' }
  const needed = Math.ceil(left / rate)
  return { rate: Math.round(rate), needed, verdict: needed <= c.dueIn ? 'ontrack' : 'late' }
}

export const timelineFor = (c) => {
  const elapsed = elapsedDays(c.started)
  const chain = levelNames(c.levels)
  const out = [
    { id: 'created', tone: 'acc', icon: 'plus', t: 'Campaign created', s: `${c.auditor} scoped the review to ${c.scope} and set the chain to ${c.levels}.`, ts: c.started },
    { id: 'collect', tone: 'ok', icon: 'layers', t: `${num(c.items)} entitlements collected`, s: 'The collection job read every mapped target and attached a system recommendation, last-use telemetry and open conflicts to each item.', ts: shiftHours(c.started, 2) },
    { id: 'notify', tone: 'acc', icon: 'mail', t: 'Reviewers notified', s: `${REVIEWER_POOL.length} reviewers received their queue with a ${c.dueIn + elapsed} day window.`, ts: shiftHours(c.started, 3) },
  ]
  if (elapsed >= 7) out.push({ id: 'r1', tone: 'mut', icon: 'bell', t: 'First reminder sent', s: 'Automatic reminder to every reviewer still holding undecided items.', ts: shiftDays(c.started, 7) })
  if (c.decided > 0) out.push({ id: 'half', tone: 'ok', icon: 'certify', t: `${num(c.decided)} decisions recorded`, s: `${num(c.decided - c.revoked)} certified, ${num(c.revoked)} revoked. Every decision carries the reviewer, the timestamp and the recommendation it overrode.`, ts: shiftDays(c.started, Math.max(1, Math.round(elapsed * 0.6))) })
  if (chain.length > 1 && c.progress >= 50) out.push({ id: 'l1', tone: 'ok', icon: 'checkC', t: `Level 1 · ${chain[0]} complete`, s: 'Items cleared at level 1 moved to the next reviewer in the chain.', ts: shiftDays(c.started, Math.max(2, Math.round(elapsed * 0.72))) })
  if (c.status === 'Active' && c.progress < 60) out.push({ id: 'esc', tone: 'warn', icon: 'trendUp', t: 'Escalation raised', s: 'Reviewers below 40% completion were escalated to their line manager and copied to the accountable auditor.', ts: shiftDays(c.started, Math.max(3, elapsed - 2)) })
  if (c.status === 'Active' && c.dueIn <= 3) out.push({ id: 'due', tone: 'bad', icon: 'clock', t: `Closes in ${c.dueIn} ${c.dueIn === 1 ? 'day' : 'days'}`, s: `${num(c.items - c.decided)} items remain undecided and will be recorded as ${c.undecided.toLowerCase()}.`, ts: TODAY })
  if (c.status !== 'Active') out.push({ id: 'closed', tone: 'mut', icon: 'lock', t: 'Campaign closed and sealed', s: 'The evidence pack was generated and the record became immutable.', ts: shiftDays(c.started, elapsed) })
  return out.reverse()
}

export const EVIDENCE_ARTIFACTS = [
  { id: 'decisions', label: 'Decision register', sub: 'Every item with reviewer, timestamp, recommendation and override flag', size: '1.4 MB', required: true },
  { id: 'population', label: 'Population and scope statement', sub: 'How the item set was derived, with the collection query', size: '86 KB', required: true },
  { id: 'reviewers', label: 'Reviewer attestations', sub: 'Signed statement per reviewer with completion timestamps', size: '312 KB' },
  { id: 'revocations', label: 'Revocation execution log', sub: 'Provisioning result for every revoked entitlement, per target', size: '640 KB' },
  { id: 'exceptions', label: 'Exceptions and compensating controls', sub: 'Items certified despite a revoke recommendation, with rationale', size: '58 KB' },
  { id: 'reminders', label: 'Notification trail', sub: 'Reminder and escalation mail with delivery receipts', size: '124 KB' },
  { id: 'controls', label: 'Control mapping', sub: 'Framework clauses this campaign evidences', size: '22 KB' },
]
export const EVIDENCE_FORMATS = ['PDF pack + CSV appendices', 'CSV only', 'XLSX workbook', 'JSON (machine readable)']

export const PRIOR_EXPORTS = [
  { id: 1, label: 'Interim pack for external audit sample', by: 'Vansh Makhija', ts: shiftDays(TODAY, -12), size: '2.1 MB', hash: 'a41f…9c02' },
  { id: 2, label: 'Reviewer completion snapshot', by: 'Shubham Jain', ts: shiftDays(TODAY, -4), size: '318 KB', hash: '7be3…11d8' },
]

export const SCOPE_TYPES = [
  { value: 'organization', label: 'Organization' },
  { value: 'department', label: 'Department' },
  { value: 'application', label: 'Application' },
  { value: 'group', label: 'Entitlement group' },
  { value: 'all', label: 'Every identity in the tenant' },
]
export const scopeOptions = (type) => {
  if (type === 'organization') return ORGS
  if (type === 'department') return DEPARTMENTS
  if (type === 'application') return APPLICATIONS.map((a) => a.displayName)
  if (type === 'group') return GROUPS.map((g) => g.name)
  return []
}
export const scopeLabel = (type, value) => {
  if (type === 'all') return 'All organizations'
  const found = SCOPE_TYPES.find((s) => s.value === type)
  return value || (found ? found.label : 'All organizations')
}

export const CONDITION_FIELDS = [
  { id: 'department', label: 'Department', options: DEPARTMENTS },
  { id: 'organization', label: 'Organization', options: ORGS },
  { id: 'employeeType', label: 'Employee type', options: LOOKUPS.employee_type },
  { id: 'officeLevel', label: 'Office level', options: LOOKUPS.office_level },
  { id: 'city', label: 'City', options: LOCATIONS },
  { id: 'status', label: 'Account status', options: ['Active', 'Locked', 'Disabled', 'Pending'] },
]
export const CONDITION_OPS = [{ value: 'is', label: 'is' }, { value: 'not', label: 'is not' }]
export const attrValue = (u, id) => u[id]

// ---------------------------------------------------------------------------
// Approval levels
// ---------------------------------------------------------------------------

/** The reviewer who acts at a level of the chain. */
export const reviewerAt = (level, c) => {
  const pool = REVIEWER_POOL.filter((r) => r.level === level)
  if (pool.length > 0) return pool[0].name
  return c.auditor
}
