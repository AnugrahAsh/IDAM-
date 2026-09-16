import { APPLICATIONS, USERS } from '../../data/seed'

export const SOURCES = APPLICATIONS.slice(0, 6)

export const ACTIONS = ['Link to identity', 'Manual review', 'Create identity']

export const TYPES = ['Internal', 'External', 'Contractor', 'Service Account']

export const UNMATCHED = 'No matching identity'

export const MODES = ['Delta', 'Full']

export const THRESHOLDS = { link: 85, review: 70 }

export const RULE_TYPES = ['Exact', 'Normalised', 'Case-insensitive', 'Fuzzy']

export const confidenceTone = (c) => (c >= THRESHOLDS.link ? 'ok' : c >= THRESHOLDS.review ? 'warn' : 'bad')

export const stateTone = (s) => ({ Open: 'info', Imported: 'ok', Suppressed: 'mut' }[s] || 'mut')

export const runTone = (s) => ({ Succeeded: 'ok', Running: 'info', Failed: 'bad', Partial: 'warn' }[s] || 'mut')

export const actionFor = (matched, confidence) =>
  (!matched ? ACTIONS[2] : confidence >= THRESHOLDS.link ? ACTIONS[0] : ACTIONS[1])

const shift = (stamp, mins) => {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(stamp || '')
  if (!m) return '—'
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) - mins * 60000
  const iso = new Date(t).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

const RULE_NAMES = ['Exact email match', 'Normalised username', 'Employee code', 'Given and family name']

const DELTA_FIELDS = ['department', 'designation', 'officeLevel', 'manager', 'mobileNo', 'status']

const buildCandidates = (app, runIdx) =>
  Array.from({ length: 14 + ((app.id * 4 + runIdx * 7) % 13) }, (_, i) => {
    const u = USERS[(i * 3 + app.id * 5 + runIdx * 7) % USERS.length]
    const seed = (i * 37 + app.id * 13 + runIdx * 11) % 100
    const unmatched = seed % 5 === 0 || seed % 13 === 0
    const confidence = unmatched ? 12 + (seed % 34) : 58 + (seed % 42)
    const changed = !unmatched && seed % 3 === 1
    return {
      id: `${app.name}-${runIdx}-${String(i + 1).padStart(3, '0')}`,
      account: `${u.username.toLowerCase()}@${app.name.toLowerCase()}`,
      employeeType: u.employeeType,
      department: u.department,
      userId: unmatched ? null : u.id,
      matchedTo: unmatched ? null : u.username,
      matchedEmail: unmatched ? null : u.email,
      matchState: unmatched ? 'Unmatched' : 'Matched',
      confidence,
      changed,
      deltaFields: changed ? DELTA_FIELDS.filter((_, k) => (seed + k) % 4 === 0) : [],
      rule: unmatched ? '—' : RULE_NAMES[seed % RULE_NAMES.length],
      firstSeen: shift(app.lastSync, 1440 * (1 + (seed % 30))),
      lastSeen: u.lastLogin,
      action: actionFor(!unmatched, confidence),
    }
  })

const runStatus = (app, k) => {
  if (k > 0) return 'Succeeded'
  if (app.status === 'Failed') return 'Failed'
  if (app.name === 'SALESFORCE') return 'Running'
  return 'Succeeded'
}

export const RUNS = SOURCES.flatMap((app, si) => [0, 1, 2].map((k) => {
  const idx = si * 3 + k
  const candidates = buildCandidates(app, idx)
  const status = runStatus(app, k)
  const fresh = candidates.filter((c) => !c.matchedTo).length
  const modified = candidates.filter((c) => c.changed).length
  const unresolved = candidates.filter((c) => c.matchedTo && c.confidence < THRESHOLDS.review).length
  const ready = candidates.filter((c) => c.confidence >= THRESHOLDS.link).length
  return {
    id: `REC-${4300 + idx}`,
    applicationId: app.id,
    source: app.displayName,
    sourceName: app.name,
    connector: app.connector,
    method: app.method,
    host: app.host,
    owner: app.owner,
    mode: k === 2 ? 'Full' : 'Delta',
    status,
    started: shift(app.lastSync, k * 180),
    durationMs: 38000 + ((app.id * 7919 + k * 42331) % 780000),
    scanned: k === 0 ? app.accounts : Math.max(1, Math.round(app.accounts * 0.98)),
    candidates,
    total: candidates.length,
    fresh,
    modified,
    unresolved,
    ready,
    triggeredBy: k === 1 ? 'admin' : 'Scheduler',
    ruleSet: `${app.name}_CORRELATION_V${1 + (k % 2)}`,
    progress: status === 'Running' ? 40 + ((app.id * 7) % 45) : 100,
  }
}))

