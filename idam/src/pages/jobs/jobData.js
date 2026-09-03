import { APPLICATIONS, JOBS, SCHEDULERS, USERS } from '../../data/seed'

const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/

export const stampMs = (s) => {
  const m = STAMP_RE.exec(String(s || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Math.abs(Number(m[4])) % 24, Math.abs(Number(m[5])) % 60)
}

export const fmtStamp = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 19).replace('T', ' ') : '—')
export const fmtClock = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().slice(11, 23) : '—')

export const JOB_NOW = JOBS.reduce((m, j) => Math.max(m, (stampMs(j.started) || 0) + j.durationMs), 0) + 26 * 60000

export const FAILURES = [
  {
    code: 'TARGET_ATTR_REJECTED',
    reason: 'Target rejected the attribute mapping',
    hint: 'The target schema refused one or more mapped attributes. Compare the connector attribute map against the current target schema before replaying these records.',
    owner: 'Provisioning Engineer',
    retryable: false,
  },
  {
    code: 'UNIQUE_CONSTRAINT',
    reason: 'Unique constraint violated on the target key',
    hint: 'An account with the same primary key already exists on the target. Claim the existing account through reconciliation, or change the key derivation rule.',
    owner: 'Provisioning Engineer',
    retryable: false,
  },
  {
    code: 'CONNECTOR_TIMEOUT',
    reason: 'Connector timed out after 30s',
    hint: 'The target did not answer inside the connector read timeout. These records are safe to replay once the target is responding.',
    owner: 'IT Operations',
    retryable: true,
  },
  {
    code: 'BIND_NO_WRITE',
    reason: 'Bind account lacks write privilege',
    hint: 'The service credential can read the target but cannot write. Raise the bind account privilege, then replay the whole group.',
    owner: 'IT Operations',
    retryable: true,
  },
  {
    code: 'ACCOUNT_UNCLAIMED',
    reason: 'Account already exists and was not claimed',
    hint: 'A matching account was found but no ownership link exists. Run trust reconciliation to claim it, then replay.',
    owner: 'Security',
    retryable: true,
  },
]

export const WORKERS = ['worker-prov-01', 'worker-prov-02', 'worker-recon-01', 'worker-policy-01', 'worker-notify-01']

/**
 * Success and failure counts a running job can actually claim.
 *
 * The dataset stores each run's end state, so a job dispatched but not finished
 * carried the totals it will have once it completes — the register showed 2,452
 * of 2,452 records succeeded beside a meter reading 36%. A run can only have
 * decided the records it has reached, so the counts are derived from progress
 * and `total` stays what it is: the size of the batch, not the part of it done.
 */
export const withDerivedCounts = (job) => {
  if (job.status !== 'Running') return job
  const processed = Math.round((job.total * job.progress) / 100)
  const failed = Math.min(job.failed, processed)
  return { ...job, succeeded: processed - failed, failed }
}

const RECORD_VERB = {
  'Full sync': 'Upsert',
  'Delta sync': 'Update',
  'Evaluate policy': 'Evaluate',
  'Dump attestation': 'Snapshot',
  'Deprovision batch': 'Disable',
  'Send digest': 'Notify',
}

export const connectorFor = (job) => APPLICATIONS.find((a) => a.displayName === job.target) || null
export const workerFor = (job) => WORKERS[job.id % WORKERS.length]
export const correlationFor = (job) => `c${String((job.id * 7919) % 1000000).padStart(6, '0')}-${String(job.jobId).slice(-4)}`
export const batchSizeFor = (job) => [100, 250, 500, 1000][job.id % 4]
export const resultFileFor = (job) => `${String(job.jobId).toLowerCase()}-result.csv`

export const schedulerFor = (job) => {
  if (job.triggeredBy !== 'Scheduler') return null
  return SCHEDULERS[job.id % SCHEDULERS.length]
}

export const headTone = (status) => (status === 'Failed' ? 'bad' : status === 'Running' ? 'acc' : status === 'Canceled' ? 'warn' : 'ok')
export const meterTone = (status) => (status === 'Failed' ? 'bad' : status === 'Succeeded' ? 'ok' : status === 'Canceled' ? 'warn' : undefined)
export const appliedPct = (job) => (job.status === 'Running'
  ? job.progress
  : job.total > 0 ? Math.round((job.succeeded / job.total) * 100) : 0)

