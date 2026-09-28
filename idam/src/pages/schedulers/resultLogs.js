/**
 * The per-item results of one run, in the shape the server returns them.
 *
 * `POST /schedulers/service/logs/get` answers with rows carrying seven fields —
 * entity_type, entity_ref, operation_type, success, message, details and
 * created_at — and that shape is what every result screen reads. Nothing here
 * renders: the vocabulary each `operation_type` is shown with lives in
 * runResults.js, and the screens read both through schedulerApi.
 *
 * The rows are derived from the registers this console already owns — the
 * approval queue, the capture register behind Security Events, the
 * recertification campaigns — rather than written out as fixtures. A run of the
 * Approval Escalation service reports on the same requests the Approvals screen
 * lists, so following a row through to the request it names lands on something
 * that exists and agrees with what the row said about it.
 *
 * Determinism matters more than variety. Every choice below is a function of
 * the execution id and the record id, so a run opened twice reports the same
 * thing twice, and the run summary above the table adds up to the rows beneath
 * it because both are counted from the same list.
 */

import { CAMPAIGNS, REQUESTS, USERS } from '../../data/seed'
import { APPROVERS_L2, APPROVERS_L3, withAudit } from '../accessRequests/data'
import { captureRows } from '../securityEvents/loggingData'
import { parseStamp, stamp } from './schedulerModel'

const DAY = 86400000

/* FNV-1a. A seed needs a spread that does not correlate with the id's shape —
   `id % n` over `exec-53-1004`, `exec-53-1045`, `exec-53-1086` walks the
   outcome list in step and every run comes out looking the same. */
const hash = (v) => {
  const s = String(v)
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const daysBefore = (value, ms) => {
  const t = parseStamp(value)
  return t == null ? null : Math.floor((ms - t) / DAY)
}

const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10)

/* The period a campaign covers, in the form its name carries. The scheduler
   form builds the same token under Campaign Name; the catalogue keeps that
   helper private, so this is the second copy and the two have to agree. */
const periodToken = (period, ms) => {
  const d = new Date(ms)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  if (period === 'MONTHLY') return `${year}-${String(month + 1).padStart(2, '0')}`
  if (period === 'HALF_YEARLY') return `${year}-H${month < 6 ? 1 : 2}`
  if (period === 'ANNUAL') return `${year}`
  return `${year}-Q${Math.floor(month / 3) + 1}`
}

/* Rows are stamped across the run rather than all at its start: `created_at` is
   when the worker reached that record, and a column of identical timestamps
   tells a reader nothing about where a run slowed down. */
const spread = (execution, index, total) => {
  const startMs = parseStamp(execution.started_at) ?? 0
  const span = Math.max(0, (execution.duration_ms || 0) - 1000)
  return stamp(startMs + Math.round((span * index) / Math.max(1, total)))
}

// ---------------------------------------------------------------------------
// Approval requests — Approval Escalation and Approval Reminder
// ---------------------------------------------------------------------------

/* The approval queue as the register holds it, not as this session has edited
   it: a run that happened last Tuesday reported on the requests as they were,
   and a decision taken on the Approvals screen this afternoon cannot change
   what it said. */
const OPEN_REQUESTS = REQUESTS.map(withAudit).filter((r) => r.status === 'Pending' || r.status === 'Escalated')

const userOf = (id) => USERS.find((u) => u.id === id) || null

const pickFrom = (list, seed, count = 1) =>
  Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(seed + i * 3) % list.length])

/**
 * The requests one run had to consider.
 *
 * A request is due when it has been waiting longer than the service's own
 * threshold *at the moment the run started* — which is why an older run returns
 * a shorter list than today's, and why the oldest run of a young scheduler
 * returns none at all. That empty run is worth keeping: it is the case the
 * empty state exists for.
 */
const dueRequests = (execution, hours, limit) => {
  const startMs = parseStamp(execution.started_at) ?? 0
  const minDays = Math.max(0, Math.floor(hours / 24))
  return OPEN_REQUESTS
    .map((r) => ({ request: r, waitingDays: daysBefore(r.raised, startMs) }))
    .filter((x) => x.waitingDays != null && x.waitingDays >= minDays)
    .sort((a, b) => b.waitingDays - a.waitingDays)
    .slice(0, Math.max(1, limit))
}

