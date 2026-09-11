import { useSyncExternalStore } from 'react'
import { stampText } from '../../lib/clock'

/**
 * Tenant settings.
 *
 * Settings is not a screen that only talks to itself: the approval levels
 * defined here name the columns on the Approvals and Access Requests
 * registers, the regions feed the region-aware password bindings, and the
 * password-flow combination rules gate one another. That cross-screen reach is
 * why this lives in a store rather than in the page's own `useState` — a level
 * renamed in Settings has to rename a column two screens away.
 *
 * Kept deliberately small: a module-level value, a listener set and
 * useSyncExternalStore. There is no server in this build, so the value is
 * mirrored into localStorage to survive a reload.
 */

const KEY = 'tf-idam-settings'

export const TIME_UNITS_LINK = ['Minutes', 'Hours', 'Days']
export const TIME_UNITS_OTP = ['Seconds', 'Minutes', 'Hours']

export const WORKFLOWS = ['Set Password (user creation)', 'Password Reset']

/** The flow list is dependent on the workflow — a reset flow cannot be bound
 *  to user creation, and the UI must not offer it. */
export const FLOWS_BY_WORKFLOW = {
  'Set Password (user creation)': ['Email Link', 'Email Link + SMS Link', 'SMS Link'],
  'Password Reset': ['Email Link', 'Email Link + SMS OTP', 'Email OTP', 'SMS OTP'],
}

export const BINDING_SCOPES = ['Global (default)', 'Region', 'Organization', 'Organization + Region']

export const PRECEDENCE = 'Org+Region → Region → Org → Global default'

/** Password Flow Configuration §6. `Email Link + SMS` is exclusive: when it is
 *  active nothing else may be, and at most two of the others may combine. */
export const FLOW_TYPES = [
  { id: 'emailLinkSms', label: 'Email Link + SMS', exclusive: true },
  { id: 'emailLink', label: 'Email Link Only' },
  { id: 'emailOtp', label: 'Email OTP' },
  { id: 'smsOtp', label: 'SMS OTP' },
]

export const MAX_COMBINED_FLOWS = 2

