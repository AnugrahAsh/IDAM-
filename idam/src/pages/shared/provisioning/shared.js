import { APPLICATIONS, ATTRS, CONNECTOR_TYPES, JOBS, USERS } from '../../../data/seed'

export const CONNECTORS = Object.fromEntries(CONNECTOR_TYPES.map((c) => [c.id, c]))

/* How a connector reads in a picker. The kind is the family a connector belongs
   to and is worth saying for a database or a directory; the two HTTP connectors
   are the whole of their family, so "REST API · Custom" said nothing. */
export const connectorOptionLabel = (c) => (c.kind === 'Custom' ? c.name : `${c.name} · ${c.kind}`)

export const NOW_MS = Date.UTC(2026, 7, 5, 9, 0)

export const DESCRIPTIONS = {
  AD_CORP: 'Primary corporate forest. Owns the account lifecycle for every internal employee.',
  WORKDAY_HR: 'Authoritative joiner, mover and leaver feed. Drives attributes into every downstream target.',
  SALESFORCE: 'Sales tenant provisioned over the REST API with profile and permission set assignment.',
  ENTRA_TENANT: 'Cloud directory for licensing, device compliance and conditional access enrollment.',
  PG_ANALYTICS: 'Warehouse roles and row-level grants across the analytics estate.',
  MYSQL_BILLING: 'Billing platform database accounts and schema-level privileges.',
  DB2_CORE: 'Core banking accounts. Every provisioning change is dual controlled.',
  ORACLE_ERP: 'Finance responsibilities, ledger access and payables approval limits.',
  PEOPLESTRONG_HRMS: 'Contractor and vendor workforce records, provisioned through the HRMS vendor API.',
}

export const OWNERS = ['IT Operations', 'Human Resources', 'Finance', 'Engineering', 'Sales', 'Security']

export const ENVIRONMENTS = ['Production', 'Pre-production', 'Development']

export const METHODS = [...new Set([...APPLICATIONS.map((a) => a.method), ...CONNECTOR_TYPES.map((c) => c.name)])]


export const MATCH_KEYS = [
  { value: 'email', label: 'Email address' },
  { value: 'username', label: 'Username' },
  { value: 'empCode', label: 'Employee code' },
  { value: 'reportingEmpId', label: 'Reporting employee id' },
]

export const DEPROVISION_ACTIONS = [
  'Disable the account',
  'Delete the account',
  'Move to the leavers container',
  'Leave the account untouched',
]

export const TRANSFORMS = ['Direct', 'Lowercase', 'Uppercase', 'Trim', 'Concatenate', 'Lookup']

export const DIRECTIONS = ['Outbound', 'Inbound', 'Bidirectional']

export const IDAM_ATTRS = ATTRS.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))

export const SAMPLE_IDENTITY = USERS[0].username

export const cap = (s) => (s ? String(s)[0].toUpperCase() + String(s).slice(1) : '—')

export const toneOf = (status) => (status === 'Failed' ? 'bad' : status === 'Degraded' ? 'warn' : undefined)

export const healthTone = (status) =>
  (status === 'Failed' ? 'bad' : status === 'Degraded' ? 'warn' : status === 'Disabled' ? 'mut' : 'ok')

export const systemName = (label) =>
  String(label).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'CONNECTOR'

export const withDescription = (a) => ({
  ...a,
  description: DESCRIPTIONS[a.name] || `${a.method} target owned by ${a.owner}.`,
})

const BRAND_BY_APP = {
  AD_CORP: 'microsoft',
  WORKDAY_HR: 'workday',
  SALESFORCE: 'salesforce',
  ENTRA_TENANT: 'entraid',
  ORACLE_ERP: 'oracle',
}

/* Every connector the catalogues offer has a mark of its own, so a tile, a
   source row and an onboarded application all show the same logo for the same
   connector. An application with a vendor logo of its own (above) keeps it. */
const BRAND_BY_CONNECTOR = {
  postgres: 'postgresql',
  mysql: 'mysql',
  mongodb: 'mongodb',
  oracle: 'oracledb',
  db2: 'ibmdb2',
  mssql: 'mssql',
  ad: 'activedirectory',
  ldap: 'ldap',
  api: 'restapi',
  custom: 'customapi',
  msentra: 'entraid',
  scim: 'scim',
  none: 'noprovisioning',
}