/* Which rule in the configured path produces an approver for this request. The
   path is tried in order and the first rule that yields wins — the same walk
   the server makes, which is why the rule it lands on is what the row reports
   as `details.strategy`. */
const resolveEscalation = (rule, request, user, config) => {
  if (rule === 'NEXT_LEVEL') {
    if (request.level >= request.levels) return null
    /* A level above this one exists, but somebody has to be holding it. The
       console has no per-organisation approver register to read that from, so
       an unstaffed level is seeded off the request id — the same way the demo
       data seeds everything else it cannot derive. It is also what makes the
       rest of the path worth configuring: with every level staffed, no rule
       after the first one ever wins. */
    if (hash(`level:${request.id}`) % 4 === 0) return null
    return pickFrom(request.level >= 2 ? APPROVERS_L3 : APPROVERS_L2, hash(request.id), 2)
  }
  if (rule === 'MANAGER') return user && user.manager ? [user.manager] : null
  /* The root organisation has no certifier above it; a child organisation
     does. A request raised at the root falls through this rule. */
  if (rule === 'ORG_CERTIFIER') {
    return user && user.organization && user.organization !== 'Tanflow'
      ? pickFrom(APPROVERS_L3, hash(user.organization), 1)
      : null
  }
  if (rule === 'ESCALATION_ROLE') {
    return config.escalationRole ? pickFrom(APPROVERS_L2, hash(config.escalationRole), 2) : null
  }
  if (rule === 'ADMINISTRATOR') {
    const admins = config.fallbackAdministrators || []
    return admins.length ? [...admins] : null
  }
  return null
}

const escalationRows = (execution, scheduler) => {
  const config = scheduler.service_config || {}
  const dry = !!config.dryRun
  const path = (config.escalationPath || []).length ? config.escalationPath : ['NEXT_LEVEL', 'MANAGER', 'ADMINISTRATOR']
  const due = dueRequests(execution, Number(config.pendingHours) || 72, Number(config.maxRequestsPerRun) || 500)

  return due.map(({ request, waitingDays }, i) => {
    const seed = hash(`${execution.id}:${request.id}`)
    const user = userOf(request.userId)
    const previousApprovers = request.pendingWith ? [request.pendingWith] : []

    let strategy = null
    let newApprovers = null
    for (let k = 0; k < path.length && !newApprovers; k += 1) {
      const produced = resolveEscalation(path[k], request, user, config)
      if (produced && produced.length) { strategy = path[k]; newApprovers = produced }
    }

    const details = {
      requestType: request.type,
      requestedBy: request.requester,
      waitingDays,
      escalationLevel: request.level,
      strategy,
      previousApprovers,
      newApprovers: newApprovers || [],
    }

    const base = {
      id: `${execution.id}:${request.id}`,
      entity_type: 'approval_request',
      entity_ref: request.id,
      created_at: spread(execution, i, due.length),
    }

    if (!newApprovers) {
      return {
        ...base,
        operation_type: 'ESCALATION:NO_TARGET',
        success: false,
        message: `No rule in the escalation path produced an approver for ${request.id}. It is still with ${request.pendingWith || 'nobody'} and nobody above them has been given it.`,
        details,
      }
    }

    if (config.skipWhenApproverActive && seed % 7 === 0) {
      return {
        ...base,
        operation_type: 'ESCALATION:SKIPPED_APPROVER_ACTIVE',
        success: true,
        message: `${request.pendingWith} signed in within the waiting period, so ${request.id} was left with them.`,
        details: { ...details, strategy: null, newApprovers: [] },
      }
    }

    if (request.status === 'Escalated' && request.level >= (Number(config.maxEscalations) || 3)) {
      return {
        ...base,
        operation_type: 'ESCALATION:SKIPPED',
        success: true,
        message: `${request.id} has already been escalated ${request.level} times, which is the maximum this scheduler allows.`,
        details: { ...details, strategy: null, newApprovers: [] },
      }
    }

    if (dry) {
      return {
        ...base,
        operation_type: 'ESCALATION:DRY_RUN',
        success: true,
        message: `${request.id} would move from ${previousApprovers.join(', ') || 'nobody'} to ${newApprovers.join(', ')}.`,
        details,
      }
    }

    /* An outcome this console's list does not carry, on purpose. The server's
       escalation rules are open-ended — a deployment that adds one starts
       sending an operation type nobody here has heard of, and the row still has
       to render rather than quietly leaving the request out of the run. */
    const rule = seed % 23 === 0 ? 'ORG_HEAD' : strategy
    const notificationFailed = !!config.notifyNewApprover && seed % 19 === 0

    return {
      ...base,
      operation_type: `ESCALATION:${rule}`,
      success: true,
      message: notificationFailed
        ? `${request.id} moved to ${newApprovers.join(', ')}, but the notification to them was not delivered.`
        : `${request.id} moved from ${previousApprovers.join(', ') || 'nobody'} to ${newApprovers.join(', ')}.`,
      /* The rule the row reports is the rule the summary counts, unknown ones
         included — a chip that disagreed with the Outcome beside it would be
         worse than no chip. */
      details: { ...details, strategy: rule, notificationFailed },
    }
  })
}

