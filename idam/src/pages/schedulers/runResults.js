/**
 * How a result row is read out loud.
 *
 * One `operation_type` from the server becomes a label, a tone and — for the
 * four outcomes that need somebody to do something — an emphasis. Nothing here
 * looks at `message`: the tone is decided on `success` and `operation_type`,
 * because a message is prose written for a reader and matching against prose is
 * how "Applied (no change)" ends up rendered as a failure.
 *
 * Both outcome lists are open-ended. A deployment that adds an escalation rule,
 * or a server release that adds a cleanup action, starts sending an operation
 * nobody here has heard of, and the row still has to render: `outcomeLabel`
 * falls back to title-casing the part after the colon rather than returning
 * nothing and letting the row disappear out of the run.
 */

import { duration } from '../../lib/format'

const LABELS = {
  // B5 — Approval Reminder
  'REMINDER:SENT': 'Reminder sent',
  'REMINDER:SKIPPED': 'Already reminded',
  'REMINDER:NO_APPROVER': 'No approver',
  'REMINDER:FAILED': 'Delivery failed',
  'REMINDER:DRY_RUN': 'Would remind',

  // B5 — Approval Escalation
  'ESCALATION:NEXT_LEVEL': 'Escalated to the next level',
  'ESCALATION:MANAGER': 'Escalated to the manager',
  'ESCALATION:ORG_CERTIFIER': 'Escalated to the organisation certifier',
  'ESCALATION:ESCALATION_ROLE': 'Escalated to the escalation role',
  'ESCALATION:ADMINISTRATOR': 'Escalated to an administrator',
  'ESCALATION:NO_TARGET': 'No escalation target',
  'ESCALATION:SKIPPED': 'Already escalated',
  'ESCALATION:SKIPPED_APPROVER_ACTIVE': 'Left with its active approver',
  'ESCALATION:DRY_RUN': 'Would escalate',

  // B6 — Audit Log Cleanup
  'CLEANUP:DRY_RUN': 'Preview',
  'CLEANUP:DELETE': 'Deleted',
  'CLEANUP:ARCHIVE': 'Archived',
  'CLEANUP:ARCHIVE_AND_DELETE': 'Archived then deleted',
  'CLEANUP:PROTECTED_TABLE': 'Protected — never cleaned',
  'CLEANUP:OWNED_BY_SCHEDULER_LOG_CLEANUP': 'Cleaned by the Scheduler Log Cleanup service',
  'CLEANUP:COMPLIANCE_LOCKED': 'Skipped — compliance lock',
  'CLEANUP:COMPLIANCE_LOCKED_WITHOUT_ARCHIVE': 'Refused — lock requires archiving first',
  'CLEANUP:INCOMPLETE_POLICY': 'Skipped — policy incomplete',
  'CLEANUP:ALREADY_RUNNING': 'Skipped — already running',
  'CLEANUP:FAILED': 'Failed',

  // B7 — Recertification Campaign
  'CAMPAIGN:CREATED': 'Campaign created',
  'CAMPAIGN:ALREADY_EXISTS': 'Already covered for this period',
  'CAMPAIGN:DRY_RUN': 'Would create',
  'CAMPAIGN:PIPELINE_NOT_STARTED': 'Created, but its pipeline did not start',

  // Every other service's per-record log
  'RECORD:APPLIED': 'Applied',
  'RECORD:FAILED': 'Failed',
}

/**
 * Succeeded, and nothing needed doing.
 *
 * Membership here is the difference between the first two rows of B4.5: a
 * skipped policy, an already-covered period and every dry run report a true
 * outcome that changed nothing, and a green badge over any of them says work
 * happened that did not.
 */
const NOTHING_DONE = new Set([
  'REMINDER:SKIPPED', 'REMINDER:DRY_RUN',
  'ESCALATION:SKIPPED', 'ESCALATION:SKIPPED_APPROVER_ACTIVE', 'ESCALATION:DRY_RUN',
  'CLEANUP:DRY_RUN', 'CLEANUP:PROTECTED_TABLE', 'CLEANUP:OWNED_BY_SCHEDULER_LOG_CLEANUP',
  'CLEANUP:COMPLIANCE_LOCKED', 'CLEANUP:INCOMPLETE_POLICY', 'CLEANUP:ALREADY_RUNNING',
  'CAMPAIGN:ALREADY_EXISTS', 'CAMPAIGN:DRY_RUN',
])

/**
 * The four that each need a human.
 *
 * A request nobody can see, a request nobody can be given, a lock that refused
 * a deletion and a campaign whose work never began. They are already the only
 * red rows on their screens; the emphasis is what stops them scrolling past in
 * a column of eighty.
 */
const NEEDS_ATTENTION = new Set([
  'REMINDER:NO_APPROVER',
  'ESCALATION:NO_TARGET',
  'CLEANUP:COMPLIANCE_LOCKED_WITHOUT_ARCHIVE',
  'CAMPAIGN:PIPELINE_NOT_STARTED',
])

