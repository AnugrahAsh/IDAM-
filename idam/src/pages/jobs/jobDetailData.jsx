import { USERS } from '../../data/seed'

export const FAIL_REASONS = [
  'Target rejected the attribute mapping',
  'Unique constraint violated on the target key',
  'Connector timed out after 30s',
  'Bind account lacks write privilege',
  'Account already exists and was not claimed',
]

const FAIL_CODES = {
  'Target rejected the attribute mapping': { http: 422, code: 'ATTR_MAPPING_REJECTED' },
  'Unique constraint violated on the target key': { http: 409, code: 'DUPLICATE_KEY' },
  'Connector timed out after 30s': { http: 504, code: 'CONNECTOR_TIMEOUT' },
  'Bind account lacks write privilege': { http: 403, code: 'INSUFFICIENT_PRIVILEGE' },
  'Account already exists and was not claimed': { http: 409, code: 'ACCOUNT_UNCLAIMED' },
}

/**
 * What each row of the run acted on. The register has to name the thing, not
 * only the identity — "ADD on Admin for JOH_JOH.45678" is the sentence an
 * operator replays; "ADD for JOH_JOH.45678" is not.
 */
const ENTITY_NAMES = {
  Provisioning: ['Standard User', 'Contractor', 'Service Account', 'Privileged User'],
  Reconciliation: ['Directory account', 'Target account', 'Orphan candidate'],
  Recertification: ['Q3 Access Review', 'Privileged Review', 'Contractor Review'],
  Policy: ['Joiner baseline', 'Leaver revocation', 'Privileged escalation'],
  'Directory Sync': ['ou=People', 'ou=Contractors', 'ou=Service'],
  Notification: ['Access approved', 'Account locked', 'Password expiring'],
}

/* Records are stamped as the batch works through them, so the result register
   sorts in the order the connector actually processed them. */
const recordStamp = (job, i) => {
  const started = new Date(`${String(job.started).replace(' ', 'T')}:00Z`)
  if (Number.isNaN(started.getTime())) return job.started
  const step = job.total > 0 ? (job.durationMs || 0) / Math.max(1, job.total) : 0
  const at = new Date(started.getTime() + step * i)
  const pad = (n) => String(n).padStart(2, '0')
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`
}

export const meterTone = (status) => (status === 'Failed' ? 'bad' : status === 'Succeeded' ? 'ok' : status === 'Canceled' ? 'warn' : undefined)

export const appliedPct = (job) => (job.status === 'Running'
  ? job.progress
  : job.total > 0 ? Math.round((job.succeeded / job.total) * 100) : 0)

// Deterministic so a record shows the same payload every time it is opened —
// a job history that changed its own numbers on each render would be unusable
// as evidence.
const hash = (value) => {
  let h = 2166136261
  const s = String(value)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

// The per-user operation this job performed. Provisioning writes an account,
// reconciliation compares one, recertification records a decision — the verb
// shown to the operator has to match the module or the detail reads as noise.
const OPERATIONS = {
  Provisioning: { verb: 'Create account', method: 'POST', path: '/scim/v2/Users', code: 'ADD', entity: 'Account' },
  Reconciliation: { verb: 'Compare account', method: 'GET', path: '/scim/v2/Users', code: 'READ', entity: 'Account' },
  Recertification: { verb: 'Record attestation', method: 'PATCH', path: '/api/v1/attestations', code: 'UPDATE', entity: 'Campaign' },
  Policy: { verb: 'Evaluate policy', method: 'POST', path: '/api/v1/policy/evaluate', code: 'EVALUATE', entity: 'Policy' },
  'Directory Sync': { verb: 'Sync directory entry', method: 'PUT', path: '/ldap/entry', code: 'UPDATE', entity: 'Directory entry' },
  Notification: { verb: 'Send notification', method: 'POST', path: '/api/v1/notifications', code: 'SEND', entity: 'Template' },
}

/**
 * How long the run took, spelled out.
 *
 * `4m 12s` is fine on a dense register; a job record is read as evidence and
 * quoted into a ticket, so the summary spells the units out the way the rest
 * of the platform's job reporting does.
 */
export const hrMinSec = (ms) => {
  const total = Math.max(0, Math.round((ms || 0) / 1000))
  return `${Math.floor(total / 3600)} hr ${Math.floor((total % 3600) / 60)} min ${total % 60} sec`
}

/** When the batch closed. A run still in flight has not got there yet. */
export const completedAt = (job) => {
  if (job.status === 'Running') return null
  const started = new Date(`${String(job.started).replace(' ', 'T')}:00Z`)
  if (Number.isNaN(started.getTime())) return job.started
  const end = new Date(started.getTime() + (job.durationMs || 0))
  const pad = (n) => String(n).padStart(2, '0')
  return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())} ${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`
}

export const operationFor = (job) => OPERATIONS[job.module] || { verb: job.operation, method: 'POST', path: '/api/v1/execute' }

