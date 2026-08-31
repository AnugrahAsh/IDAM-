import {
  APPLICATIONS, CAMPAIGNS, CERT_ITEMS, GROUPS, LOGS, LOOKUPS, MFA_METHODS, MY_APPS,
  ORGS, POLICIES, REQUESTS, ROLES, SOD_VIOLATIONS, USERS,
} from '../../data/seed'

const BASE_DAY = Date.UTC(2026, 7, 5)

export const dayStr = (n) => new Date(BASE_DAY - n * 86400000).toISOString().slice(0, 10)
export const stampStr = (n, h = 9) => `${dayStr(n)} ${String(h % 24).padStart(2, '0')}:${String((n * 13) % 60).padStart(2, '0')}`

const hash = (n) => {
  let x = (n * 2654435761) % 4294967296
  x ^= x >>> 13
  return Math.abs(x)
}
const seq = (id, i) => hash(id * 131 + i * 37 + 11)
const rotate = (arr, n) => {
  if (!arr.length) return []
  const k = ((n % arr.length) + arr.length) % arr.length
  return arr.slice(k).concat(arr.slice(0, k))
}

export const MANAGERS = [...new Set(
  USERS.map((u) => `${u.firstName} ${u.lastName}`).concat(USERS.map((u) => u.manager).filter(Boolean)),
)].sort()

export const optionsFor = (src) => {
  if (!src) return []
  if (src === 'organizations') return ORGS
  if (src === 'managers') return MANAGERS
  return LOOKUPS[src] || []
}

const APPROVERS = ['Priya Nair', 'Shubham Jain', 'Vansh Makhija', 'Elena Ferrer', 'Omar Haddad']

export const entitlementsFor = (user) => rotate(GROUPS, user.id * 3)
  .slice(0, 4 + (user.id % 5))
  .map((g, i) => {
    const s = seq(user.id, i)
    const kind = s % 3
    const role = ROLES[(s >> 3) % ROLES.length]
    const policy = POLICIES[(s >> 5) % POLICIES.length]
    const stale = (s >> 7) % 5 === 0
    return {
      id: `${user.id}-${g.id}`,
      groupId: g.id,
      group: g.name,
      kind: g.kind,
      description: g.description,
      application: g.application,
      sodFlags: g.sodFlags,
      owner: g.owner,
      grantedOn: dayStr(12 + (s % 620)),
      grantedBy: kind === 0 ? APPROVERS[s % APPROVERS.length] : kind === 1 ? 'Role engine' : 'Policy engine',
      source: kind === 0 ? 'Direct' : kind === 1 ? `Role · ${role.name}` : `Policy · ${policy.name}`,
      sourceKind: kind === 0 ? 'direct' : kind === 1 ? 'role' : 'policy',
      lastUsed: stale ? `${140 + (s % 130)}d ago` : `${1 + (s % 21)}d ago`,
      stale,
      requestId: kind === 0 ? `REQ-${2200 + (s % 280)}` : null,
    }
  })

export const provisionedFor = (user) => rotate(APPLICATIONS, user.id * 2)
  .slice(0, 3 + (user.id % 3))
  .map((a, i) => {
    const s = seq(user.id, 40 + i)
    return {
      id: a.id,
      name: a.displayName,
      code: a.name,
      connector: a.connector,
      method: a.method,
      host: a.host,
      account: a.connector === 'ad'
        ? `CN=${user.firstName} ${user.lastName},OU=Users`
        : user.username.toLowerCase(),
      state: a.status === 'Failed' ? 'Out of sync' : a.status === 'Degraded' && s % 2 === 0 ? 'Pending' : 'Provisioned',
      connectorStatus: a.status,
      provisionedOn: dayStr(28 + (s % 380)),
      lastSync: a.lastSync,
      owner: a.owner,
    }
  })

export const reachableAppsFor = (user) => rotate(MY_APPS, user.id * 5)
  .slice(0, 4 + (user.id % 6))
  .map((a, i) => {
    const s = seq(user.id, 70 + i)
    const ent = GROUPS[(s >> 2) % GROUPS.length]
    return {
      ...a,
      via: s % 3 === 0 ? 'Direct assignment' : s % 3 === 1 ? `Group · ${ent.name}` : 'Organization baseline',
      signIns30d: s % 4 === 0 ? 0 : 2 + (s % 90),
    }
  })