export const brandFor = (app) => BRAND_BY_APP[app.name] || BRAND_BY_CONNECTOR[app.connector] || ''

export const brandForConnector = (id) => BRAND_BY_CONNECTOR[id] || ''

export const PROFILES = {
  postgres: { port: '5432', containerLabel: 'Database', container: 'analytics', objectLabel: 'Account table', object: 'public.app_users', principalLabel: 'Bind user', principal: 'idam_svc', secretLabel: 'Password', tls: true },
  mysql: { port: '3306', containerLabel: 'Schema', container: 'billing', objectLabel: 'Account table', object: 'billing.users', principalLabel: 'Bind user', principal: 'idam_svc', secretLabel: 'Password', tls: true },
  mongodb: { port: '27017', containerLabel: 'Database', container: 'identity', objectLabel: 'Collection', object: 'accounts', principalLabel: 'Bind user', principal: 'idam_svc', secretLabel: 'Password', tls: true },
  oracle: { port: '1521', containerLabel: 'Service name', container: 'ERPPRD', objectLabel: 'Account table', object: 'APPS.FND_USER', principalLabel: 'Bind user', principal: 'IDAM_SVC', secretLabel: 'Password', tls: true },
  db2: { port: '50000', containerLabel: 'Database', container: 'COREBNK', objectLabel: 'Account table', object: 'SYSIBM.USERS', principalLabel: 'Bind user', principal: 'IDAMSVC', secretLabel: 'Password', tls: true },
  mssql: { port: '1433', containerLabel: 'Database', container: 'AppDirectory', objectLabel: 'Account table', object: 'dbo.Users', principalLabel: 'Bind user', principal: 'idam_svc', secretLabel: 'Password', tls: true },
  ad: { port: '636', containerLabel: 'Base DN', container: 'dc=tanflow,dc=com', objectLabel: 'Object class', object: 'user', principalLabel: 'Bind DN', principal: 'cn=idam,ou=svc,dc=tanflow,dc=com', secretLabel: 'Bind password', tls: true },
  ldap: { port: '636', containerLabel: 'Base DN', container: 'dc=tanflow,dc=com', objectLabel: 'Object class', object: 'inetOrgPerson', principalLabel: 'Bind DN', principal: 'cn=idam,ou=svc,dc=tanflow,dc=com', secretLabel: 'Bind password', tls: true },
  api: { port: '443', containerLabel: 'Base URL', container: 'https://api.example.com/v1', objectLabel: 'Resource path', object: '/users', principalLabel: 'Client id', principal: 'idam-connected-app', secretLabel: 'Client secret', tls: true },
  msentra: { port: '443', containerLabel: 'Base URL', container: 'https://graph.microsoft.com/v1.0', objectLabel: 'Resource path', object: '/users', principalLabel: 'Application id', principal: 'a7f1c204-idam-provisioning', secretLabel: 'Client secret', tls: true },
  scim: { port: '443', containerLabel: 'Base URL', container: 'https://api.example.com/scim/v2', objectLabel: 'Resource', object: '/Users', principalLabel: 'Client id', principal: 'tanflow-scim', secretLabel: 'Bearer token', tls: true },
  none: { port: '', containerLabel: 'Container', container: '', objectLabel: 'Object', object: '', principalLabel: 'Principal', principal: '', secretLabel: 'Secret', tls: false },
}

export const profileFor = (id) => PROFILES[id] || PROFILES.api

const APP_SETTINGS = {
  AD_CORP: { container: 'dc=tanflow,dc=com', object: 'user', principal: 'cn=idam,ou=svc,dc=tanflow,dc=com', tls: true, timeout: 30, pageSize: 1000 },
  WORKDAY_HR: { container: 'https://api.workday.com/scim/v2', object: '/Users', principal: 'tanflow-scim', tls: true, timeout: 45, pageSize: 500 },
  SALESFORCE: { container: 'https://tanflow.my.salesforce.com/services/data/v60.0', object: '/sobjects/User', principal: 'idam-connected-app', tls: true, timeout: 30, pageSize: 200 },
  ENTRA_TENANT: { container: 'https://graph.microsoft.com/v1.0', object: '/users', principal: 'a7f1c204-idam-provisioning', tls: true, timeout: 30, pageSize: 999 },
  PG_ANALYTICS: { container: 'analytics', object: 'public.app_users', principal: 'idam_svc', tls: false, timeout: 30, pageSize: 500 },
  MYSQL_BILLING: { container: 'billing', object: 'billing.users', principal: 'idam_svc', tls: true, timeout: 20, pageSize: 500 },
  DB2_CORE: { container: 'COREBNK', object: 'SYSIBM.USERS', principal: 'IDAMSVC', tls: true, timeout: 60, pageSize: 250 },
  ORACLE_ERP: { container: 'ERPPRD', object: 'APPS.FND_USER', principal: 'IDAM_SVC', tls: true, timeout: 45, pageSize: 300 },
  PEOPLESTRONG_HRMS: { container: 'https://hrms.peoplestrong.com/api/v2', object: '/employees', principal: 'tanflow-idam', tls: true, timeout: 30, pageSize: 200 },
}