// One row per identity the run touched. Capped at 40: this is a register an
// operator reads, and the full set belongs in the downloadable result file.
export const recordsFor = (job) => {
  const size = Math.min(40, Math.max(6, job.total > 40 ? 40 : job.total))
  const failRatio = job.total > 0 ? job.failed / job.total : 0

  return Array.from({ length: size }, (_, i) => {
    const u = USERS[(job.id * 5 + i * 7) % USERS.length]
    const seed = hash(`${job.jobId}:${u.username}:${i}`)
    const isFailed = job.failed > 0 && (seed % 100) < Math.max(8, failRatio * 100)
    const isPending = job.status === 'Running' && i > Math.floor(size * (job.progress / 100))
    const reason = FAIL_REASONS[seed % FAIL_REASONS.length]

    return {
      id: `${job.jobId}-${i}`,
      principal: u.username,
      email: u.email,
      displayName: `${u.firstName} ${u.lastName}`,
      department: u.department,
      organization: u.organization,
      outcome: isFailed ? 'Failed' : isPending ? 'Pending' : 'Succeeded',
      detail: isFailed ? reason : isPending ? 'Queued for dispatch' : 'Applied to target',
      reason: isFailed ? reason : '',
      // Pending records were never dispatched, so they have no duration and no
      // response — 0 here means "not attempted", not "instant".
      durationMs: isPending ? 0 : 40 + (seed % 2400),
      attempt: isFailed ? 1 + (seed % 3) : 1,
      correlationId: `${job.jobId}-${String(seed % 100000).padStart(5, '0')}`,
      /* The columns a result register is actually read through: what was acted
         on, the verb the connector was given, the boolean it returned, and the
         message or error it returned with it. These were only reachable by
         opening each record before. */
      jobId: job.jobId,
      module: job.module,
      entity: ENTITY_NAMES[job.module]
        ? ENTITY_NAMES[job.module][seed % ENTITY_NAMES[job.module].length]
        : job.target,
      operationCode: isPending ? 'QUEUED' : (OPERATIONS[job.module] || {}).code || 'EXECUTE',
      success: isFailed ? false : isPending ? null : true,
      message: isFailed
        ? ''
        : isPending ? 'Queued for dispatch' : `${(OPERATIONS[job.module] || {}).entity || 'Record'} processed successfully`,
      error: isFailed ? (FAIL_CODES[reason] || { code: 'UNKNOWN' }).code : 'N/A',
      createdAt: recordStamp(job, i),
    }
  })
}

const attributesFor = (record) => ({
  userName: record.principal,
  displayName: record.displayName,
  emails: [{ value: record.email, primary: true }],
  department: record.department,
  organization: record.organization,
  active: true,
})

export const payloadFor = (job, record) => {
  const op = operationFor(job)
  return {
    method: op.method,
    url: `https://${String(job.target).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.example.com${op.path}`,
    headers: {
      'Content-Type': 'application/scim+json',
      Authorization: 'Bearer ****redacted****',
      'X-Correlation-Id': record.correlationId,
    },
    body: {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      externalId: record.principal,
      ...attributesFor(record),
    },
  }
}

export const responseFor = (job, record) => {
  if (record.outcome === 'Pending') {
    return { status: null, note: 'This record was not dispatched before the run was observed. No response exists yet.' }
  }
  if (record.outcome === 'Failed') {
    const f = FAIL_CODES[record.reason] || { http: 500, code: 'UNKNOWN' }
    return {
      status: f.http,
      durationMs: record.durationMs,
      headers: { 'Content-Type': 'application/scim+json', 'X-Correlation-Id': record.correlationId },
      body: {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: String(f.http),
        scimType: f.code,
        detail: record.reason,
      },
    }
  }
  return {
    status: operationFor(job).method === 'POST' ? 201 : 200,
    durationMs: record.durationMs,
    headers: { 'Content-Type': 'application/scim+json', 'X-Correlation-Id': record.correlationId },
    body: {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: `${record.correlationId}`,
      ...attributesFor(record),
      meta: { resourceType: 'User', location: `/scim/v2/Users/${record.correlationId}` },
    },
  }
}

// The run-level response: what the worker reported back when the batch closed.
export const jobResponseFor = (job) => {
  const op = operationFor(job)
  return {
    request: {
      method: 'POST',
      url: `https://worker.tanflow.internal/api/v1/jobs/${job.jobId}/run`,
      headers: { 'Content-Type': 'application/json', 'X-Job-Id': job.jobId },
      body: {
        jobId: job.jobId,
        module: job.module,
        operation: job.operation,
        target: job.target,
        triggeredBy: job.triggeredBy,
        mode: op.method === 'GET' ? 'read-only' : 'write',
        batchSize: job.total,
      },
    },
    response: {
      status: job.status === 'Failed' ? 207 : job.status === 'Running' ? 202 : 200,
      durationMs: job.durationMs,
      headers: { 'Content-Type': 'application/json', 'X-Job-Id': job.jobId },
      body: {
        jobId: job.jobId,
        state: job.status.toUpperCase(),
        startedAt: `${job.started}Z`,
        totals: { processed: job.total, succeeded: job.succeeded, failed: job.failed },
        // A multi-status response carries the distinct failure reasons rather
        // than one collapsed message, so the reader can tell a permissions
        // problem from a timeout without opening every record.
        errors: job.failed > 0
          ? [...new Set(recordsFor(job).filter((r) => r.outcome === 'Failed').map((r) => r.reason))]
            .map((reason) => ({ reason, code: (FAIL_CODES[reason] || {}).code || 'UNKNOWN' }))
          : [],
      },
    },
  }
}
