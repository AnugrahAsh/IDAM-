import { APPLICATIONS, ORPHANS, SCHEDULERS, USERS } from '../../data/seed'

export const BASE = '/iam/orphanedpolicy'

export const RULES_BASE = `${BASE}/rules`

export const SWEEP = SCHEDULERS.find((s) => s.service === 'orphanDetectQueue')


export const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](-?\d{1,2}):(-?\d{1,2})/

export const parseStamp = (s) => {
  const m = STAMP_RE.exec(String(s || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Math.abs(Number(m[4])) % 24, Math.abs(Number(m[5])) % 60)
}

export const NOW = ORPHANS.reduce((m, o) => Math.max(m, parseStamp(o.discovered) || 0), 0)

export const NOW_STAMP = new Date(NOW).toISOString().slice(0, 16).replace('T', ' ')

export const fmtStamp = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')

export const ageDays = (stamp) => Math.max(0, Math.round((NOW - (parseStamp(stamp) ?? NOW)) / 86400000))


export const NEVER_USED_DAYS = 180

export const orphanTone = (status) => ({ Open: 'warn', Claimed: 'ok', Disabled: 'mut', Suppressed: 'mut' }[status] || 'mut')


export const IDENTITY_OPTIONS = USERS
  .filter((u) => u.status === 'Active')
  .map((u) => ({ value: u.username, label: `${u.username} · ${u.department}` }))
  .sort((a, b) => a.value.localeCompare(b.value))


export const SCOPES = ['All applications', ...APPLICATIONS.map((a) => a.displayName)]

export const RISK_OVERRIDES = ['Inherit from account', 'critical', 'high', 'medium', 'low']


export const ACCOUNT_ATTRIBUTES = [
  { id: 'account', label: 'Account name' },
  { id: 'application', label: 'Application', options: APPLICATIONS.map((a) => a.displayName) },
  { id: 'status', label: 'Account status', options: ['Open', 'Claimed', 'Disabled', 'Suppressed'] },
  { id: 'matchedIdentity', label: 'Matched identity' },
  { id: 'ownerStatus', label: 'Owner status', options: ['Active', 'Disabled', 'Retired'] },
  { id: 'employeeType', label: 'Employee type', options: ['Internal', 'External', 'Contractor', 'Service Account'] },
  { id: 'department', label: 'Department' },
  { id: 'risk', label: 'Risk band', options: ['critical', 'high', 'medium', 'low'] },
  { id: 'lastUsedDays', label: 'Last used (days)' },
  { id: 'discoveredDays', label: 'Discovered (days)' },
  // Credential age and group activity are the two signals a stale-account rule
  // is normally written against — "no group activity in 180 days" was not
  // expressible without them.
  { id: 'passwordAgeDays', label: 'Credential age (days)' },
  { id: 'lastGroupActivityDays', label: 'Last group activity (days)' },
]

export const ATTR_INDEX = Object.fromEntries(ACCOUNT_ATTRIBUTES.map((a) => [a.id, a]))

export const ATTR_OPTIONS = ACCOUNT_ATTRIBUTES.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))

export const OPERATORS = ['=', '!=', 'contains', 'starts with', 'in', '>', '>=', '<', '<=', 'is empty', 'is not empty']

export const NO_VALUE = ['is empty', 'is not empty']

export const needsValue = (op) => !NO_VALUE.includes(op)

export const PICKABLE = ['=', '!=']


export const accountView = (a) => {
  const owner = a.owner ? USERS.find((u) => u.username === a.owner) : null
  return {
    account: a.account,
    application: a.application,
    status: a.status,
    matchedIdentity: a.owner || '',
    ownerStatus: owner ? owner.status : '',
    employeeType: owner ? owner.employeeType : '',
    department: owner ? owner.department : '',
    risk: a.risk,
    lastUsedDays: ageDays(a.lastUsed),
    discoveredDays: ageDays(a.discovered),
    // Derived from the account's own age so a rule written against them
    // evaluates against something real rather than a constant.
    passwordAgeDays: ageDays(a.discovered) + ((a.id * 13) % 240),
    lastGroupActivityDays: ageDays(a.lastUsed) + ((a.id * 7) % 90),
  }
}


export const blankRule = () => ({ attribute: ACCOUNT_ATTRIBUTES[0].id, operator: '=', value: '' })

export const blankModel = () => ({ join: 'AND', groups: [{ join: 'AND', rules: [blankRule()] }] })


export const quoteValue = (v) => (/^-?\d+(\.\d+)?$/.test(String(v).trim()) ? String(v).trim() : `'${v}'`)

export const ruleText = (r) => {
  if (!needsValue(r.operator)) return `${r.attribute} ${r.operator}`
  return `${r.attribute} ${r.operator} ${quoteValue(r.value)}`
}