export const throughputFor = (job) => (job.durationMs > 0 ? Math.max(1, Math.round(job.total / (job.durationMs / 1000))) : 0)

export const timingFor = (job) => {
  const started = stampMs(job.started) || 0
  const queued = started - (18000 + (job.id % 7) * 4000)
  const running = job.status === 'Running'
  const elapsed = running ? Math.max(job.durationMs, JOB_NOW - started) : job.durationMs
  const finished = running ? null : started + job.durationMs
  return {
    queued,
    started,
    finished,
    elapsed,
    waitMs: started - queued,
    projectedEnd: running && job.progress > 0 ? started + Math.round(elapsed / (job.progress / 100)) : null,
  }
}

export const recordsFor = (job) => {
  const size = Math.max(0, Math.min(job.total, 48))
  if (size === 0) return []
  const started = stampMs(job.started) || 0
  const step = Math.max(120, Math.round(job.durationMs / size))
  const failedCount = job.failed > 0 ? Math.min(size, Math.max(1, Math.round((job.failed / job.total) * size))) : 0
  const doneCount = job.status === 'Running' ? Math.max(1, Math.round((job.progress / 100) * size)) : size
  const stride = failedCount > 0 ? Math.max(1, Math.floor(size / failedCount)) : 1
  const failedIdx = new Set()
  for (let k = 0; k < failedCount; k += 1) failedIdx.add((job.id * 3 + k * stride) % size)

  return Array.from({ length: size }, (_, i) => {
    const u = USERS[(job.id * 5 + i * 7) % USERS.length]
    const pending = i >= doneCount
    const failed = !pending && failedIdx.has(i)
    const f = FAILURES[(job.id + i) % FAILURES.length]
    return {
      id: `${job.jobId}-R${String(i + 1).padStart(4, '0')}`,
      seq: i + 1,
      userId: u.id,
      principal: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      department: u.department,
      account: u.username.toLowerCase(),
      verb: RECORD_VERB[job.operation] || 'Apply',
      outcome: pending ? 'Pending' : failed ? 'Failed' : 'Succeeded',
      attempts: failed ? 1 + ((job.id + i) % 3) : 1,
      latencyMs: pending ? null : 80 + ((job.id * 13 + i * 37) % 1900) + (failed ? 900 : 0),
      code: pending ? 'QUEUED' : failed ? f.code : 'OK',
      reason: pending ? 'Queued for dispatch' : failed ? f.reason : 'Applied to target',
      at: pending ? null : started + i * step,
    }
  })
}

export const errorGroupsFor = (job, records) => {
  const map = new Map()
  records.filter((r) => r.outcome === 'Failed').forEach((r) => {
    const g = map.get(r.code) || {
      code: r.code, reason: r.reason, count: 0, principals: [], attempts: 0,
      firstAt: r.at, lastAt: r.at, firstSeq: r.seq, lastSeq: r.seq,
    }
    g.count += 1
    g.attempts += r.attempts
    g.lastAt = r.at
    g.lastSeq = r.seq
    if (g.principals.length < 4) g.principals.push(r.principal)
    map.set(r.code, g)
  })
  const groups = [...map.values()]
  const sampled = groups.reduce((a, g) => a + g.count, 0)
  if (sampled === 0) return []
  return groups
    .map((g) => {
      const meta = FAILURES.find((f) => f.code === g.code) || FAILURES[0]
      return {
        ...g,
        hint: meta.hint,
        owner: meta.owner,
        retryable: meta.retryable,
        share: (g.count / sampled) * 100,
        estimated: Math.max(1, Math.round((g.count / sampled) * job.failed)),
      }
    })
    .sort((a, b) => b.count - a.count)
}

