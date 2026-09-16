import { ATTR_MAPPINGS, DIRECTORIES } from '../../data/seed'

export const dayStr = (n) => new Date(Date.UTC(2026, 7, 5) - n * 86400000).toISOString().slice(0, 10)
export const stampStr = (n, h = 9, m = null) => `${dayStr(n)} ${String(h % 24).padStart(2, '0')}:${String((m == null ? n * 7 : m) % 60).padStart(2, '0')}`

// The record's structure mirrors the platform's own LDAP connection editor:
// what it is, how to reach it, how to authenticate, what to read, how to tune it.
export const LDAP_TABS = ['general', 'connection', 'authentication', 'directory', 'users', 'attributes', 'provisioning', 'options']

// Tabs that were split differently before, kept working for existing links.
export const LDAP_TAB_ALIASES = { overview: 'general', dashboard: 'general', mapping: 'attributes', rules: 'provisioning' }

// The estate threshold a bind is measured against, quoted in the UI copy.
export const SLOW_BIND_MS = 150

export const OWNERS = ['IT Operations', 'Security', 'IT Operations', 'Human Resources', 'Engineering', 'Compliance']
export const OWNER_OPTIONS = [...new Set(OWNERS)]
export const OBJECT_CLASSES = ['inetOrgPerson', 'organizationalPerson', 'person', 'user', 'groupOfNames', 'posixAccount']
export const SYNC_SCHEDULES = ['Every 15 minutes', 'Hourly', 'Every 6 hours', 'Nightly at 01:00', 'Manual only']
export const SYNTAXES = ['Directory string', 'Boolean', 'Integer', 'Generalized time', 'Distinguished name', 'Octet string']

const EXTRA_DIRECTORIES = [
  {
    id: 4, name: 'CONTRACTOR_DIR', displayName: 'Contractor Directory',
    url: 'ldaps://ldap-ctr.tanflow.internal:636',
    baseDn: 'ou=contractors,dc=tanflow,dc=com',
    bindDn: 'cn=idam_ctr,ou=svc,dc=tanflow,dc=com',
    entries: 298, tls: true, status: 'Healthy', lastSync: stampStr(0, 7),
  },
  {
    id: 5, name: 'LDAP_QA', displayName: 'QA Directory',
    url: 'ldap://ldap-qa.tanflow.internal:389',
    baseDn: 'dc=qa,dc=tanflow,dc=com',
    bindDn: 'cn=qa_bind,dc=qa,dc=tanflow,dc=com',
    entries: 184, tls: false, status: 'Degraded', lastSync: stampStr(2, 19),
  },
  {
    id: 6, name: 'ARCHIVE_LDAP', displayName: 'Leaver Archive',
    url: 'ldaps://ldap-archive.tanflow.internal:636',
    baseDn: 'ou=archive,dc=tanflow,dc=com',
    bindDn: 'cn=archive_ro,ou=svc,dc=tanflow,dc=com',
    entries: 1420, tls: true, status: 'Failed', lastSync: stampStr(6, 3),
  },
]

const DESCRIPTIONS = {
  IDAM_PRIMARY: 'Authoritative directory for every internal Tanflow identity.',
  PARTNER_DMZ: 'Externally reachable branch holding partner and vendor identities.',
  AD_FOREST: 'Windows forest replica used for workstation and file-share authorisation.',
  CONTRACTOR_DIR: 'Isolated branch for contractor accounts with a ninety-day lifetime.',
  LDAP_QA: 'Non-production directory used to rehearse schema and filter changes.',
  ARCHIVE_LDAP: 'Read-only archive of leaver records retained for audit evidence.',
}

const VENDORS = {
  IDAM_PRIMARY: 'OpenLDAP 2.6.7',
  PARTNER_DMZ: 'OpenLDAP 2.5.16',
  AD_FOREST: 'Active Directory · Windows Server 2022',
  CONTRACTOR_DIR: 'OpenLDAP 2.6.7',
  LDAP_QA: 'OpenLDAP 2.6.4',
  ARCHIVE_LDAP: '389 Directory Server 3.0',
}