export const eventsFor = (user) => {
  const own = LOGS.filter((l) => l.actor === user.username)
  const seen = new Set(own.map((l) => l.id))
  const fill = rotate(LOGS.filter((l) => l.actor !== 'system' && !seen.has(l.id)), user.id * 4)
    .slice(0, Math.max(0, 14 - own.length))
    .map((l) => ({ ...l, id: `f-${l.id}`, actor: user.username }))
  return [...own, ...fill].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 14)
}

export const factorsFor = (user) => {
  const pool = MFA_METHODS.filter((m) => m.enabled)
  return rotate(pool, user.id).slice(0, 1 + (user.id % 3)).map((m, i) => {
    const s = seq(user.id, 60 + i)
    return {
      id: m.id,
      name: m.name,
      sub: m.sub,
      icon: m.icon,
      strength: m.strength,
      registered: dayStr(18 + (s % 460)),
      lastUsed: `${1 + (s % 14)}d ago`,
      primary: i === 0,
    }
  })
}

const DEVICE_POOL = [
  { model: 'MacBook Pro 14"', os: 'macOS 15.4', icon: 'device' },
  { model: 'iPhone 16 Pro', os: 'iOS 19.1', icon: 'phone' },
  { model: 'ThinkPad X1 Carbon', os: 'Windows 11 24H2', icon: 'device' },
  { model: 'Pixel 9', os: 'Android 16', icon: 'phone' },
  { model: 'iPad Air', os: 'iPadOS 19.1', icon: 'device' },
]

export const devicesFor = (user) => rotate(DEVICE_POOL, user.id).slice(0, 1 + (user.id % 3)).map((d, i) => {
  const s = seq(user.id, 100 + i)
  return {
    id: `${user.id}-dev-${i}`,
    ...d,
    trusted: s % 4 !== 0,
    enrolled: dayStr(30 + (s % 500)),
    lastSeen: `${1 + (s % 9)}d ago`,
    ip: `10.${s % 40}.${(s >> 3) % 250}.${2 + ((s >> 6) % 240)}`,
  }
})

const CLIENT_POOL = ['Chrome 141 · macOS', 'Safari 19 · iOS', 'Edge 141 · Windows', 'Firefox 143 · Linux']

export const sessionsFor = (user) => {
  if (user.status !== 'Active') return []
  return Array.from({ length: 1 + (user.id % 2) }, (_, i) => {
    const s = seq(user.id, 130 + i)
    return {
      id: `${user.id}-ses-${i}`,
      client: CLIENT_POOL[(s + i) % CLIENT_POOL.length],
      ip: `10.${s % 40}.${(s >> 4) % 250}.${2 + ((s >> 7) % 240)}`,
      location: `${user.city}, ${user.country}`,
      started: stampStr(0, 6 + (s % 9)),
      expires: stampStr(0, 18 + (s % 5)),
      current: i === 0,
    }
  })
}

export const healthFor = (user) => {
  const s = seq(user.id, 90)
  const passwordAge = 2 + (s % 118)
  return {
    passwordAge,
    passwordChanged: dayStr(passwordAge),
    passwordExpiresIn: Math.max(0, 90 - passwordAge),
    factors: 1 + (user.id % 3),
    signIns30d: user.status === 'Active' ? 14 + (s % 186) : 0,
    failed30d: (s >> 4) % 7,
    lockouts90d: user.status === 'Locked' ? 1 + (s % 3) : (s >> 6) % 4 === 0 ? 1 : 0,
    devices: 1 + (user.id % 3),
    sourceOfRecord: user.employeeType === 'Service Account' ? 'Manual (IT Operations)' : 'Workday HR',
    lastModified: stampStr(1 + (s % 40), 10 + (s % 8)),
    lastModifiedBy: APPROVERS[s % APPROVERS.length],
  }
}

export const sodFor = (user) => SOD_VIOLATIONS.filter((v) => v.userId === user.id)
export const requestsFor = (user) => REQUESTS.filter((r) => r.userId === user.id)
export const certItemsFor = (user) => CERT_ITEMS.filter((c) => c.userId === user.id)

