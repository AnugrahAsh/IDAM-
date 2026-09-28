/**
 * The calls the module makes, and the data behind them.
 *
 *   services/get              the catalogue — schema, defaults, metadata
 *   scripts/get               the approved script registry
 *   schedulers/get            the register, searched and paged server-side
 *   service/job/progress/get  live progress for whatever is running
 *   logs/get                  the runs of one service, newest first
 *   service/logs/get          the per-item results of one run
 *
 * They are synchronous here because the console runs on a fixed dataset, but
 * they are the module's only door to its data: a screen reads through these and
 * never reaches past them, so pointing the module at a live API is an edit to
 * this file alone. The last two answer in the envelope the server uses —
 * totalCount, page, limit, display_timezone, totalResults — so a screen written
 * against them is already written against the real response.
 */

import { NOW_MS } from '../../lib/clock'
import { CATALOG, defaultConfig, serviceFor } from './serviceCatalog'
import { MODELLED_SERVICES, resultRowsFor } from './resultLogs'
import { executionDefaults, nextRunAt, scheduleDescription, stamp } from './schedulerModel'

/**
 * The zone every scheduler timestamp is reported in.
 *
 * The response carries it — a deployment reports in the zone its operators
 * work in, not in the zone each scheduler happens to be evaluated in — and the
 * screens convert into it exactly once. See `schedulerTime` in schedulerModel.
 */
