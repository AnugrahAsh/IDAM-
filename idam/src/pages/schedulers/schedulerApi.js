/**
 * The four calls the module makes, and the data behind them.
 *
 *   services/get              the catalogue — schema, defaults, metadata
 *   scripts/get               the approved script registry
 *   schedulers/get            the register, searched and paged server-side
 *   service/job/progress/get  live progress for whatever is running
 *
 * They are synchronous here because the console runs on a fixed dataset, but
 * they are the module's only door to its data: a screen reads through these and
 * never reaches past them, so pointing the module at a live API is an edit to
 * this file alone.
 */

import { NOW_MS } from '../../lib/clock'
import { CATALOG, defaultConfig, serviceFor } from './serviceCatalog'
import { executionDefaults, nextRunAt, scheduleDescription, stamp } from './schedulerModel'

// ---------------------------------------------------------------------------
// GET /apis/api/v1/schedulers/services/get
// ---------------------------------------------------------------------------

export const getServices = () => ({
  services: CATALOG.map((s) => ({
    serviceCode: s.serviceCode,
    displayName: s.displayName,
    legacyQueueName: s.legacyQueueName,
  })),
  catalog: CATALOG,
})

// ---------------------------------------------------------------------------
// GET /apis/api/v1/schedulers/scripts/get
// ---------------------------------------------------------------------------

/**
 * The approved script registry.
 *
 * Scripts are registered by an operator on the server; this screen can only
 * choose between them. `configured: false` with an empty list is a real state —
 * a deployment that has never registered one — and the form treats it as
 * blocking rather than rendering an empty dropdown under a required field.
 */
export const SCRIPTS = [
  { id: 'NIGHTLY_ACCOUNT_SWEEP', name: 'Nightly account sweep', description: 'Reconciles stale connector accounts against the identity store.', timeoutSeconds: 3600, parameters: ['scope', 'dryRun'] },
  { id: 'PG_BASEBACKUP', name: 'PostgreSQL base backup', description: 'Runs pg_basebackup against the primary and verifies the archive.', timeoutSeconds: 7200, parameters: ['target', 'compression'] },
  { id: 'MYSQL_DUMP_ALL', name: 'MySQL full dump', description: 'mysqldump of every schema, streamed to the backup volume.', timeoutSeconds: 7200, parameters: ['target'] },
  { id: 'ENTITLEMENT_SNAPSHOT', name: 'Entitlement snapshot', description: 'Writes a point-in-time entitlement snapshot for attestation.', timeoutSeconds: 1800, parameters: ['campaign'] },
  { id: 'SESSION_PURGE', name: 'Expired session purge', description: 'Clears expired sessions and their refresh tokens.', timeoutSeconds: 600, parameters: [] },
]

export const getScripts = () => ({ scripts: SCRIPTS, configured: SCRIPTS.length > 0 })

export const scriptOptions = () => {
  const { scripts } = getScripts()
  return scripts.map((s) => ({ value: s.id, label: `${s.name} — ${s.id}` }))
}

export const scriptFor = (id) => SCRIPTS.find((s) => s.id === id) || null

export const REMOTE_SOURCES = {
  scripts: { options: scriptOptions, configured: () => getScripts().configured, emptyNotice: 'No approved scripts yet. Ask a server operator to register one before this service can run.' },
}

// ---------------------------------------------------------------------------
// GET /apis/api/v1/schedulers/get
// ---------------------------------------------------------------------------

const at = (daysAgo, hour, minute = 0) =>
  stamp(NOW_MS - daysAgo * 86400000 - (9 - hour) * 3600000 - (0 - minute) * 60000)

const iso = (v) => (v == null ? null : `${String(v).replace(' ', 'T')}:00.000Z`)