export const buildApps = () => [...DIRECTORIES, ...EXTRA_DIRECTORIES].map((d, i) => {
  const bind = d.status === 'Healthy' ? 16 + i * 4 : d.status === 'Degraded' ? 188 + i * 12 : 0
  return {
    ...d,
    description: DESCRIPTIONS[d.name] || 'Directory connection managed by the identity platform.',
    vendor: VENDORS[d.name] || 'OpenLDAP 2.6.7',
    owner: OWNERS[i % OWNERS.length],
    createdOn: dayStr(410 - i * 46),
    protocol: d.tls ? 'LDAPS' : 'LDAP',
    port: d.tls ? '636' : '389',
    bindMs: bind,
    searchMs: bind ? bind * 3 + 9 : 0,
    uptime: d.status === 'Healthy' ? 99.94 - i * 0.03 : d.status === 'Degraded' ? 96.4 : 41.2,
    failedBinds: d.status === 'Healthy' ? i * 3 : d.status === 'Degraded' ? 148 + i * 9 : 612,
    schedule: d.status === 'Failed' ? 'Manual only' : SYNC_SCHEDULES[i % 4],
    lastError: d.status === 'Failed'
      ? 'LDAP_SERVER_DOWN after three consecutive retries'
      : d.status === 'Degraded'
        ? 'Intermittent LDAP_TIMELIMIT_EXCEEDED on subtree search'
        : '',
  }
})

const EXTRA_MAPPINGS = [
  { id: 7, idam: 'username', ldap: 'uid', objectClass: 'inetOrgPerson', directory: 'Partner Directory (DMZ)', description: 'Login identifier' },
  { id: 8, idam: 'email', ldap: 'mail', objectClass: 'inetOrgPerson', directory: 'Partner Directory (DMZ)', description: 'Primary email' },
  { id: 9, idam: 'organization', ldap: 'o', objectClass: 'organizationalPerson', directory: 'Partner Directory (DMZ)', description: 'Partner organization' },
  { id: 10, idam: 'username', ldap: 'sAMAccountName', objectClass: 'user', directory: 'AD Forest', description: 'Windows logon name' },
  { id: 11, idam: 'email', ldap: 'userPrincipalName', objectClass: 'user', directory: 'AD Forest', description: 'User principal name' },
  { id: 12, idam: 'username', ldap: 'uid', objectClass: 'inetOrgPerson', directory: 'Contractor Directory', description: 'Login identifier' },
  { id: 13, idam: 'retirementDate', ldap: 'tanflowContractEnd', objectClass: 'inetOrgPerson', directory: 'Contractor Directory', description: 'Contract end date' },
  { id: 14, idam: 'username', ldap: 'uid', objectClass: 'inetOrgPerson', directory: 'QA Directory', description: 'Login identifier' },
  { id: 15, idam: 'username', ldap: 'uid', objectClass: 'inetOrgPerson', directory: 'Leaver Archive', description: 'Archived login identifier' },
]

export const allMappings = () => [...ATTR_MAPPINGS, ...EXTRA_MAPPINGS]

export const emptyApp = () => ({
  name: '',
  displayName: '',
  description: '',
  vendor: 'OpenLDAP 2.6.7',
  url: 'ldaps://',
  baseDn: '',
  bindDn: '',
  owner: OWNER_OPTIONS[0],
  tls: true,
  entries: 0,
  status: 'Degraded',
  protocol: 'LDAPS',
  port: '636',
  lastSync: 'Never',
  createdOn: dayStr(0),
  bindMs: 0,
  searchMs: 0,
  uptime: 0,
  failedBinds: 0,
  schedule: 'Nightly at 01:00',
  lastError: 'Never synchronized',
})

// Host and port are edited separately and the URL is composed from them, which
// is how the directory itself is addressed — one field per fact.
export const splitUrl = (url = '') => {
  const m = /^(ldaps?):\/\/([^:/]+)(?::(\d+))?/i.exec(String(url).trim())
  if (!m) return { scheme: 'ldap', host: '', port: '389' }
  return { scheme: m[1].toLowerCase(), host: m[2], port: m[3] || (m[1].toLowerCase() === 'ldaps' ? '636' : '389') }
}

export const composeUrl = (host, port, tls) => `${tls ? 'ldaps' : 'ldap'}://${String(host).trim()}:${String(port).trim()}`

export const LDAP_VERSIONS = ['3', '2']

export const connectionDefaults = (app) => {
  const { host, port } = splitUrl(app.url)
  return {
    host,
    port,
    tls: !!app.tls,
    baseDn: app.baseDn,
    bindDn: app.bindDn,
    bindPassword: '',
    timeout: 15,
    poolSize: 8,
    retries: 3,
    searchLimit: 1000,
    version: '3',
    followReferrals: false,
  }
}

