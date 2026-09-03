import { DEPARTMENTS, GROUPS, LOOKUPS, ORGS, SCHEDULERS, USERS } from '../../data/seed'
import { NOW_MS } from '../../lib/clock'
import { filterableAttrs } from '../configurations/schemaStore'

export const BASE = '/iam/dynamicPolicy'

export const GROUP_TYPES = ['Access', 'Application', 'SSO']

export const CYCLE = SCHEDULERS.find((s) => s.service === 'dynamicPolicyQueue')

export const HIGH_IMPACT = Math.max(8, Math.round(USERS.length * 0.12))

export const SOURCES = { ...LOOKUPS, organizations: ORGS, department: DEPARTMENTS }

export const EXTRA_ATTRIBUTES = [
  { id: 'status', label: 'Account status', options: ['Active', 'Locked', 'Disabled', 'Pending'] },
]

/**
 * The attribute list a policy condition may be written against is the identity
 * schema, not a copy of it: an attribute added in Configurations is usable in a
 * policy immediately. These are `let` bindings re-derived on a schema change —
 * importers see live values through the module binding.
 */
const buildAttributes = () => [
  ...filterableAttrs().map((a) => ({
    id: a.id,
    label: a.label,
    options: a.src && SOURCES[a.src] ? SOURCES[a.src] : undefined,
  })),
  ...EXTRA_ATTRIBUTES,
]

/* Read at call time, not captured at module load: an attribute added while the
   console is open has to be usable in the next condition the operator writes. */
export const attributes = () => buildAttributes()
export const attrIndex = () => Object.fromEntries(buildAttributes().map((a) => [a.id, a]))
export const attrOptions = () => buildAttributes().map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))

/* An attribute resolves if the identity record carries it or the schema
   defines it — a newly defined attribute is empty on every identity today, but
   it is not an unresolvable reference. */
export const resolvable = () => new Set([
  ...Object.keys(USERS[0]),
  ...attributes().map((a) => a.id),
])
export const RESOLVABLE = resolvable()

export const OPERATORS = ['=', '!=', 'contains', 'starts with', 'ends with', 'in', '>', '>=', '<', '<=', 'is empty', 'is not empty']

export const NO_VALUE = ['is empty', 'is not empty']

export const needsValue = (op) => !NO_VALUE.includes(op)

export const PICKABLE = ['=', '!=']

export const POLICY_META = {
  1: { owner: 'IT Operations', createdOn: '2026-01-22 10:14', createdBy: 'shubham.jain', modifiedOn: '2026-06-30 16:02', modifiedBy: 'admin', ticket: 'CHG-4471', review: '2026-10-01' },
  2: { owner: 'Finance', createdOn: '2025-11-08 09:35', createdBy: 'admin', modifiedOn: '2026-07-18 11:41', modifiedBy: 'priya.nair', ticket: 'CHG-4102', review: '2026-09-15' },
  3: { owner: 'Engineering', createdOn: '2026-02-14 13:50', createdBy: 'admin', modifiedOn: '2026-08-01 08:22', modifiedBy: 'admin', ticket: 'CHG-4620', review: '2026-11-01' },
  4: { owner: 'IT Operations', createdOn: '2026-04-03 15:07', createdBy: 'vansh.makhija', modifiedOn: '2026-07-30 09:12', modifiedBy: 'vansh.makhija', ticket: 'CHG-4712', review: '2026-12-01' },
}

export const DEFAULT_META = { owner: 'IT Operations', createdOn: '2026-08-05 09:00', createdBy: 'admin', modifiedOn: '2026-08-05 09:00', modifiedBy: 'admin', ticket: 'Not linked', review: '2027-02-01' }

export const metaFor = (p) => POLICY_META[p.id] || DEFAULT_META

export const SAMPLE_IMPORT = `[
  {
    "name": "Security analyst baseline",
    "description": "Security staff receive SIEM analyst rights on join.",
    "condition": "department = 'Security'",
    "groupType": "Access",
    "group": ["SEC_SIEM_ANALYST"]
  }
]`

export const stripParens = (text) => {
  const t = text.trim()
  if (!t.startsWith('(') || !t.endsWith(')')) return t
  let depth = 0
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '(') depth += 1
    else if (t[i] === ')') {
      depth -= 1
      if (depth === 0 && i < t.length - 1) return t
    }
  }
  return t.slice(1, -1).trim()
}

