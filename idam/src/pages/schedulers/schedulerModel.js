/**
 * The scheduler record, and everything that reads or writes one.
 *
 * A scheduler is three things bolted together: a binding to a service from the
 * catalogue (plus that service's own configuration), a schedule, and an
 * execution policy. They are kept apart here because they fail apart — a
 * schedule can be complete while the service configuration is not, and the
 * form has to be able to say which.
 *
 * Times are stored in UTC and entered in the scheduler's own timezone, which
 * is the only arrangement where "runs at 02:00" survives a server move. The
 * conversion lives in `wallToUtc` / `utcToWall` and nowhere else.
 */

import { NOW_MS } from '../../lib/clock'
import { APPLICATIONS, ORGANIZATIONS } from '../../data/seed'
import { attrs } from '../configurations/schemaStore'
import { TEMPLATES } from '../shared/comms/commsData'
import { SEED_SOURCES } from '../trustReconciliation/trustModel'
import { applicationRequired, defaultConfig, serviceFor } from './serviceCatalog'

export const BASE = '/iam/schedulers'

// ---------------------------------------------------------------------------
// Timezones
// ---------------------------------------------------------------------------

/* Configuration, not a constant: a multi-region deployment adds its zones here
   rather than in the component that renders the dropdown. */
export const TIMEZONE_CATALOG = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney',
]

export const browserZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

/**
 * The Timezone dropdown.
 *
 * The browser's own zone leads the list and says so. It used to be listed as a
 * separate entry from its own canonical name — `Asia/Calcutta` above
 * `Asia/Kolkata` — which put the same zone in the list twice under two spellings
 * and left an operator picking between them. The browser zone is folded into
 * the catalogue entry when it resolves to one already there.
 */
export const timezoneOptions = () => {
  const here = browserZone()
  const canonical = TIMEZONE_CATALOG.find((z) => sameZone(z, here))
  if (canonical) {
    return TIMEZONE_CATALOG.map((z) => ({
      value: z,
      label: z === canonical ? `${z} (this browser)` : z,
    }))
  }
  return [{ value: here, label: `${here} (this browser)` }, ...TIMEZONE_CATALOG.map((z) => ({ value: z, label: z }))]
}

/* Two IANA names are the same zone when they agree on the offset — which is how
   `Asia/Calcutta` and `Asia/Kolkata` are recognised as one thing. */
const sameZone = (a, b) => a === b || zoneOffsetMs(a, NOW_MS) === zoneOffsetMs(b, NOW_MS)

export const defaultTimezone = () => {
  const here = browserZone()
  return TIMEZONE_CATALOG.find((z) => sameZone(z, here)) || here
}

/** How far ahead of UTC a zone is at a given instant, in milliseconds. */
export function zoneOffsetMs(tz, utcMs) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs))
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
    const hour = p.hour === '24' ? 0 : Number(p.hour)
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second)) - utcMs
  } catch {
    return 0
  }
}

/* A wall-clock reading in `tz`, expressed as the UTC instant it names. Applied
   twice because the offset depends on the instant it is being asked about, and
   an hour either side of a DST boundary the first answer is the wrong one. */
export const wallToUtc = (tz, wallMs) => {
  const first = wallMs - zoneOffsetMs(tz, wallMs)
  return wallMs - zoneOffsetMs(tz, first)
}

export const utcToWall = (tz, utcMs) => utcMs + zoneOffsetMs(tz, utcMs)

// ---------------------------------------------------------------------------
// Stamps
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0')

/** `YYYY-MM-DD HH:MM`, the stamp every register in this console renders. */
export const stamp = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : null)

export const stampSeconds = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 19).replace('T', ' ') : null)

export const parseStamp = (v) => {
  if (v == null || v === '') return null
  const t = Date.parse(String(v).length <= 10 ? `${v}T00:00:00Z` : `${String(v).replace(' ', 'T').slice(0, 19)}Z`)
  return Number.isNaN(t) ? null : t
}

/** `YYYY-MM-DDTHH:MM` — what a `datetime-local` input reads and writes. */
export const toLocalInput = (utcIso, tz) => {
  const ms = parseStamp(utcIso)
  if (ms == null) return ''
  const d = new Date(utcToWall(tz, ms))
  return `${d.toISOString().slice(0, 16)}`
}