export const settingsFor = (app) => {
  const p = profileFor(app.connector)
  const s = APP_SETTINGS[app.name] || {}
  return {
    host: app.host || '',
    port: app.port || p.port,
    container: s.container != null ? s.container : p.container,
    object: s.object != null ? s.object : p.object,
    principal: s.principal != null ? s.principal : p.principal,
    secret: 'stored',
    tls: s.tls != null ? s.tls : p.tls,
    timeout: s.timeout != null ? s.timeout : 30,
    pageSize: s.pageSize != null ? s.pageSize : 500,
  }
}

const APP_OPERATIONS = {
  AD_CORP: { create: true, update: true, remove: true, updateExisting: true, deactivate: true, password: true },
  WORKDAY_HR: { create: false, update: false, remove: false, updateExisting: true, deactivate: false, password: false },
  SALESFORCE: { create: true, update: true, remove: false, updateExisting: true, deactivate: true, password: false },
  ENTRA_TENANT: { create: true, update: true, remove: false, updateExisting: true, deactivate: true, password: true },
  PG_ANALYTICS: { create: true, update: true, remove: true, updateExisting: false, deactivate: false, password: true },
  MYSQL_BILLING: { create: true, update: true, remove: true, updateExisting: true, deactivate: true, password: true },
  DB2_CORE: { create: true, update: true, remove: false, updateExisting: true, deactivate: true, password: false },
  ORACLE_ERP: { create: true, update: true, remove: false, updateExisting: true, deactivate: true, password: false },
  PEOPLESTRONG_HRMS: { create: true, update: true, remove: true, updateExisting: true, deactivate: false, password: false },
}

export const OPERATION_SPECS = [
  { id: 'create', label: 'Create', hint: 'Provision a target account when an identity enters scope.' },
  { id: 'update', label: 'Update', hint: 'Push attribute changes to accounts this connector owns.' },
  { id: 'remove', label: 'Delete', hint: 'Remove the target account when the identity leaves scope.' },
  { id: 'updateExisting', label: 'Update for existing user', hint: 'Adopt an account that already exists on the target instead of failing the run.' },
]

export const EXTRA_OPERATION_SPECS = [
  { id: 'deactivate', label: 'Deactivate on leaver', hint: 'Disable rather than delete when the leaver event fires.' },
  { id: 'password', label: 'Password synchronization', hint: 'Replay credential resets to this target.' },
]

export const operationsFor = (app) =>
  APP_OPERATIONS[app.name] || { create: true, update: true, remove: false, updateExisting: false, deactivate: true, password: false }

const TARGET_SETS = {
  Directory: { username: 'sAMAccountName', email: 'mail', firstName: 'givenName', lastName: 'sn', department: 'department', designation: 'title', mobileNo: 'mobile', employeeType: 'employeeType', empCode: 'employeeID' },
  Database: { username: 'user_name', email: 'email_address', firstName: 'first_name', lastName: 'last_name', department: 'dept_code', designation: 'job_title', mobileNo: 'mobile_no', employeeType: 'user_type', empCode: 'employee_no' },
  Standard: { username: 'userName', email: 'emails[0].value', firstName: 'name.givenName', lastName: 'name.familyName', department: 'enterprise.department', designation: 'title', mobileNo: 'phoneNumbers[0].value', employeeType: 'userType', empCode: 'externalId' },
  Cloud: { username: 'userPrincipalName', email: 'mail', firstName: 'givenName', lastName: 'surname', department: 'department', designation: 'jobTitle', mobileNo: 'mobilePhone', employeeType: 'employeeType', empCode: 'employeeId' },
  Custom: { username: 'Username', email: 'Email', firstName: 'FirstName', lastName: 'LastName', department: 'Department', designation: 'Title', mobileNo: 'MobilePhone', employeeType: 'UserType', empCode: 'EmployeeNumber' },
  Manual: { username: 'Username', email: 'Email', firstName: 'FirstName', lastName: 'LastName', department: 'Department', designation: 'Title', mobileNo: 'MobilePhone', employeeType: 'UserType', empCode: 'EmployeeNumber' },
}