export const DEFAULT_SETTINGS = {
  general: {
    orgName: 'Tanflow Corp',
    usernameUppercase: false,
  },
  /**
   * How the platform renders time.
   *
   * Everything is stored in UTC; these settings decide what an operator reads
   * and what an export contains. They used to be three loose selects inside
   * General, which put "what timezone are these timestamps in" — the question
   * every report and every job record is read through — behind a section about
   * the tenant's name.
   */
  datetime: {
    timezone: 'Asia/Calcutta',
    dateFormat: 'dd-MM-yyyy',
    timeFormat: '12h',
    locale: 'en-IN',
    weekStartsOn: 'Sunday',
    displaySeconds: true,
  },
  /**
   * Direct SIEM delivery.
   *
   * The local file and the Splunk forwarder are always on; this adds a second,
   * direct path to a collector over TLS. The passphrase is deliberately absent
   * — it is read from the server environment, and a form that accepts one
   * invites it into a config export.
   *
   * Edited from Security Events rather than from this page: the transport is
   * where security events go, so it sits with the register that decides which
   * events exist. The value stays here because it is tenant configuration and
   * has to survive a reload and appear in a configuration export.
   */
  siem: {
    enabled: false,
    host: '',
    port: 6514,
    framing: 'Octet counting (RFC 5425)',
    /* Carried over from the Syslog config screen the transport replaced.
       Nothing else on the platform sets the severity floor, the RFC 5424
       facility, or whether secrets are redacted before dispatch. */
    minSeverity: 'INFO',
    facility: 'LOCAL3',
    maskSensitive: true,
    failover: '',
    deadLetterPath: '',
    caBundlePath: '',
    sni: '',
    clientCertPath: '',
    clientKeyPath: '',
    minTlsVersion: 'TLS 1.2',
    verifyServerCert: true,
    retryAttempts: 5,
    baseBackoffMs: 200,
    maxBackoffMs: 5000,
    breakerThreshold: 5,
    breakerCooldownMs: 30000,
  },
  branding: {
    logoName: 'tanflow-wordmark.png',
    logoDataUrl: '',
    logoSize: 18734,
  },
  security: {
    sessionTimeout: '30 minutes',
    idleWarning: '2 minutes',
    enforceMfa: true,
    privilegedStepUp: true,
    /* The two outbound-channel master switches. Every template, link and
       one-time code on that channel depends on its switch, so they sit
       together rather than one per section. */
    smsService: true,
    emailService: true,
    deviceBasedAuth: false,
  },
  lifetimes: {
    linkValue: 10,
    linkUnit: 'Hours',
    otpValue: 1,
    otpUnit: 'Minutes',
  },
  signout: {
    redirectUri: 'https://demo1.tanflow.com',
  },
  redirectUris: [
    { id: 1, uri: 'https://demo1.tanflow.com/callback', description: 'Console sign-in callback', createdBy: 'SHUBHAM_JAIN', createdOn: '2026-03-11' },
    { id: 2, uri: 'https://portal.tanflow.com/oauth/return', description: 'Employee portal return URI', createdBy: 'SHUBHAM_JAIN', createdOn: '2026-05-02' },
  ],
  passwordFlows: {
    active: { emailLinkSms: false, emailLink: true, emailOtp: false, smsOtp: false },
    maxLimit: 10,
  },
  regions: [
    { id: 1, key: 'IN', name: 'India', active: true },
    { id: 2, key: 'PK', name: 'Pakistan', active: true },
    { id: 3, key: 'AE', name: 'UAE', active: true },
    { id: 4, key: 'UK', name: 'UK', active: true },
    { id: 5, key: 'US', name: 'USA', active: true },
  ],
  regionFlows: {
    enabled: false,
    overrides: [
      { id: 1, org: 'Tanflow · Finance', state: 'Enabled' },
    ],
    bindings: [
      { id: 1, workflow: 'Set Password (user creation)', scope: 'Global (default)', region: '', org: '', flow: 'Email Link', priority: 100, active: true },
      { id: 2, workflow: 'Password Reset', scope: 'Global (default)', region: '', org: '', flow: 'Email Link', priority: 100, active: true },
      { id: 3, workflow: 'Password Reset', scope: 'Region', region: 'IN', org: '', flow: 'SMS OTP', priority: 20, active: true },
      { id: 4, workflow: 'Set Password (user creation)', scope: 'Organization + Region', region: 'UK', org: 'Tanflow · Finance', flow: 'Email Link + SMS Link', priority: 10, active: true },
    ],
  },
  approvalLevels: [
    { id: 1, name: 'Manager', role: 'Access Approver', detail: 'Line manager confirms the business need', sla: 8 },
    { id: 2, name: 'Resource Owner', role: 'Resource Owner', detail: 'Application owner signs off on the entitlement', sla: 16 },
    { id: 3, name: 'Security', role: 'Global Identity Administrator', detail: 'Security review for privileged and conflicting access', sla: 24 },
  ],
  /**
   * The vocabulary the Notification Center is authored against.
   *
   * Category and Severity are the two selects on an announcement, and they
   * were hard-coded lists in the module that happened to render them: adding a
   * category meant a code change. They are tenant vocabulary, so they are
   * tenant settings.
   *
   * `tone` is the colour a category's chip carries, `icon` the mark beside it
   * in the inbox. A severity carries `level`, which is the three-step scale the
   * notification centre files, counts and sorts by — an authored severity can
   * be named anything, but it has to resolve to one of Info, High or Critical
   * for the tiles above the register to add up.
   *
   * Order is meaningful in one respect: the first entry of each list is what a
   * new announcement opens on, which is why the section offers arrows rather
   * than sorting alphabetically.
   */
  notificationTaxonomy: {
    categories: [
      { id: 'cat-announcements', label: 'Announcements', tone: 'acc',  icon: 'bell' },
      { id: 'cat-compliance',    label: 'Compliance',    tone: 'warn', icon: 'sod' },
      { id: 'cat-governance',    label: 'Governance',    tone: 'viol', icon: 'certify' },
      { id: 'cat-operations',    label: 'Operations',    tone: 'info', icon: 'provision' },
      { id: 'cat-security',      label: 'Security',      tone: 'bad',  icon: 'shield' },
      { id: 'cat-platform',      label: 'Platform',      tone: 'mut',  icon: 'server' },
    ],
    severities: [
      { id: 'sev-info',     label: 'info',     level: 'info' },
      { id: 'sev-warn',     label: 'warn',     level: 'high' },
      { id: 'sev-high',     label: 'high',     level: 'high' },
      { id: 'sev-critical', label: 'critical', level: 'critical' },
    ],
  },
  /**
   * The severity register a segregation-of-duties rule is authored against.
   *
   * The four names were a literal array inside the SoD module, so a tenant that
   * grades its controls on anything but critical/high/medium/low had to wait for
   * a build. Every entry carries the badge step it is drawn as, so however a
   * tenant names its grades the register's colours stay consistent.
   */
  sodSeverities: {
    levels: [
      { id: 'sod-sev-critical', label: 'critical', badge: 'critical' },
      { id: 'sod-sev-high', label: 'high', badge: 'high' },
      { id: 'sod-sev-medium', label: 'medium', badge: 'medium' },
      { id: 'sod-sev-low', label: 'low', badge: 'low' },
    ],
  },
  provisioning: {
    cadence: 'Every 6 hours',
    autoDeprovision: true,
    graceDays: '7 days',
    orphanHandling: 'Suspend and notify owner',
  },
  privacyConsent: {
    privacyNotice: 'Global privacy notice v4.2',
    reconsent: 'On material change',
    blockUntilAccepted: true,
  },
  transport: {
    encryptPayloads: false,
    /* Whether a plain request is refused or merely allowed alongside an
       encrypted one. Soft exists because a tenant cannot cut every client over
       at the same instant — during a key rotation or a client migration both
       shapes have to be accepted, and Strict is what you switch to once the
       last client is across. */
    enforceEncryption: false,
    lastChange: '',
  },
  /**
   * Who last touched each section.
   *
   * A single tenant-wide "last changed by" told every section the same thing,
   * which is worse than saying nothing: the card claimed to describe the
   * section in front of you and did not. Change control is per section, and a
   * section nobody has edited says so rather than borrowing someone else's
   * change ticket.
   */
  meta: {
    general: { by: 'SHUBHAM_JAIN', at: '2026-08-01 09:12', ticket: 'CHG-4471' },
    datetime: { by: 'SHUBHAM_JAIN', at: '2026-08-01 09:12', ticket: 'CHG-4471' },
    siem: { by: 'vansh.makhija', at: '2026-07-29 11:47', ticket: 'CHG-4460' },
    branding: { by: 'priya.nair', at: '2026-06-18 14:02', ticket: 'CHG-4102' },
    security: { by: 'vansh.makhija', at: '2026-07-29 11:47', ticket: 'CHG-4460' },
    lifetimes: { by: 'vansh.makhija', at: '2026-07-29 11:51', ticket: 'CHG-4460' },
    signout: null,
    redirectUris: { by: 'SHUBHAM_JAIN', at: '2026-05-02 16:20', ticket: 'CHG-3980' },
    passwordFlows: { by: 'elena.ferrer', at: '2026-07-14 08:35', ticket: 'CHG-4388' },
    regionFlows: { by: 'elena.ferrer', at: '2026-07-14 09:02', ticket: 'CHG-4388' },
    approvalLevels: { by: 'SHUBHAM_JAIN', at: '2026-06-30 10:18', ticket: 'CHG-4221' },
    notificationTaxonomy: { by: 'SHUBHAM_JAIN', at: '2026-07-22 11:36', ticket: 'CHG-4390' },
    sodSeverities: { by: 'priya.nair', at: '2026-06-18 10:12', ticket: 'CHG-4265' },
    provisioning: { by: 'nikhil.rao', at: '2026-08-03 07:40', ticket: 'CHG-4478' },
    privacyConsent: { by: 'priya.nair', at: '2026-04-11 13:05', ticket: 'CHG-3840' },
    transport: null,
  },
}