export const fromLocalInput = (value, tz) => {
  if (!value) return null
  const ms = parseStamp(value.replace('T', ' '))
  if (ms == null) return null
  return new Date(wallToUtc(tz, ms)).toISOString()
}

export const fmtCell = (v) => {
  const ms = parseStamp(v)
  return ms == null ? '—' : stamp(ms)
}

/**
 * The one conversion a scheduler result screen makes.
 *
 * Every scheduler timestamp is an absolute instant, and the response says which
 * zone it is to be read in — `display_timezone`. Converting here, once, is the
 * whole point of the helper existing: the console's general-purpose cell
 * formatter treats a stamp as already local, so applying it to a scheduler
 * value adds the offset a second time and renders an Asia/Kolkata deployment
 * five and a half hours late. Nothing on these screens calls that formatter.
 */
export const schedulerTime = (value, tz = 'UTC') => {
  const ms = parseStamp(value)
  return ms == null ? '—' : stamp(utcToWall(tz, ms))
}

/** The same instant with the zone it is being read in, for a title or footnote. */
export const schedulerTimeText = (value, tz = 'UTC') => {
  const text = schedulerTime(value, tz)
  return text === '—' ? text : `${text} ${tz}`
}

export const relFuture = (ms) => {
  const mins = Math.max(0, Math.round((ms - NOW_MS) / 60000))
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export const SCHEDULE_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'one-time', label: 'One Time' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'recurring', label: 'Recurring' },
]

export const INTERVAL_TYPES = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const DAY_OPTIONS = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
]

const DAY_INDEX = Object.fromEntries(DAY_OPTIONS.map((d, i) => [d.value, i]))

export const DATE_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))

export const MISFIRE_POLICIES = [
  { value: 'RUN_IMMEDIATELY', label: 'Run once as soon as possible (recommended)' },
  { value: 'SKIP', label: 'Skip the missed run and wait for the next one' },
  { value: 'RUN_ALL', label: 'Run every missed occurrence' },
]

/* The example series is generated from the base delay rather than quoted at the
   default, so choosing a 30-second base does not leave the dropdown promising
   "10s, 20s, 40s". */
export const backoffOptions = (baseSeconds = 10) => {
  const b = Math.max(0, Number(baseSeconds) || 0)
  return [
    { value: 'EXPONENTIAL', label: `Exponential (${b}s, ${b * 2}s, ${b * 4}s…)` },
    { value: 'LINEAR', label: `Linear (${b}s, ${b * 2}s, ${b * 3}s…)` },
    { value: 'FIXED', label: `Fixed (${b}s each time)` },
  ]
}

