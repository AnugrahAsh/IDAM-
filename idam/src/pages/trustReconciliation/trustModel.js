/* Trust Reconciliation source model.
 *
 * A trust source is a system the platform reads identities out of. It is
 * configured the way a provisioning application is: one of the platform's
 * connector types, the connection fields that type declares, an attribute
 * mapping table with a unique pair, and the identities the source governs.
 *
 * The connector facet is shared with Provision Application rather than
 * duplicated — `CONNECTION_SPECS`, `connectionIssues` and `probeConnection` all
 * come from `pages/applications/appModel`, so a source and an application ask
 * for the same fields and test a connection the same way.
 *
 * API sources keep the two calls the module has always modelled — one to
 * acquire a token, one to read the users — plus the paths into the response
 * that locate the user list and a single record. Those have no counterpart on
 * the provisioning side, so they sit beside the connector rather than in it.
 */

import { USERS } from '../../data/seed'
import { NOW_MS, stampText } from '../../lib/clock'
import { IDAM_ATTRS } from '../shared/provisioning/shared'
import {
  CONNECTORS, blankConnection, defaultUniqueAttribute, kindOf, targetAttrsFor,
} from '../applications/appModel'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export const AUTH_METHODS = [
  { value: 'noAuth', label: 'No Auth' },
  { value: 'Basic', label: 'Basic Auth' },
  { value: 'Bearer', label: 'Bearer Token' },
]

// ---------------------------------------------------------------------------
// Connector facet
// ---------------------------------------------------------------------------

// A source registered before the connector facet existed is read forward rather
// than migrated: its old `type` names the connector it was always talking to,
// so it opens on the right connection form instead of on an empty one.
const CONNECTOR_BY_DB_TYPE = {
  MYSQL: 'mysql', POSTGRESQL: 'postgres', ORACLE: 'oracle',
  MSSQL: 'mssql', DB2: 'db2', MONGODB: 'mongodb',
}

const CONNECTOR_BY_TYPE = { api: 'api', peopleStrong: 'api', ldap: 'ldap', activedirectory: 'ad' }

const isDatabase = (t) => t === 'Database'

export const connectorFor = (s = {}) => {
  if (s.connector && CONNECTORS[s.connector]) return s.connector
  if (isDatabase(s.type)) return CONNECTOR_BY_DB_TYPE[s.db_type] || 'mysql'
  return CONNECTOR_BY_TYPE[s.type] || 'api'
}

export const connectorName = (id) => (CONNECTORS[id] ? CONNECTORS[id].name : id)

/* An API connector answers with whatever shape the source chose, so the token
   call and the two response paths are the only way to find the users in it. A
   directory, a database, SCIM and Entra all have a schema the platform already
   knows, so they are read directly and are never asked these questions. */
export const needsReadSettings = (connector) => kindOf(connector) === 'Custom'

// Legacy per-type fields, carried onto the connection the spec declares. An
// empty legacy value is left empty so the form still asks for it.
const LEGACY_CONNECTION = {
  host: (s) => s.hostname,
  port: (s) => s.port,
  database: (s) => s.database,
  username: (s) => s.username,
  password: (s) => s.password,
  accountTable: (s) => s.table_name,
  baseDn: (s) => s.baseDn,
  baseUrl: (s) => s.users_data_api_url,
  endpoint: (s) => s.users_data_api_url,
}

export const connectionFor = (s = {}) => {
  const connector = connectorFor(s)
  const blank = blankConnection(connector)
  if (s.connection) return { ...blank, ...s.connection }
  Object.keys(blank).forEach((k) => {
    const legacy = LEGACY_CONNECTION[k] ? LEGACY_CONNECTION[k](s) : ''
    if (legacy) blank[k] = String(legacy)
  })
  return blank
}

// ---------------------------------------------------------------------------
// Attribute configuration
//
// Reconciliation reads inward, so the pair is source attribute to IDAM
// attribute — the mirror of the provisioning table, which writes outward. The
// Manual flag has the same effect in both directions: the attribute leaves the
// connector's hands and the operator supplies the value themselves, so a manual
// row is never read from the source at all.
// ---------------------------------------------------------------------------

export const attrLabel = (idam) => {
  const found = IDAM_ATTRS.find((a) => a.value === idam)
  return found ? found.label.split(' · ')[0] : idam
}

const defaultMappings = () => [
  { id: 1, idam: 'username', label: attrLabel('username'), source: 'userName', transform: 'Direct', manual: false },
  { id: 2, idam: 'email', label: attrLabel('email'), source: 'emailId', transform: 'Lowercase', manual: false },
  { id: 3, idam: 'firstName', label: attrLabel('firstName'), source: 'firstName', transform: 'Direct', manual: false },
  { id: 4, idam: 'lastName', label: attrLabel('lastName'), source: 'lastName', transform: 'Direct', manual: false },
  { id: 5, idam: 'employeeType', label: attrLabel('employeeType'), source: 'Internal', transform: 'Direct', manual: true },
]