export const splitTop = (text, keyword) => {
  const kw = keyword.toLowerCase()
  const parts = []
  let depth = 0
  let quoted = false
  let cur = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === "'") { quoted = !quoted; cur += ch; i += 1; continue }
    if (!quoted && ch === '(') { depth += 1; cur += ch; i += 1; continue }
    if (!quoted && ch === ')') { depth -= 1; cur += ch; i += 1; continue }
    if (!quoted && depth === 0 && /\s/.test(ch)) {
      const ahead = text.slice(i + 1, i + 1 + kw.length).toLowerCase()
      const after = text[i + 1 + kw.length]
      if (ahead === kw && (after === undefined || /\s/.test(after) || after === '(')) {
        parts.push(cur)
        cur = ''
        i += 1 + kw.length
        continue
      }
    }
    cur += ch
    i += 1
  }
  parts.push(cur)
  return parts.map((p) => p.trim()).filter(Boolean)
}

export const SYMBOL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|!=|=|>|<)\s*(.+)$/

export const WORD_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s+(starts with|ends with|contains|in)\s+(.+)$/i

export const EMPTY_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s+(is not empty|is empty)$/i

export const unquote = (v) => String(v).trim().replace(/^'(.*)'$/s, '$1')

export const parseRule = (text) => {
  const t = stripParens(text)
  const empty = t.match(EMPTY_RE)
  if (empty) return { attribute: empty[1], operator: empty[2].toLowerCase(), value: '' }
  const m = t.match(SYMBOL_RE) || t.match(WORD_RE)
  if (!m) return { raw: t }
  return { attribute: m[1], operator: m[2].toLowerCase(), value: unquote(m[3]) }
}

export const blankRule = () => ({ attribute: attributes()[0].id, operator: '=', value: '' })

export const blankModel = () => ({ join: 'AND', groups: [{ join: 'AND', rules: [blankRule()] }] })

export const parseExpression = (text) => {
  const src = String(text || '').trim()
  if (!src) return { join: 'AND', groups: [{ join: 'AND', rules: [] }] }
  let join = 'AND'
  let chunks = splitTop(src, 'OR')
  if (chunks.length > 1) join = 'OR'
  else chunks = [src]
  const groups = chunks.map((chunk) => {
    const inner = stripParens(chunk)
    let gjoin = 'AND'
    let parts = splitTop(inner, 'AND')
    if (parts.length === 1) {
      const alt = splitTop(inner, 'OR')
      if (alt.length > 1) { parts = alt; gjoin = 'OR' }
    }
    return { join: gjoin, rules: parts.map(parseRule) }
  })
  return { join, groups }
}

export const quoteValue = (v) => (/^-?\d+(\.\d+)?$/.test(String(v).trim()) ? String(v).trim() : `'${v}'`)