const MAP_ORDER = ['username', 'email', 'firstName', 'lastName', 'department', 'designation', 'mobileNo', 'employeeType', 'empCode']

export const kindOf = (connector) => (CONNECTORS[connector] ? CONNECTORS[connector].kind : 'Custom')

export const targetSetFor = (connector) => TARGET_SETS[kindOf(connector)] || TARGET_SETS.Custom

export const mappingsFor = (app) => {
  const set = targetSetFor(app.connector)
  const kind = kindOf(app.connector)
  const u = USERS[0]
  return MAP_ORDER.filter((k) => set[k]).map((k, i) => {
    const attr = ATTRS.find((a) => a.id === k)
    return {
      id: i + 1,
      idam: k,
      label: attr ? attr.label : k,
      target: set[k],
      transform: k === 'email' ? 'Lowercase' : k === 'username' && kind === 'Directory' ? 'Uppercase' : 'Direct',
      direction: k === 'department' ? 'Inbound' : 'Outbound',
      required: !!(attr && attr.req),
      sample: u[k] == null || u[k] === '' ? '—' : String(u[k]),
    }
  })
}

const accountName = (app, u) => {
  const kind = kindOf(app.connector)
  if (kind === 'Directory') return `TANFLOW\\${u.username.toLowerCase()}`
  if (kind === 'Database') return u.username.toLowerCase()
  return u.email
}

export const accountsFor = (app) => {
  const pool = USERS.filter((_, i) => (i + app.id * 3) % 3 === 0).slice(0, 26)
  const orphanCount = Math.min(app.orphans, 5)
  return pool.map((u, i) => {
    const orphan = i < orphanCount
    return {
      id: `${app.name}-${String(i + 1).padStart(3, '0')}`,
      account: accountName(app, u),
      identity: orphan ? null : u.username,
      email: orphan ? null : u.email,
      userId: orphan ? null : u.id,
      department: u.department,
      state: orphan ? 'Orphaned' : u.status === 'Pending' ? 'Pending' : u.status === 'Disabled' ? 'Disabled' : 'Linked',
      entitlements: 1 + ((u.id * 5 + app.id * 3) % 11),
      lastSync: app.lastSync,
      provisioned: u.createdOn,
      drifted: !orphan && (u.id + app.id) % 7 === 0,
    }
  })
}

const RUN_OPERATIONS = ['Full sync', 'Delta sync', 'Deprovision batch', 'Attribute push', 'Account discovery']

export const runsFor = (app) => {
  const matched = JOBS.filter((j) => j.target === app.displayName && j.module === 'Provisioning')
  const pool = matched.length >= 5 ? matched : JOBS.filter((_, i) => (i + app.id) % 3 === 0)
  return pool.map((j, i) => {
    const operation = RUN_OPERATIONS[(j.id + app.id + i) % RUN_OPERATIONS.length]
    return {
      ...j,
      target: app.displayName,
      module: 'Provisioning',
      operation,
      mode: operation === 'Full sync' || operation === 'Account discovery' ? 'Full' : 'Delta',
      outcome: j.status === 'Failed' ? 'Failed' : j.status === 'Running' ? 'Running' : j.failed > 0 ? 'Partial' : 'Succeeded',
      successRate: j.total ? (j.succeeded / j.total) * 100 : 0,
    }
  })
}

export const syncSeries = (app) => {
  const base = Math.max(8, Math.round(app.accounts / 12))
  return Array.from({ length: 16 }, (_, i) => {
    const wave = Math.sin((i + app.id * 2) * 0.62) * 0.26 + Math.sin((i + app.id) * 1.31) * 0.11
    const fade = app.status === 'Failed' && i > 11 ? 0.16 : app.status === 'Degraded' && i > 12 ? 0.54 : 1
    return Math.max(2, Math.round(base * (1 + wave) * fade))
  })
}