/* The pre-connector shape kept the read field and the manual value in two
   slots. One row carries one value whichever way the flag reads, so they fold
   into a single slot on the way in. */
const fromAttributes = (rows = []) => rows.map((a, i) => ({
  id: a.id || i + 1,
  idam: a.idam,
  label: attrLabel(a.idam),
  source: a.manual ? String(a.value || '') : String(a.source || ''),
  transform: 'Direct',
  manual: !!a.manual,
}))

/** Names this connector type is known to expose, plus anything already mapped. */
export const sourceAttrsFor = (connector, rows = []) =>
  targetAttrsFor(connector, rows.filter((r) => !r.manual).map((r) => ({ target: r.source })))

export const uniqueSourceFor = (rows = [], idam) => {
  const row = rows.find((r) => r.idam === idam)
  return row ? row.source || '' : ''
}

export const defaultUniquePair = (rows = []) => {
  const idam = defaultUniqueAttribute(rows)
  return { uniqueAttribute: idam, uniqueSourceAttribute: uniqueSourceFor(rows, idam) }
}

export const uniqueIssues = (rows = [], idam, source) => {
  const out = []
  if (!String(idam || '').trim()) {
    out.push('No unique IDAM attribute is designated. A run cannot tell a new identity from an existing one without one.')
  } else if (!rows.some((r) => r.idam === idam)) {
    out.push(`The unique IDAM attribute ${idam} is not mapped, so the source supplies no value for it. Map it, or designate a mapped attribute instead.`)
  }
  if (source !== undefined && !String(source || '').trim()) {
    out.push('No unique source attribute is designated. The run needs the name the record is identified by on the source.')
  }
  return out
}

/** A stored source read as the console now models it. */
export const withConnector = (s = {}) => {
  const mappings = s.mappings || (s.attributes ? fromAttributes(s.attributes) : defaultMappings())
  const pair = defaultUniquePair(mappings)
  return {
    ...s,
    connector: connectorFor(s),
    connection: connectionFor(s),
    mappings,
    uniqueAttribute: s.uniqueAttribute == null ? pair.uniqueAttribute : s.uniqueAttribute,
    uniqueSourceAttribute: s.uniqueSourceAttribute == null ? pair.uniqueSourceAttribute : s.uniqueSourceAttribute,
  }
}

export const blankSource = () => withConnector({
  application_name: '',
  display_name: '',
  type: 'api',
  connector: 'api',

  // Token call
  get_token_api_http_method: 'POST',
  get_token_api_auth_method: 'noAuth',
  get_token_api_url: '',
  get_token_api_headers: '',
  get_token_api_payload: '',

  // Users call
  users_data_api_http_method: 'GET',
  users_data_api_auth_method: 'Bearer',
  users_data_api_headers: '',
  users_data_api_payload: '',

  // Where the users sit in the response
  listPath: '',
  detailPath: '',

  mappings: defaultMappings(),
})

export const sourceLabel = (s = {}) => s.display_name || s.application_name || 'Untitled source'

/* ------------------------------------------------------------ reconciled set

   What a run produced, split the way the running application splits it: users
   the source has that the platform does not, users whose attributes differ, and
   rows that could not be processed at all.
*/

const bucketOf = (i) => (i % 7 === 3 ? 'FailedUsers' : i % 3 === 1 ? 'ModifiedUser' : 'NewUsers')

const FAIL_REASONS = [
  'Mandatory attribute email is empty',
  'Username already exists on another identity',
  'Employee type is not a configured value',
  'Mobile number failed format validation',
]

export const reconciledUsers = (sourceId = 1) => USERS.slice(0, 34).map((u, i) => {
  const bucket = bucketOf(i + sourceId)
  return {
    id: `${sourceId}-${u.id}`,
    bucket,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    mobileNo: u.mobileNo,
    department: u.department,
    employeeType: u.employeeType,
    // What changed, for the modified bucket.
    changed: bucket === 'ModifiedUser' ? ['department', 'designation'][i % 2] : '',
    reason: bucket === 'FailedUsers' ? FAIL_REASONS[i % FAIL_REASONS.length] : '',
  }
})

export const BUCKETS = [
  { id: 'NewUsers', label: 'New users', icon: 'users', tone: 'ok', sub: 'Present on the source, absent from the platform' },
  { id: 'ModifiedUser', label: 'Modified users', icon: 'edit', tone: 'warn', sub: 'Held by both, with attributes that differ' },
  { id: 'FailedUsers', label: 'Failed users', icon: 'warn', tone: 'bad', sub: 'Could not be processed from the source' },
]

