// Derived report datasets for the Reports centre.
// Everything is computed from the read-only demo seed so the numbers stay
// consistent with the rest of the console.

import {
  USERS, ORGS, GROUPS, APPLICATIONS, LOGS, SIGNIN_SERIES, DELIVERY_LOG, ROLES, DEPARTMENTS,
} from '../../data/seed'

// The seed clock. Every stamp in the seed is generated backwards from this day.
export const TODAY = '2026-08-05'

export const dayOf = (ts) => String(ts || '').slice(0, 10)
export const timeOf = (ts) => String(ts || '').slice(11, 16)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const niceDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '—'
}

export const shiftDays = (iso, n) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  if (!m) return iso
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - n * 86400000)
  return d.toISOString().slice(0, 10)
}

export const daysBetween = (a, b) => {
  const pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(a || ''))
  const pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(b || ''))
  if (!pa || !pb) return null
  const ta = Date.UTC(Number(pa[1]), Number(pa[2]) - 1, Number(pa[3]))
  const tb = Date.UTC(Number(pb[1]), Number(pb[2]) - 1, Number(pb[3]))
  return Math.round((tb - ta) / 86400000)
}

const USER_BY_NAME = new Map(USERS.map((u) => [u.username, u]))
export const userByName = (name) => USER_BY_NAME.get(name) || null

const APP_NAMES = APPLICATIONS.map((a) => a.displayName)
export const APPLICATION_OPTIONS = APP_NAMES
export const ORG_OPTIONS = ORGS
export const DEPARTMENT_OPTIONS = DEPARTMENTS

// Entitlements that confer administrative or financially material rights.
const PRIVILEGED_GROUPS = new Set([
  'IT_DOMAIN_ADMIN', 'ENG_REPO_ADMIN', 'ENG_PROD_DEPLOY', 'HR_PAYROLL_RUN', 'FIN_AP_APPROVE',
])

// Deterministic entitlement model: which groups each identity holds. Standard
// entitlements are common; privileged ones are granted to a small minority.
export const groupsFor = (u) => GROUPS.filter((g, gi) => {
  if (PRIVILEGED_GROUPS.has(g.name)) return (u.id * 5 + gi * 3) % 17 === 0
  return (u.id * 3 + gi * 7) % 11 < 3
})

// Distinct values actually present in a dataset — keeps filter dropdowns honest.
export const optionsOf = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()

// The same, for a value the row keeps somewhere other than a top-level key.
export const optionsBy = (rows, read) => [...new Set(rows.map(read).filter(Boolean))].sort()

/**
 * The platform event a notification was rendered from.
 *
 * A delivery row stores one event key, and that key is both "what happened"
 * and "which template was used" — the two are the same column, so one filter
 * answers both. The label is carried here so the drawer reads as English while
 * the filter still matches the key the register stores.
 */
const EVENT_LABELS = {
  'user.created': 'Account created',
  'password.set': 'Password set',
  'password.reset': 'Password reset',
  'mfa.reset': 'MFA reset',
  'recert.reminder': 'Recertification reminder',
}
export const eventLabel = (e) => (EVENT_LABELS[e] ? `${EVENT_LABELS[e]} (${e})` : e)
export const eventOptions = (rows) =>
  optionsOf(rows, 'event').map((e) => ({ value: e, label: eventLabel(e) }))

/**
 * How a session was authenticated.
 *
 * The row carries the client the sign-in arrived from; the method it was
 * authenticated with is recorded in the grant response, so it is read from
 * there rather than duplicated onto the row.
 */
export const authMethodOf = (r) => {
  const d = r && r.response && Array.isArray(r.response.data) ? r.response.data[0] : null
  return d ? d.auth_method || null : null
}
export const mfaFactorOf = (r) => {
  const d = r && r.response && Array.isArray(r.response.data) ? r.response.data[0] : null
  return d ? d.mfa_factor || null : null
}
const METHOD_LABELS = { 'password+mfa': 'Password + MFA', federated_sso: 'Federated SSO' }
export const methodLabel = (m) => METHOD_LABELS[m] || m
export const methodOptions = (rows) =>
  optionsBy(rows, authMethodOf).map((m) => ({ value: m, label: methodLabel(m) }))