const reminderRows = (execution, scheduler) => {
  const config = scheduler.service_config || {}
  const dry = !!config.dryRun
  const interval = Math.max(1, Number(config.reminderIntervalHours) || 24)
  const maxReminders = Number(config.maxReminders) || 3
  const after = Number(config.remindAfterHours) || 24
  const due = dueRequests(execution, after, Number(config.maxRequestsPerRun) || 1000)

  return due.map(({ request, waitingDays }, i) => {
    const seed = hash(`${execution.id}:${request.id}`)
    const approvers = request.pendingWith ? [request.pendingWith] : []
    const reminderNumber = Math.max(1, Math.floor((waitingDays * 24 - after) / interval) + 1)

    const details = {
      requestType: request.type,
      requestedBy: request.requester,
      waitingDays,
      reminderNumber,
      approvers,
      requesterNotified: !!config.notifyRequester,
    }

    const base = {
      id: `${execution.id}:${request.id}`,
      entity_type: 'approval_request',
      entity_ref: request.id,
      created_at: spread(execution, i, due.length),
    }

    /* A request assigned to an approval level nobody in its organisation holds.
       The console has no per-organisation approver register to read this from,
       so it is seeded — deterministically, off the request id, the way the
       demo data seeds everything else it cannot derive. */
    if (seed % 13 === 0) {
      return {
        ...base,
        operation_type: 'REMINDER:NO_APPROVER',
        success: false,
        message: `${request.id} has no approver at level ${request.level}. Nobody can act on it and nobody is being reminded about it.`,
        details: { ...details, approvers: [] },
      }
    }

    if (reminderNumber > maxReminders) {
      return {
        ...base,
        operation_type: 'REMINDER:SKIPPED',
        success: true,
        message: `${request.id} has had all ${maxReminders} of its reminders. It is left to Approval Escalation rather than chased again.`,
        details,
      }
    }

    if (dry) {
      return {
        ...base,
        operation_type: 'REMINDER:DRY_RUN',
        success: true,
        message: `Reminder ${reminderNumber} would go to ${approvers.join(', ')} about ${request.id}.`,
        details,
      }
    }

    if (seed % 17 === 0) {
      return {
        ...base,
        operation_type: 'REMINDER:FAILED',
        success: false,
        message: `The reminder for ${request.id} was not delivered: the mail server rejected the recipient address.`,
        details,
      }
    }

    return {
      ...base,
      operation_type: 'REMINDER:SENT',
      success: true,
      message: `Reminder ${reminderNumber} sent to ${approvers.join(', ')}${config.notifyRequester ? `, copied to ${request.requester}` : ''}.`,
      details,
    }
  })
}

// ---------------------------------------------------------------------------
// Retention policies — Audit Log Cleanup
// ---------------------------------------------------------------------------

/* The two history tables the Scheduler Log Cleanup service owns. They are the
   targets that service declares, and Audit Log Cleanup reports them rather than
   touching them — two schedulers deleting the same rows is how a run ends up
   blaming the other one for records that are already gone. */
const SCHEDULER_TABLES = ['SCHEDULER_EXECUTIONS', 'SCHEDULER_EXECUTION_LOGS']

/* Evidence-grade records that are never cleaned, whatever a policy says. */
const PROTECTED_TYPES = new Set(['ADMIN_ACTION', 'PERMISSION_CHANGE', 'EVIDENCE_PACK'])

/* Seven years. A policy at or above it is under a compliance lock, and a locked
   policy may only be cleaned once its records have been archived somewhere. */
const COMPLIANCE_DAYS = 2555