const ORDINAL = (n) => {
  const v = Number(n)
  const s = ['th', 'st', 'nd', 'rd'][((v % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][v % 100] || 'th'
  return `${v}${s}`
}

const titleCase = (v) => String(v).charAt(0) + String(v).slice(1).toLowerCase()

const timeText = (t) => (String(t || '').length === 5 ? `${t}:00` : String(t || '00:00:00'))

/**
 * The human summary the list renders in its SCHEDULE column.
 *
 * Rendered from the record rather than stored on it, so a schedule and its
 * description can never disagree — the old register kept them as two fields and
 * they did.
 */
export function scheduleDescription(r) {
  const tz = r.timezone || 'UTC'
  const zone = ` (${tz})`
  // A draft with no schedule type yet has no schedule to describe. It used to
  // fall through to the recurring branch and claim a daily 09:00 run the
  // operator had not chosen.
  if (!r.schedule_type) return 'No schedule type selected'
  if (r.schedule_type === 'manual') return 'Manual only'

  if (r.schedule_type === 'one-time') {
    const ms = parseStamp(r.start_time)
    if (ms == null) return 'Once — start time not set'
    return `Once at ${stampSeconds(utcToWall(tz, ms))}${zone}`
  }

  /* The window is only stated when it says something. A start date already in
     the past is how every long-running scheduler looks, so quoting it on every
     row pushed the part that matters — the cadence — off the end of the column
     while telling the reader nothing. A start date still ahead means the
     schedule is dormant, and that is worth a phrase. */
  const window = () => {
    const from = parseStamp(r.start_date)
    const to = parseStamp(r.end_date)
    const a = from == null || from <= NOW_MS ? '' : ` from ${stamp(utcToWall(tz, from))}`
    const b = to == null ? '' : ` until ${stamp(utcToWall(tz, to))}`
    return `${a}${b}`
  }

  if (r.schedule_type === 'periodic') {
    const n = Math.max(1, Number(r.run_between) || 1)
    const unit = n === 1 ? String(r.interval_type || 'hours').replace(/s$/, '') : (r.interval_type || 'hours')
    return `Every ${n === 1 ? '' : `${n} `}${unit}${window()}${zone}`
  }

  const at = ` at ${timeText(r.time_of_day)}`
  if (r.frequency === 'weekly') {
    const days = (r.days || []).slice().sort((a, b) => DAY_INDEX[a] - DAY_INDEX[b]).map((d) => titleCase(d).slice(0, 3))
    return `Weekly on ${days.length ? days.join(', ') : 'no day selected'}${at}${window()}${zone}`
  }
  if (r.frequency === 'monthly') {
    const dates = (r.dates || []).slice().map(Number).sort((a, b) => a - b)
    return `Monthly on the ${dates.length ? dates.map(ORDINAL).join(', ') : 'no date selected'}${at}${window()}${zone}`
  }
  return `Daily${at}${window()}${zone}`
}

/**
 * When this scheduler fires next, as a UTC millisecond instant.
 *
 * Walked in the scheduler's own timezone and converted back, so a daily 02:00
 * job in Asia/Kolkata stays at 02:00 there rather than drifting with the
 * server. Returns null for manual schedules, for one-time schedules already
 * past, and for any schedule whose end date has been reached.
 */
export function nextRunAt(r, fromMs = NOW_MS) {
  if (!r || r.schedule_type === 'manual') return null
  if (!r.active_status) return null
  const tz = r.timezone || 'UTC'
  const endMs = parseStamp(r.end_date)

  if (r.schedule_type === 'one-time') {
    const ms = parseStamp(r.start_time)
    return ms != null && ms > fromMs ? ms : null
  }

  const startMs = parseStamp(r.start_date)

  if (r.schedule_type === 'periodic') {
    const n = Math.max(1, Number(r.run_between) || 1)
    const unitMs = { minutes: 60000, hours: 3600000, days: 86400000 }[r.interval_type] || 3600000
    const step = n * unitMs
    const anchor = startMs == null ? fromMs : startMs
    if (anchor > fromMs) return endMs != null && anchor > endMs ? null : anchor
    const elapsed = fromMs - anchor
    const next = anchor + (Math.floor(elapsed / step) + 1) * step
    return endMs != null && next > endMs ? null : next
  }

  // Recurring — scan forward a day at a time in the scheduler's own zone.
  const [hh, mm] = String(r.time_of_day || '00:00').split(':').map((x) => Number(x) || 0)
  const dates = (r.dates || []).map(Number)
  const days = new Set(r.days || [])
  const begin = Math.max(fromMs, startMs == null ? fromMs : startMs - 86400000)
  const cursor = new Date(utcToWall(tz, begin))
  cursor.setUTCHours(0, 0, 0, 0)

  for (let i = 0; i < 800; i += 1) {
    const y = cursor.getUTCFullYear()
    const mo = cursor.getUTCMonth()
    const d = cursor.getUTCDate()
    const dow = DAY_OPTIONS[cursor.getUTCDay()].value
    const ok = r.frequency === 'weekly' ? days.has(dow)
      : r.frequency === 'monthly' ? dates.includes(d)
        : true
    if (ok) {
      const utc = wallToUtc(tz, Date.UTC(y, mo, d, hh, mm, 0))
      if (utc > fromMs && (startMs == null || utc >= startMs)) {
        return endMs != null && utc > endMs ? null : utc
      }
    }
    cursor.setUTCDate(d + 1)
  }
  return null
}

/** Cross-field rules the form enforces before anything is written. */
export function scheduleIssues(r) {
  const out = []
  if (r.schedule_type === 'one-time' && !r.start_time) out.push('A one-time schedule needs a start time.')
  if (r.schedule_type === 'periodic') {
    if (!(Number(r.run_between) > 0)) out.push('A periodic schedule needs an interval value greater than zero.')
    if (!r.start_date) out.push('A periodic schedule needs a start date and time.')
  }
  if (r.schedule_type === 'recurring') {
    if (!r.time_of_day) out.push('A recurring schedule needs a time of day.')
    if (r.frequency === 'weekly' && !(r.days || []).length) out.push('Select at least one day of the week.')
    if (r.frequency === 'monthly' && !(r.dates || []).length) out.push('Select at least one date of the month.')
  }
  if (r.schedule_type === 'periodic' || r.schedule_type === 'recurring') {
    const a = parseStamp(r.start_date)
    const b = parseStamp(r.end_date)
    if (a != null && b != null && b <= a) out.push('The end date falls on or before the start date, so the schedule would never run.')
  }
  return out
}

// ---------------------------------------------------------------------------
// Execution policy
// ---------------------------------------------------------------------------

export const TIMEOUT_RANGE = { min: 1, max: 1440 }
export const ATTEMPT_RANGE = { min: 1, max: 20 }
export const BACKOFF_RANGE = { min: 0, max: 3600 }

/**
 * The execution defaults a service declares.
 *
 * Every one of them, not just the timeout. Applying the timeout alone left an
 * operator who browsed the catalogue before settling on a service with the
 * retry policy of whichever service they happened to look at first — a
 * scheduler silently created with retry off because Custom Script was opened
 * on the way past.
 */
export const executionDefaults = (code) => {
  const svc = serviceFor(code)
  const meta = svc?.metadata || {}
  return {
    timeout_ms: svc?.defaultTimeoutMs ?? 900000,
    allow_concurrent: false,
    max_concurrent: 1,
    batch_size: meta.supportsBatch ? 500 : 1,
    retry_enabled: !!meta.retryable,
    max_attempts: 3,
    backoff_strategy: 'EXPONENTIAL',
    backoff_delay_ms: 10000,
    misfire_policy: 'RUN_IMMEDIATELY',
    continue_on_error: true,
    notify_on_failure: false,
    notification_emails: null,
  }
}

export const summariseExecution = (r) => {
  const mins = Math.round((r.timeout_ms || 0) / 60000)
  const retry = r.retry_enabled ? `${r.max_attempts} attempt${r.max_attempts === 1 ? '' : 's'}` : 'no retry'
  return `${r.timezone} · timeout ${mins} min · ${retry}`
}

// ---------------------------------------------------------------------------
// Application sources
// ---------------------------------------------------------------------------

/* Deployment data rather than an enum: both lists are read from the registers
   that own them, so a newly onboarded application is selectable here without a
   second edit. */
export const provisionApplications = () =>
  APPLICATIONS.map((a) => ({ value: String(a.id), label: a.displayName, sub: a.name }))

export const trustSources = () =>
  SEED_SOURCES.map((s) => ({ value: String(s.id), label: s.display_name || s.application_name, sub: s.application_name }))

export const applicationOptions = (source) =>
  (source === 'trustSources' ? trustSources() : provisionApplications())

export const applicationLabel = (code, id) => {
  const meta = serviceFor(code)?.metadata
  if (!meta?.requiresApplication || id == null) return null
  const hit = applicationOptions(meta.applicationField.source).find((o) => String(o.value) === String(id))
  return hit ? hit.label : `#${id}`
}

/**
 * Carrying a single application binding forward into a multi-select.
 *
 * A service that reconciles several applications keeps the list in its own
 * configuration; the record's `application_id` column predates that and holds
 * exactly one. Declaring `migratesApplicationTo` on the service is what turns
 * that one into the first chip, so a scheduler saved before the change opens
 * showing what it was saved with rather than an empty required field. Nothing
 * here knows which service that is.
 */
export const withApplicationBinding = (r) => {
  const key = serviceFor(r?.service_code)?.metadata?.migratesApplicationTo
  if (!key || r.application_id == null) return r
  const held = r.service_config?.[key]
  if (Array.isArray(held) && held.length) return r
  return { ...r, service_config: { ...r.service_config, [key]: [String(r.application_id)] } }
}

// ---------------------------------------------------------------------------
// Remote option sources
// ---------------------------------------------------------------------------

/**
 * The lists a `remote-enum` or `multi-remote-enum` field is filled from.
 *
 * The descriptor names a source; this is where that name resolves. Every one of
 * them reads the register that owns the data rather than restating it, so an
 * organisation added under Organizations, a template written under Email
 * Management or a date attribute defined under Configurations is selectable
 * here without a second edit.
 *
 * Each source reports `configured` separately from its options: an empty list
 * behind a required field is not an empty dropdown, it is a service that cannot
 * be saved, and the field says so instead.
 */

/* The directory column a schema attribute is stored under. The schema's ids are
   camelCase and most columns are the snake_case of the same word — but not all
   of them: `dor` is the column the deprovisioning service reads and the export
   screen offers, and no mechanical transform produces it from `retirementDate`. */
const ATTRIBUTE_COLUMN = { retirementDate: 'dor', mobileNo: 'mobile_no' }

const columnName = (id) =>
  ATTRIBUTE_COLUMN[id] || String(id).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

/* Only these two schema types hold an instant. A scheduler pointed at anything
   else parses nothing and fails at run time, which is the failure the dropdown
   exists to prevent. */
const DATE_TYPES = { date: 'Date', datetime: 'Timestamp' }

/* Dated columns every identity carries that the identity schema does not
   define: they are the platform's own, so Configurations never lists them, and
   without them the three date fields would have almost nothing to choose
   between. `doj` and `dor` are the pair the joiner and leaver services read. */
const PLATFORM_DATE_ATTRIBUTES = [
  { name: 'doj', label: 'Joining Date', dataType: 'Date' },
  { name: 'dor', label: 'Date Of Retirement', dataType: 'Date' },
  { name: 'last_login', label: 'Last Login', dataType: 'Timestamp' },
  { name: 'created_on', label: 'Created On', dataType: 'Timestamp' },
]

/** Every attribute that actually holds a date, schema-defined ones first. */
export const dateAttributes = () => {
  const defined = attrs()
    .filter((a) => DATE_TYPES[a.type])
    .map((a) => ({ name: columnName(a.id), label: a.label, dataType: DATE_TYPES[a.type] }))
  const named = new Set(defined.map((a) => a.name))
  return [...defined, ...PLATFORM_DATE_ATTRIBUTES.filter((a) => !named.has(a.name))]
    .sort((a, b) => a.label.localeCompare(b.label))
}

/* The attribute name is in the option rather than only in the stored value: two
   attributes can carry the same display name, and the one that runs is the
   column. The data type follows it — what the attribute holds is the reason
   this list is shorter than the schema. */
export const dateAttributeOptions = () =>
  dateAttributes().map((a) => ({
    value: a.name,
    label: `${a.label} (${a.name}) · ${a.dataType}`,
    sub: a.dataType,
  }))

/* A template that is switched off, or that has never been written, is listed
   and labelled rather than hidden. Both are skipped when mail is sent, and an
   administrator who cannot see that picks one and then waits for a notification
   that was never going to arrive. */
export const emailTemplateOptions = () =>
  [...TEMPLATES]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((t) => {
      const empty = !String(t.body || '').trim()
      const notes = [t.enabled ? null : 'disabled', empty ? 'no content' : null].filter(Boolean)
      return {
        value: t.name,
        label: notes.length ? `${t.name} (${notes.join(', ')})` : t.name,
        sub: t.subject,
      }
    })

/* The stored value is the organisation id, because the id is what a scheduler
   matches a request against. Inactive organisations stay in the list, labelled:
   hiding one would make an existing selection vanish from the form. */
export const organizationOptions = () =>
  ORGANIZATIONS.map((o) => ({
    value: String(o.id),
    label: o.status === 'Active' ? o.name : `${o.name} (inactive)`,
    sub: o.status,
  }))

export const CONFIG_SOURCES = {
  provisionApplications: {
    options: provisionApplications,
    configured: () => APPLICATIONS.length > 0,
    emptyNotice: 'No provisioning applications are configured yet. Register one under Applications before this service can run.',
  },
  dateAttributes: {
    options: dateAttributeOptions,
    configured: () => dateAttributes().length > 0,
    emptyNotice: 'No attribute in the identity schema holds a date. Define one under Configurations → Attributes before this service can run.',
  },
  emailTemplates: {
    options: emailTemplateOptions,
    configured: () => TEMPLATES.length > 0,
    emptyNotice: 'No email templates exist yet. Write one under Email Management → Templates before this service can notify anyone.',
  },
  organizations: {
    options: organizationOptions,
    configured: () => ORGANIZATIONS.length > 0,
    emptyNotice: 'No organisations are defined yet.',
  },
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

export const STATUS_LABEL = (r) => (r.active_status ? 'Active' : 'Inactive')

export const lastResultLabel = (r) => {
  if (r.last_status) return r.last_status
  if (r.schedule_type === 'manual') return 'Manual'
  return 'Inactive'
}

/** A blank draft, bound to nothing until a service is chosen. */
export const blankScheduler = () => ({
  id: null,
  name: '',
  description: '',
  display_name: '',
  service_code: '',
  service_name: null,
  service_display_name: '',
  service_available: true,
  service_config: {},
  application_id: null,
  schedule_type: '',
  timezone: defaultTimezone(),
  start_time: null,
  interval_type: 'minutes',
  run_between: 15,
  frequency: 'daily',
  time_of_day: '09:00',
  days: [],
  dates: [],
  start_date: null,
  end_date: null,
  active_status: false,
  is_start: false,
  update_status: false,
  last_run_at: null,
  next_run_at: null,
  last_status: null,
  last_execution_id: null,
  delete_status: false,
  ...executionDefaults(''),
})

/**
 * Rebind a draft to a different service.
 *
 * The service's own defaults are re-applied whole — configuration and execution
 * policy both. Configuration is held per service code so a value typed against
 * Data Export is still there on returning to it, and is never read by a service
 * that merely happens to declare a key by the same name.
 */
export const bindService = (draft, code, configByService = {}) => {
  const svc = serviceFor(code)
  return {
    ...draft,
    ...executionDefaults(code),
    // The operator's own timezone choice survives a service change; nothing in
    // the catalogue has an opinion about it.
    timezone: draft.timezone || defaultTimezone(),
    service_code: code,
    service_name: svc?.legacyQueueName || null,
    service_display_name: svc?.displayName || '',
    service_available: !!svc,
    application_id: svc?.metadata?.requiresApplication ? draft.application_id : null,
    service_config: { ...defaultConfig(code), ...(configByService[code] || {}) },
  }
}

/** Everything that must be true before a record can be written. */
export function schedulerIssues(r) {
  const out = []
  if (!r.service_code) out.push('Select a service name.')
  const meta = serviceFor(r.service_code)?.metadata
  if (applicationRequired(r.service_code, r.service_config) && !r.application_id) {
    out.push(`Select a ${meta.applicationField.label.toLowerCase()}.`)
  }
  if (!String(r.name || '').trim()) out.push('A scheduler name is required.')
  if (!r.schedule_type) out.push('Select a schedule type.')
  if (r.notify_on_failure && !(r.notification_emails || []).length) out.push('Add at least one recipient for failure notifications.')
  return [...out, ...scheduleIssues(r)]
}

/** Derived fields the register reads, recomputed whenever a record changes. */
export const withDerived = (r) => {
  const svc = serviceFor(r.service_code)
  const next = nextRunAt(r)
  return {
    ...r,
    schedule_description: scheduleDescription(r),
    next_run_at: r.schedule_type === 'manual' ? null : (next == null ? null : stamp(next)),
    display_name: r.display_name || r.name,
    // A record can outlive the service it is bound to. Reading availability off
    // the catalogue means the register says so instead of rendering a service
    // name for something that will never run.
    service_available: !!svc,
    service_display_name: svc?.displayName || r.service_display_name || r.service_code || '',
  }
}