export const recertHistoryFor = (user) => CAMPAIGNS.map((c, i) => {
  const s = seq(user.id, 120 + i)
  if ((s + i) % 4 === 0) return null
  const closed = c.status === 'Closed'
  return {
    id: c.id,
    campaign: c.name,
    scope: c.scope,
    reviewer: c.auditor,
    items: 2 + (s % 7),
    decision: closed ? 'Certified' : ['Certified', 'Pending', 'Revoked', 'Certified'][s % 4],
    decidedOn: closed ? dayStr(116 - i * 3) : null,
    status: c.status,
  }
}).filter(Boolean)

/* The values an attribute plausibly held before the change that replaced it. */
const PRIOR_DESIGNATIONS = ['Engineer', 'Analyst', 'Senior Engineer', 'Lead', 'Architect']
const PRIOR_OFFICE_LEVELS = ['Field', 'Sub-Divisional', 'Divisional', 'Zonal', 'Corporate']

export const auditFor = (user) => {
  const h = healthFor(user)
  const s = seq(user.id, 150)
  const trail = [
    {
      id: 'created',
      ts: user.createdOn,
      action: 'Identity created',
      actor: user.createdBy,
      detail: `Sourced from ${h.sourceOfRecord} · employee code ${user.empCode}`,
      tone: 'acc',
      changes: [
        { attribute: 'Username', from: '', to: user.username },
        { attribute: 'Email', from: '', to: user.email },
        { attribute: 'Employee type', from: '', to: user.employeeType },
      ],
    },
    {
      id: 'baseline',
      ts: `${String(user.createdOn).slice(0, 10)} 11:${String((s >> 2) % 60).padStart(2, '0')}`,
      action: 'Organization baseline applied',
      actor: 'Policy engine',
      detail: `Joined ${user.organization} · ${user.department}`,
      tone: 'ok',
      changes: [
        { attribute: 'Organization', from: 'Unassigned', to: user.organization },
        { attribute: 'Department', from: 'Unassigned', to: user.department },
      ],
    },
    {
      id: 'pw',
      ts: `${h.passwordChanged} 09:${String(s % 60).padStart(2, '0')}`,
      action: 'Password changed',
      actor: user.username,
      detail: 'Self-service change from the sign-in portal',
      tone: 'ok',
      changes: [{ attribute: 'Credential', from: 'Set 2026-02-11', to: 'Replaced · history depth 6' }],
    },
    {
      id: 'mod',
      ts: h.lastModified,
      action: 'Attributes updated',
      actor: h.lastModifiedBy,
      detail: `Designation and office level revised to ${user.designation} · ${user.officeLevel}`,
      tone: 'acc',
      // The previous values are what an auditor is actually asking for; the
      // action verb alone answers nothing.
      changes: [
        { attribute: 'Designation', from: PRIOR_DESIGNATIONS[s % PRIOR_DESIGNATIONS.length], to: user.designation },
        { attribute: 'Office level', from: PRIOR_OFFICE_LEVELS[s % PRIOR_OFFICE_LEVELS.length], to: user.officeLevel },
        { attribute: 'Reporting employee id', from: `EMP${1000 + ((s + 3) % 12)}`, to: user.reportingEmpId },
      ],
    },
  ]
  if ((s >> 8) % 4 === 0) {
    trail.push({
      id: 'mfa',
      ts: stampStr(3 + (s % 20), 14),
      action: 'MFA factors reset',
      actor: 'Helpdesk Operator',
      detail: 'All factors removed. Re-enrollment required at next sign-in.',
      tone: 'warn',
      changes: [
        { attribute: 'Enrolled factors', from: '2 enrolled', to: 'None — re-enrollment forced' },
        { attribute: 'Active sessions', from: 'Signed in', to: 'Revoked on every device' },
      ],
    })
  }
  if (user.status === 'Locked') {
    trail.push({
      id: 'lock',
      ts: stampStr(1, 8),
      action: 'Account locked',
      actor: 'system',
      detail: `${h.lockouts90d} lockouts in the last 90 days · repeated authentication failures`,
      tone: 'bad',
      changes: [{ attribute: 'Status', from: 'Active', to: 'Locked' }],
    })
  }
  return trail.sort((a, b) => (a.ts < b.ts ? 1 : -1))
}
