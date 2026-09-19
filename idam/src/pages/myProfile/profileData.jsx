import { ATTRS, GROUPS, LOGS, LOOKUPS, ME, MY_APPS, ORGS } from '../../data/seed'
import { NOW_MS, daysUntil } from '../../lib/clock'
import { mfaOf } from '../users/posture'

/* The directory records one enrolled factor per identity and the register
   prints it. This screen listed a fixed three, so the same person read as
   Passkey here and Email OTP there. Both now read the directory. */
const FACTOR_ID_BY_NAME = { Passkey: 'passkey', TOTP: 'totp', Push: 'push', 'Email OTP': 'email' }
const myFactor = mfaOf(ME)
export const FACTOR_IDS = myFactor.state === 'on' ? [FACTOR_ID_BY_NAME[myFactor.factor]] : []

/* Every identity carries one country while the city list spans four, which
   printed "Singapore, India". The city settles it. */
const CITY_COUNTRY = { Singapore: 'Singapore', Dubai: 'United Arab Emirates', London: 'United Kingdom' }
export const locationText = (u) => `${u.city}, ${CITY_COUNTRY[u.city] || u.country}`

export const STRENGTH = {
  strongest: { label: 'Phishing-resistant', tone: 'ok' },
  strong: { label: 'Strong', tone: 'ok' },
  weak: { label: 'Weak', tone: 'warn' },
  weakest: { label: 'Not recommended', tone: 'bad' },
}

export const SESSIONS = [
  { id: 1, name: 'MacBook Pro 16', detail: 'macOS 26.1 · Safari 26', location: 'Mumbai, India', ip: '10.4.18.22', lastSeen: '2 hours ago', current: true },
  { id: 2, name: 'iPhone 17 Pro', detail: 'iOS 26.1 · Tanflow Mobile', location: 'Mumbai, India', ip: '10.4.20.101', lastSeen: '3 days ago', current: false },
  { id: 3, name: 'Windows 11 VDI', detail: 'Windows 11 · Edge 130', location: 'Bengaluru, India', ip: '172.16.9.40', lastSeen: '6 days ago', current: false },
]

export const PROFILE_SECTIONS = [
  { id: 'general', title: 'General details', sub: 'Core identity record. Governed fields are sourced from Workday HR.' },
  { id: 'professional', title: 'Professional details', sub: 'Position, department and reporting line as recorded by HR.' },
  { id: 'residential', title: 'Residential details', sub: 'Your registered address. You may correct these yourself.' },
]

export const EDITABLE = new Set(['mobileNo', 'address', 'country', 'state', 'city', 'postalCode'])

export const HIDDEN_ATTRS = new Set(['retirementDate'])

export const LANGUAGES = ['en-GB', 'en-US', 'hi-IN', 'fr-FR', 'de-DE', 'ar-AE']

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'UTC']

export const DATE_FORMATS = ['DD MMM YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']

export const PREF_DEFAULTS = {
  language: 'en-GB',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
  notifyApprovals: true,
  notifyRecert: true,
  notifySecurity: true,
  notifyDigest: false,
  channelSms: false,
}

export const NOTIFY_ROWS = [
  { id: 'notifyApprovals', title: 'Approval requests', body: 'Email me when a request is waiting on my decision.' },
  { id: 'notifyRecert', title: 'Access review reminders', body: 'Remind me while an attestation campaign that names me is open.' },
  { id: 'notifySecurity', title: 'Security alerts', body: 'New device sign-ins, factor changes and password resets on my account.' },
  { id: 'notifyDigest', title: 'Weekly digest', body: 'A Monday summary of my requests, approvals and expiring access.' },
  { id: 'channelSms', title: 'Also send by SMS', body: 'Deliver security alerts to my registered mobile number as well.' },
]

export const MY_GROUPS = GROUPS.filter((_, i) => i % 3 === 0)

const tsMs = (ts) => Date.parse(`${String(ts).replace(' ', 'T')}:00Z`)

/**
 * The account activity feed.
 *
 * The log pool spreads each row's hour across its day independently of the
 * platform clock, so the raw slice both ordered an evening entry below a
 * morning one on the same date and carried rows dated after now. Neither is
 * survivable in a feed an operator reads as a history, so it is filtered to
 * what has already happened and sorted on the whole timestamp.
 */
const ACCOUNT_SCOPED = /^(Sign-in|Password reset|MFA factor)/

/* The pool also picks `category` independently of the action, which put a
   sign-in under "Configuration" and a role change under "Policy". The feed
   states what the entry is about, taken from the action it records. */
const categoryOf = (action) => {
  if (/^Sign-in/.test(action)) return 'Authentication'
  if (/^(Password|MFA factor)/.test(action)) return 'Credentials'
  if (/^(Entitlement|Role)/.test(action)) return 'Access'
  if (/^Connector sync/.test(action)) return 'Provisioning'
  if (/^Policy/.test(action)) return 'Policy'
  return 'Configuration'
}

export const MY_EVENTS = LOGS
  .filter((_, i) => i % 5 === 0)
  .filter((e) => tsMs(e.ts) <= NOW_MS)
  .sort((a, b) => tsMs(b.ts) - tsMs(a.ts))
  .slice(0, 8)
  .map((e) => ({
    ...e,
    category: categoryOf(e.action),
    // An action against the account itself carries whatever target the pool
    // attached to it, which reads as though the password belonged to a group.
    subject: ACCOUNT_SCOPED.test(e.action) ? ME.username : e.target,
  }))

const agoText = (iso) => {
  const d = -daysUntil(iso)
  if (d <= 0) return 'today'
  return d === 1 ? 'yesterday' : `${d} days ago`
}

/* The side panel and the feed described the same password from two independent
   constants and disagreed by two months. The panel reads the feed. */
const lastPasswordChange = MY_EVENTS.find((e) => e.action === 'Password reset')
export const PASSWORD_CHANGED = lastPasswordChange ? agoText(lastPasswordChange.ts) : 'today'
export const PASSWORD_AGE_DAYS = lastPasswordChange ? Math.max(0, -daysUntil(lastPasswordChange.ts)) : 0

export const MY_ASSIGNED_APPS = MY_APPS

export const PROFILE_INITIAL = Object.fromEntries(
  ATTRS.filter((a) => !HIDDEN_ATTRS.has(a.id)).map((a) => [a.id, ME[a.id] || '']),
)

export const attrOptions = (attr) => {
  if (attr.src === 'organizations') return ORGS
  if (attr.src === 'managers') return null
  return LOOKUPS[attr.src] || null
}

export const pwScore = (v) => {
  let s = 0
  if (v.length >= 8) s += 25
  if (v.length >= 14) s += 25
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s += 20
  if (/\d/.test(v)) s += 15
  if (/[^A-Za-z0-9]/.test(v)) s += 15
  return s
}