/* ------------------------------------------------------------------ run log

   A source keeps its own read history. The estate-wide Run history is keyed on
   the provisioning application a run targeted, which a trust source is not —
   so the rows a source shows are derived from what it actually holds, the same
   way its reconciled buckets are.
*/

export const trustRunsFor = (source = {}) => {
  const id = Number(source.id) || 1
  const rows = reconciledUsers(id)
  const created = rows.filter((r) => r.bucket === 'NewUsers').length
  const modified = rows.filter((r) => r.bucket === 'ModifiedUser').length
  const failed = rows.filter((r) => r.bucket === 'FailedUsers').length
  return [0, 1, 2].map((k) => ({
    id: `TRS-${2400 + id * 10 + k}`,
    // The most recent run is the one the record already reports, so the header
    // and the log cannot disagree about when this source was last read.
    started: k === 0 && source.lastRun ? source.lastRun : stampText(new Date(NOW_MS - (k * 24 + 7) * 3600000)),
    durationMs: 21000 + ((id * 6151 + k * 33107) % 420000),
    scanned: rows.length,
    created: k === 0 ? created : Math.max(0, created - k * 2),
    modified: k === 0 ? modified : Math.max(0, modified - k),
    failed: k === 0 ? failed : Math.max(0, failed - k),
    mode: k === 2 ? 'Full' : 'Delta',
    status: k === 0 && source.status === 'Degraded' ? 'Partial' : 'Succeeded',
    triggeredBy: k === 1 ? 'admin' : 'Scheduler',
  }))
}

// Registered sources so the screen is not empty on first load. Three connector
// kinds rather than one, because "which connector" is now a decision the record
// carries and a single example would not show that it is.
export const SEED_SOURCES = [
  {
    id: 1,
    application_name: 'workday_hr',
    display_name: 'Workday HR',
    type: 'api',
    connector: 'api',
    get_token_api_http_method: 'POST',
    get_token_api_auth_method: 'Basic',
    get_token_api_url: 'https://hr.tanflow.com/oauth/token',
    get_token_api_headers: '{ "Content-Type": "application/json" }',
    get_token_api_payload: '{ "grant_type": "client_credentials" }',
    users_data_api_http_method: 'GET',
    users_data_api_auth_method: 'Bearer',
    users_data_api_url: 'https://hr.tanflow.com/api/v1/workers',
    users_data_api_headers: '{ "Accept": "application/json" }',
    users_data_api_payload: '',
    listPath: 'data.workers',
    detailPath: '',
    lastRun: '2026-08-05 03:30',
    status: 'Healthy',
    connection: {
      baseUrl: 'https://hr.tanflow.com/api/v1',
      authMethod: 'Bearer token',
      tokenApi: 'https://hr.tanflow.com/oauth/token',
      token: 'stored',
      resourcePath: '/workers',
      payload: '',
      responseKey: 'data.status',
      errorKey: 'error.code',
      timeoutSeconds: '45',
    },
  },
  {
    id: 2,
    application_name: 'payroll_db',
    display_name: 'Payroll database',
    type: 'Database',
    db_type: 'POSTGRESQL',
    connector: 'postgres',
    hostname: 'db-payroll.internal',
    port: '5432',
    database: 'payroll',
    table_name: 'employees',
    username: 'idam_reader',
    password: '',
    lastRun: '2026-08-04 03:30',
    status: 'Degraded',
  },
  {
    id: 3,
    application_name: 'corp_directory',
    display_name: 'Corporate directory',
    type: 'activedirectory',
    connector: 'ad',
    directory: 'Active Directory · Corporate',
    baseDn: 'ou=people,dc=tanflow,dc=com',
    lastRun: '2026-08-05 02:00',
    status: 'Healthy',
    connection: {
      host: 'dc01.tanflow.internal',
      port: '636',
      baseDn: 'ou=people,dc=tanflow,dc=com',
      bindDn: 'cn=idam,ou=svc,dc=tanflow,dc=com',
      bindPassword: 'stored',
      objectClass: 'user',
    },
    mappings: [
      { id: 1, idam: 'username', label: attrLabel('username'), source: 'sAMAccountName', transform: 'Lowercase', manual: false },
      { id: 2, idam: 'email', label: attrLabel('email'), source: 'mail', transform: 'Lowercase', manual: false },
      { id: 3, idam: 'firstName', label: attrLabel('firstName'), source: 'givenName', transform: 'Direct', manual: false },
      { id: 4, idam: 'lastName', label: attrLabel('lastName'), source: 'sn', transform: 'Direct', manual: false },
      { id: 5, idam: 'department', label: attrLabel('department'), source: 'department', transform: 'Trim', manual: false },
      { id: 6, idam: 'empCode', label: attrLabel('empCode'), source: 'employeeID', transform: 'Direct', manual: false },
    ],
  },
].map(withConnector)