const dayLabel = (back) => new Date(NOW_MS - back * 86400000).toISOString().slice(5, 10)

export const volumeSeries = (app) => {
  const base = Math.max(10, Math.round(app.accounts / 9))
  return Array.from({ length: 14 }, (_, i) => {
    const back = 13 - i
    const wave = Math.sin((i + app.id * 2) * 0.58) * 0.3 + Math.sin((i + app.id) * 1.27) * 0.12
    const broken = app.status === 'Failed' && back < 3
    const degraded = app.status === 'Degraded' && back < 2
    const processed = broken ? 0 : Math.max(2, Math.round(base * (1 + wave) * (degraded ? 0.5 : 1)))
    const failed = broken
      ? Math.max(3, Math.round(base * 0.22))
      : degraded
        ? Math.max(1, Math.round(base * 0.12))
        : (i + app.id) % 5 === 0
          ? Math.max(1, Math.round(base * 0.03))
          : 0
    return { t: dayLabel(back), processed, failed }
  })
}

const SYNC_INTERVAL_MINS = 180

export const nextRun = (app) => {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(app.lastSync || '')
  if (!m || app.status === 'Disabled') return { label: 'Not scheduled', inMins: null, overdue: false }
  const at = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) + SYNC_INTERVAL_MINS * 60000
  const iso = new Date(at).toISOString()
  return { label: `${iso.slice(0, 10)} ${iso.slice(11, 16)}`, inMins: Math.round((at - NOW_MS) / 60000), overdue: at < NOW_MS }
}

const ERROR_TEMPLATES = [
  { code: 'PRV-4013', message: 'Bind credential rejected by the target', hint: 'Rotate the stored service credential, then re-run the connection test.' },
  { code: 'PRV-5030', message: 'Connection refused on the configured port', hint: 'Confirm the target firewall admits the provisioning egress range.' },
  { code: 'PRV-4212', message: 'Mapping produced a null value for a required attribute', hint: 'An outbound required attribute is unmapped for part of the population.' },
  { code: 'PRV-4290', message: 'Duplicate account key returned by the target', hint: 'Two target rows share the same account identifier.' },
  { code: 'PRV-5501', message: 'Read timed out before the page completed', hint: 'Lower the page size or widen the read timeout.' },
  { code: 'PRV-4400', message: 'TLS certificate chain could not be validated', hint: 'Upload the issuing certificate authority to the platform trust store.' },
]

export const errorsFor = (app) => {
  if (app.status === 'Healthy' || app.status === 'Disabled') return []
  const n = app.status === 'Failed' ? 3 : 2
  return Array.from({ length: n }, (_, i) => {
    const t = ERROR_TEMPLATES[(app.id + i * 2) % ERROR_TEMPLATES.length]
    return {
      ...t,
      id: i + 1,
      severity: i === 0 ? (app.status === 'Failed' ? 'critical' : 'high') : 'medium',
      count: 1 + ((app.id * 3 + i * 5) % 24),
      last: app.lastSync,
    }
  })
}