const FAIL_REASONS = [
  'Invalid credentials', 'Account locked', 'Expired password',
  'Unknown username', 'Second factor rejected', 'Blocked by network policy',
]
const RESET_CHANNELS = ['Self-service portal', 'Service desk', 'Administrative reset', 'Expiry-forced reset']
// What the credential was set to before the reset overwrote it.
const PRIOR_SET = ['2026-05-11 09:20', '2026-03-02 14:41', '2025-12-19 08:05', '2026-06-27 17:33']
const CLIENTS = ['Web console', 'Mobile app', 'Desktop SSO agent', 'API client']

/**
 * The evidence behind a row.
 *
 * Every report answers "what happened"; the detail panel answers "prove it".
 * For an event the platform issued or refused, that proof is the response it
 * returned; for an event that wrote to a record, it is the attribute diff. The
 * builders below keep both shapes in one place so a new report picks up the
 * same vocabulary rather than inventing its own.
 */
const sessionRef = (seed) => `sess_${(seed * 7919 + 100000).toString(36).toUpperCase()}`
const traceRef = (seed) => `${String(3309650000 + seed * 7919).slice(0, 10)}_${17665097000000 + seed * 1373}`

const FACTORS = ['TOTP', 'Passkey', 'Push', 'Email OTP', 'None']

const grantResponse = (seed, { username, application, client, ip }) => ({
  code: 200,
  status: 'success',
  data: [
    {
      subject: username,
      session_id: sessionRef(seed),
      uniqueid: traceRef(seed),
      application,
      client,
      auth_method: seed % 4 === 0 ? 'password+mfa' : 'federated_sso',
      mfa_factor: FACTORS[seed % FACTORS.length],
      token_type: 'Bearer',
      expires_in: 3600,
      source_ip: ip,
    },
  ],
})

const DENIAL_CODES = {
  'Account locked': 423,
  'Wrong password': 401,
  'MFA challenge failed': 401,
  'Password expired': 403,
}

const denialResponse = (seed, { username, application, reason, attempts, ip }) => {
  const code = DENIAL_CODES[reason] || 401
  return {
    code,
    status: 'error',
    data: [
      {
        subject: username,
        uniqueid: traceRef(seed),
        application,
        source_ip: ip,
      },
    ],
    error: {
      reason,
      attempts,
      attempts_remaining: Math.max(0, 5 - attempts),
      locked: code === 423,
      retryable: code !== 423,
    },
  }
}

const diff = (pairs) => pairs.map(([attribute, from, to]) => ({ attribute, from, to }))

// ---------------------------------------------------------------- successful