export const ruleText = (r) => {
  if (r.raw != null) return r.raw
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

export const unresolvedRules = (m) => {
  const known = resolvable()
  return m.groups.flatMap((g) => g.rules).filter((r) => r.raw != null || !known.has(r.attribute))
}

export const evalRule = (u, r) => {
  if (r.raw != null) return true
  if (!resolvable().has(r.attribute)) return true
  const raw = u[r.attribute]
  const a = String(raw == null ? '' : raw).toLowerCase()
  const b = String(r.value == null ? '' : r.value).trim().toLowerCase()
  switch (r.operator) {
    case '=': return a === b
    case '!=': return a !== b
    case 'contains': return b !== '' && a.includes(b)
    case 'starts with': return b !== '' && a.startsWith(b)
    case 'ends with': return b !== '' && a.endsWith(b)
    case 'in': return b.split(',').map((s) => s.trim()).filter(Boolean).includes(a)
    case '>': return Number(raw) > Number(r.value)
    case '>=': return Number(raw) >= Number(r.value)
    case '<': return Number(raw) < Number(r.value)
    case '<=': return Number(raw) <= Number(r.value)
    case 'is empty': return raw == null || raw === '' || raw === false
    case 'is not empty': return !(raw == null || raw === '' || raw === false)
    default: return true
  }
}

export const evalModel = (u, m) => {
  const live = m.groups.filter((g) => g.rules.length > 0)
  if (live.length === 0) return false
  const results = live.map((g) => (g.join === 'OR' ? g.rules.some((r) => evalRule(u, r)) : g.rules.every((r) => evalRule(u, r))))
  return m.join === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

export const matchUsers = (m, pool) => (pool || USERS).filter((u) => evalModel(u, m))

export const assignedIds = (policy, matched) => {
  const out = new Set()
  if (!policy.lastRun || policy.lastRun === '—') return out
  matched.forEach((u) => { if ((u.id * 7 + policy.id * 13) % 5 !== 0) out.add(u.id) })
  USERS.forEach((u) => { if (!out.has(u.id) && (u.id * 11 + policy.id * 3) % 41 === 0) out.add(u.id) })
  return out
}

export const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/

export const parseStamp = (s) => {
  const m = STAMP_RE.exec(String(s || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Math.abs(Number(m[4])) % 24, Math.abs(Number(m[5])) % 60)
}

export const fmtStamp = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')

/* Run history is anchored to the platform clock, not the browser's, so a
   policy's last run never reads as being in the future. */
export { NOW_MS }

export const runHistory = (policy, matchedCount) => {
  const anchor = parseStamp(policy.lastRun) || NOW_MS
  return Array.from({ length: 9 }, (_, i) => {
    const started = anchor - i * 6 * 3600000
    const drift = ((policy.id * 5 + i * 7) % 9) - 4
    const evaluated = USERS.length
    const matched = Math.max(0, matchedCount + drift)
    const failed = (policy.id + i) % 7 === 0
    const granted = failed ? 0 : Math.max(0, (i === 0 ? 0 : (policy.id + i) % 4))
    const revoked = failed ? 0 : (policy.id * 2 + i * 3) % 4 === 0 ? 1 : 0
    return {
      id: `${policy.id}-${i}`,
      runId: `RUN-${9400 - policy.id * 20 - i}`,
      started: fmtStamp(started),
      trigger: i % 4 === 3 ? 'Manual · admin' : 'Scheduler · dynamicPolicyQueue',
      status: failed ? 'Failed' : 'Succeeded',
      evaluated,
      matched,
      granted,
      revoked,
      durationMs: 1400 + ((policy.id * 311 + i * 977) % 9000),
      detail: failed ? 'Target connector unreachable, run aborted before writes' : `${granted} granted · ${revoked} revoked`,
    }
  })
}

export const changeLog = (policy) => {
  const meta = metaFor(policy)
  return [
    { id: 1, tone: 'acc', icon: 'edit', title: 'Condition amended', body: `Predicate set saved as ${policy.condition}`, ts: meta.modifiedOn, actor: meta.modifiedBy },
    { id: 2, tone: policy.active ? 'ok' : 'warn', icon: policy.active ? 'checkC' : 'ban', title: policy.active ? 'Policy activated' : 'Policy paused', body: policy.active ? 'Included in every scheduled evaluation cycle.' : 'Skipped by the evaluation cycle. Existing assignments retained.', ts: meta.modifiedOn, actor: meta.modifiedBy },
    { id: 3, tone: 'acc', icon: 'group', title: groupList(policy).length > 1 ? 'Target groups set' : 'Target group set', body: `${groupList(policy).join(', ') || 'None'} (${policy.groupType} ${groupList(policy).length > 1 ? 'groups' : 'group'})`, ts: meta.createdOn, actor: meta.createdBy },
    { id: 4, tone: 'ok', icon: 'plus', title: 'Policy created', body: `Raised under change ${meta.ticket}.`, ts: meta.createdOn, actor: meta.createdBy },
  ]
}

export const groupsOfType = (type) => GROUPS.filter((g) => g.kind === type).map((g) => g.name)

export const groupRecord = (name) => GROUPS.find((g) => g.name === name)

/**
 * A policy targeted one group before it could target several, and every record
 * written before that — the seeded ones included — still carries a plain
 * string. Readers go through `groupList`, so the old shape renders and saves
 * without a migration; only what is written back is always an array.
 */
export const groupList = (p) => {
  const v = Array.isArray(p) ? p : (p && typeof p === 'object' ? p.group : p)
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  return v ? [String(v)] : []
}

export const groupRecords = (p) => groupList(p).map(groupRecord).filter(Boolean)

/* Two names still read as names; beyond that a count is the honest summary. */
export const groupLabel = (p) => {
  const list = groupList(p)
  if (list.length === 0) return 'Not selected'
  if (list.length <= 2) return list.join(', ')
  return `${list[0]} + ${list.length - 1} more`
}

export const groupPhrase = (p) => {
  const list = groupList(p)
  if (list.length === 0) return 'no target group'
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.length} target groups`
}