const record = (r) => {
  const full = {
    display_name: r.name,
    service_available: true,
    application_id: null,
    is_start: false,
    update_status: false,
    delete_status: false,
    deleted_on: null,
    deleted_by: null,
    created_by: 'a.mehta',
    last_modified_by: 'a.mehta',
    created_on: at(120, 11, 20),
    last_modified_on: at(9, 16, 5),
    last_execution_id: null,
    days: [],
    dates: [],
    start_time: null,
    start_date: null,
    end_date: null,
    interval_type: 'minutes',
    run_between: 15,
    frequency: 'daily',
    time_of_day: '09:00',
    ...executionDefaults(r.service_code),
    ...r,
    /* Read from the catalogue rather than repeated on every seed row: a display
       name typed out twelve times is a display name that disagrees with itself
       on the thirteenth. */
    service_name: r.service_name ?? serviceFor(r.service_code)?.legacyQueueName ?? null,
    service_display_name: serviceFor(r.service_code)?.displayName || r.service_code,
    service_config: { ...defaultConfig(r.service_code), ...(r.service_config || {}) },
  }
  const next = nextRunAt(full)
  return {
    ...full,
    schedule_description: scheduleDescription(full),
    next_run_at: full.schedule_type === 'manual' ? null : (next == null ? null : stamp(next)),
  }
}