/**
 * Every retention policy this deployment has, as the Log Retention screen would
 * list them: one per captured log type, plus the two history tables another
 * scheduler owns. `rotation` is what says whether the type has an archive
 * destination — a type rotated by date writes a file per day, and that file is
 * what an archive step streams to.
 */
const RETENTION_POLICIES = [
  /* The two another scheduler owns come first, because a run reports what it
     declined to touch before it reports what it did. */
  ...SCHEDULER_TABLES.map((code) => ({
    code,
    label: code === 'SCHEDULER_EXECUTIONS' ? 'Scheduler execution history' : 'Per-item execution logs',
    table: code.toLowerCase(),
    archivalDays: 90,
    captured: true,
    archives: true,
    volume: 2000,
    ownedElsewhere: true,
  })),
  ...captureRows().map((row) => ({
    code: row.code,
    label: row.label,
    table: `audit_log_${row.category}`,
    archivalDays: row.archivalDays,
    captured: row.captured,
    archives: row.rotation === 'By date',
    volume: row.fileSizeMb * row.maxFiles,
  })),
]

const cleanupRows = (execution, scheduler) => {
  const config = scheduler.service_config || {}
  const dry = config.mode !== 'APPLY'
  const startMs = parseStamp(execution.started_at) ?? 0
  const excluded = new Set((config.excludedLogTypes || []).map((v) => String(v).toUpperCase()))
  const named = new Set((config.logTypes || []).map((v) => String(v).toUpperCase()))

  const scoped = RETENTION_POLICIES
    .filter((p) => (config.policyScope === 'NAMED' ? named.has(p.code) : true))
    .filter((p) => !excluded.has(p.code))
    .slice(0, Number(config.maxPoliciesPerRun) || 20)

  return scoped.map((policy, i) => {
    const seed = hash(`${execution.id}:${policy.code}`)
    const cutoff = dateOnly(startMs - policy.archivalDays * DAY)
    /* What a policy has past its retention is a slice of what it keeps, and
       what it keeps is its own rotation geometry — file size by file count. */
    const identified = Math.round(policy.volume * (0.4 + (seed % 60) / 100))
    const archivePath = `/var/tanflow/archive/audit/${policy.code.toLowerCase()}/${cutoff}.jsonl.gz`

    const base = {
      id: `${execution.id}:${policy.code}`,
      entity_type: 'retention_policy',
      entity_ref: policy.code,
      created_at: spread(execution, i, scoped.length),
    }
    const details = {
      table: policy.table,
      logTypeLabel: policy.label,
      cutoff,
      retentionDays: policy.archivalDays,
      /* What the run found past the cutoff, whatever it then did about it. The
         run summary needs it on every row: a policy that was skipped still has
         records sitting past their retention, and a summary that only counted
         the policies it acted on would report none. */
      identified,
      rowsArchived: 0,
      rowsDeleted: 0,
    }

    if (dry) {
      return {
        ...base,
        operation_type: 'CLEANUP:DRY_RUN',
        success: true,
        message: `${identified.toLocaleString('en-US')} ${policy.label.toLowerCase()} records sit past ${cutoff}. Nothing was changed.`,
        details: { ...details, wouldRemove: identified },
      }
    }

    if (policy.ownedElsewhere) {
      return {
        ...base,
        operation_type: 'CLEANUP:OWNED_BY_SCHEDULER_LOG_CLEANUP',
        success: true,
        message: `${policy.table} is cleaned by the Scheduler Log Cleanup service, so this run left it alone.`,
        details,
      }
    }

    if (PROTECTED_TYPES.has(policy.code)) {
      return {
        ...base,
        operation_type: 'CLEANUP:PROTECTED_TABLE',
        success: true,
        message: `${policy.label} is evidence-grade and is never cleaned, whatever retention a policy names.`,
        details,
      }
    }

    if (policy.archivalDays >= COMPLIANCE_DAYS) {
      if (policy.archives || config.skipComplianceLocked) {
        return {
          ...base,
          operation_type: 'CLEANUP:COMPLIANCE_LOCKED',
          success: true,
          message: `${policy.label} is under a compliance lock until ${cutoff}. Nothing past it yet.`,
          details,
        }
      }
      return {
        ...base,
        operation_type: 'CLEANUP:COMPLIANCE_LOCKED_WITHOUT_ARCHIVE',
        success: false,
        message: `${policy.label} is under a compliance lock and has no archive destination. The lock requires the records to be written somewhere before they can be removed, so nothing was deleted.`,
        details,
      }
    }

    if (!policy.captured) {
      return {
        ...base,
        operation_type: 'CLEANUP:INCOMPLETE_POLICY',
        success: true,
        message: `${policy.label} is not being captured, so its policy has no retention period to act on. Complete it on the Log Retention screen.`,
        details,
      }
    }

    if (seed % 29 === 0) {
      return {
        ...base,
        operation_type: 'CLEANUP:FAILED',
        success: false,
        message: `${policy.table} could not be cleaned: the delete statement timed out after 600 seconds with ${identified.toLocaleString('en-US')} rows outstanding.`,
        details,
      }
    }

    if (seed % 31 === 0) {
      return {
        ...base,
        operation_type: 'CLEANUP:ALREADY_RUNNING',
        success: true,
        message: `Another run of this policy was still in flight, so this one left ${policy.table} to it.`,
        details,
      }
    }

    if (policy.archives && policy.archivalDays >= 730) {
      return {
        ...base,
        operation_type: 'CLEANUP:ARCHIVE_AND_DELETE',
        success: true,
        message: `${identified.toLocaleString('en-US')} records older than ${cutoff} were archived and then removed from ${policy.table}.`,
        details: {
          ...details,
          rowsArchived: identified,
          rowsDeleted: identified,
          bytesArchived: identified * 1280,
          archivePath,
          verification: seed % 9 === 0 ? null : 'SHA-256 checksum verified',
        },
      }
    }

    if (policy.archives) {
      return {
        ...base,
        operation_type: 'CLEANUP:ARCHIVE',
        success: true,
        message: `${identified.toLocaleString('en-US')} records older than ${cutoff} were archived. The delete step runs once the archive is verified.`,
        details: {
          ...details,
          rowsArchived: identified,
          bytesArchived: identified * 1280,
          archivePath,
          verification: seed % 9 === 0 ? null : 'SHA-256 checksum verified',
        },
      }
    }

    return {
      ...base,
      operation_type: 'CLEANUP:DELETE',
      success: true,
      message: `${identified.toLocaleString('en-US')} records older than ${cutoff} were removed from ${policy.table}.`,
      details: { ...details, rowsDeleted: identified },
    }
  })
}