export const RUN_BY_ID = Object.fromEntries(RUNS.map((r) => [r.id, r]))

export const latestRunFor = (applicationId) => RUNS.find((r) => r.applicationId === applicationId)

export const runsForSource = (applicationId) => RUNS.filter((r) => r.applicationId === applicationId)

export const SCHEDULES = ['Manual only', 'Daily · 03:00', 'Weekly · Sunday 02:00']

export const IDAM_ATTRIBUTES = ['email', 'username', 'empCode', 'firstName + lastName', 'mobileNo', 'department', 'designation']

// An application onboarded for reconciliation: the target connection plus the
// matching (correlation) configuration that binds target accounts to identities.
export const defaultConfig = (app) => ({
  id: app.id,
  appId: app.id,
  name: app.name,
  displayName: app.displayName,
  connector: app.connector,
  method: app.method,
  host: app.host,
  port: app.port,
  owner: app.owner,
  accounts: app.accounts,
  health: app.status,
  mode: 'Delta',
  schedule: SCHEDULES[1],
  rules: RULE_LIBRARY.map((r) => ({ ...r })),
  link: THRESHOLDS.link,
  review: THRESHOLDS.review,
  onboardedOn: app.lastSync,
})

// Identities in the store with no corresponding account on the target for this
// run. Deterministic demo selection so every visit shows the same records.
export const unmatchedIdentitiesFor = (run) => {
  const matched = new Set(run.candidates.map((c) => c.userId).filter(Boolean))
  return USERS
    .filter((u) => u.status === 'Active' && !matched.has(u.id) && (u.id + run.applicationId) % 4 === 0)
    .slice(0, 10)
}

export const RULE_LIBRARY = [
  { id: 1, order: 1, name: 'Exact email match', target: 'mail', idam: 'email', type: 'Exact', weight: 45, enabled: true, description: 'Highest trust binding. A single exact hit resolves the candidate outright.' },
  { id: 2, order: 2, name: 'Normalised username', target: 'accountName', idam: 'username', type: 'Normalised', weight: 30, enabled: true, description: 'Strips domain prefixes and separators before comparing.' },
  { id: 3, order: 3, name: 'Employee code', target: 'employeeID', idam: 'empCode', type: 'Exact', weight: 20, enabled: true, description: 'Authoritative for identities sourced from the HR feed.' },
  { id: 4, order: 4, name: 'Given and family name', target: 'displayName', idam: 'firstName + lastName', type: 'Fuzzy', weight: 10, enabled: true, description: 'Contributes only when a stronger rule has already partially matched.' },
  { id: 5, order: 5, name: 'Mobile number', target: 'mobile', idam: 'mobileNo', type: 'Exact', weight: 8, enabled: false, description: 'Disabled by default. Shared handsets produce false positives.' },
]

export const rulesFor = (run) => RULE_LIBRARY.map((r, i) => ({
  ...r,
  hits: r.enabled ? Math.max(0, Math.round(run.total * (r.weight / 120)) + ((run.applicationId + i) % 4)) : 0,
}))

export const PHASE_TEMPLATE = [
  { id: 'connect', label: 'Open target connection', detail: 'Service credential bound and TLS negotiated.' },
  { id: 'read', label: 'Read account inventory', detail: 'Paged read of every account object on the target.' },
  { id: 'correlate', label: 'Correlate against the identity store', detail: 'Correlation rules evaluated in weight order.' },
  { id: 'score', label: 'Score and classify candidates', detail: 'Confidence computed and a proposed action assigned.' },
  { id: 'publish', label: 'Publish the candidate queue', detail: 'Results written to the reconciliation queue for review.' },
]

export const phasesFor = (run) => {
  const failAt = run.status === 'Failed' ? 1 : -1
  const runningAt = run.status === 'Running' ? 3 : -1
  return PHASE_TEMPLATE.map((p, i) => {
    let state = 'done'
    if (failAt >= 0 && i === failAt) state = 'failed'
    else if (failAt >= 0 && i > failAt) state = 'skipped'
    else if (runningAt >= 0 && i === runningAt) state = 'running'
    else if (runningAt >= 0 && i > runningAt) state = 'pending'
    return {
      ...p,
      state,
      detail: state === 'failed'
        ? `Read abandoned after ${Math.round(run.durationMs / 1000)}s. The target closed the connection mid-page.`
        : state === 'skipped'
          ? 'Not attempted because the previous phase failed.'
          : state === 'pending'
            ? 'Queued.'
            : p.detail,
      ms: state === 'done' ? Math.round(run.durationMs / PHASE_TEMPLATE.length) : 0,
    }
  })
}