const SEED = [
  record({
    id: 41,
    name: 'Nightly Active Directory reconciliation',
    description: 'Reconciles the corporate directory against IDAM before the working day starts.',
    service_code: 'RECONCILIATION',
    service_name: 'reconcileQueue',
    service_display_name: 'Reconciliation',
    application_id: 1,
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '02:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(120, 0)),
    active_status: true,
    last_run_at: at(0, 2),
    last_status: 'Succeeded',
    last_execution_id: 'exec-41-1184',
    timeout_ms: 7200000,
    service_config: { skipIfRunning: true },
  }),
  record({
    id: 42,
    name: 'Workday joiner activation',
    description: 'Activates identities on their joining date and syncs the Access Manager.',
    service_code: 'USER_PROVISIONING_DATE_PROCESSOR',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '06:30',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(200, 0)),
    active_status: true,
    last_run_at: at(0, 6, 30),
    last_status: 'Succeeded',
    last_execution_id: 'exec-42-2210',
    service_config: { joiningDateAttribute: 'doj', graceDays: 7, includeFutureSameDay: true, syncAccessManager: true, maxUsersPerRun: 5000 },
  }),
  record({
    id: 43,
    name: 'Leaver deactivation',
    description: 'Deactivates identities whose date of release has passed and terminates their sessions.',
    service_code: 'USER_DEPROVISIONING_DATE_PROCESSOR',
    service_name: 'deactivateUsersQueue',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '23:30',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(200, 0)),
    active_status: true,
    last_run_at: at(1, 23, 30),
    last_status: 'Succeeded',
    last_execution_id: 'exec-43-2209',
    service_config: { endDateAttribute: 'dor', graceDays: 7, includeSameDay: true, terminateSessions: true, reportOutstandingAccess: true },
  }),
  record({
    id: 44,
    name: 'Workday trust synchronisation',
    description: 'Reads the HR system of record every four hours and applies joiners, movers and leavers.',
    service_code: 'TRUST_RECONCILIATION',
    service_name: 'trustReconciliationSchedularQueue',
    application_id: 1,
    schedule_type: 'periodic',
    interval_type: 'hours',
    run_between: 4,
    timezone: 'Asia/Kolkata',
    start_date: iso(at(60, 0)),
    active_status: true,
    last_run_at: at(0, 8),
    last_status: 'Running',
    is_start: true,
    last_execution_id: 'exec-44-4471',
    service_config: { skipIfRunning: true },
  }),
  record({
    id: 45,
    name: 'Dormant account sweep',
    description: 'Flags accounts inactive for 90 days, warns them, and deactivates once the warning window closes.',
    service_code: 'DORMANT_ACCOUNT_DETECTION',
    schedule_type: 'recurring',
    frequency: 'weekly',
    days: ['MONDAY'],
    time_of_day: '03:15',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(90, 0)),
    active_status: true,
    last_run_at: at(3, 3, 15),
    last_status: 'Succeeded',
    last_execution_id: 'exec-45-0092',
    service_config: {
      lastActivityAttribute: 'last_login', dormancyDays: 90, treatNeverLoggedInAsDormant: true,
      notifyDormantUsers: true, warningTemplate: 'dormant-warning', warningDaysBefore: 14,
      deactivationEnabled: true, syncAccessManager: true, dryRun: false,
      neverDeactivateUsernames: ['svc_backup', 'breakglass.admin'],
    },
  }),
  record({
    id: 46,
    name: 'Monthly access review extract',
    description: 'Builds the user / role mapping report the access review campaign is seeded from.',
    service_code: 'REPORT_GENERATION',
    schedule_type: 'recurring',
    frequency: 'monthly',
    dates: ['1', '15'],
    time_of_day: '05:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(150, 0)),
    active_status: true,
    last_run_at: at(5, 5),
    last_status: 'Succeeded',
    last_execution_id: 'exec-46-0311',
    service_config: {
      reportType: 'USER_ROLE_MAPPING', dateRangeMode: 'RELATIVE', lastNDays: 30, format: 'xlsx',
      subdirectory: 'attestation', fileRetentionDays: 365,
      notificationEnabled: true, notificationRecipients: ['grc_team'], notificationTemplate: 'report-ready',
    },
  }),
  record({
    id: 47,
    name: 'Audit history export',
    description: 'Streams the previous day of audit history to the SIEM landing folder.',
    service_code: 'DATA_EXPORT',
    schedule_type: 'periodic',
    interval_type: 'hours',
    run_between: 6,
    timezone: 'UTC',
    start_date: iso(at(45, 0)),
    active_status: true,
    last_run_at: at(0, 6),
    last_status: 'Succeeded',
    last_execution_id: 'exec-47-8820',
    service_config: {
      dataset: 'AUDIT_LOGS', lastNDays: 1, format: 'jsonl', subdirectory: 'siem',
      maskSensitiveFields: true, fileRetentionDays: 7, maxRecords: 5000000,
    },
  }),
  record({
    id: 48,
    name: 'Nightly database backup',
    description: 'Triggers the deployment’s own PostgreSQL backup and waits for a clean exit code.',
    service_code: 'DATABASE_BACKUP',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '01:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(210, 0)),
    active_status: true,
    last_run_at: at(0, 1),
    last_status: 'Failed',
    last_execution_id: 'exec-48-5560',
    service_config: {
      triggerMode: 'APPROVED_COMMAND', scriptId: 'PG_BASEBACKUP', scriptParameters: ['target=/backup/nightly'],
      engine: 'POSTGRESQL', backupType: 'FULL', retentionDays: 30, timeoutSeconds: 7200, verifyExitCode: true,
    },
  }),
  record({
    id: 49,
    name: 'Execution history cleanup',
    description: 'Archives scheduler history older than 90 days and then removes it in batches.',
    service_code: 'SCHEDULER_LOG_CLEANUP',
    schedule_type: 'recurring',
    frequency: 'weekly',
    days: ['SATURDAY'],
    time_of_day: '04:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(80, 0)),
    active_status: true,
    last_run_at: at(6, 4),
    last_status: 'Succeeded',
    last_execution_id: 'exec-49-0044',
    service_config: {
      retentionValue: 90, retentionUnit: 'days', mode: 'ARCHIVE_AND_DELETE',
      targets: ['SCHEDULER_EXECUTIONS', 'SCHEDULER_EXECUTION_LOGS'],
      batchSize: 2000, interBatchSleepMs: 200, maxRuntimeSeconds: 3600,
    },
  }),
  record({
    id: 50,
    name: 'Licence check',
    description: 'Verifies the licence signature and seat usage, and warns thirty days before expiry.',
    service_code: 'LICENSE_VALIDATION',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '07:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(300, 0)),
    active_status: true,
    last_run_at: at(0, 7),
    last_status: 'Succeeded',
    last_execution_id: 'exec-50-9901',
    service_config: {
      expiryWarningDays: 30, seatWarningPercent: 85, verifySignature: true, verifyFingerprint: false,
      notificationEnabled: true, notificationRecipients: ['itops'], notificationTemplate: 'licence-findings',
    },
  }),
  record({
    id: 51,
    name: 'Quarter-end entitlement snapshot',
    description: 'One-off snapshot taken for the Q3 access review pack.',
    service_code: 'CUSTOM_SCRIPT',
    schedule_type: 'one-time',
    start_time: iso(at(-25, 21)),
    timezone: 'Asia/Kolkata',
    active_status: true,
    last_run_at: null,
    last_status: null,
    service_config: {
      scriptId: 'ENTITLEMENT_SNAPSHOT', parameters: ['campaign=Q3-2026'],
      timeoutSeconds: 1800, treatNonZeroExitAsFailure: true, captureOutput: true,
    },
  }),
  record({
    id: 52,
    name: 'Salesforce reconciliation (on demand)',
    description: 'Held for incident use. Dispatched by an operator rather than on a schedule.',
    service_code: 'RECONCILIATION',
    service_name: 'reconcileQueue',
    application_id: 3,
    schedule_type: 'manual',
    timezone: 'Asia/Kolkata',
    active_status: false,
    last_run_at: at(14, 15, 40),
    last_status: 'Stopped',
    last_execution_id: 'exec-52-0007',
    service_config: { skipIfRunning: true },
  }),
]