export const groupText = (g) => g.rules.map(ruleText).join(` ${g.join} `)

export const modelText = (m) => {
  const live = m.groups.filter((g) => g.rules.length > 0)
  return live
    .map((g) => (live.length > 1 && g.rules.length > 1 ? `(${groupText(g)})` : groupText(g)))
    .join(` ${m.join} `)
}

export const countRules = (m) => m.groups.reduce((a, g) => a + g.rules.length, 0)

export const allRules = (m) => m.groups.flatMap((g) => g.rules)

export const flatRules = (m) => allRules(m)

export const flatten = (m) => ({ join: m.join === 'OR' ? 'OR' : 'AND', groups: [{ join: m.join === 'OR' ? 'OR' : 'AND', rules: allRules(m) }] })

export const unresolvedRules = (m) => allRules(m).filter((r) => !ATTR_INDEX[r.attribute])


export const evalRule = (view, r) => {
  if (!ATTR_INDEX[r.attribute]) return true
  const raw = view[r.attribute]
  const a = String(raw == null ? '' : raw).toLowerCase()
  const b = String(r.value == null ? '' : r.value).trim().toLowerCase()
  switch (r.operator) {
    case '=': return a === b
    case '!=': return a !== b
    case 'contains': return b !== '' && a.includes(b)
    case 'starts with': return b !== '' && a.startsWith(b)
    case 'in': return b.split(',').map((s) => s.trim()).filter(Boolean).includes(a)
    case '>': return Number(raw) > Number(r.value)
    case '>=': return Number(raw) >= Number(r.value)
    case '<': return Number(raw) < Number(r.value)
    case '<=': return Number(raw) <= Number(r.value)
    case 'is empty': return raw == null || raw === ''
    case 'is not empty': return !(raw == null || raw === '')
    default: return true
  }
}


export const evalModel = (view, m) => {
  const live = m.groups.filter((g) => g.rules.length > 0)
  if (live.length === 0) return false
  const results = live.map((g) => (g.join === 'OR' ? g.rules.some((r) => evalRule(view, r)) : g.rules.every((r) => evalRule(view, r))))
  return m.join === 'OR' ? results.some(Boolean) : results.every(Boolean)
}


export const matchAccounts = (model, accounts, scope) => accounts.filter((a) => {
  if (scope && scope !== 'All applications' && a.application !== scope) return false
  return evalModel(accountView(a), model)
})


export const sweepHistory = (rule, matchedCount) => {
  const anchor = parseStamp(rule.lastRun) || NOW
  return Array.from({ length: 10 }, (_, i) => {
    const started = anchor - i * 86400000
    const failed = (rule.id * 4 + i) % 9 === 0
    const discovered = failed ? 0 : (rule.id + i) % 3 === 0 ? 1 : 0
    const cleared = failed ? 0 : (rule.id * 2 + i) % 5 === 0 ? 1 : 0
    return {
      id: `${rule.id}-${i}`,
      runId: `SWEEP-${7300 - rule.id * 18 - i}`,
      started: fmtStamp(started),
      trigger: i % 6 === 4 ? 'Manual · admin' : 'Scheduler · orphanDetectQueue',
      scope: rule.scope,
      scanned: rule.scope === 'All applications'
        ? APPLICATIONS.reduce((a, x) => a + x.accounts, 0)
        : (APPLICATIONS.find((x) => x.displayName === rule.scope) || { accounts: 0 }).accounts,
      matched: Math.max(0, matchedCount - (i % 3)),
      discovered,
      cleared,
      status: failed ? 'Failed' : 'Succeeded',
      durationMs: 9000 + ((rule.id * 617 + i * 883) % 48000),
    }
  })
}


export const changeLog = (rule) => [
  { id: 1, tone: 'acc', icon: 'edit', title: 'Conditions amended', body: `${countRules(rule.model)} ${countRules(rule.model) === 1 ? 'condition' : 'conditions'} in the saved definition.`, ts: rule.modifiedOn, actor: rule.modifiedBy },
  { id: 2, tone: rule.active ? 'ok' : 'warn', icon: rule.active ? 'checkC' : 'eyeoff', title: rule.active ? 'Rule enabled' : 'Rule disabled', body: rule.active ? 'Included in the nightly detection sweep.' : 'Skipped by the detection sweep. Accounts already surfaced stay in the register.', ts: rule.modifiedOn, actor: rule.modifiedBy },
  { id: 3, tone: 'acc', icon: 'provision', title: 'Scope set', body: `Rule scoped to ${rule.scope}.`, ts: rule.createdOn, actor: rule.createdBy },
  { id: 4, tone: 'ok', icon: 'plus', title: 'Rule created', body: `Raised under change ${rule.ticket} and owned by ${rule.owner}.`, ts: rule.createdOn, actor: rule.createdBy },
]