/** `ESCALATION:ORG_HEAD` → "Org head". The half of the list nobody has written. */
const titleCase = (operation) => {
  const tail = String(operation || '').split(':').slice(1).join(':') || String(operation || '')
  const words = tail.replace(/_/g, ' ').trim().toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown outcome'
}

export const outcomeLabel = (operation) => LABELS[operation] || titleCase(operation)

/** The one rule: `success` first, then whether the operation did anything. */
export const outcomeTone = (row) => {
  if (!row || row.success === false) return 'bad'
  return NOTHING_DONE.has(row.operation_type) ? 'mut' : 'ok'
}

export const needsAttention = (row) => NEEDS_ATTENTION.has(row?.operation_type)

export const isKnownOutcome = (operation) => Object.prototype.hasOwnProperty.call(LABELS, operation)

/**
 * The reference, as the row is addressed by.
 *
 * The server's approval requests are numbered, and `#13` is how one is written.
 * This console's are `REQ-2412`, which already carries its own prefix — putting
 * a hash in front of it produces `#REQ-2412`, which is not what anything calls
 * it. The hash belongs to a bare number.
 */
export const refLabel = (ref) => (/^\d+$/.test(String(ref ?? '')) ? `#${ref}` : String(ref ?? '—'))

// ---------------------------------------------------------------------------
// Which screen a service's results are rendered as
// ---------------------------------------------------------------------------

export const RESULT_VIEWS = {
  APPROVAL_ESCALATION: 'escalation',
  APPROVAL_REMINDER: 'reminder',
  AUDIT_LOG_CLEANUP: 'cleanup',
  RECERTIFICATION_CAMPAIGN: 'campaign',
}

export const resultViewFor = (code) => RESULT_VIEWS[code] || 'generic'

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

/**
 * Why this run has nothing to show.
 *
 * "No data available" is the sentence this replaces. It leaves a reader unable
 * to tell a scheduler that found nothing to do from one that is misconfigured,
 * and those are the only two things they came to the screen to distinguish.
 */
export const emptyStateFor = (code, config = {}) => {
  if (code === 'APPROVAL_ESCALATION') {
    return {
      icon: 'checkC',
      title: 'This run found no requests past the escalation timeout',
      body: `Nothing had been waiting with the same approver for ${config.pendingHours || 72} hours when the run started. Requests raised since then are picked up by the next run.`,
    }
  }
  if (code === 'APPROVAL_REMINDER') {
    return {
      icon: 'checkC',
      title: 'This run found no approval waiting long enough to be reminded about',
      body: `Nothing had been pending for ${config.remindAfterHours || 24} hours when the run started, so no approver was chased.`,
    }
  }
  if (code === 'AUDIT_LOG_CLEANUP') {
    return {
      icon: 'db',
      title: 'No retention policy matched this scheduler’s scope',
      body: 'Policies are configured on the Log Retention screen. Widen the scope, or remove an exclusion, to bring one into this scheduler.',
    }
  }
  if (code === 'RECERTIFICATION_CAMPAIGN') {
    return {
      icon: 'certify',
      title: 'This run opened no campaign',
      body: 'Nothing covered the period and nothing was created — the run reached its duplicate check without a population to review.',
    }
  }
  return {
    icon: 'layers',
    title: 'This run recorded no per-record results',
    body: 'The worker output above is everything this run retained.',
  }
}

// ---------------------------------------------------------------------------
// Run summaries
// ---------------------------------------------------------------------------

const count = (rows, fn) => rows.filter(fn).length
const total = (rows, fn) => rows.reduce((a, r) => a + (Number(fn(r)) || 0), 0)

const bytesText = (n) => {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = Number(n)
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1 }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

/* A strategy chip is labelled off the same map the Outcome column uses, so a
   rule the server invented reads the same in both places. The chip drops the
   "Escalated to" the column needs — six chips in a row all starting with the
   same two words say nothing six times. */
