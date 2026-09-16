import { ME, MFA_METHODS, SSO_APPS, USERS } from '../../data/seed'
import { num } from '../../lib/format'

export const BASE = '/iam/signOnPolicy'
export const MODULE = 'Sign-On Policy'

export const policyPath = (id, tail) => `${BASE}/${id}${tail ? `/${tail}` : ''}`

export const plural = (n, one, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`

export const NAME_MIN = 2
export const NAME_MAX = 100
export const DESCRIPTION_MAX = 500

// ---------------------------------------------------------------------------
// Vocabulary. Values are the ones the rules endpoint takes; labels are the
// ones the previous console showed, so an operator moving across recognises
// every option.
// ---------------------------------------------------------------------------

export const CONDITION_TYPES = [
  { value: 'ip', label: 'IP Address', short: 'IP', noun: 'IP address', icon: 'globe' },
  { value: 'browser', label: 'Browser', short: 'Browser', noun: 'browser', icon: 'browser' },
  { value: 'os', label: 'Operating System', short: 'OS', noun: 'operating system', icon: 'monitor' },
  { value: 'device', label: 'Device / Phone', short: 'Device', noun: 'device', icon: 'device' },
]

export const typeMeta = (type) => CONDITION_TYPES.find((t) => t.value === type) || null

/* `shape` is the value control an operator needs: one value, a comma-separated
   list, or a from/to pair. Ranges only mean something for addresses. */
export const OPERATORS = [
  { value: 'equals', label: 'is equal to', phrase: 'is', shape: 'single' },
  { value: 'not_equals', label: 'is not equal to', phrase: 'is not', shape: 'single' },
  { value: 'any_of', label: 'is any of', phrase: 'is any of', shape: 'list' },
  { value: 'none_of', label: 'is none of', phrase: 'is none of', shape: 'list' },
  { value: 'in_range', label: 'is in range', phrase: 'is in range', shape: 'range', ipOnly: true },
  { value: 'not_in_range', label: 'is not in range', phrase: 'is not in range', shape: 'range', ipOnly: true },
]

export const operatorsFor = (type) => OPERATORS.filter((o) => type === 'ip' || !o.ipOnly)
export const operatorMeta = (operator) => OPERATORS.find((o) => o.value === operator) || null
export const shapeOf = (operator) => (operatorMeta(operator) || {}).shape || null

export const ACTIONS = [
  { value: 'ALLOW', label: 'Allow access', short: 'Allow', icon: 'checkC', tone: 'ok', sub: 'A matching sign-in is allowed.' },
  { value: 'DENY', label: 'Deny access', short: 'Deny', icon: 'ban', tone: 'bad', sub: 'A matching sign-in is refused and shown the denied message.' },
]
export const actionMeta = (action) => ACTIONS.find((a) => a.value === action) || ACTIONS[0]

export const LOGIC = [
  { value: 'AND', label: 'AND (all conditions must pass)', word: 'and' },
  { value: 'OR', label: 'OR (any condition passes)', word: 'or' },
]

export const MFA_OPTIONS = [
  { value: 'totp', label: 'TOTP (Authenticator App)', short: 'TOTP', icon: 'device', tenant: 'totp', sub: 'A code from an authenticator app.' },
  { value: 'email', label: 'Email OTP', short: 'Email OTP', icon: 'mail', tenant: 'email', sub: 'A one-time code sent to the registered mailbox.' },
  { value: 'sms', label: 'SMS', short: 'SMS', icon: 'sms', tenant: 'sms', sub: 'A one-time code sent by text message.' },
  { value: 'fido', label: 'FIDO / WebAuthn', short: 'FIDO', icon: 'key', tenant: 'passkey', sub: 'A security key or a platform passkey.' },
]
export const mfaMeta = (value) => MFA_OPTIONS.find((m) => m.value === value) || null

/* Whether the tenant offers the method at all. A rule can name a method the
   Multi-Factor Authentication module has switched off, and nobody can then be
   challenged with it — which is worth saying where the method is chosen. */
export const tenantOffers = (value) => {
  const meta = mfaMeta(value)
  const method = meta && MFA_METHODS.find((m) => m.id === meta.tenant)
  return method ? method.enabled : true
}

export const FREQUENCY_TYPES = [
  { value: 'EVERY_TIME', label: 'Every time' },
  { value: 'CUSTOM_INTERVAL', label: 'Custom interval' },
]

export const FREQUENCY_UNITS = [
  { value: 'MINUTES', label: 'Minutes', one: 'minute', many: 'minutes' },
  { value: 'HOURS', label: 'Hours', one: 'hour', many: 'hours' },
  { value: 'DAYS', label: 'Days', one: 'day', many: 'days' },
]

/* Placeholders per condition type. The previous console suggested
   "chrome, firefox" for a list of IP addresses; each type now suggests values
   of its own kind. */
export const VALUE_HINTS = {
  ip: { single: 'e.g. 10.0.0.5', list: 'e.g. 10.0.0.5, 10.0.0.6', from: 'e.g. 10.0.0.1', to: 'e.g. 10.0.0.254' },
  browser: { single: 'e.g. chrome', list: 'e.g. chrome, firefox', suggestions: ['chrome', 'firefox', 'safari', 'edge', 'opera'] },
  os: { single: 'e.g. windows', list: 'e.g. windows, macos', suggestions: ['windows', 'macos', 'linux', 'ios', 'android'] },
  device: { single: 'e.g. iphone', list: 'e.g. iphone, android', suggestions: ['desktop', 'mobile', 'tablet', 'iphone', 'android'] },
}

/* The SSO catalogue a policy can be attached to. */
export const APP_CATALOG = SSO_APPS.map((a) => ({
  id: a.id,
  name: a.name,
  displayName: a.displayName,
  protocol: a.protocol,
  url: `https://${a.name.replace(/_/g, '-')}.tanflow.com`,
  clientId: a.clientId,
  enabled: a.enabled,
  owner: a.owner,
}))