// The directory answers a root-DSE read with the naming contexts it serves.
// This is the list the Base DN picker offers once the host has answered.
export const fetchDns = (app) => {
  const base = app.baseDn || 'dc=tanflow,dc=com'
  const root = base.split(',').filter((p) => p.trim().toLowerCase().startsWith('dc=')).join(',') || base
  return [...new Set([
    base,
    root,
    `ou=people,${root}`,
    `ou=groups,${root}`,
    `ou=svc,${root}`,
  ])]
}

export const GLOBAL_DEFAULTS = {
  poolSize: 16,
  timeout: 15,
  retries: 3,
  logBinds: false,
  quarantineOnFailure: true,
  // Which credential rule set governs identities read from a directory. The
  // per-directory map is sparse: anything absent falls back to the default.
  passwordPolicy: 'Default Strong Policy',
  policyByDirectory: {},
}

export const bindSuccessRate = (apps) => {
  const failed = apps.reduce((a, r) => a + r.failedBinds, 0)
  const attempts = apps.reduce((a, r) => a + r.failedBinds + Math.max(r.entries * 4, 320), 0)
  return attempts ? ((attempts - failed) / attempts) * 100 : 100
}

export const recentActivity = (apps) => {
  const items = []
  apps.forEach((a, i) => {
    const hour = Math.max(1, 17 - i * 2)
    if (a.status === 'Failed') {
      items.push({
        id: `bind-${a.id}`, tone: 'bad', icon: 'ban',
        title: `Bind refused · ${a.displayName}`,
        sub: a.lastError || 'The directory did not answer the service bind.',
        time: stampStr(0, hour, (i * 13) % 60),
      })
    } else if (a.status === 'Degraded') {
      items.push({
        id: `bind-${a.id}`, tone: 'warn', icon: 'warn',
        title: `Slow bind · ${a.displayName}`,
        sub: `${a.bindDn} authenticated in ${a.bindMs} ms, above the 150 ms threshold.`,
        time: stampStr(0, hour, (i * 13) % 60),
      })
    } else {
      items.push({
        id: `bind-${a.id}`, tone: 'ok', icon: 'key',
        title: `Authentication succeeded · ${a.displayName}`,
        sub: `${a.bindDn} authenticated in ${a.bindMs} ms.`,
        time: stampStr(0, hour, (i * 13) % 60),
      })
    }
    if (a.status !== 'Failed' && i < 4) {
      items.push({
        id: `sync-${a.id}`, tone: a.status === 'Healthy' ? 'ok' : 'warn', icon: 'refresh',
        title: `Synchronization ${a.status === 'Healthy' ? 'completed' : 'completed with warnings'} · ${a.displayName}`,
        sub: `${a.entries.toLocaleString('en-US')} entries read under ${a.baseDn}.`,
        time: stampStr(0, Math.max(1, hour - 1), (i * 23) % 60),
      })
    }
  })
  return items.slice(0, 9)
}

export const buildDashboardAttributes = () => [
  { id: 1, name: 'Employee code', ldap: 'employeeNumber', type: 'Directory string', description: 'Payroll identifier sourced from Workday HR.' },
  { id: 2, name: 'Cost center', ldap: 'departmentNumber', type: 'Directory string', description: 'Finance cost center used for chargeback reporting.' },
  { id: 3, name: 'Contract end', ldap: 'tanflowContractEnd', type: 'Generalized time', description: 'Engagement end date for contractor accounts.' },
  { id: 4, name: 'Account never expires', ldap: 'tanflowNoExpiry', type: 'Boolean', description: 'Marks service and break-glass accounts exempt from expiry.' },
]

export const latencySeries = (app) => Array.from({ length: 12 }, (_, k) => {
  const base = app.bindMs || 6
  return Math.max(3, Math.round(base * (0.74 + ((k * 37) % 27) / 46)))
})

export const errorBreakdown = (app) => {
  const total = app.failedBinds
  if (!total) return []
  const mix = app.status === 'Failed'
    ? [['LDAP_SERVER_DOWN', 0.71], ['LDAP_CONNECT_ERROR', 0.19], ['LDAP_TIMEOUT', 0.1]]
    : [['LDAP_TIMELIMIT_EXCEEDED', 0.46], ['LDAP_INVALID_CREDENTIALS', 0.27], ['LDAP_SIZELIMIT_EXCEEDED', 0.15], ['LDAP_BUSY', 0.12]]
  const colors = ['var(--s6)', 'var(--s8)', 'var(--s3)', 'var(--s5)']
  return mix.map(([label, w], i) => ({ label, value: Math.round(total * w), color: colors[i] }))
}