// Two complementary sources: explicit sign-in events recorded in the audit log,
// and the last successful sign-in held on every directory identity.
export const SUCCESSFUL_LOGINS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Sign-in succeeded').forEach((l) => {
    const u = userByName(l.actor)
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      name: u ? `${u.firstName} ${u.lastName}` : '—',
      email: u ? u.email : '—',
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
      client: CLIENTS[l.id % CLIENTS.length],
      ip: l.ip,
      outcome: l.outcome,
      source: 'Audit event',
      statusCode: 200,
      response: grantResponse(l.id, {
        username: l.actor,
        application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
        client: CLIENTS[l.id % CLIENTS.length],
        ip: l.ip,
      }),
    })
  })

  USERS.filter((u) => u.lastLogin).forEach((u) => {
    out.push({
      id: `usr-${u.id}`,
      ts: u.lastLogin,
      username: u.username,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      organization: u.organization,
      department: u.department,
      application: APP_NAMES[u.id % APP_NAMES.length],
      client: CLIENTS[u.id % CLIENTS.length],
      ip: `10.${u.id % 40}.${(u.id * 13) % 250}.${(u.id % 240) + 2}`,
      outcome: 'Allowed',
      source: 'Last sign-in',
      statusCode: 200,
      response: grantResponse(u.id, {
        username: u.username,
        application: APP_NAMES[u.id % APP_NAMES.length],
        client: CLIENTS[u.id % CLIENTS.length],
        ip: `10.${u.id % 40}.${(u.id * 13) % 250}.${(u.id % 240) + 2}`,
      }),
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// Hourly success / failure profile straight from the seed series.
export const SIGNIN_PROFILE = SIGNIN_SERIES.map((p) => ({ ...p }))

// -------------------------------------------------------------------- failed

export const FAILED_LOGINS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Sign-in failed' || l.outcome === 'Denied').forEach((l) => {
    const u = userByName(l.actor)
    const denial = denialResponse(l.id, {
      username: l.actor,
      application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
      reason: FAIL_REASONS[l.id % FAIL_REASONS.length],
      attempts: 1 + (l.id % 4),
      ip: l.ip,
    })
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      application: APP_NAMES.includes(l.target) ? l.target : APP_NAMES[l.id % APP_NAMES.length],
      reason: FAIL_REASONS[l.id % FAIL_REASONS.length],
      attempts: 1 + (l.id % 4),
      ip: l.ip,
      outcome: l.outcome === 'Denied' ? 'Denied' : 'Failed',
      statusCode: denial.code,
      response: denial,
    })
  })

  // Lockout-driven failures for identities the directory reports as locked.
  USERS.filter((u) => u.status === 'Locked').forEach((u) => {
    out.push({
      id: `lock-${u.id}`,
      ts: u.lastLogin,
      username: u.username,
      organization: u.organization,
      department: u.department,
      application: APP_NAMES[(u.id + 3) % APP_NAMES.length],
      reason: 'Account locked',
      attempts: 5 + (u.id % 3),
      ip: `10.${(u.id * 7) % 40}.${(u.id * 11) % 250}.${(u.id % 240) + 2}`,
      outcome: 'Denied',
      statusCode: 423,
      response: denialResponse(u.id, {
        username: u.username,
        application: APP_NAMES[(u.id + 3) % APP_NAMES.length],
        reason: 'Account locked',
        attempts: 5 + (u.id % 3),
        ip: `10.${(u.id * 7) % 40}.${(u.id * 11) % 250}.${(u.id % 240) + 2}`,
      }),
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// --------------------------------------------------------------- user access

export const USER_ACCESS = USERS.map((u) => {
  const groups = groupsFor(u)
  return {
    id: u.id,
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    organization: u.organization,
    department: u.department,
    employeeType: u.employeeType,
    status: u.status,
    manager: u.manager || '—',
    groupCount: groups.length,
    groups: groups.map((g) => g.name).join(', ') || '—',
    applications: [...new Set(groups.map((g) => g.application))].join(', ') || '—',
    privileged: groups.some((g) => PRIVILEGED_GROUPS.has(g.name)),
    sodFlags: groups.reduce((a, g) => a + g.sodFlags, 0),
    /* The table has to flatten these to a comma string to fit a cell, which is
       where an entitlement review actually stops being readable. The structured
       lists travel with the row so the detail panel can show them as the sets
       they are, with the privileged ones called out. */
    lists: [
      {
        k: 'Entitlements held',
        icon: 'group',
        items: groups.map((g) => ({
          label: g.name,
          sub: `${g.kind} · ${g.application}`,
          flag: PRIVILEGED_GROUPS.has(g.name) ? 'Privileged' : null,
        })),
      },
      {
        k: 'Applications reached',
        icon: 'apps',
        items: [...new Set(groups.map((g) => g.application))].map((a) => ({
          label: a,
          sub: `${groups.filter((g) => g.application === a).length} entitlement(s)`,
        })),
      },
      {
        k: 'Segregation-of-duties flags',
        icon: 'sod',
        items: groups.filter((g) => g.sodFlags > 0).map((g) => ({
          label: g.name,
          sub: `${g.sodFlags} open conflict${g.sodFlags === 1 ? '' : 's'} on ${g.application}`,
          flag: 'Conflict',
        })),
      },
    ],
    lastLogin: u.lastLogin,
    ts: u.lastLogin,
  }
})

// ---------------------------------------------------------- locked / disabled

const LOCK_CAUSES = {
  Locked: 'Lockout threshold reached after repeated failed sign-ins',
  Disabled: 'Deactivated by the identity lifecycle process',
}

export const LOCKED_ACCOUNTS = USERS
  .filter((u) => u.status === 'Locked' || u.status === 'Disabled')
  .map((u) => ({
    id: u.id,
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    organization: u.organization,
    department: u.department,
    employeeType: u.employeeType,
    status: u.status,
    reason: LOCK_CAUSES[u.status],
    lastLogin: u.lastLogin,
    ts: u.lastLogin,
    dormantDays: daysBetween(dayOf(u.lastLogin), TODAY),
    entitlements: groupsFor(u).length,
    changes: diff(u.status === 'Locked'
      ? [
        ['account_status', 'ACTIVE', 'LOCKED'],
        ['failed_attempts', '4', '5'],
        ['locked_on', 'null', u.lastLogin],
        ['unlock_at', 'null', 'Manual unlock required'],
      ]
      : [
        ['account_status', 'ACTIVE', 'DISABLED'],
        ['deactivated_on', 'null', dayOf(u.lastLogin)],
        ['deactivated_by', 'null', 'Identity lifecycle'],
        ['entitlements_retained', String(groupsFor(u).length), String(groupsFor(u).length)],
      ]),
  }))
  .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

// ------------------------------------------------------- password resets

export const PASSWORD_RESETS = (() => {
  const out = []

  LOGS.filter((l) => l.action === 'Password reset').forEach((l) => {
    const u = userByName(l.actor)
    out.push({
      id: `log-${l.id}`,
      ts: l.ts,
      username: l.actor,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      channel: RESET_CHANNELS[l.id % RESET_CHANNELS.length],
      performedBy: l.actor === 'system' ? 'system' : l.id % 3 === 0 ? 'SHUBHAM_JAIN' : l.actor,
      outcome: l.outcome === 'Denied' ? 'Failed' : 'Completed',
      ip: l.ip,
      changes: l.outcome === 'Denied' ? [] : diff([
        ['password_last_set', PRIOR_SET[l.id % PRIOR_SET.length], l.ts],
        ['force_change_at_next_login', 'false', 'true'],
        ['failed_attempts', String(1 + (l.id % 4)), '0'],
        ['account_status', 'LOCKED', 'ACTIVE'],
      ]),
    })
  })

  // Reset notices actually delivered to the identity.
  DELIVERY_LOG.filter((d) => d.event === 'password.set').forEach((d) => {
    const u = userByName(d.username)
    out.push({
      id: `del-${d.id}`,
      ts: d.ts,
      username: d.username,
      organization: u ? u.organization : '—',
      department: u ? u.department : '—',
      channel: d.channel === 'SMS' ? 'Self-service portal' : 'Service desk',
      performedBy: u ? u.username : 'system',
      outcome: d.status === 'Failed' ? 'Notice failed' : 'Completed',
      ip: `10.${d.id % 40}.${(d.id * 17) % 250}.${(d.id % 240) + 2}`,
      changes: diff([
        ['password_last_set', PRIOR_SET[d.id % PRIOR_SET.length], d.ts],
        ['force_change_at_next_login', 'false', 'true'],
        ['reset_notice_channel', 'null', d.channel],
        ['reset_notice_status', 'null', d.status],
      ]),
    })
  })

  return out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})()

// ------------------------------------------------------------------ delivery

/**
 * What the provider answered.
 *
 * A delivery row that says only "Failed" cannot be chased with the gateway —
 * the provider's own status code and message id are what a support ticket is
 * opened against, so the recorded response travels with the row and the report
 * can show it verbatim.
 */
const providerRef = (id, seed) => `${String(3309650000 + id * 7919).slice(0, 10)}_${17665097000000 + seed * 1373}`

const deliveryResponse = (d) => {
  const failed = d.status === 'Failed' || d.status === 'Bounced'
  const pending = d.status === 'Queued' || d.status === 'Pending'
  const code = failed ? 422 : pending ? 202 : 200
  return {
    code,
    status: failed ? 'error' : 'success',
    data: [
      {
        [d.channel === 'SMS' ? 'mobile' : 'address']: String(d.recipient || '').replace(/^\+/, ''),
        uniqueid: providerRef(d.id, d.id + 3),
        clientuid: `409ce490AA07e7AA4259AAb127AA97c271c3e9c7`.slice(0, 40),
        channel: d.channel,
        event: d.event,
      },
    ],
    ...(failed ? { error: { reason: d.detail, retryable: false } } : {}),
  }
}

export const DELIVERY_REPORT = DELIVERY_LOG.map((d) => {
  const u = userByName(d.username)
  const response = deliveryResponse(d)
  return {
    id: d.id,
    ts: d.ts,
    channel: d.channel,
    event: d.event,
    recipient: d.recipient,
    username: d.username,
    organization: u ? u.organization : '—',
    status: d.status,
    statusCode: response.code,
    detail: d.detail,
    response,
  }
}).sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

// --------------------------------------------------------------- audit trail

const SIGNIN_ACTIONS = ['Sign-in succeeded', 'Sign-in failed']

/**
 * What a write actually changed.
 *
 * "Modified user" is not an audit record — it says something happened without
 * saying what. An auditor asking "what was the department before?" needs the
 * previous value, so every write carries an attribute-level diff and the
 * report can expand a row to show it.
 */
/**
 * The platform names its actions verb-last — "Role modified", "Entitlement
 * granted", "Configuration changed" — so this cannot be anchored to the start
 * of the string. Anchored, it matched nothing and every audit event reported
 * itself as having changed no attribute.
 */
const WRITE_VERBS = /\b(created|updated|modified|changed|deleted|removed|granted|revoked|assigned|enabled|disabled|reset|locked|unlocked|added)\b/i

/**
 * The diff an action would plausibly have written. Keyed by the action so a
 * role change shows role attributes and a configuration change shows
 * configuration ones; a creation writes over `null`, which is what the record
 * actually held before the event.
 */
/**
 * Not every attribute holds a scalar.
 *
 * A password rule is a list, a role is a set of permissions, a connector is a
 * document. Written into the trail as text they arrive as "[object Object]" or
 * as a comma string that has already lost which value sat under which key —
 * and an auditor cannot answer "which character class was dropped" from that.
 * These carry the shape the platform actually stored. The detail panel decides
 * how to render a value from what it is: a document as a document, a scalar as
 * text — so one table holds both without either being bent into the other.
 */
const DIFF_BY_ACTION = {
  'Entitlement granted': [
    ['membership_status', 'null', 'ACTIVE'],
    ['granted_on', 'null', '2026-08-05 20:00'],
    ['granted_by', 'null', 'NEHA.PILLAI'],
    ['entitlement_scope', null, {
      application: 'Workday HR',
      group: 'HR_PAYROLL_RUN',
      expires_on: '2026-11-03',
      conditions: ['network:corp', 'mfa:required'],
    }],
    ['source', 'null', 'Access request'],
  ],
  'Entitlement revoked': [
    ['membership_status', 'ACTIVE', 'REVOKED'],
    ['revoked_on', 'null', '2026-08-05 20:00'],
    ['revoked_by', 'null', 'NEHA.PILLAI'],
  ],
  'Role modified': [
    ['display_name', 'Access Approver', 'Access Approver (Finance)'],
    ['scope', 'Global', 'Tanflow · Finance'],
    ['risk', 'medium', 'high'],
    ['role_permissions',
      [
        { module: 'Approvals', actions: ['view', 'approve'] },
        { module: 'Reports', actions: ['view'] },
      ],
      [
        { module: 'Approvals', actions: ['view', 'approve', 'reassign'] },
        { module: 'Reports', actions: ['view', 'export'] },
        { module: 'Directory', actions: ['view'] },
      ]],
  ],
  'Password reset': [
    ['password_last_set', '2026-05-11 09:20', '2026-08-05 20:00'],
    ['force_change_at_next_login', 'false', 'true'],
    ['failed_attempts', '3', '0'],
  ],
  'MFA factor removed': [
    ['factor_type', 'TOTP', 'null'],
    ['factor_status', 'ENROLLED', 'null'],
    ['enrolled_on', '2026-02-14 11:02', 'null'],
  ],
  'Configuration changed': [
    ['session_idle_minutes', '30', '15'],
    ['device_trust', 'false', 'true'],
    ['required_characters', ['#', '@', '!'], null],
    ['characters_not_allowed', ['^'], ['^', '%', '&']],
    ['connector_config',
      {
        host: 'ldaps://dir.tanflow.com',
        port: 636,
        bind_dn: 'cn=svc_idam,ou=service,dc=tanflow,dc=com',
        page_size: 500,
        tls: { verify: true, min_version: 'TLSv1.2' },
      },
      {
        host: 'ldaps://dir.tanflow.com',
        port: 636,
        bind_dn: 'cn=svc_idam,ou=service,dc=tanflow,dc=com',
        page_size: 1000,
        tls: { verify: true, min_version: 'TLSv1.3' },
      }],
    ['updated_by', 'null', 'ALISHA.JOHN'],
  ],
}

const DIFF_SHAPES = [
  [['Department', 'Finance', 'IT Operations'], ['Office level', 'Regional', 'Corporate']],
  [['Status', 'Active', 'Disabled'], ['Deactivated on', '—', '2026-08-05']],
  [['Designation', 'Engineer', 'Senior Engineer'], ['Reporting employee id', 'EMP1004', 'EMP1011']],
  [['Group membership', 'Not held', 'FIN_GL_POST'], ['Granted by', '—', 'Access request REQ-2431']],
  [['Role', 'Standard User', 'Access Approver'], ['Scope', 'Global', 'Tanflow · Finance']],
  [['Mobile no', '+91 98••••4471', '+91 98••••9920']],
  [['Password policy', 'Default Strong Policy', 'Contractor Policy'], ['Applies from', '—', 'Next credential change']],
  [['Multi-factor methods', '2 enrolled', 'Cleared — re-enrollment forced']],
  [['Email', 'j.doe@tanflow.com', 'jane.doe@tanflow.com']],
  [['Organization', 'Tanflow', 'Tanflow · Finance'], ['Manager', 'Priya Nair', 'Rohan Mehta']],
  [
    ['notification_channels', ['email'], ['email', 'sms', 'webhook']],
    ['digest_schedule',
      { cron: '0 9 * * 1', timezone: 'Asia/Kolkata', quiet_hours: null },
      { cron: '0 9 * * 1-5', timezone: 'Asia/Kolkata', quiet_hours: { from: '21:00', to: '07:00' } }],
  ],
]

export const AUDIT_TRAIL = LOGS
  .filter((l) => !SIGNIN_ACTIONS.includes(l.action))
  .map((l) => {
    const u = userByName(l.actor)
    const isWrite = WRITE_VERBS.test(l.action) && l.outcome !== 'Denied'
    const shape = DIFF_BY_ACTION[l.action] || DIFF_SHAPES[l.id % DIFF_SHAPES.length]
    return {
      id: l.id,
      ts: l.ts,
      level: l.level,
      category: l.category,
      actor: l.actor,
      organization: u ? u.organization : 'Platform',
      action: l.action,
      target: l.target,
      application: APP_NAMES.includes(l.target) ? l.target : '—',
      ip: l.ip,
      outcome: l.outcome,
      // A read leaves nothing to diff, and a denied write never applied one.
      changes: isWrite ? shape.map(([attribute, from, to]) => ({ attribute, from, to })) : [],
    }
  })
  .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

// ------------------------------------------------------- delivery by channel

// The delivery register is reported per channel: email and SMS are run by
// different gateways and are chased by different teams, so a combined table
// forced every reader to filter it first.
export const EMAIL_DELIVERY = DELIVERY_REPORT.filter((r) => r.channel === 'Email')
export const SMS_DELIVERY = DELIVERY_REPORT.filter((r) => r.channel === 'SMS')

// ---------------------------------------------------- mapping and OTP logs

// Timestamps are derived from the seed clock the same way the seed builds its
// own, so these rows sort and filter alongside every other report.
const logStamp = (n, h) => `${shiftDays(TODAY, n)} ${String(h % 24).padStart(2, '0')}:${String((n * 13) % 60).padStart(2, '0')}`

const ACTORS = ['admin', 'shubham.jain', 'priya.nair', 'vansh.makhija']
const GRANT_SOURCES = ['Access request', 'Administrative', 'Dynamic policy', 'Reconciliation']

export const ROLE_MAPPING_LOGS = Array.from({ length: 42 }, (_, i) => {
  const u = USERS[(i * 3) % USERS.length]
  const role = ROLES[(i * 2) % ROLES.length]
  const revoked = i % 5 === 2
  const failed = i % 13 === 6
  return {
    id: i + 1,
    ts: logStamp(Math.floor(i / 5), 8 + (i % 10)),
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    organization: u.organization,
    role: role.name,
    scope: role.scope,
    operation: revoked ? 'Revoked' : 'Assigned',
    source: GRANT_SOURCES[i % GRANT_SOURCES.length],
    actor: ACTORS[i % ACTORS.length],
    status: failed ? 'Failed' : 'Succeeded',
    detail: failed ? 'Target rejected the role binding' : `Role ${revoked ? 'removed from' : 'written to'} the directory`,
    // A failed binding wrote nothing, so it has no diff to show — which is
    // itself the answer to "did this actually take effect?".
    changes: failed ? [] : diff(revoked
      ? [
        ['role_binding', 'ACTIVE', 'null'],
        ['revoked_on', 'null', logStamp(Math.floor(i / 5), 8 + (i % 10))],
        ['revoked_by', 'null', ACTORS[i % ACTORS.length]],
        ['scope', role.scope, 'null'],
      ]
      : [
        ['role_binding', 'null', 'ACTIVE'],
        ['role_name', 'null', role.name],
        ['scope', 'null', role.scope],
        ['granted_by', 'null', ACTORS[i % ACTORS.length]],
        ['grant_source', 'null', GRANT_SOURCES[i % GRANT_SOURCES.length]],
      ]),
  }
}).sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

export const USER_GROUP_LOGS = Array.from({ length: 48 }, (_, i) => {
  const u = USERS[(i * 5) % USERS.length]
  const g = GROUPS[(i * 5) % GROUPS.length]
  const removed = i % 4 === 3
  const failed = i % 15 === 8
  return {
    id: i + 1,
    ts: logStamp(Math.floor(i / 6), 7 + (i % 11)),
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    organization: u.organization,
    group: g.name,
    kind: g.kind,
    application: g.application,
    operation: removed ? 'Removed' : 'Added',
    source: GRANT_SOURCES[(i + 2) % GRANT_SOURCES.length],
    actor: ACTORS[(i + 1) % ACTORS.length],
    status: failed ? 'Failed' : 'Succeeded',
    detail: failed ? 'Group does not exist on the target' : `Membership ${removed ? 'revoked' : 'granted'} on ${g.application}`,
    changes: failed ? [] : diff(removed
      ? [
        ['membership_status', 'ACTIVE', 'null'],
        ['removed_on', 'null', logStamp(Math.floor(i / 6), 7 + (i % 11))],
        ['removed_by', 'null', ACTORS[(i + 1) % ACTORS.length]],
      ]
      : [
        ['membership_status', 'null', 'ACTIVE'],
        ['group_name', 'null', g.name],
        ['group_kind', 'null', g.kind],
        ['target_application', 'null', g.application],
        ['granted_by', 'null', ACTORS[(i + 1) % ACTORS.length]],
      ]),
  }
}).sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

const OTP_PURPOSES = ['Sign-in second factor', 'Password reset', 'MFA enrolment', 'Profile change confirmation']
const OTP_GATEWAYS = ['Tanflow SMS gateway', 'Twilio', 'Gupshup']

export const SMS_OTP_LOGS = Array.from({ length: 40 }, (_, i) => {
  const u = USERS[(i * 7) % USERS.length]
  const outcome = i % 9 === 4 ? 'Expired' : i % 11 === 5 ? 'Failed' : i % 3 === 1 ? 'Delivered' : 'Verified'
  const sendFailed = i % 13 === 0
  return {
    id: i + 1,
    ts: logStamp(Math.floor(i / 5), 9 + (i % 9)),
    username: u.username,
    name: `${u.firstName} ${u.lastName}`,
    organization: u.organization,
    mobile: u.mobileNo,
    purpose: OTP_PURPOSES[i % OTP_PURPOSES.length],
    gateway: OTP_GATEWAYS[i % OTP_GATEWAYS.length],
    attempts: outcome === 'Failed' ? 3 : outcome === 'Expired' ? 1 : (i % 2) + 1,
    validity: '5 min',
    status: outcome,
    detail: outcome === 'Failed'
      ? 'Wrong code entered three times'
      : outcome === 'Expired'
        ? 'Code was never submitted'
        : outcome === 'Delivered'
          ? 'Handset acknowledged the message'
          : 'Code accepted',
    // The gateway did or did not accept the send. That is a separate question
    // from whether the identity then typed the code correctly, so the send
    // response is kept alongside the verification outcome rather than folded
    // into it — a 200 with a Failed outcome is a real and common state.
    statusCode: sendFailed ? null : 200,
    response: sendFailed
      ? null
      : {
        code: 200,
        status: 'success',
        data: [
          {
            mobile: String(u.mobileNo || '').replace(/^\+/, ''),
            uniqueid: `${String(3309650000 + i * 7919).slice(0, 10)}_${17665097000000 + i * 1373}`,
            clientuid: '409ce490AA07e7AA4259AAb127AA97c271c3e9c7',
          },
        ],
      },
  }
}).sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