export const appById = (id) => APP_CATALOG.find((a) => String(a.id) === String(id)) || null

// ---------------------------------------------------------------------------
// Conditions. The form edits `value`, `list` or `from`/`to` depending on the
// operator; what is stored is the `values` array the endpoint takes.
// ---------------------------------------------------------------------------

let keySeq = 0
const nextKey = () => {
  keySeq += 1
  return `cond-${keySeq}`
}

export const blankCondition = () => ({ key: nextKey(), type: '', operator: '', value: '', list: '', from: '', to: '' })

export const splitList = (text) => String(text || '').split(',').map((s) => s.trim()).filter(Boolean)

/** `equals` → `[value]`, `any_of` → the comma-split list, `in_range` → `[from, to]`. */
export const conditionValues = (c) => {
  switch (shapeOf(c.operator)) {
    case 'single': return [String(c.value || '').trim()]
    case 'list': return splitList(c.list)
    case 'range': return [String(c.from || '').trim(), String(c.to || '').trim()]
    default: return []
  }
}

/** A stored condition, spread back out into the fields the form edits. */
export const conditionDraft = (c) => {
  const values = c.values || []
  const shape = shapeOf(c.operator)
  return {
    key: nextKey(),
    type: c.type,
    operator: c.operator,
    value: shape === 'single' ? values[0] || '' : '',
    list: shape === 'list' ? values.join(', ') : '',
    from: shape === 'range' ? values[0] || '' : '',
    to: shape === 'range' ? values[1] || '' : '',
  }
}

/* Changing the operator keeps what was typed, carried into the new shape,
   rather than blanking a value the operator only meant to re-qualify. */
export const reshapeCondition = (c, operator) => {
  const from = shapeOf(c.operator)
  const to = shapeOf(operator)
  if (!from || from === to) return { operator }
  const values = conditionValues(c).filter(Boolean)
  if (to === 'single') return { operator, value: values[0] || '' }
  if (to === 'list') return { operator, list: values.join(', ') }
  if (to === 'range') return { operator, from: values[0] || '', to: values[1] || '' }
  return { operator }
}

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4 = new RegExp(`^${OCTET}(\\.${OCTET}){3}$`)
/* IPv6 is checked for its alphabet and shape only. A full grammar refuses the
   compressed and IPv4-embedded forms an operator is most likely to paste. */