export const probeOf = (cfg) => {
  const host = String(cfg.host || '').trim()
  const port = String(cfg.port || '').trim()
  const principal = String(cfg.principal || '').trim()
  const object = String(cfg.object || '').trim()
  const secret = String(cfg.secret || '').trim()
  const seed = [...host].reduce((a, c) => a + c.charCodeAt(0), 0) || 7

  const steps = []
  const push = (label, state, detail, ms) => steps.push({ id: steps.length + 1, label, state, detail, ms })
  let stopped = false

  if (!host || /\s/.test(host)) {
    push('Resolve host', 'fail', host ? 'Host contains whitespace and cannot be resolved.' : 'No host has been supplied.', 12)
    stopped = true
  } else {
    push('Resolve host', 'ok', `${host} resolved to 10.42.${seed % 200}.${(seed * 7) % 250}`, 14 + (seed % 20))
  }

  if (stopped) push('TCP handshake', 'skip', 'Not attempted.', 0)
  else if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    push('TCP handshake', 'fail', port ? `Port ${port} is not a valid TCP port.` : 'No port has been supplied.', 8)
    stopped = true
  } else {
    push('TCP handshake', 'ok', `Socket opened to ${host}:${port}`, 22 + (seed % 40))
  }

  if (stopped) push('TLS negotiation', 'skip', 'Not attempted.', 0)
  else if (!cfg.tls) push('TLS negotiation', 'warn', 'TLS is disabled. Credentials and account data cross the network in clear text.', 0)
  else push('TLS negotiation', 'ok', 'TLS 1.3 negotiated, certificate chain trusted to the platform store.', 30 + (seed % 25))

  if (stopped) push('Authenticate service principal', 'skip', 'Not attempted.', 0)
  else if (!principal) {
    push('Authenticate service principal', 'fail', 'No bind principal has been supplied.', 6)
    stopped = true
  } else if (!secret) {
    push('Authenticate service principal', 'fail', `${principal} was rejected: no credential is stored for this connector.`, 40)
    stopped = true
  } else {
    push('Authenticate service principal', 'ok', `${principal} authenticated.`, 46 + (seed % 30))
  }

  if (stopped) push('Read account object', 'skip', 'Not attempted.', 0)
  else if (!object) {
    push('Read account object', 'fail', 'No account table, object class or resource path has been supplied.', 5)
    stopped = true
  } else {
    push('Read account object', 'ok', `${object} returned ${100 + (seed % 900)} rows in the first page.`, 60 + (seed % 90))
  }

  const failed = steps.some((s) => s.state === 'fail')
  const warned = steps.some((s) => s.state === 'warn')
  const at = new Date()
  return {
    ok: !failed,
    level: failed ? 'bad' : warned ? 'warn' : 'ok',
    ms: steps.reduce((a, s) => a + s.ms, 0),
    at: `${at.toISOString().slice(11, 19)} UTC`,
    steps,
    summary: failed
      ? 'The connector cannot reach the target with the current settings.'
      : warned
        ? 'The target is reachable, but the transport is not protected.'
        : 'The target is reachable and the stored credential can read the account object.',
  }
}

export const blankDraft = () => ({
  connector: '',
  method: '',
  displayName: '',
  name: '',
  description: '',
  owner: OWNERS[0],
  environment: ENVIRONMENTS[0],
  host: '',
  port: '',
  container: '',
  principal: '',
  secret: '',
  object: '',
  tls: true,
  timeout: 30,
  pageSize: 500,
  operations: { create: true, update: true, remove: false, updateExisting: false, deactivate: true, password: false },
  matchKey: 'email',
  deprovision: DEPROVISION_ACTIONS[0],
})

export const draftIssues = (d) => {
  const type = []
  const info = []
  const connection = []
  const operations = []

  if (!d.connector) type.push('Choose the connector type this target speaks.')

  if (!d.displayName.trim()) info.push('An application name is required.')
  else if (d.displayName.trim().length < 3) info.push('The application name must be at least three characters.')
  if (!/^[A-Z0-9_]{3,20}$/.test(d.name)) info.push('The system name must be three to twenty uppercase characters, digits or underscores.')
  if (APPLICATIONS.some((a) => a.name === d.name)) info.push(`${d.name} is already in use by another connector.`)

  if (d.connector && d.connector !== 'none') {
    if (!d.host.trim()) connection.push('A host is required.')
    if (!/^\d+$/.test(String(d.port)) || Number(d.port) < 1 || Number(d.port) > 65535) connection.push('The port must be a number between 1 and 65535.')
    if (!d.container.trim()) connection.push(`${profileFor(d.connector).containerLabel} is required.`)
    if (!d.principal.trim()) connection.push(`${profileFor(d.connector).principalLabel} is required.`)
    if (!d.secret.trim()) connection.push(`${profileFor(d.connector).secretLabel} is required.`)
    if (!d.object.trim()) connection.push(`${profileFor(d.connector).objectLabel} is required.`)
    if (!d.tls && d.environment === 'Production') connection.push('TLS cannot be disabled on a production target.')
  }

  const ops = d.operations || {}
  if (!ops.create && !ops.update && !ops.remove && !ops.updateExisting) operations.push('Select at least one provisioning operation.')
  if (ops.remove && ops.deactivate) operations.push('Delete and deactivate-on-leaver conflict. Choose one leaver behavior.')
  if (ops.password && d.connector === 'scim') operations.push('SCIM 2.0 targets cannot accept a synchronized password.')

  return { type, info, connection, operations }
}
