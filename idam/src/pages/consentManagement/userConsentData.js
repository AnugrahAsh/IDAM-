import { CONSENT_DEFS, CONSENT_RECORDS } from '../shared/comms/commsData'

/**
 * One identity's consents.
 *
 * Consent Management holds the estate view — every notice and every record
 * across the tenant. This is the other side of the same data: the notices one
 * identity has been asked for, the answer they gave and when, which is what a
 * profile has to show and what a data subject is entitled to see.
 *
 * Derived rather than stored: the record set is the evidence, so the state of a
 * consent is whatever that person's latest record for that notice says.
 */

/* A consent is not a decision taken once. A notice carries a validity period,
   after which the person is asked again; a notice republished at a new version
   asks again immediately. Both are held here so the profile can say which of
   the two is about to happen. */
const VALID_DAYS = { PRIVACY_NOTICE: 365, ACCEPTABLE_USE: 365, BIOMETRIC: 180 }
const DEFAULT_VALID_DAYS = 365
export const EXPIRING_WINDOW_DAYS = 30

const NOW_MS = Date.UTC(2026, 7, 5, 9, 0)
const DAY = 86400000

const parse = (stamp) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(String(stamp || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0))
}

const fmtDate = (ms) => (ms == null ? '—' : new Date(ms).toISOString().slice(0, 10))

export const STATUS_TONE = {
  Accepted: 'ok',
  Pending: 'warn',
  Withdrawn: 'mut',
  Declined: 'bad',
  'Not answered': 'mut',
}

/* The statuses a filter offers, in the order the profile lists them. */
export const CONSENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Accepted', label: 'Active' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Withdrawn', label: 'Withdrawn' },
]

const latestFor = (username, consentName) => CONSENT_RECORDS
  .filter((r) => r.username === username && r.consentName === consentName)
  .sort((a, b) => (parse(b.timestamp) || 0) - (parse(a.timestamp) || 0))[0] || null

export const consentsFor = (username) => CONSENT_DEFS.map((def) => {
  const last = latestFor(username, def.name)
  const answeredAt = last ? parse(last.timestamp) : null
  const status = last ? last.status : 'Not answered'
  const accepted = status === 'Accepted'
  const validDays = VALID_DAYS[def.code] || DEFAULT_VALID_DAYS
  const expiresAt = accepted && answeredAt != null ? answeredAt + validDays * DAY : null
  const daysLeft = expiresAt == null ? null : Math.round((expiresAt - NOW_MS) / DAY)
  /* The version answered against, not the version published: a notice that has
     moved on since is the whole point of asking again. */
  const answeredVersion = last ? last.consentVersion : null
  const reconsent = accepted && (answeredVersion !== def.version || (daysLeft != null && daysLeft <= 0))

  return {
    id: def.id,
    code: def.code,
    name: def.name,
    owner: def.owner,
    body: def.body,
    mandatory: def.mandatory,
    version: def.version,
    answeredVersion,
    status,
    tone: STATUS_TONE[status] || 'mut',
    answeredAt,
    answeredOn: fmtDate(answeredAt),
    lastAction: last ? last.actionType : null,
    ip: last ? last.ip : null,
    browser: last ? last.browser : null,
    expiresAt,
    expiresOn: fmtDate(expiresAt),
    daysLeft,
    expiringSoon: accepted && daysLeft != null && daysLeft > 0 && daysLeft <= EXPIRING_WINDOW_DAYS,
    reconsent,
  }
})

/* The six figures the profile leads with, in the order it shows them. */
export const consentSummary = (rows) => ({
  total: rows.length,
  active: rows.filter((r) => r.status === 'Accepted').length,
  pending: rows.filter((r) => r.status === 'Pending' || r.status === 'Not answered').length,
  withdrawn: rows.filter((r) => r.status === 'Withdrawn' || r.status === 'Declined').length,
  expiring: rows.filter((r) => r.expiringSoon).length,
  reconsent: rows.filter((r) => r.reconsent).length,
})

export const matchesConsentFilter = (row, filter) => {
  if (filter === 'all') return true
  if (filter === 'Accepted') return row.status === 'Accepted'
  if (filter === 'Pending') return row.status === 'Pending' || row.status === 'Not answered'
  if (filter === 'Withdrawn') return row.status === 'Withdrawn' || row.status === 'Declined'
  return true
}

/* The history behind one consent, newest first — the evidence a data subject
   may ask to see, and an auditor may ask to be shown. */
export const consentHistoryFor = (username, consentName) => CONSENT_RECORDS
  .filter((r) => r.username === username && r.consentName === consentName)
  .sort((a, b) => (parse(b.timestamp) || 0) - (parse(a.timestamp) || 0))