const IPV6 = /^(?=.*:.*:)[0-9a-f:.]{2,45}$/i

export const isIpv4 = (v) => IPV4.test(String(v).trim())
export const isIp = (v) => isIpv4(v) || IPV6.test(String(v).trim())
const ipv4Number = (v) => String(v).trim().split('.').reduce((a, o) => a * 256 + Number(o), 0)

/**
 * What is wrong with one condition row, keyed by the field that is wrong.
 *
 * The previous console registered these checks and never rendered them, so a
 * rule with an empty value refused to save and said nothing. Every message
 * here is shown under the field it names.
 */
export const conditionIssues = (c) => {
  if (!c.type) return { type: 'Select a condition type.' }
  if (!c.operator) return { operator: 'Select an operator.' }
  const out = {}
  const ip = c.type === 'ip'
  const shape = shapeOf(c.operator)
  if (shape === 'single') {
    const v = String(c.value || '').trim()
    if (!v) out.value = 'Enter a value.'
    else if (ip && !isIp(v)) out.value = 'Enter a valid IP address.'
  }
  if (shape === 'list') {
    const values = splitList(c.list)
    const bad = ip ? values.filter((v) => !isIp(v)) : []
    if (values.length === 0) out.list = 'Enter at least one value.'
    else if (bad.length === 1) out.list = `${bad[0]} is not a valid IP address.`
    else if (bad.length > 1) out.list = `${bad.length} values are not valid IP addresses.`
  }
  if (shape === 'range') {
    const start = String(c.from || '').trim()
    const end = String(c.to || '').trim()
    if (!start) out.from = 'Enter where the range starts.'
    else if (!isIp(start)) out.from = 'Enter a valid IP address.'
    if (!end) out.to = 'Enter where the range ends.'
    else if (!isIp(end)) out.to = 'Enter a valid IP address.'
    else if (!out.from && isIpv4(start) !== isIpv4(end)) out.to = 'Use the same address family as the start.'
    else if (!out.from && isIpv4(start) && ipv4Number(end) < ipv4Number(start)) out.to = 'The range ends before it starts.'
  }
  return out
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export const blankRuleDraft = () => ({
  name: '',
  action: 'ALLOW',
  logic: 'AND',
  conditions: [blankCondition()],
  errorMessage: '',
  excludeUsers: false,
  excludedUsernames: [],
  excludedFile: null,
  promptMfa: false,
  mfaMethods: [],
  frequencyType: 'EVERY_TIME',
  frequencyInterval: '',
  frequencyUnit: 'HOURS',
})

export const ruleDraft = (rule) => (rule ? {
  name: rule.name,
  action: rule.action,
  logic: rule.logic || 'AND',
  conditions: rule.conditions.map(conditionDraft),
  errorMessage: rule.errorMessage || '',
  excludeUsers: rule.excludeUsers,
  excludedUsernames: [...rule.excludedUsernames],
  excludedFile: rule.excludedFile,
  promptMfa: rule.promptMfa,
  mfaMethods: [...rule.mfaMethods],
  frequencyType: rule.frequencyType || 'EVERY_TIME',
  frequencyInterval: rule.frequencyInterval == null ? '' : String(rule.frequencyInterval),
  frequencyUnit: rule.frequencyUnit || 'HOURS',
} : blankRuleDraft())

/** The draft as it is stored, and as the rules endpoint receives it. */
export const ruleFromDraft = (d) => {
  const conditions = d.conditions.map((c) => ({ type: c.type, operator: c.operator, values: conditionValues(c) }))
  const custom = d.promptMfa && d.frequencyType === 'CUSTOM_INTERVAL'
  return {
    name: d.name.trim(),
    action: d.action,
    // Sent only when there are conditions for it to join.
    logic: conditions.length > 0 ? d.logic : null,
    conditions,
    errorMessage: d.errorMessage.trim(),
    excludeUsers: d.excludeUsers,
    excludedUsernames: d.excludeUsers ? d.excludedUsernames : [],
    excludedFile: d.excludeUsers ? d.excludedFile : null,
    promptMfa: d.promptMfa,
    mfaMethods: d.promptMfa ? d.mfaMethods : [],
    frequencyType: d.promptMfa ? d.frequencyType : null,
    frequencyInterval: custom ? Number(d.frequencyInterval) : null,
    frequencyUnit: custom ? d.frequencyUnit : null,
  }
}

export const ruleIssues = (d, siblings = []) => {
  const out = {}
  const name = d.name.trim()
  if (!name) out.name = 'Rule name is required.'
  else if (siblings.some((r) => r.name.toLowerCase() === name.toLowerCase())) out.name = 'Another rule in this policy already uses this name.'

  const conditions = d.conditions.map(conditionIssues)
  if (conditions.some((c) => Object.keys(c).length > 0)) out.conditions = conditions
  if (d.conditions.length === 0 && !d.promptMfa) out.scope = 'Add at least one condition or require MFA.'
  if (d.conditions.length > 0 && !d.errorMessage.trim()) out.errorMessage = 'Denied message is required when the rule has conditions.'

  if (d.promptMfa && d.mfaMethods.length === 0) out.mfaMethods = 'Select at least one method.'
  if (d.promptMfa && d.frequencyType === 'CUSTOM_INTERVAL') {
    const raw = String(d.frequencyInterval).trim()
    if (!raw) out.frequencyInterval = 'Enter an interval.'
    else if (!/^\d+$/.test(raw) || Number(raw) < 1) out.frequencyInterval = 'Enter a whole number of 1 or more.'
  }
  if (d.excludeUsers && d.excludedUsernames.length === 0) out.excludedUsernames = 'Add at least one user to exclude, from the directory or a CSV file.'
  return out
}

export const issueCount = (issues) => Object.entries(issues).reduce(
  (n, [k, v]) => n + (k === 'conditions' ? v.reduce((m, c) => m + Object.keys(c).length, 0) : 1),
  0,
)

// ---------------------------------------------------------------------------
// Reading a rule back in words
// ---------------------------------------------------------------------------

const GAP = '…'

export const valueText = (c, cap = Infinity) => {
  const values = c.values || []
  if (shapeOf(c.operator) === 'range') return `${values[0] || GAP} – ${values[1] || GAP}`
  if (shapeOf(c.operator) === 'list') {
    const listed = values.filter(Boolean)
    if (listed.length === 0) return GAP
    return listed.length > cap ? `${listed.slice(0, cap).join(', ')} +${listed.length - cap}` : listed.join(', ')
  }
  return values[0] || GAP
}

/** "IP address is in range 10.0.0.1 – 10.0.0.254", or "IP is in range …" with `short`. */
export const conditionText = (c, { short = false, cap } = {}) => {
  const type = typeMeta(c.type)
  const op = operatorMeta(c.operator)
  return `${type ? (short ? type.short : type.noun) : GAP} ${op ? op.phrase : GAP} ${valueText(c, cap)}`
}

export const ruleSummary = (rule) => {
  const verb = actionMeta(rule.action).short
  if (rule.conditions.length === 0) return `${verb} every sign-in`
  const word = rule.logic === 'OR' ? ' or ' : ' and '
  return `${verb} when ${rule.conditions.map((c) => conditionText(c)).join(word)}`
}

export const methodsText = (methods) => {
  const names = methods.map((m) => (mfaMeta(m) || {}).short).filter(Boolean)
  if (names.length <= 1) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

export const frequencyText = (rule) => {
  if (rule.frequencyType !== 'CUSTOM_INTERVAL') return 'every sign-in'
  const unit = FREQUENCY_UNITS.find((u) => u.value === rule.frequencyUnit) || FREQUENCY_UNITS[1]
  const n = Number(rule.frequencyInterval)
  if (!n) return `every ${GAP} ${unit.many}`
  return n === 1 ? `every ${unit.one}` : `every ${n} ${unit.many}`
}

/* Rules with no application to run against. The previous console let a policy
   sit in that state with nothing to say it had no effect. */
export const isOrphan = (p) => p.rules.length > 0 && p.applications.length === 0

// ---------------------------------------------------------------------------
// Excluded users
// ---------------------------------------------------------------------------

export const TEMPLATE_NAME = 'sample_usernames.csv'
export const TEMPLATE_ROWS = ['username', 'example_user1', 'example_user2', 'example_user3']

const HEADERS = new Set(['username', 'user', 'user_name'])

/**
 * The exclusion file, read the way the platform reads it: every cell is a
 * username, a leading header cell is skipped, and values are trimmed,
 * lowercased and de-duplicated. What it drops is counted rather than lost, so
 * the upload can say what it did.
 */
export const parseUsernames = (text) => {
  const cells = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/[\r\n,]+/)
    .map((t) => t.trim().replace(/^"(.*)"$/, '$1').trim().toLowerCase())
    .filter(Boolean)
  const header = cells.length > 0 && HEADERS.has(cells[0])
  const body = header ? cells.slice(1) : cells
  const usernames = [...new Set(body)]
  return { usernames, header, duplicates: body.length - usernames.length }
}

const DIRECTORY = new Set(USERS.map((u) => u.username.toLowerCase()))
export const inDirectory = (username) => DIRECTORY.has(String(username).toLowerCase())

export const policyIssues = (draft, policies, self) => {
  const out = {}
  const name = draft.name.trim()
  if (!name) out.name = 'Policy name is required.'
  else if (name.length < NAME_MIN) out.name = `Name must be at least ${NAME_MIN} characters.`
  else if (name.length > NAME_MAX) out.name = `Name must be at most ${NAME_MAX} characters.`
  else if (policies.some((p) => (!self || p.id !== self.id) && p.name.toLowerCase() === name.toLowerCase())) {
    out.name = 'Another sign-on policy already uses this name.'
  }
  if (draft.description.length > DESCRIPTION_MAX) out.description = `Description must be at most ${DESCRIPTION_MAX} characters.`
  return out
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const cond = (type, operator, values) => ({ type, operator, values })

const rule = (id, name, action, conditions, extra = {}) => ({
  id,
  name,
  action,
  logic: conditions.length > 0 ? 'AND' : null,
  conditions,
  errorMessage: '',
  excludeUsers: false,
  excludedUsernames: [],
  excludedFile: null,
  promptMfa: false,
  mfaMethods: [],
  frequencyType: null,
  frequencyInterval: null,
  frequencyUnit: null,
  ...extra,
})

const attached = (appIds, on) => appIds.map((appId) => ({ appId, attachedOn: on, attachedBy: ME.username }))

const CONTRACTOR_EXCEPTIONS = [
  ...USERS.filter((u) => u.employeeType === 'Contractor').slice(0, 3).map((u) => u.username.toLowerCase()),
  'vendor_breakglass',
]

const SEED = [
  {
    id: 1,
    name: 'Workforce baseline',
    description: 'Default sign-on rules for employee applications: blocked egress first, the office network without a challenge, everywhere else behind MFA.',
    status: 'Active',
    createdOn: '2026-06-18 10:42',
    createdBy: ME.username,
    modifiedOn: '2026-07-29 16:05',
    modifiedBy: ME.username,
    applications: attached([1, 3, 4], '2026-06-18 11:02'),
    rules: [
      rule(1, 'deny-blocked-egress', 'DENY', [cond('ip', 'any_of', ['203.0.113.51', '198.51.100.7'])], {
        errorMessage: 'Sign-in from this network is blocked. Contact the service desk if you believe this is wrong.',
      }),
      rule(2, 'office-network', 'ALLOW', [cond('ip', 'in_range', ['10.0.0.1', '10.255.255.254'])], {
        errorMessage: 'You are not on the corporate network.',
      }),
      rule(3, 'remote-with-mfa', 'ALLOW', [], {
        promptMfa: true, mfaMethods: ['totp', 'fido'], frequencyType: 'CUSTOM_INTERVAL', frequencyInterval: 8, frequencyUnit: 'HOURS',
      }),
    ],
  },
  {
    id: 2,
    name: 'Contractor access',
    description: 'External contractors reach vendor-facing applications from a managed workstation only, with an MFA challenge at every sign-in.',
    status: 'Active',
    createdOn: '2026-06-24 09:15',
    createdBy: ME.username,
    modifiedOn: '2026-08-01 11:30',
    modifiedBy: ME.username,
    applications: attached([2, 6], '2026-06-24 09:40'),
    rules: [
      rule(4, 'contractor-unmanaged-os', 'DENY', [cond('os', 'none_of', ['windows', 'macos'])], {
        errorMessage: 'Contractor access needs a managed Windows or macOS workstation.',
        excludeUsers: true,
        excludedUsernames: CONTRACTOR_EXCEPTIONS,
        excludedFile: { name: 'contractor-exceptions.csv', size: 96, duplicates: 0, header: true },
      }),
      rule(5, 'contractor-supported-browsers', 'ALLOW', [cond('browser', 'any_of', ['chrome', 'edge'])], {
        errorMessage: 'Use Chrome or Edge to reach contractor applications.',
        promptMfa: true, mfaMethods: ['totp', 'email'], frequencyType: 'EVERY_TIME',
      }),
    ],
  },
  {
    id: 3,
    name: 'Privileged consoles',
    description: 'Analytics and administration consoles: reachable from the admin bastion only, with a phishing-resistant factor at every sign-in.',
    status: 'Active',
    createdOn: '2026-07-02 14:20',
    createdBy: ME.username,
    modifiedOn: null,
    modifiedBy: null,
    applications: attached([5], '2026-07-02 14:31'),
    rules: [
      rule(6, 'bastion-only', 'DENY', [cond('ip', 'not_equals', ['10.12.4.10'])], {
        errorMessage: 'Privileged consoles are reachable from the admin bastion only.',
      }),
      rule(7, 'bastion-fido', 'ALLOW', [cond('ip', 'equals', ['10.12.4.10'])], {
        errorMessage: 'Sign in from the admin bastion.',
        promptMfa: true, mfaMethods: ['fido'], frequencyType: 'EVERY_TIME',
      }),
    ],
  },
  {
    id: 4,
    name: 'Field staff on mobile',
    description: 'Drafted for the field rollout: company phones and tablets, with a daily one-time code.',
    status: 'Active',
    createdOn: '2026-07-21 08:50',
    createdBy: ME.username,
    modifiedOn: '2026-07-22 17:12',
    modifiedBy: ME.username,
    applications: [],
    rules: [
      rule(8, 'field-mobile-devices', 'ALLOW', [cond('device', 'any_of', ['iphone', 'android']), cond('os', 'any_of', ['ios', 'android'])], {
        logic: 'OR',
        errorMessage: 'Field applications are available on company phones and tablets only.',
        promptMfa: true, mfaMethods: ['email', 'sms'], frequencyType: 'CUSTOM_INTERVAL', frequencyInterval: 1, frequencyUnit: 'DAYS',
      }),
    ],
  },
  {
    id: 5,
    name: 'Partner SSO pilot',
    description: 'Placeholder for the partner intranet pilot. Rules are pending security review.',
    status: 'Inactive',
    createdOn: '2026-07-30 12:05',
    createdBy: ME.username,
    modifiedOn: null,
    modifiedBy: null,
    applications: attached([7], '2026-07-30 12:09'),
    rules: [],
  },
]

export const seedPolicies = () => {
  let mapping = 0
  return SEED.map((p) => ({
    ...p,
    rules: p.rules.map((r) => ({
      ...r,
      conditions: r.conditions.map((c) => ({ ...c, values: [...c.values] })),
      excludedUsernames: [...r.excludedUsernames],
      mfaMethods: [...r.mfaMethods],
    })),
    applications: p.applications.map((m) => {
      mapping += 1
      return { ...m, mappingId: mapping }
    }),
  }))
}