const clone = (v) => JSON.parse(JSON.stringify(v))

/** A stored value is merged over the defaults so a build that adds a section
 *  does not read `undefined` out of a browser that saved the old shape. */
const hydrate = () => {
  const base = clone(DEFAULT_SETTINGS)
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw)
    Object.keys(base).forEach((k) => {
      if (saved[k] === undefined) return
      base[k] = Array.isArray(base[k]) ? saved[k] : (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(saved[k]))
        ? { ...base[k], ...saved[k] }
        : saved[k]
    })
    return base
  } catch {
    return base
  }
}

let state = hydrate()
const listeners = new Set()

const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

export const getSettings = () => state

export const writeSettings = (next) => {
  state = typeof next === 'function' ? next(state) : next
  emit()
}

/** Replace one section. */
export const writeSection = (key, value) => writeSettings((s) => ({
  ...s,
  [key]: typeof value === 'function' ? value(s[key]) : value,
}))

export const resetSettings = () => writeSettings(clone(DEFAULT_SETTINGS))

/** Stamp a section as changed by the signed-in operator, here and now. */
export const recordChange = (section, by = 'SHUBHAM_JAIN', at = stampText()) => writeSettings((s) => ({
  ...s,
  meta: { ...s.meta, [section]: { by, at, ticket: 'CHG-4482' } },
}))