export const DISPLAY_TIMEZONE = 'Asia/Kolkata'

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
    /* Only the per-item logs are cleaned. The execution rows are small and are
       what every run history is read from; the per-item rows underneath them
       are the bulk, and dropping those at 90 days keeps a year of history
       legible at a fraction of the size. It is also why a run older than that
       has a summary but no results — see `getServiceLogs`. */
    service_config: {
      retentionValue: 90, retentionUnit: 'days', mode: 'ARCHIVE_AND_DELETE',
      targets: ['SCHEDULER_EXECUTION_LOGS'],
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

  /* -------------------------------------------------------------------------
     The four add-on services.

     They are seeded because their result screens are the work: without a
     scheduler bound to each, the run history for Approval Escalation, Approval
     Reminder, Audit Log Cleanup and Recertification Campaign opens on an empty
     register and none of the four column sets is reachable.

     Escalation and cleanup carry two schedulers each, which is how a deployment
     that takes either seriously actually runs them: one doing the work, one
     rehearsing. The rehearsal is where the dry-run banner is read.

     The deployment has no approval-specific email template yet, so the
     notification fields point at the closest one written — the same thing an
     administrator does on the day, and the reason A3 lists what a template is
     rather than letting one be typed.
     --------------------------------------------------------------------- */

  record({
    id: 53,
    name: 'Approval escalation sweep',
    description: 'Moves approvals that have sat three days with the same approver up the escalation path.',
    service_code: 'APPROVAL_ESCALATION',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '07:30',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(45, 0)),
    active_status: true,
    last_run_at: at(0, 7, 30),
    last_execution_id: 'exec-53-0141',
    service_config: {
      escalationPath: ['NEXT_LEVEL', 'MANAGER', 'ORG_CERTIFIER', 'ADMINISTRATOR'],
      fallbackAdministrators: ['security_team', 'it_ops'],
      skipWhenApproverActive: true,
      notifyNewApprover: true, newApproverTemplate: 'Recertification reminder',
      notifyPreviousApprover: false,
      dryRun: false,
    },
  }),
  record({
    id: 54,
    name: 'Emergency access escalation (rehearsal)',
    description: 'Added for emergency access requests and still in dry run while the path is settled.',
    service_code: 'APPROVAL_ESCALATION',
    schedule_type: 'periodic',
    interval_type: 'hours',
    run_between: 12,
    timezone: 'Asia/Kolkata',
    start_date: iso(at(12, 0)),
    active_status: true,
    last_run_at: at(0, 6),
    last_execution_id: 'exec-54-0022',
    service_config: {
      pendingHours: 24,
      /* No administrator fallback, on purpose: this is the path being settled,
         and a request nobody above the manager can take is exactly what the
         rehearsal is meant to surface before the service is switched on. */
      escalationPath: ['NEXT_LEVEL', 'MANAGER'],
      notifyNewApprover: false,
      maxRequestsPerRun: 40,
      dryRun: true,
    },
  }),
  record({
    id: 55,
    name: 'Pending approval reminders',
    description: 'Chases approvers daily about the requests still waiting on them.',
    service_code: 'APPROVAL_REMINDER',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '09:30',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(70, 0)),
    active_status: true,
    last_run_at: at(0, 9, 30),
    last_execution_id: 'exec-55-0318',
    service_config: {
      approverTemplate: 'Recertification reminder',
      notifyRequester: true, requesterTemplate: 'Recertification reminder',
      notifyAdminsWhenNoApprover: true,
      fallbackAdministrators: ['security_team'],
      maxReminders: 3,
      dryRun: false,
    },
  }),
  record({
    id: 56,
    name: 'Audit retention enforcement',
    description: 'Applies the configured retention policies, archiving before anything is removed.',
    service_code: 'AUDIT_LOG_CLEANUP',
    schedule_type: 'recurring',
    frequency: 'weekly',
    days: ['SUNDAY'],
    time_of_day: '02:30',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(110, 0)),
    active_status: true,
    last_run_at: at(2, 2, 30),
    last_execution_id: 'exec-56-0071',
    service_config: {
      policyScope: 'AUTOMATIC',
      excludedLogTypes: ['SIGNIN_FAILURE'],
      skipComplianceLocked: false,
      mode: 'APPLY',
      /* Above the number of log types this deployment captures, so one run
         covers the whole register rather than leaving the tail of it to the
         next one and reporting a different set of policies every week. */
      maxPoliciesPerRun: 50,
      continueOnPolicyFailure: true,
    },
  }),
  record({
    id: 57,
    name: 'Retention preview',
    description: 'Reports what the retention policies would remove, without removing anything.',
    service_code: 'AUDIT_LOG_CLEANUP',
    schedule_type: 'recurring',
    frequency: 'weekly',
    days: ['THURSDAY'],
    time_of_day: '06:00',
    timezone: 'Asia/Kolkata',
    start_date: iso(at(110, 0)),
    active_status: true,
    last_run_at: at(5, 6),
    last_execution_id: 'exec-57-0064',
    service_config: {
      policyScope: 'AUTOMATIC',
      mode: 'DRY_RUN',
      maxPoliciesPerRun: 20,
    },
  }),
  record({
    id: 58,
    name: 'Quarterly access review opener',
    description: 'Opens the quarter’s recertification campaign on the first run inside the period.',
    service_code: 'RECERTIFICATION_CAMPAIGN',
    schedule_type: 'recurring',
    frequency: 'weekly',
    days: ['WEDNESDAY'],
    time_of_day: '04:00',
    timezone: 'Asia/Kolkata',
    /* Weekly, for a quarterly campaign. The cadence is deliberate: the
       scheduler runs often so that a quarter is never missed, and the duplicate
       check is what stops it opening a second campaign on every run after the
       first. That is the outcome the result screen spends most of its rows on. */
    start_date: iso(at(51, 0)),
    active_status: true,
    last_run_at: at(0, 4),
    last_execution_id: 'exec-58-0009',
    service_config: {
      campaignName: 'Quarterly review',
      campaignPeriod: 'QUARTERLY',
      population: 'ALL_USERS',
      auditor: 'grc_team',
      reviewLevels: ['user', 'manager', 'auditor'],
      duplicateCheck: 'PERIOD',
      countClosedCampaigns: true,
      dryRun: false,
    },
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

/**
 * The register.
 *
 * A scheduler whose runs are modelled row by row takes its last result from its
 * own most recent run rather than from a value seeded beside it. The two used to
 * be written out independently, which is the one place the register and the run
 * history could contradict each other — a row reporting "Succeeded" over a run
 * whose results are half failures.
 */
export const seedSchedulers = () => SEED.map((r) => {
  const row = { ...r }
  if (MODELLED_SERVICES.has(row.service_code)) {
    const latest = executionsFor([row], 1)[0]
    if (latest) row.last_status = latest.status
  }
  return row
})

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

/* A run's status, read off what its rows actually say. Every row succeeded is a
   clean run; some did not is a partial one; none did is a failure. */
const statusOfRows = (items) => {
  const failed = items.filter((i) => i.success === false).length
  if (!items.length || failed === 0) return 'Succeeded'
  return failed === items.length ? 'Failed' : 'Partial'
}

export const executionsFor = (rows, count = 8) => {
  const out = []
  rows.forEach((r) => {
    const base = parseStampMs(r.last_run_at) ?? NOW_MS
    const step = CADENCE_MS(r)
    /* A scheduler has no history from before it existed. Without this the
       register invented eight runs for a scheduler registered last week, and a
       monthly one claimed runs from before the deployment. */
    const from = parseStampMs(r.start_date)
    const modelled = MODELLED_SERVICES.has(r.service_code)
    const service = serviceFor(r.service_code)
    for (let k = 0; k < count; k += 1) {
      const started = base - k * step
      if (from != null && started < from) break
      const seed = (Number(r.id) * 7 + k * 13) % OUTCOMES.length
      let status = k === 0 && r.last_status ? r.last_status : OUTCOMES[seed]
      const running = status === 'Running'
      const durationMs = running
        ? NOW_MS - started
        : Math.max(2000, Math.round((r.timeout_ms || 900000) * (0.04 + ((Number(r.id) * 3 + k * 5) % 17) / 100)))
      let processed = 40 + ((Number(r.id) * 31 + k * 97) % 960)
      /* Only a failed run loses the whole batch. A stopped one is checkpointed
         and a running one has not lost anything yet, so quoting every record as
         failed on either of those reads as a far worse incident than it is. */
      let failed = status === 'Failed' ? processed : status === 'Partial' ? 1 + (k % 9) : 0
      const execution = {
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
        /* What the run needs to be read with: the cadence it sits on, the
           configuration it executed under, and whether that configuration made
           it a rehearsal. A run records the mode it ran in — changing the
           scheduler afterwards does not rewrite what it did. */
        cadence_ms: step,
        config: r.service_config || {},
        dry_run: (r.service_config || {}).mode === 'DRY_RUN' || !!(r.service_config || {}).dryRun,
      }
      if (modelled) {
        const items = resultRowsFor(execution, service, r)
        processed = items.length
        failed = items.filter((i) => i.success === false).length
        /* A run still in flight keeps its own status: nothing has finished, so
           what its rows say so far is not a verdict on it. */
        status = running ? status : statusOfRows(items)
        Object.assign(execution, { records_processed: processed, records_failed: failed, status })
      }
      out.push(execution)
    }
  })
  return out.sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
}

function parseStampMs(v) {
  if (v == null || v === '') return null
  const t = Date.parse(`${String(v).replace(' ', 'T').slice(0, 19)}Z`)
  return Number.isNaN(t) ? null : t
}

// ---------------------------------------------------------------------------
// POST /apis/api/v1/schedulers/logs/get
// ---------------------------------------------------------------------------

/**
 * The runs of one service, or of one scheduler on it.
 *
 * The envelope is the server's — `display_timezone` included, because the
 * screen converts into it and must not guess. A caller that wants every run
 * asks for a limit larger than the history; the server never answers unbounded.
 */
export const getSchedulerLogs = (rows, { service, schedulerId, page = 1, limit = 200, search = '' } = {}) => {
  const scoped = schedulerId != null
    ? rows.filter((r) => String(r.id) === String(schedulerId))
    : rows.filter((r) => r.service_code === service)
  const runs = executionsFor(scoped)
  const needle = String(search || '').trim().toLowerCase()
  const matched = needle
    ? runs.filter((e) => `${e.id} ${e.scheduler_name} ${e.status} ${e.trigger}`.toLowerCase().includes(needle))
    : runs
  const start = (page - 1) * limit
  return {
    ok: true,
    status: 200,
    totalCount: matched.length,
    page,
    limit,
    display_timezone: DISPLAY_TIMEZONE,
    totalResults: matched.slice(start, start + limit),
  }
}

// ---------------------------------------------------------------------------
// POST /apis/api/v1/schedulers/service/logs/get
// ---------------------------------------------------------------------------

/**
 * How long a run's per-item results survive.
 *
 * Read off the Scheduler Log Cleanup scheduler rather than written down here:
 * that service is what removes them, and a number repeated in two places is a
 * number that will disagree with itself the first time one of them is changed.
 * A run older than this has a summary and no results, which is a refusal with a
 * reason rather than an empty table.
 */
const ITEM_LOG_RETENTION = (() => {
  const cleaner = SEED.find((r) => r.service_code === 'SCHEDULER_LOG_CLEANUP')
  const config = cleaner?.service_config || {}
  if (!cleaner?.active_status || !(config.targets || []).includes('SCHEDULER_EXECUTION_LOGS')) {
    return { days: null, ms: Infinity }
  }
  const unit = { days: 1, weeks: 7, months: 30 }[config.retentionUnit] || 1
  const days = (Number(config.retentionValue) || 90) * unit
  return { days, ms: days * 86400000 }
})()

/**
 * The per-item results of one run.
 *
 * A real server is handed `jobId` and looks the rest up; here the caller passes
 * the run and the scheduler it belongs to, because the configuration a run
 * executed under is what decides what its rows say. `allowed` is the answer to
 * the permission the server checks before it reads the log at all — a refusal
 * is a response, not an absence, and the screen renders it as one.
 */
export const getServiceLogs = ({
  execution, scheduler, service, page = 1, limit = 500, search = '', onlyFailures = false, allowed = true,
} = {}) => {
  const envelope = {
    ok: false, status: 200, message: null,
    totalCount: 0, page, limit, display_timezone: DISPLAY_TIMEZONE, totalResults: [],
  }

  if (!allowed) {
    return {
      ...envelope,
      status: 403,
      message: 'Forbidden: reading the per-item results of a scheduler run requires the View Scheduler service logs permission, which is not granted to your role.',
    }
  }

  if (!execution) {
    return { ...envelope, status: 404, message: 'No run was found for that execution id.' }
  }

  const age = NOW_MS - (parseStampMs(execution.started_at) ?? NOW_MS)
  if (age > ITEM_LOG_RETENTION.ms) {
    return {
      ...envelope,
      status: 410,
      message: `The per-item results of this run are no longer retained: the Scheduler Log Cleanup service keeps them for ${ITEM_LOG_RETENTION.days} days and this run is older than that. The run summary above is kept.`,
    }
  }

  const rows = resultRowsFor(execution, service, scheduler)
  const needle = String(search || '').trim().toLowerCase()
  const matched = rows
    .filter((r) => (onlyFailures ? r.success === false : true))
    .filter((r) => (needle ? `${r.entity_ref} ${r.operation_type} ${r.message}`.toLowerCase().includes(needle) : true))
  const start = (page - 1) * limit

  return {
    ...envelope,
    ok: true,
    totalCount: matched.length,
    totalResults: matched.slice(start, start + limit),
  }
}

// ---------------------------------------------------------------------------
// Service permissions
// ---------------------------------------------------------------------------

/**
 * The permission each add-on service needs on top of the scheduler ones.
 *
 * The server enforces these and answers 403 when they are missing; this is the
 * console's stand-in for that answer. A role reaches one of them by holding
 * "Start or stop" on Schedulers *and* being able to see the register the
 * service acts on — there is no point granting somebody the right to escalate
 * approvals they cannot read.
 *
 * The control it gates stays on screen and goes disabled. Hiding it tells a
 * reader nothing; disabling it tells them the capability exists and that they
 * are not the one who holds it.
 */
export const SERVICE_PERMISSIONS = {
  APPROVAL_ESCALATION: { permission: 'run_approval_escalation', module: 'Approval', anyOf: ['View Approvals List', 'View Approval Details'] },
  APPROVAL_REMINDER: { permission: 'run_approval_reminders', module: 'Approval', anyOf: ['View Approvals List', 'View Approval Details'] },
  AUDIT_LOG_CLEANUP: { permission: 'run_audit_log_cleanup', module: 'Security Events', anyOf: ['View System Logs'] },
  RECERTIFICATION_CAMPAIGN: { permission: 'run_recertification_campaigns', module: 'Recertification', anyOf: ['Add Campaign', 'Modify Campaign'] },
}

export const checkServicePermission = (serviceCode, can) => {
  const rule = SERVICE_PERMISSIONS[serviceCode]
  if (!rule) return { required: false, granted: true, status: 200, message: null, permission: null }
  const granted = !!can && can('Schedulers', 'Start or stop') && can(rule.module, rule.anyOf)
  return {
    required: true,
    permission: rule.permission,
    granted,
    status: granted ? 200 : 403,
    message: granted
      ? null
      : `Forbidden: this service requires the ${rule.permission} permission, which is not granted to your role.`,
  }
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
  /* A rehearsal says so in its own output too. The banner above the results is
     the loud statement; a log that then reads "records applied" quietly
     contradicts it, and the log is what gets pasted into a ticket. */
  if (execution.dry_run) {
    lines.splice(2, 0, { tone: 'lg-warn', text: `${at}  dry run — nothing will be written` })
  }
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
      { tone: 'lg-dim', text: `${at}  ${execution.records_processed} records ${execution.dry_run ? 'evaluated' : 'applied'}, 0 errors` },
      { tone: 'lg-ok', text: `${at}  execution finished with status SUCCEEDED` },
    )
  }
  return lines
}
