import { ME } from '../../data/seed'
import { ago } from '../../lib/format'
import { MATCH_KEYS, NOW_MS } from '../shared/provisioning/shared'
import { blankConnection, connectionIssues } from '../applications/appModel'
import { SYNC_SCHEDULES, buildApps, fetchDns } from '../ldapApplications/ldapModel'
import { childrenOf } from '../ldapApplications/directoryTree'
import { FEDERATIONS, STATUS, needsAttention, statusOf } from './federationSeed'

export const BASE = '/iam/externalUserFederation'

export { FEDERATIONS, MATCH_KEYS, STATUS, SYNC_SCHEDULES, needsAttention, statusOf }

/* ---------------------------------------------------------------------------
   The Connector Hub.

   Four categories and the twelve connectors under them, in the order the hub
   lists them. Connector ids are the platform's own (CONNECTOR_TYPES in the
   seed), so a connector shows the same logo, asks for the same connection
   settings and is probed the same way here as it is under Applications.
   ------------------------------------------------------------------------- */
export const CATEGORIES = [
  { id: 'database', label: 'Databases', tag: 'Database', icon: 'db' },
  { id: 'directory', label: 'Directory Services', tag: 'Directory', icon: 'hierarchy' },
  { id: 'cloud', label: 'Cloud & Identity', tag: 'Cloud & Identity', icon: 'cloud' },
  { id: 'other', label: 'Other', tag: 'Other', icon: 'more' },
]

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

/* `method` is the provision method a connector fixes on the application, and
   `dbType` the database type a database connector fixes beside it. Neither is
   asked for on the setup form: choosing the connector has already answered. */
export const HUB_CONNECTORS = [
  { id: 'postgres', name: 'PostgreSQL', category: 'database', method: 'Database', dbType: 'Postgres', description: 'Provision and read users from PostgreSQL databases.' },
  { id: 'mysql', name: 'MySQL', category: 'database', method: 'Database', dbType: 'MySQL', description: 'Provision and read users from MySQL databases.' },
  { id: 'mongodb', name: 'MongoDB', category: 'database', method: 'Database', dbType: 'MongoDB', description: 'Sync user documents held in MongoDB collections.' },
  { id: 'oracle', name: 'Oracle', category: 'database', method: 'Database', dbType: 'Oracle', description: 'Manage user accounts in Oracle Database schemas.' },
  { id: 'db2', name: 'IBM DB2', category: 'database', method: 'Database', dbType: 'IBM DB2', description: 'Manage user records in IBM DB2 databases.' },
  { id: 'mssql', name: 'SQL Server', category: 'database', method: 'Database', dbType: 'SQL Server', description: 'Manage user accounts in Microsoft SQL Server databases.' },
  { id: 'ad', name: 'Active Directory', category: 'directory', method: 'Active Directory', description: 'Manage users and groups in on-premises Active Directory.' },
  { id: 'ldap', name: 'LDAP', category: 'directory', method: 'LDAP', description: 'Connect to LDAP-compliant directory servers.' },
  { id: 'api', name: 'REST API', category: 'cloud', method: 'REST API', description: 'Integrate with applications through custom REST APIs.' },
  { id: 'msentra', name: 'Microsoft Entra ID', category: 'cloud', method: 'Microsoft Entra ID', description: 'Manage identities in Microsoft Entra ID (Azure AD).' },
  { id: 'scim', name: 'SCIM 2.0', category: 'cloud', method: 'SCIM 2.0', description: 'Standards-based provisioning via the SCIM protocol.' },
  { id: 'none', name: 'No Provisioning', category: 'other', method: 'No Provisioning', description: 'Track the application without automated provisioning.' },
]

export const hubConnector = (id) => HUB_CONNECTORS.find((c) => c.id === id) || null

export const countIn = (category) => (category === 'all'
  ? HUB_CONNECTORS.length
  : HUB_CONNECTORS.filter((c) => c.category === category).length)

/* No Provisioning writes nothing, so it has no operations, no connection and
   nothing to synchronize — only the record of where its users are kept. */
export const isTracked = (connector) => connector === 'none'

/* ---------------------------------------------------------------------------
   Where federated users land: an LDAP application, and an organizational unit
   inside it. The directories are the ones LDAP Applications holds, and the
   units are read from each directory's own tree — so the unit is chosen from
   what the directory contains, never typed as a free DN.
   ------------------------------------------------------------------------- */
export const LDAP_APPS = buildApps()

export const ldapAppById = (id) => LDAP_APPS.find((a) => String(a.id) === String(id)) || null

export const LDAP_APP_OPTIONS = LDAP_APPS.map((a) => ({ value: String(a.id), label: `${a.displayName} · ${a.name}` }))

const normDn = (dn) => String(dn || '').split(',').map((p) => p.trim().toLowerCase()).filter(Boolean).join(',')

const underBase = (dn, base) => {
  const d = normDn(dn)
  const b = normDn(base)
  return d === b || d.endsWith(`,${b}`)
}

/* The base DN, the naming contexts under it, and two levels of units below
   it. Platform policy containers are left out: users are not written there. */