/**
 * The register, searched and paged the way the server does it.
 *
 * Search matches the scheduler name and the service display name, which is what
 * makes "Reconciliation" return every scheduler bound to that service rather
 * than only the ones with the word in their own name.
 */
export const getSchedulers = (rows, { search = '', page = 1, limit = 10 } = {}) => {
  const needle = search.trim().toLowerCase()
  const matched = needle
    ? rows.filter((r) => `${r.name} ${r.service_display_name} ${r.description || ''}`.toLowerCase().includes(needle))
    : rows
  const start = (page - 1) * limit
  return { records: matched.slice(start, start + limit), totalCount: matched.length, page, limit }
}

export const seedSchedulers = () => SEED.map((r) => ({ ...r }))

// ---------------------------------------------------------------------------
// GET /apis/api/v1/schedulers/service/job/progress/get
// ---------------------------------------------------------------------------

/** Progress for whatever is in flight, keyed by scheduler id. */
export const getJobProgress = (rows) =>
  Object.fromEntries(
    rows.filter((r) => r.is_start).map((r) => {
      const seed = (Number(r.id) * 37) % 100
      return [r.id, { percent: Math.max(4, seed), phase: seed > 60 ? 'Applying changes' : 'Reading records' }]
    }),
  )

// ---------------------------------------------------------------------------
// Execution history
// ---------------------------------------------------------------------------

/**
 * Executions of a scheduler.
 *
 * Derived rather than stored, so every scheduler has a history that is
 * self-consistent with its own cadence, timeout and retry policy instead of a
 * shared fixture that contradicts them. The most recent run agrees with the
 * record's own `last_status` and `last_run_at`, which is the one place the
 * register and this screen could otherwise disagree.
 */
const CADENCE_MS = (r) => {
  if (r.schedule_type === 'periodic') {
    const unit = { minutes: 60000, hours: 3600000, days: 86400000 }[r.interval_type] || 3600000
    return Math.max(1, Number(r.run_between) || 1) * unit
  }
  if (r.schedule_type === 'recurring') {
    if (r.frequency === 'weekly') return 7 * 86400000 / Math.max(1, (r.days || []).length)
    if (r.frequency === 'monthly') return 30 * 86400000 / Math.max(1, (r.dates || []).length)
    return 86400000
  }
  return 86400000
}

const OUTCOMES = ['Succeeded', 'Succeeded', 'Succeeded', 'Succeeded', 'Partial', 'Succeeded', 'Failed']