// ---------------------------------------------------------------------------
// Campaigns — Recertification Campaign
// ---------------------------------------------------------------------------

/* The campaign whose collection pipeline did not start when it was opened. It
   exists, it is in the register, and its items were collected later by hand —
   which is the state the row has to be able to report, and the reason the row
   must not tell an operator to open another one. Seeded rather than derived:
   nothing on a campaign records how its collection began. */
const STALLED_PIPELINE = new Set([3])

const DATED_CAMPAIGNS = CAMPAIGNS
  .map((c) => ({ ...c, startedMs: parseStamp(c.started) }))
  .filter((c) => c.startedMs != null)
  .sort((a, b) => a.startedMs - b.startedMs)

/**
 * One row per run, and the campaign it is about.
 *
 * A period has exactly one campaign from this scheduler: the first run inside
 * the period opens it, and every run after that finds it and stops. That is the
 * duplicate guard, and it is why the same campaign is named on five consecutive
 * runs — the scheduler is doing its job, not failing four times.
 */
const recertificationRows = (execution, scheduler) => {
  const config = scheduler.service_config || {}
  const startMs = parseStamp(execution.started_at) ?? 0
  const period = periodToken(config.campaignPeriod, startMs)
  const name = `${String(config.campaignName || 'Campaign').toUpperCase()} ${period}`
  const base = {
    id: `${execution.id}:campaign`,
    entity_type: 'recertification_campaign',
    created_at: stamp(startMs),
  }

  /* Whether this is the run that found the period uncovered. The run before it
     either fell in an earlier period or predates the scheduler itself. */
  const previousMs = startMs - Math.max(DAY, execution.cadence_ms || 7 * DAY)
  const schedulerFrom = parseStamp(scheduler.start_date)
  const firstInPeriod = (schedulerFrom != null && previousMs < schedulerFrom)
    || periodToken(config.campaignPeriod, previousMs) !== period

  /* A closed campaign counts as covering its period when the scheduler says it
     should — the option exists because a re-review after remediation needs it
     not to. */
  const owner = DATED_CAMPAIGNS
    .filter((c) => c.startedMs <= startMs || firstInPeriod)
    .filter((c) => periodToken(config.campaignPeriod, c.startedMs) === period)
    .filter((c) => config.countClosedCampaigns !== false || c.status !== 'Closed')[0]

  if (config.dryRun) {
    return [{
      ...base,
      entity_ref: name,
      operation_type: 'CAMPAIGN:DRY_RUN',
      success: true,
      message: owner
        ? `${owner.name} already covers ${period}, so nothing would be opened.`
        : `${name} would be opened for ${period}. Nothing was created.`,
      details: {
        campaignName: name,
        period,
        population: config.population === 'CONDITION' ? config.condition : 'All users',
        reviewLevels: config.reviewLevels || [],
      },
    }]
  }

  if (!owner) return []

  const details = {
    campaignId: owner.id,
    campaignName: owner.name,
    period,
    population: owner.scope,
    reviewLevels: config.reviewLevels || [],
    auditor: config.auditor || owner.auditor,
    items: owner.items,
    status: owner.status,
  }

  if (firstInPeriod) {
    const stalled = STALLED_PIPELINE.has(owner.id)
    return [{
      ...base,
      entity_ref: String(owner.id),
      operation_type: stalled ? 'CAMPAIGN:PIPELINE_NOT_STARTED' : 'CAMPAIGN:CREATED',
      success: !stalled,
      message: stalled
        ? `${owner.name} was opened for ${period}, but its collection pipeline never started. Retry the pipeline on the campaign — opening another one would duplicate it.`
        : `${owner.name} opened for ${period} over ${owner.scope}, signed off by ${config.auditor || owner.auditor}.`,
      details,
    }]
  }

  return [{
    ...base,
    entity_ref: String(owner.id),
    operation_type: 'CAMPAIGN:ALREADY_EXISTS',
    success: true,
    message: `Already covered for ${period} by ${owner.name}.`,
    details,
  }]
}