export const changeMetaFor = (section, s = state) => (s.meta || {})[section] || null

export const useSettings = () => useSyncExternalStore(subscribe, getSettings, getSettings)

export const useSettingsSection = (key) => useSyncExternalStore(
  subscribe,
  () => state[key],
  () => DEFAULT_SETTINGS[key],
)

/** The ordered approval chain every request runs through. */
export const useApprovalLevels = () => useSettingsSection('approvalLevels')
export const approvalLevels = () => state.approvalLevels

/**
 * The Notification Center vocabulary.
 *
 * Exposed as both a hook and a plain read: the announcement editor and the
 * register subscribe, while the inbox model resolves a severity outside of
 * React when it shapes a row.
 */
export const useNotificationTaxonomy = () => useSettingsSection('notificationTaxonomy')
export const notificationTaxonomy = () => state.notificationTaxonomy

/** The three-step scale the inbox files a severity under. */
export const severityLevel = (label, s = state) => {
  const hit = (s.notificationTaxonomy?.severities || []).find((x) => x.label === label)
  return hit ? hit.level : 'info'
}

/** The chip tone and inbox mark a category carries. */
export const categoryStyle = (label, s = state) => (
  (s.notificationTaxonomy?.categories || []).find((x) => x.label === label) || null
)

/**
 * The severity register a segregation-of-duties rule is graded against.
 *
 * Both a hook and a plain read, for the same reason as the notification
 * taxonomy: the rule builder subscribes, while the list and detail surfaces
 * resolve a badge step outside of React when they shape a row.
 */
export const useSodSeverities = () => useSettingsSection('sodSeverities')
export const sodSeverities = () => state.sodSeverities

/** The labels offered by the Severity dropdown when a rule is authored. */
export const sodSeverityOptions = (s = state) => (s.sodSeverities?.levels || []).map((x) => x.label)

/** The badge step a configured severity is drawn as. An unknown label — a rule
 *  authored before the register was edited — keeps rendering at its own name. */
export const sodSeverityBadge = (label, s = state) => {
  const hit = (s.sodSeverities?.levels || []).find((x) => x.label === label)
  return hit ? hit.badge : String(label || 'low').toLowerCase()
}

/** Active regions are the only ones a new binding may reference. */
export const activeRegions = (s = state) => s.regions.filter((r) => r.active)

/** A region referenced by a binding may be deactivated but never deleted. */
export const regionInUse = (key, s = state) => s.regionFlows.bindings.some((b) => b.region === key)

/**
 * Which flow actually applies, given the precedence rule the UI states.
 * Exported so the section can show a resolution preview rather than asking the
 * operator to trust the sentence.
 */
export const resolveFlow = (workflow, { region, org } = {}, s = state) => {
  const candidates = s.regionFlows.bindings
    .filter((b) => b.active && b.workflow === workflow)
    .filter((b) => {
      if (b.scope === 'Global (default)') return true
      if (b.scope === 'Region') return !!region && b.region === region
      if (b.scope === 'Organization') return !!org && b.org === org
      return !!region && !!org && b.region === region && b.org === org
    })
  const rank = { 'Organization + Region': 0, Region: 1, Organization: 2, 'Global (default)': 3 }
  candidates.sort((a, b) => (rank[a.scope] - rank[b.scope]) || (a.priority - b.priority))
  return candidates[0] || null
}

/**
 * Password Flow Configuration disables what the combination rules forbid, so
 * the table can render a disabled state that explains itself instead of
 * silently rejecting a save.
 */
export const flowAvailability = (active) => {
  const on = FLOW_TYPES.filter((t) => active[t.id])
  const exclusiveOn = on.some((t) => t.exclusive)
  const combinedCount = on.filter((t) => !t.exclusive).length
  return FLOW_TYPES.reduce((acc, t) => {
    if (active[t.id]) { acc[t.id] = { disabled: false, reason: '' }; return acc }
    if (t.exclusive) {
      acc[t.id] = combinedCount > 0
        ? { disabled: true, reason: 'Email Link + SMS must be used alone. Deactivate the other flows first.' }
        : { disabled: false, reason: '' }
      return acc
    }
    if (exclusiveOn) {
      acc[t.id] = { disabled: true, reason: 'Email Link + SMS is exclusive. Deactivate it before combining other flows.' }
      return acc
    }
    acc[t.id] = combinedCount >= MAX_COMBINED_FLOWS
      ? { disabled: true, reason: `At most ${MAX_COMBINED_FLOWS} flows may be combined.` }
      : { disabled: false, reason: '' }
    return acc
  }, {})
}