export const executionsFor = (rows, count = 8) => {
  const out = []
  rows.forEach((r) => {
    const base = parseStampMs(r.last_run_at) ?? NOW_MS
    const step = CADENCE_MS(r)
    for (let k = 0; k < count; k += 1) {
      const seed = (Number(r.id) * 7 + k * 13) % OUTCOMES.length
      const status = k === 0 && r.last_status ? r.last_status : OUTCOMES[seed]
      const started = base - k * step
      const running = status === 'Running'
      const durationMs = running
        ? NOW_MS - started
        : Math.max(2000, Math.round((r.timeout_ms || 900000) * (0.04 + ((Number(r.id) * 3 + k * 5) % 17) / 100)))
      const processed = 40 + ((Number(r.id) * 31 + k * 97) % 960)
      /* Only a failed run loses the whole batch. A stopped one is checkpointed
         and a running one has not lost anything yet, so quoting every record as
         failed on either of those reads as a far worse incident than it is. */
      const failed = status === 'Failed' ? processed : status === 'Partial' ? 1 + (k % 9) : 0
      out.push({
        id: r.last_execution_id && k === 0 ? r.last_execution_id : `exec-${r.id}-${1000 + (Number(r.id) * 17 + k * 41) % 9000}`,
        scheduler_id: r.id,
        scheduler_name: r.name,
        service_code: r.service_code,
        service_display_name: r.service_display_name,
        trigger: r.schedule_type === 'manual' || k === 3 ? 'Manual' : 'Scheduled',
        status,
        started_at: stamp(started),
        finished_at: running ? null : stamp(started + durationMs),
        duration_ms: durationMs,
        attempt: status === 'Failed' && r.retry_enabled ? r.max_attempts : 1,
        records_processed: processed,
        records_failed: failed,
        timezone: r.timezone,
      })
    }
  })
  return out.sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
}

function parseStampMs(v) {
  if (v == null || v === '') return null
  const t = Date.parse(`${String(v).replace(' ', 'T').slice(0, 19)}Z`)
  return Number.isNaN(t) ? null : t
}

/** Per-item rows, for services that declare `producesItemLogs`. */
export const itemLogsFor = (execution, service) => {
  if (!service?.metadata?.producesItemLogs) return []
  const n = Math.min(12, Math.max(3, execution.records_processed % 13))
  return Array.from({ length: n }, (_, i) => {
    const bad = execution.records_failed > 0 && i % 4 === 1
    return {
      id: `${execution.id}-${i}`,
      subject: `${service.serviceCode === 'DATA_EXPORT' ? 'row' : 'user'}-${1000 + (i * 37) % 8000}`,
      outcome: bad ? 'Failed' : 'Applied',
      detail: bad
        ? 'Target rejected the change — attribute is read-only on the connector.'
        : 'Change applied and acknowledged by the target.',
    }
  })
}

/** Worker output for one execution. */
export const workerLines = (execution, service) => {
  const at = execution.started_at
  const lines = [
    { tone: 'lg-dim', text: `${at}  execution=${execution.id} service=${execution.service_code} starting` },
    { tone: 'lg-dim', text: `${at}  configuration loaded · timezone=${execution.timezone} trigger=${execution.trigger.toLowerCase()}` },
    { tone: 'lg-ok', text: `${at}  connected to the platform queue` },
    { tone: 'lg-dim', text: `${at}  claimed ${execution.records_processed} records` },
  ]
  if (execution.status === 'Failed') {
    lines.push(
      { tone: 'lg-warn', text: `${at}  attempt ${Math.max(1, execution.attempt - 1)}/${execution.attempt} failed — upstream timeout` },
      { tone: 'lg-bad', text: `${at}  retry budget exhausted — aborting` },
      { tone: 'lg-bad', text: `${at}  execution finished with status FAILED` },
    )
  } else if (execution.status === 'Partial') {
    lines.push(
      { tone: 'lg-warn', text: `${at}  ${execution.records_failed} records rejected by the target` },
      { tone: 'lg-dim', text: `${at}  continue_on_error is on — remaining records applied` },
      { tone: 'lg-warn', text: `${at}  execution finished with status PARTIAL` },
    )
  } else if (execution.status === 'Running') {
    lines.push({ tone: 'lg-dim', text: `${at}  in flight — ${service?.displayName || execution.service_code} still reading records` })
  } else if (execution.status === 'Stopped') {
    lines.push(
      { tone: 'lg-warn', text: `${at}  stop requested by an operator — finishing the record in flight` },
      { tone: 'lg-warn', text: `${at}  execution finished with status STOPPED` },
    )
  } else {
    lines.push(
      { tone: 'lg-dim', text: `${at}  ${execution.records_processed} records applied, 0 errors` },
      { tone: 'lg-ok', text: `${at}  execution finished with status SUCCEEDED` },
    )
  }
  return lines
}