export const logLinesFor = (job, records, groups) => {
  const started = stampMs(job.started) || 0
  const conn = connectorFor(job)
  const worker = workerFor(job)
  const batch = batchSizeFor(job)
  const batches = Math.max(1, Math.min(8, Math.ceil(job.total / batch)))
  const perBatch = Math.ceil(job.total / batches)
  const span = Math.max(job.durationMs, 4000)
  const out = []
  let t = started
  let n = 0

  const push = (level, source, text, gap) => {
    t += gap == null ? 60 : gap
    n += 1
    out.push({ n, level, at: t, source, text })
  }

  push('INFO', 'dispatcher', `Accepted ${job.jobId} module=${job.module} operation="${job.operation}" worker=${worker}`, 0)
  push('DEBUG', 'dispatcher', `correlation_id=${correlationFor(job)} trigger=${job.triggeredBy} batch_size=${batch} retry_budget=3`)
  push('INFO', 'connector', `Resolving target "${job.target}"${conn ? ` connector=${conn.connector} method="${conn.method}"` : ''}`)
  if (conn) {
    push('DEBUG', 'connector', `tcp connect ${conn.host}:${conn.port} tls=${conn.port === '636' || conn.port === '443' ? 'true' : 'false'}`, 220)
    push('INFO', 'connector', `Session established with ${conn.host} in ${140 + (job.id % 90)}ms`, 180)
  } else {
    push('INFO', 'connector', 'Session established with the internal execution target', 180)
  }
  push('INFO', 'reader', `Enumerated ${job.total.toLocaleString('en-US')} source records for ${job.operation.toLowerCase()}`, 640)
  push('DEBUG', 'mapper', `Attribute map loaded: 12 mapped, 3 computed, 1 ignored`, 90)

  const gap = Math.max(90, Math.round(span / (batches + 2)))
  for (let b = 0; b < batches; b += 1) {
    const lo = b * perBatch + 1
    const hi = Math.min(job.total, (b + 1) * perBatch)
    push('INFO', 'writer', `Batch ${b + 1}/${batches} dispatching records ${lo}-${hi}`, gap)
    const g = groups[b % Math.max(1, groups.length)]
    if (groups.length > 0 && b % 2 === 1) {
      push('WARN', 'writer', `Retrying record seq=${g.firstSeq + b} attempt=2 code=${g.code}`, 140)
      push('ERROR', 'writer', `Record seq=${g.firstSeq + b} principal=${g.principals[0]} code=${g.code} message="${g.reason}"`, 90)
    }
    if (job.status !== 'Running' || b < batches - 1) {
      push('DEBUG', 'writer', `Batch ${b + 1} committed in ${Math.max(60, Math.round(gap * 0.7))}ms`, 120)
    }
  }

  if (job.status === 'Running') {
    push('INFO', 'writer', `Progress ${job.progress}% · ${job.succeeded.toLocaleString('en-US')} of ${job.total.toLocaleString('en-US')} records dispatched`, gap)
    push('DEBUG', 'writer', 'Awaiting acknowledgement from the target for the in-flight batch', 200)
    return out
  }

  groups.forEach((g) => {
    push('ERROR', 'reconciler', `Group ${g.code} affected ${g.estimated.toLocaleString('en-US')} records · sample=${g.principals.join(',')}`, 130)
  })

  push('INFO', 'reconciler', `Applied ${job.succeeded.toLocaleString('en-US')} records, rejected ${job.failed.toLocaleString('en-US')}`, 240)
  push('DEBUG', 'writer', `Result artefact written to /var/idam/results/${resultFileFor(job)}`, 110)
  push('INFO', 'connector', 'Session closed cleanly', 90)
  push(
    job.status === 'Failed' ? 'ERROR' : job.status === 'Canceled' ? 'WARN' : 'INFO',
    'dispatcher',
    job.status === 'Failed'
      ? `${job.jobId} finished with status FAILED after ${Math.round(job.durationMs / 1000)}s`
      : job.status === 'Canceled'
        ? `${job.jobId} canceled by operator after ${Math.round(job.durationMs / 1000)}s`
        : `${job.jobId} finished with status SUCCEEDED after ${Math.round(job.durationMs / 1000)}s`,
    140,
  )
  return out
}

export const relatedRuns = (job, pool = JOBS) => pool
  .filter((j) => String(j.id) !== String(job.id) && (j.target === job.target || j.module === job.module))
  .sort((a, b) => String(b.started).localeCompare(String(a.started)))
  .slice(0, 6)

export const LEVEL_COLOR = {
  ERROR: 'var(--bad)',
  WARN: 'var(--warn)',
  INFO: 'var(--ink-2)',
  DEBUG: 'var(--faint)',
}

export const LEVEL_BG = {
  ERROR: 'var(--bad-bg)',
  WARN: 'var(--warn-bg)',
  INFO: 'transparent',
  DEBUG: 'transparent',
}