const strategyLabel = (key) => {
  const text = outcomeLabel(`ESCALATION:${key}`).replace(/^Escalated to (the |an |a )?/, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const DUPLICATE_CHECK = {
  PERIOD_AND_POPULATION: 'Period and population',
  PERIOD: 'Period only',
  NONE: 'None',
}

/**
 * The strip above the table.
 *
 * Every figure is counted from the rows below it rather than carried on the
 * run, so the summary and the table cannot disagree — which they did, because
 * the run's own `records_processed` counts records and the table counts
 * requests, and one request can be several records.
 */
export const runSummaryFor = (view, rows, execution, config = {}) => {
  if (view === 'escalation') {
    /* Counted off `details.strategy`, which a row only carries when a rule
       actually produced an approver. A dry run counts too: the rule that would
       have won is the most useful thing a rehearsal has to say, and leaving it
       out would give the chips nothing to show on exactly the run an operator
       opens them for. */
    const byStrategy = {}
    rows.forEach((r) => {
      const key = r.details?.strategy
      if (key) byStrategy[key] = (byStrategy[key] || 0) + 1
    })
    return {
      facts: [
        { label: 'Due', value: rows.length, icon: 'layers' },
        { label: execution?.dry_run ? 'Would escalate' : 'Escalated', value: count(rows, (r) => (execution?.dry_run ? r.operation_type === 'ESCALATION:DRY_RUN' : outcomeTone(r) === 'ok')), icon: 'arrowRight' },
        { label: 'No target', value: count(rows, (r) => r.operation_type === 'ESCALATION:NO_TARGET'), icon: 'warn', tone: 'bad' },
        { label: 'Left with an active approver', value: count(rows, (r) => r.operation_type === 'ESCALATION:SKIPPED_APPROVER_ACTIVE'), icon: 'user' },
        { label: 'Skipped', value: count(rows, (r) => r.operation_type === 'ESCALATION:SKIPPED'), icon: 'ban' },
        { label: 'Delivery failures', value: count(rows, (r) => r.details?.notificationFailed), icon: 'mail', tone: 'warn' },
      ],
      chipsLabel: 'By rule',
      chips: Object.entries(byStrategy).map(([key, n]) => ({ key, label: strategyLabel(key), value: n })),
    }
  }

  if (view === 'reminder') {
    /* On a rehearsal the reminders were not sent, and the strip says so rather
       than reporting a count of deliveries that did not happen. */
    const sent = rows.filter((r) => r.operation_type === (execution?.dry_run ? 'REMINDER:DRY_RUN' : 'REMINDER:SENT'))
    return {
      facts: [
        { label: 'Due', value: rows.length, icon: 'layers' },
        { label: execution?.dry_run ? 'Would remind' : 'Reminders sent', value: sent.length, icon: 'mail' },
        { label: 'Requesters notified', value: count(sent, (r) => r.details?.requesterNotified), icon: 'user' },
        { label: 'No approver', value: count(rows, (r) => r.operation_type === 'REMINDER:NO_APPROVER'), icon: 'warn', tone: 'bad' },
        { label: 'Skipped', value: count(rows, (r) => r.operation_type === 'REMINDER:SKIPPED'), icon: 'ban' },
        { label: 'Delivery failures', value: count(rows, (r) => r.operation_type === 'REMINDER:FAILED'), icon: 'warn', tone: 'bad' },
      ],
    }
  }

  if (view === 'cleanup') {
    const acted = rows.filter((r) => (r.details?.rowsArchived || 0) + (r.details?.rowsDeleted || 0) > 0)
    const skipped = rows.filter((r) => outcomeTone(r) === 'mut')
    return {
      /* Mode leads, and it is the one figure on this screen that is not a
         number: a reader who takes a dry run for an apply misreads every count
         under it. */
      mode: config.mode === 'APPLY' ? 'Apply' : 'Dry run',
      facts: [
        { label: 'Policies considered', value: rows.length, icon: 'layers' },
        { label: 'Run', value: acted.length, icon: 'play' },
        { label: 'Skipped', value: skipped.length, icon: 'ban' },
        { label: 'Failed', value: count(rows, (r) => r.success === false), icon: 'warn', tone: 'bad' },
        { label: 'Records identified', value: total(rows, (r) => r.details?.identified), icon: 'db' },
        { label: 'Archived', value: total(rows, (r) => r.details?.rowsArchived), icon: 'upload' },
        { label: 'Deleted', value: total(rows, (r) => r.details?.rowsDeleted), icon: 'trash' },
        { label: 'Records skipped', value: total(skipped, (r) => r.details?.identified), icon: 'minus' },
        { label: 'Bytes archived', value: bytesText(total(rows, (r) => r.details?.bytesArchived)), text: true, icon: 'save' },
        { label: 'Duration', value: duration(execution?.duration_ms), text: true, icon: 'clock' },
      ],
    }
  }

  if (view === 'campaign') {
    const row = rows[0]
    return {
      facts: [
        { label: 'Period', value: row?.details?.period || '—', text: true, icon: 'calendar' },
        { label: 'Population', value: row?.details?.population || '—', text: true, icon: 'users' },
        { label: 'Duplicate check', value: DUPLICATE_CHECK[config.duplicateCheck] || '—', text: true, icon: 'copy' },
        { label: 'Review levels', value: (config.reviewLevels || []).join(' → ') || '—', text: true, icon: 'hierarchy' },
      ],
    }
  }

  return {
    facts: [
      { label: 'Records', value: rows.length, icon: 'layers' },
      { label: 'Failed', value: count(rows, (r) => r.success === false), icon: 'warn', tone: 'bad' },
    ],
  }
}