export const ouOptionsFor = (app) => {
  if (!app) return []
  const seen = new Set()
  const out = []
  const push = (dn, label) => {
    const key = normDn(dn)
    if (seen.has(key) || !underBase(dn, app.baseDn)) return
    seen.add(key)
    out.push({ value: dn, label: label || dn })
  }
  push(app.baseDn, `${app.baseDn} · base DN`)
  fetchDns(app).forEach((dn) => push(dn))
  childrenOf(app, app.baseDn, 0).filter((e) => e.type === 'ou').forEach((e) => {
    push(e.dn)
    childrenOf(app, e.dn, 1).filter((c) => c.type === 'ou').forEach((c) => push(c.dn))
  })
  return out
}

/* ---------------------------------------------------------------------------
   A federated application as the register reads it.
   ------------------------------------------------------------------------- */
export const canSync = (r) => !isTracked(r.connector) && r.status !== 'Paused'

export const OPERATION_LABELS = { create: 'Create', update: 'Update', remove: 'Delete', updateExisting: 'Update existing' }

export const operationList = (ops = {}) => Object.keys(OPERATION_LABELS).filter((k) => ops[k]).map((k) => OPERATION_LABELS[k])

/* The stored values laid over the connector's full field set, so the form and
   the connection probe always see every field the connector declares. */
export const fullConnection = (r) => ({ ...blankConnection(r.connector), ...(r.connection || {}) })

const stampOf = (mins) => new Date(NOW_MS - mins * 60000).toISOString().slice(0, 16).replace('T', ' ')

/* A last-sync time as the register reads it: relative, with the exact stamp
   kept for a tooltip. */
export const lastSyncOf = (r) => (r.lastSyncMins == null
  ? { rel: 'Never', at: 'No sync has run yet' }
  : { rel: ago(r.lastSyncMins), at: `${stampOf(r.lastSyncMins)} UTC` })

export const TODAY = stampOf(0).slice(0, 10)

/* ---------------------------------------------------------------------------
   The setup form.
   ------------------------------------------------------------------------- */
export const blankOperationsFor = (connector) => (isTracked(connector)
  ? { create: false, update: false, remove: false, updateExisting: false }
  : { create: true, update: false, remove: false, updateExisting: false })

export const blankDraft = (connector) => ({
  name: '',
  displayName: '',
  description: '',
  connector,
  ldapAppId: '',
  ouDn: '',
  operations: blankOperationsFor(connector),
  connection: blankConnection(connector),
  schedule: isTracked(connector) ? 'Manual only' : 'Hourly',
  matchKey: 'email',
})

export const draftOf = (r) => ({
  name: r.name,
  displayName: r.displayName,
  description: r.description || '',
  connector: r.connector,
  ldapAppId: String(r.ldapAppId),
  ouDn: r.ouDn,
  operations: { ...r.operations },
  connection: fullConnection(r),
  schedule: r.schedule,
  matchKey: r.matchKey,
})

/* The system name as it is typed: uppercase, and anything that is not a
   letter, digit or underscore becomes an underscore. */
export const toSystemName = (v) => String(v).toUpperCase().replace(/[^A-Z0-9_]+/g, '_').slice(0, 40)

export const systemNameFrom = (label) => toSystemName(String(label).trim()).replace(/_+/g, '_').replace(/^_|_$/g, '')

const NAME_RE = /^[A-Z][A-Z0-9_]{2,39}$/

/* Application Information, field by field, so the inline error under a
   control and the count on its tab can never disagree. */
export const infoErrors = (d, rows = [], selfId = null) => {
  const e = {}
  const name = String(d.name || '').trim()
  if (!name) e.name = 'An application name is required.'
  else if (!NAME_RE.test(name)) e.name = 'Use 3 to 40 uppercase letters, digits or underscores, starting with a letter.'
  else if (rows.some((r) => r.name === name && String(r.id) !== String(selfId))) e.name = `${name} is already used by another federated application.`
  if (!String(d.displayName || '').trim()) e.displayName = 'A display name is required.'
  if (!d.ldapAppId) e.ldapAppId = 'Choose the LDAP application users are federated into.'
  if (!d.ouDn) {
    e.ouDn = d.ldapAppId ? 'Choose the organizational unit users are created in.' : 'Choose an LDAP application first.'
  } else if (!ouOptionsFor(ldapAppById(d.ldapAppId)).some((o) => o.value === d.ouDn)) {
    e.ouDn = 'This organizational unit is not in the chosen LDAP application.'
  }
  return e
}

export const configIssues = (d) => (isTracked(d.connector)
  ? []
  : connectionIssues(d.connector, d.connection, { operations: d.operations }))

export const recordOf = (d, id) => ({
  id,
  name: d.name.trim(),
  displayName: d.displayName.trim(),
  description: d.description.trim(),
  connector: d.connector,
  ldapAppId: Number(d.ldapAppId),
  ouDn: d.ouDn,
  operations: { ...d.operations },
  connection: { ...d.connection },
  schedule: d.schedule,
  matchKey: d.matchKey,
  status: isTracked(d.connector) ? 'Manual' : 'Pending',
  users: 0,
  lastSyncMins: null,
  createdOn: TODAY,
  createdBy: ME.username,
})