// ---------------------------------------------------------------------------
// Everything else
// ---------------------------------------------------------------------------

/**
 * The per-record log the rest of the catalogue produces.
 *
 * It was a Subject / Outcome / Detail table whose tone came from matching the
 * word "Applied" — so a service that reported "Applied (no change)" turned red.
 * Same seven fields as everything above; the tone is read off `success`.
 */
const genericRows = (execution, service) => {
  const n = Math.min(12, Math.max(3, execution.records_processed % 13))
  const noun = service?.serviceCode === 'DATA_EXPORT' ? 'row' : 'user'
  return Array.from({ length: n }, (_, i) => {
    const failed = execution.records_failed > 0 && i % 4 === 1
    return {
      id: `${execution.id}:${i}`,
      entity_type: noun === 'row' ? 'export_row' : 'identity',
      entity_ref: `${noun}-${1000 + (i * 37) % 8000}`,
      operation_type: failed ? 'RECORD:FAILED' : 'RECORD:APPLIED',
      success: !failed,
      message: failed
        ? 'The target rejected the change — the attribute is read-only on the connector.'
        : 'Change applied and acknowledged by the target.',
      details: {},
      created_at: spread(execution, i, n),
    }
  })
}

// ---------------------------------------------------------------------------

const BUILDERS = {
  APPROVAL_ESCALATION: escalationRows,
  APPROVAL_REMINDER: reminderRows,
  AUDIT_LOG_CLEANUP: cleanupRows,
  RECERTIFICATION_CAMPAIGN: recertificationRows,
}

/**
 * The services whose runs are modelled row by row.
 *
 * For these, a run's record counts and its status are read off the rows rather
 * than seeded beside them — a run cannot be "Failed" while every row under it
 * succeeded, and the register cannot report a last result the run detail
 * contradicts.
 */
export const MODELLED_SERVICES = new Set(Object.keys(BUILDERS))

/**
 * The rows one run produced.
 *
 * `scheduler` is the record the run belongs to. A real server reads it by
 * `jobId` and needs nothing else; here the caller hands it over, because the
 * configuration a run executed under is what decides whether it escalated or
 * only reported that it would have.
 */
export const resultRowsFor = (execution, service, scheduler) => {
  if (!service?.metadata?.producesItemLogs) return []
  const build = BUILDERS[service.serviceCode]
  if (!build) return genericRows(execution, service)
  return scheduler ? build(execution, scheduler) : []
}