export const syncHistory = (app) => Array.from({ length: 8 }, (_, i) => {
  const failed = app.status === 'Failed' || (app.status === 'Degraded' && i % 3 === 0)
  const read = failed ? 0 : Math.round(app.entries * (0.94 + ((i * 7) % 9) / 100))
  return {
    id: i + 1,
    runId: `LDAP-${9200 - i * 3 - app.id}`,
    started: stampStr(i, 1 + (i % 6), (i * 11) % 60),
    durationMs: failed ? 32000 : 42000 + i * 9100 + app.id * 2400,
    read,
    created: failed ? 0 : (i * 3 + app.id) % 14,
    updated: failed ? 0 : (i * 11 + app.id) % 64,
    deleted: failed ? 0 : i % 5,
    status: failed ? 'Failed' : 'Succeeded',
    triggeredBy: i % 4 === 0 ? 'admin' : 'Scheduler',
    detail: failed ? app.lastError || 'Bind refused by the directory' : 'Delta read completed inside the time limit',
  }
})

export const healthTiles = (app) => [
  { k: 'Directory entries', icon: 'users', v: app.entries, sub: `Read under ${app.baseDn}` },
  { k: 'Bind latency', icon: 'bolt', v: app.bindMs ? `${app.bindMs} ms` : 'No response', sub: app.searchMs ? `${app.searchMs} ms subtree search` : 'Server unreachable', tone: app.bindMs > 150 ? 'bad' : undefined },
  { k: 'Failed binds, 24h', icon: 'ban', v: app.failedBinds, sub: 'Rejected credentials and timeouts', tone: app.failedBinds > 100 ? 'bad' : undefined },
  { k: 'Connection health, 30d', icon: 'activity', v: `${app.uptime.toFixed(2)}%`, sub: app.status, tone: app.uptime < 98 ? 'warn' : undefined },
  { k: 'Last synchronization', icon: 'clock', v: String(app.lastSync).slice(5), sub: 'Most recent completed read' },
  { k: 'Transport', icon: 'shield', v: app.protocol, sub: app.tls ? 'TLS 1.3, certificate valid to 2027-04-18' : 'No transport encryption', tone: app.tls ? undefined : 'warn' },
]

export const healthNote = (app) => (
  app.status === 'Healthy'
    ? 'Every scheduled bind and search completed inside the timeout window.'
    : app.status === 'Degraded'
      ? 'Searches are completing, but the server is breaching the time limit on large subtrees.'
      : 'The platform has not established a session since the last successful synchronization.'
)

export const customAttributes = (app) => {
  const rows = [
    { name: 'Employee code', ldap: 'employeeNumber', syntax: 'Directory string', multi: false, indexed: true, populated: 98, source: 'Workday HR' },
    { name: 'Cost center', ldap: 'departmentNumber', syntax: 'Directory string', multi: false, indexed: true, populated: 91, source: 'Workday HR' },
    { name: 'Office level', ldap: 'tanflowOfficeLevel', syntax: 'Directory string', multi: false, indexed: false, populated: 74, source: 'Manual' },
    { name: 'Discom', ldap: 'tanflowDiscom', syntax: 'Directory string', multi: false, indexed: false, populated: 62, source: 'Manual' },
    { name: 'Contract end', ldap: 'tanflowContractEnd', syntax: 'Generalized time', multi: false, indexed: false, populated: 41, source: 'Contractor intake' },
    { name: 'Certifications', ldap: 'tanflowCertification', syntax: 'Directory string', multi: true, indexed: false, populated: 28, source: 'Manual' },
    { name: 'Account never expires', ldap: 'tanflowNoExpiry', syntax: 'Boolean', multi: false, indexed: false, populated: 12, source: 'Manual' },
  ]
  const take = app.name === 'ARCHIVE_LDAP' ? 3 : app.name === 'LDAP_QA' ? 4 : rows.length
  return rows.slice(0, take).map((r, i) => ({ ...r, id: i + 1, directory: app.displayName }))
}

export const schemaFacts = (app) => [
  { k: 'Server', v: app.vendor, icon: 'server' },
  { k: 'Naming context', v: app.baseDn, icon: 'branch' },
  { k: 'Schema entry', v: 'cn=subschema', icon: 'file' },
  { k: 'Supported controls', v: 'Paged results, Sort, Persistent search', icon: 'sliders' },
  { k: 'Transport', v: app.tls ? 'LDAPS' : 'LDAP', icon: 'shield' },
]
