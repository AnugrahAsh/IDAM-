import {
  APPLICATIONS, ATTR_MAPPINGS, DIRECTORIES, ORGS, SSO_APPS, USERS,
} from '../../data/seed'
import {
  CONNECTORS, IDAM_ATTRS, brandFor as provisioningBrand, kindOf, mappingsFor, operationsFor,
  profileFor, settingsFor, withDescription,
} from '../shared/provisioning/shared'
import { defaultsFor } from './ssoFields'

export { CONNECTORS, kindOf, profileFor }

export const BASE = '/iam/applications'
export const SSO_BASE = 'https://sso.tanflow.com'
export const TODAY = '2026-08-13'

export const ORG_OPTIONS = ORGS

export const slugify = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
export const systemName = (label) =>
  String(label).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'APPLICATION'

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * What an application record does.
 *
 * One capability per record. A single application is either a provisioning
 * target or a relying party, and the two are configured, tested and revoked by
 * different people — a record claiming both was one form nobody owned end to
 * end. An application that genuinely needs both is registered twice and the two
 * records are paired on the Linkage tab, which is where that pairing has always
 * been described.
 */
export const CAPABILITIES = [
  {
    id: 'provisioning',
    label: 'Provisioning connector',
    icon: 'provision',
    sub: 'Create, update and retire accounts on the target system.',
    detail: 'The platform owns the account lifecycle on the target: joiners are created, movers are updated and leavers are retired on schedule.',
  },
  {
    id: 'sso',
    label: 'SSO / federation',
    icon: 'sso',
    sub: 'Issue sign-in assertions so identities reach the application without a local password.',
    detail: 'Registers a relying party, publishes its endpoints and releases identity attributes in every assertion.',
  },
]

export const hasProv = (cap) => cap === 'provisioning'
export const hasSso = (cap) => cap === 'sso'

/**
 * The capability a stored record carries.
 *
 * Records paired before an application was limited to one capability hold both
 * facets, and they answer `dual`. They are read as they were written rather
 * than cut down on load: dropping a facet on read would take a live connector
 * or a live federation out of the estate to satisfy a rule about new records.
 */
export const capabilityOf = (app) => {
  if (!app) return ''
  if (app.provisioning && app.sso) return 'dual'
  if (app.provisioning) return 'provisioning'
  if (app.sso) return 'sso'
  return ''
}

export const isDualCapability = (app) => capabilityOf(app) === 'dual'

export const capabilityLabel = (id) => {
  const found = CAPABILITIES.find((c) => c.id === id)
  return found ? found.label : id === 'dual' ? 'Provisioning and SSO' : '—'
}

// ---------------------------------------------------------------------------
// Connector-specific connection settings (client item 14)
// ---------------------------------------------------------------------------

/**
 * How the two HTTP connectors authenticate.
 *
 * Two decisions, not one. `authType` says what kind of credential the target
 * accepts; for a bearer target `authMethod` says where the token comes from —
 * minted by the platform from a token API, or supplied here because something
 * upstream already holds it. They used to be one four-option dropdown, which
 * could express "bearer" but not which of those two it meant, so the token API
 * fields were shown to connectors that had no use for them and the header a
 * dynamic connector needs had nowhere to live at all. REST API and Custom API
 * share this model rather than each keeping its own, so moving between them is
 * not also a lesson in a second way of authenticating.
 */
export const AUTH_TYPES = ['Basic Auth', 'Bearer Token']
export const AUTH_BASIC = AUTH_TYPES[0]
export const AUTH_BEARER_TYPE = AUTH_TYPES[1]

export const BEARER_METHODS = ['Default', 'Dynamic']
export const BEARER_DEFAULT = BEARER_METHODS[0]
export const BEARER_DYNAMIC = BEARER_METHODS[1]

/**
 * The two HTTP connectors.
 *
 * REST API and Custom API used to be one connector with an `apiType` sub-type.
 * They are two entries in the catalogue now (`CONNECTOR_TYPES` in the seed):
 * the REST connector drives one base URL and one resource path and
 * authenticates exactly as Custom API does, and the Custom API connector
 * carries its own configuration beyond that — token API, response keys, and
 * one API plus one attribute mapping per lifecycle operation. Records written
 * under the old sub-type are read through `migrateProvisioningFacet` so
 * nothing already registered stops working.
 */
export const REST_API_CONNECTOR = 'api'
export const CUSTOM_API_CONNECTOR = 'custom'
export const isCustomApiConnector = (connector) => connector === CUSTOM_API_CONNECTOR

/* The two directory connectors. Both are kind `Directory`, but their
   connection fields diverge (Active Directory reads an application OU and a
   group OU; LDAP reads only an application OU and allows an anonymous bind),
   so each carries its own spec rather than a shared 'Directory' one. */
export const AD_CONNECTOR = 'ad'
export const LDAP_CONNECTOR = 'ldap'

/** The one list every HTTP method dropdown reads from. */
export const apiMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

// Categories the platform knows how to act on: a validation error is a bad
// record and is not retried, an auth error stops the run, a server error and a
// rate limit are both retried but on different backoffs. The list is closed
// because the behaviour behind each entry is closed.
export const ERROR_CATEGORIES = ['Success', 'Duplicate', 'NotFound', 'InvalidInput', 'Unauthorized', 'ServerError']

const isBearer = (c) => c.authType === AUTH_BEARER_TYPE
const isBasic = (c) => c.authType === AUTH_BASIC
const isDynamicBearer = (c) => isBearer(c) && c.authMethod === BEARER_DYNAMIC
const isDefaultBearer = (c) => isBearer(c) && c.authMethod !== BEARER_DYNAMIC

/* Lifecycle sections follow the operations ticked for the application, not the
   connection: a connector that may not delete is never asked for a delete
   endpoint. The operations arrive as render context rather than on the
   connection, because they are the application's decision and not the
   connector's. */
const canCreate = (c, ctx = {}) => !!(ctx.operations || {}).create
const canUpdate = (c, ctx = {}) => !!(ctx.operations || {}).update
const canDelete = (c, ctx = {}) => !!(ctx.operations || {}).remove

// The same decision on every HTTP connector, so it is declared once and spread
// into each spec that carries it (client items 5 and 8) — a second copy is a
// second label and a second validation rule waiting to drift.
const TIMEOUT_FIELD = {
  id: 'timeoutSeconds',
  label: 'API request timeout (seconds)',
  required: true,
  numeric: true,
  default: '30',
  min: 1,
  max: 600,
  placeholder: '30',
  hint: 'How long an outgoing call may wait for a response before the run gives up on it.',
}

/* A JSON body field, in the shape every payload field on the two HTTP
   connectors shares — declared once so a Get Token, Create, Update or Delete
   payload is the same control with a different label. */
const payloadField = (group, id, label, extra = {}) => ({
  group,
  id,
  label,
  type: 'textarea',
  mono: true,
  rows: 5,
  span: 2,
  json: true,
  ...extra,
})

/**
 * Connection field specs.
 *
 * A field may carry `when(conn)`. The renderer hides a field whose predicate is
 * false and the validator ignores it, so a field an operator cannot see is
 * never one they are asked to fill in. `required` takes the same treatment: it
 * is either a boolean or a predicate over the rest of the connection.
 */
export const CONNECTION_SPECS = {
  Database: [
    { id: 'host', label: 'Host', required: true, mono: true, placeholder: 'db.tanflow.internal' },
    { id: 'port', label: 'Port', required: true, mono: true, numeric: true },
    { id: 'database', label: 'Database', required: true, mono: true, placeholder: 'appdb' },
    { id: 'username', label: 'Username', required: true, mono: true, placeholder: 'idam_svc' },
    { id: 'password', label: 'Password', required: true, secret: true },
    { id: 'accountTable', label: 'Account table', mono: true, span: 2, hint: 'Table the connector reads and writes accounts against. Discovered automatically when left blank.' },
  ],
  /* The REST API connector: one base URL and the resource path accounts are
     listed from. Authentication is the same decision as the Custom API
     connector's — Basic Auth, or Bearer Token minted from a Get Token API or
     supplied here directly — so the two fields sets share their ids and their
     `when` predicates rather than each connector inventing its own shape.
     Everything per-operation still belongs to the Custom API connector's own
     spec alone. */
  Custom: [
    { id: 'baseUrl', label: 'Base URL', required: true, mono: true, span: 2, placeholder: 'https://api.example.com/v1' },
    { group: 'Authentication', id: 'authType', label: 'Auth type', required: true, options: AUTH_TYPES, default: AUTH_BEARER_TYPE, hint: 'The authentication mechanism used by every request to this target.' },
    { group: 'Authentication', id: 'username', label: 'Username', mono: true, when: isBasic, required: isBasic },
    { group: 'Authentication', id: 'password', label: 'Password', secret: true, when: isBasic },
    { group: 'Authentication', id: 'authMethod', label: 'Auth method', options: BEARER_METHODS, default: BEARER_DEFAULT, when: isBearer, required: isBearer, hint: 'Default obtains a token from the Get Token API below. Dynamic sends the authorization value supplied here.' },
    {
      group: 'Authentication',
      id: 'authorization',
      label: 'Authorization',
      secret: true,
      span: 2,
      when: isDynamicBearer,
      required: isDynamicBearer,
      hint: 'The authorization value sent on every API request. Extra key/value pairs can be added beneath it.',
    },
    { group: 'Get Token API', id: 'getTokenAPIUrl', label: 'Get Token API URL', mono: true, span: 2, when: isDefaultBearer, required: isDefaultBearer, placeholder: 'https://example.com/oauth/token' },
    { group: 'Get Token API', id: 'getTokenAPIMethod', label: 'Get Token API method', options: apiMethodOptions, default: 'POST', when: isDefaultBearer, required: isDefaultBearer },
    { group: 'Get Token API', id: 'clientId', label: 'Client ID', mono: true, when: isDefaultBearer, required: isDefaultBearer },
    { group: 'Get Token API', id: 'clientSecret', label: 'Client secret', secret: true, when: isDefaultBearer, required: isDefaultBearer },
    payloadField('Get Token API', 'getTokenAPIPayload', 'Get Token API payload', {
      when: isDefaultBearer,
      required: isDefaultBearer,
      placeholder: '{\n  "grant_type": "client_credentials"\n}',
      hint: 'Body sent to the token endpoint. Validated as JSON when the field loses focus.',
    }),
    { id: 'resourcePath', label: 'Resource path', mono: true, span: 2, placeholder: '/users', hint: 'Endpoint below the base URL that lists accounts.' },
    TIMEOUT_FIELD,
  ],
  Cloud: [
    { id: 'tenantId', label: 'Tenant ID', required: true, mono: true, placeholder: 'tanflow.onmicrosoft.com' },
    { id: 'clientId', label: 'Client ID', required: true, mono: true, placeholder: 'a7f1c204-…' },
    { id: 'clientSecret', label: 'Client secret', required: true, secret: true, span: 2 },
    TIMEOUT_FIELD,
  ],
  Standard: [
    { id: 'endpoint', label: 'SCIM endpoint', required: true, mono: true, span: 2, placeholder: 'https://api.example.com/scim/v2' },
    { id: 'bearerToken', label: 'Bearer token', required: true, secret: true, span: 2 },
    TIMEOUT_FIELD,
  ],
  Manual: [],
}

// ---------------------------------------------------------------------------
// The Custom API connector.
//
// Its own connector, not a variant of REST. Every field below belongs to it
// alone: the authentication applied to every API it calls, the token API a
// default bearer connector mints from, the keys a response is read by, and one
// API configuration per lifecycle operation the application is allowed to
// perform. Field ids follow the connector's own configuration names
// (`maxAPIRequestTimeout`, `getTokenAPIUrl`, `createUserAPIUrl`, …) rather than
// the REST connector's, so the two never share a stored key by accident.
// ---------------------------------------------------------------------------

/** Value formats offered on a Create or Update attribute mapping row. */
export const CUSTOM_API_VALUE_FORMATS = ['Direct', 'Lowercase', 'Uppercase', 'Trim', 'Concatenate', 'Lookup']

/* Which application attributes a Custom API connection already names, so the
   unique attribute can be chosen from them as well as from the catalogue. */
const customApiAppAttributes = (conn = {}) => [
  ...(conn.getUserMappings || []).map((r) => r.applicationAttribute),
  ...(conn.createMappings || []).map((r) => r.applicationAttribute),
  ...(conn.updateMappings || []).map((r) => r.applicationAttribute),
  ...(conn.deleteMappings || []).map((r) => r.applicationAttribute),
  conn.uniqueAppAttribute,
].map((v) => String(v || '').trim()).filter(Boolean)

const customApiUniqueOptions = (conn = {}) =>
  [...new Set([...TARGET_ATTR_CATALOG.Custom, ...customApiAppAttributes(conn)])]

const uniqueIdamOptions = () => IDAM_ATTRS

/* The unique attribute pair is asked for once, on the first lifecycle section
   that needs it: Create when the application may create, otherwise Update. The
   two entries share an id and are never visible together, so the value is one
   value however it is reached. */
const uniquePairFields = (group, when) => [
  {
    group,
    id: 'uniqueAppAttribute',
    label: 'Application unique attribute',
    mono: true,
    options: customApiUniqueOptions,
    placeholder: 'Select an application attribute',
    when,
    required: when,
    hint: 'The attribute an account is identified by on the target. Changing it clears the Create and Update attribute mappings.',
  },
  {
    group,
    id: 'uniqueIdamAttribute',
    label: 'IDAM unique attribute',
    options: uniqueIdamOptions,
    placeholder: 'Select an IDAM attribute',
    when,
    required: when,
    hint: 'The identity attribute matched against it during provisioning and reconciliation.',
  },
]

export const CUSTOM_API_SPEC = [
  // -- Authentication. Applied to every API in this configuration. ---------
  { group: 'Authentication', id: 'authType', label: 'Auth type', required: true, options: AUTH_TYPES, default: AUTH_BEARER_TYPE, hint: 'The authentication mechanism used by every API configured below.' },
  {
    group: 'Authentication',
    id: 'maxAPIRequestTimeout',
    label: 'API request timeout (seconds)',
    required: true,
    numeric: true,
    default: '30',
    min: 1,
    max: 600,
    placeholder: '30',
    hint: 'How long the platform waits for an API response before the request is treated as failed.',
  },
  { group: 'Authentication', id: 'username', label: 'Username', mono: true, when: isBasic, required: isBasic },
  // Registered without required validation, as the connector's own form does
  // (validation summary: "Basic Password — registered without required
  // validation").
  { group: 'Authentication', id: 'password', label: 'Password', secret: true, when: isBasic },
  { group: 'Authentication', id: 'authMethod', label: 'Auth method', options: BEARER_METHODS, default: BEARER_DEFAULT, when: isBearer, required: isBearer, hint: 'Default obtains a token from the Get Token API below. Dynamic sends the authorization value supplied here.' },
  {
    group: 'Authentication',
    id: 'authorization',
    label: 'Authorization',
    secret: true,
    span: 2,
    when: isDynamicBearer,
    required: isDynamicBearer,
    hint: 'The authorization value sent on every API request. Extra key/value pairs can be added beneath it.',
  },

  // -- Get Token API. Only a default bearer connector mints its own token. -
  // The connector's form marks the token URL and method as required while
  // registering them as optional. Treated as required here: a default bearer
  // connector with no token endpoint cannot authenticate a single call.
  { group: 'Get Token API', id: 'getTokenAPIUrl', label: 'Get Token API URL', mono: true, span: 2, when: isDefaultBearer, required: isDefaultBearer, placeholder: 'https://example.com/oauth/token' },
  { group: 'Get Token API', id: 'getTokenAPIMethod', label: 'Get Token API method', options: apiMethodOptions, default: 'POST', when: isDefaultBearer, required: isDefaultBearer },
  { group: 'Get Token API', id: 'clientId', label: 'Client ID', mono: true, when: isDefaultBearer, required: isDefaultBearer },
  { group: 'Get Token API', id: 'clientSecret', label: 'Client secret', secret: true, when: isDefaultBearer, required: isDefaultBearer },
  payloadField('Get Token API', 'getTokenAPIPayload', 'Get Token API payload', {
    when: isDefaultBearer,
    required: isDefaultBearer,
    placeholder: '{\n  "grant_type": "client_credentials"\n}',
    hint: 'Body sent to the token endpoint. Validated as JSON when the field loses focus.',
  }),

  // -- How a response is read. Every key is optional. ---------------------
  { group: 'Get Response Error Keys', id: 'successKey', label: 'Success key', mono: true, placeholder: 'e.g., status, success, code', hint: 'Key in the response body that says whether a call succeeded.' },
  { group: 'Get Response Error Keys', id: 'successValue', label: 'Success value', mono: true, placeholder: 'e.g., true, success, 000', hint: 'The value that key carries on a successful call.' },
  { group: 'Get Response Error Keys', id: 'messageKey', label: 'Message key', mono: true, placeholder: 'e.g., message, msg, ResMsg, detail', hint: 'Key carrying the human-readable outcome.' },
  { group: 'Get Response Error Keys', id: 'errorKey', label: 'Error key', mono: true, placeholder: 'e.g., message, msg, ResMsg, detail', hint: 'Key that carries the failure reason. The error classification keywords beneath are matched against it.' },

  // -- Get User. Always configured. ---------------------------------------
  { group: 'Get User API Configurations', id: 'getUserAPIUrl', label: 'Get API URL', mono: true, span: 2, placeholder: 'https://example.com/api/users', hint: 'Endpoint the connector retrieves users from.' },
  { group: 'Get User API Configurations', id: 'getUserAPIMethod', label: 'Get API method', options: apiMethodOptions, default: 'GET' },
  payloadField('Get User API Configurations', 'getUserAPIPayload', 'Get API payload', {
    required: true,
    default: '{}',
    placeholder: '{\n  "id": "",\n  "profile": {\n    "email": ""\n  }\n}',
    hint: 'Body sent on the read, validated as JSON when the field loses focus. Nested keys are offered to the Get User attribute mapping as dot paths, such as profile.email.',
  }),

  // -- Create. Shown only when the application may create accounts. --------
  { group: 'Create User API Configurations', id: 'createUserAPIUrl', label: 'Create API URL', mono: true, span: 2, url: true, when: canCreate, required: canCreate, placeholder: 'https://example.com/api/users' },
  { group: 'Create User API Configurations', id: 'createUserAPIMethod', label: 'Create API method', options: apiMethodOptions, default: 'POST', when: canCreate, required: canCreate },
  payloadField('Create User API Configurations', 'createUserAPIPayload', 'Create API payload', {
    when: canCreate,
    required: canCreate,
    placeholder: '{\n  "userName": "{username}",\n  "email": "{email}"\n}',
    hint: 'A {token} is replaced with the value the Create attribute mapping writes for it.',
  }),
  ...uniquePairFields('Create User API Configurations', canCreate),

  // -- Update. The same shape as Create, against the update endpoint. ------
  { group: 'Update User API Configurations', id: 'updateUserAPIUrl', label: 'Update API URL', mono: true, span: 2, url: true, when: canUpdate, required: canUpdate, placeholder: 'https://example.com/api/users/{id}' },
  { group: 'Update User API Configurations', id: 'updateUserAPIMethod', label: 'Update API method', options: apiMethodOptions, default: 'PUT', when: canUpdate, required: canUpdate },
  payloadField('Update User API Configurations', 'updateUserAPIPayload', 'Update API payload', {
    when: canUpdate,
    required: canUpdate,
    placeholder: '{\n  "email": "{email}"\n}',
    hint: 'A {token} is replaced with the value the Update attribute mapping writes for it.',
  }),
  ...uniquePairFields('Update User API Configurations', (c, ctx) => !canCreate(c, ctx) && canUpdate(c, ctx)),

  // -- Delete. An endpoint and a verb; a body is optional. -----------------
  { group: 'Delete User API Configurations', id: 'deleteUserAPIUrl', label: 'Delete API URL', mono: true, span: 2, url: true, when: canDelete, required: canDelete, placeholder: 'https://example.com/api/users/{id}' },
  { group: 'Delete User API Configurations', id: 'deleteUserAPIMethod', label: 'Delete API method', options: apiMethodOptions, default: 'DELETE', when: canDelete, required: canDelete },
  payloadField('Delete User API Configurations', 'deleteUserAPIPayload', 'Delete API payload', {
    when: canDelete,
    placeholder: '{\n  "reason": "offboarded"\n}',
    hint: 'Body sent with the delete request, if the target expects one. Optional — most targets accept a bodyless delete.',
  }),
]

// ---------------------------------------------------------------------------
// Active Directory / LDAP connection settings.
//
// A single Connection URL (the LDAP URI, scheme and port included) in place
// of a separate host and port, and no explicit Base DN or object class — the
// connector reads it from the bind DN instead of asking for it twice.
// ---------------------------------------------------------------------------

const DIRECTORY_URL_FIELD = {
  id: 'connectionUrl',
  label: 'Connection URL',
  required: true,
  mono: true,
  span: 2,
  placeholder: 'ldap://10.0.0.00:389 or ldaps://abc.def.com:636',
}
const DIRECTORY_BIND_DN_FIELD = {
  id: 'bindDn',
  label: 'Bind DN',
  required: true,
  mono: true,
  span: 2,
  placeholder: 'cn=idam,ou=svc,dc=tanflow,dc=com',
}

export const AD_SPEC = [
  DIRECTORY_URL_FIELD,
  DIRECTORY_BIND_DN_FIELD,
  { id: 'bindPassword', label: 'Password', required: true, secret: true },
]

export const LDAP_SPEC = [
  DIRECTORY_URL_FIELD,
  DIRECTORY_BIND_DN_FIELD,
  { id: 'bindPassword', label: 'Password', secret: true, hint: 'Left blank for an anonymous bind.' },
]

/* A connector with a spec of its own is looked up by id before its kind, so
   the two HTTP connectors share a family without sharing a form, and Active
   Directory and LDAP share a kind without sharing a form either. */
const CONNECTOR_SPECS = {
  [CUSTOM_API_CONNECTOR]: CUSTOM_API_SPEC,
  [AD_CONNECTOR]: AD_SPEC,
  [LDAP_CONNECTOR]: LDAP_SPEC,
}

export const specFor = (connector) =>
  CONNECTOR_SPECS[connector] || CONNECTION_SPECS[kindOf(connector)] || CONNECTION_SPECS.Custom

/** The options a select field offers, for the connection as it currently reads. */
export const fieldOptions = (f, conn = {}, ctx = {}) => (typeof f.options === 'function' ? f.options(conn, ctx) : f.options)

/** Whether a conditional field applies to the connection as it currently reads. */
/* `ctx` carries what the connection itself cannot know — currently the
   operations the application is allowed to perform. */
export const fieldShown = (f, conn = {}, ctx = {}) => (typeof f.when === 'function' ? !!f.when(conn, ctx) : true)

/** A hidden field is never required — that is the whole point of hiding it. */
export const fieldRequired = (f, conn = {}, ctx = {}) => {
  if (!fieldShown(f, conn, ctx)) return false
  return typeof f.required === 'function' ? !!f.required(conn, ctx) : !!f.required
}

export const visibleSpec = (connector, conn = {}, ctx = {}) =>
  specFor(connector).filter((f) => fieldShown(f, conn, ctx))

/** The visible fields in declaration order, gathered under their group heading. */
export const specGroups = (connector, conn = {}, ctx = {}) => {
  const out = []
  visibleSpec(connector, conn, ctx).forEach((f) => {
    const name = f.group || ''
    const last = out[out.length - 1]
    if (last && last.group === name) last.fields.push(f)
    else out.push({ group: name, fields: [f] })
  })
  return out
}

/**
 * The one place a single field is judged, so the inline error under the control
 * and the line in the save bar can never disagree about what is wrong.
 */
export const fieldIssue = (f, conn = {}, subject = '', ctx = {}) => {
  if (!fieldShown(f, conn, ctx)) return null
  const raw = String(conn[f.id] == null ? '' : conn[f.id]).trim()
  if (fieldRequired(f, conn, ctx) && !raw) {
    return f.requiredMessage || `${f.label} is required${subject ? ` for a ${subject} connector` : ''}.`
  }
  if (raw && f.numeric && (f.min != null || f.max != null)) {
    const n = Number(raw)
    if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) {
      return `${f.label} must be between ${f.min} and ${f.max}.`
    }
  }
  // A payload that does not parse is a run that fails on its first record, so
  // it is caught on the form rather than at the target. The placeholders are
  // substituted before the body is sent, and a {token} sits inside a JSON
  // string, so the template itself has to parse as it stands.
  if (raw && f.json) {
    try {
      JSON.parse(raw)
    } catch (e) {
      return `${f.label} is not valid JSON: ${e.message}`
    }
  }
  /* A lifecycle endpoint is an absolute address, not a path fragment: the
     connector calls it as it stands rather than resolving it against the base
     URL, so "users/{id}" is a call that never leaves the machine. */
  if (raw && f.url && !/^https?:\/\/[^\s]+$/i.test(raw)) {
    return `${f.label} must be a full URL including http:// or https://.`
  }
  return null
}

/**
 * Error classification (client item 4).
 *
 * A list rather than one text box: an operator needs to say that 401 is an auth
 * failure and 422 is a bad record, and a single field cannot carry two answers.
 * It is deliberately not part of the field spec — the generic renderer walks
 * scalars, and this is a table.
 */
/**
 * Extra authentication parameters, for a dynamic bearer connector.
 *
 * A target that wants a tenant id, an API version or a subscription key
 * alongside the authorization header has no way to say so in a fixed field
 * list, because the names are the target's own. They are key/value pairs for
 * that reason and for no other.
 */
export const blankAuthExtras = () => []

export const authExtraIssues = (conn = {}) => {
  const rows = conn.authExtras || []
  const out = []
  if (rows.some((r) => String(r.value || '').trim() && !String(r.key || '').trim())) {
    out.push('An extra authentication parameter has a value but no name.')
  }
  const seen = new Set()
  rows.forEach((r) => {
    const key = String(r.key || '').trim().toLowerCase()
    if (!key) return
    if (seen.has(key)) out.push(`More than one extra authentication parameter is called ${r.key}. Only the first is sent.`)
    seen.add(key)
  })
  return [...new Set(out)]
}

// Default keywords are part of every connector and cannot be removed.
export const DEFAULT_ERROR_CLASSES = Object.entries({
  Success: ['created successfully', 'updated successfully', 'operation completed', 'request accepted', 'success'],
  Duplicate: ['already exists', 'duplicate', 'exist'],
  NotFound: ['not found', 'no record', 'missing'],
  InvalidInput: ['invalid', 'bad request', 'validation failed', 'unprocessable'],
  Unauthorized: ['unauthorized', 'token', 'permission denied', 'access denied'],
  ServerError: ['internal server', 'unexpected', 'failed', 'exception', 'crash', 'error occurred'],
}).flatMap(([category, matches]) => matches.map((match) => ({ match, category })))

export const isDefaultErrorClass = (r) => DEFAULT_ERROR_CLASSES.some(
  (d) => d.category === r.category && d.match.toLowerCase() === String(r.match || '').trim().toLowerCase(),
)

export const blankErrorClasses = () => DEFAULT_ERROR_CLASSES.map((d, i) => ({ id: i + 1, ...d }))

export const errorClassIssues = (conn = {}) => {
  const rows = conn.errorClasses || []
  const out = []
  if (rows.some((r) => !String(r.match || '').trim())) {
    out.push('Every error classification needs a response condition to match on.')
  }
  const seen = new Set()
  rows.forEach((r) => {
    const key = String(r.match || '').trim().toLowerCase()
    if (!key) return
    // Conditions are evaluated in order, so a repeat is dead configuration
    // rather than a second chance at classifying the same response.
    if (seen.has(key)) out.push(`More than one error classification matches on ${r.match}. Only the first one is ever applied.`)
    seen.add(key)
  })
  return [...new Set(out)]
}

export const blankConnection = (connector) => {
  const out = {}
  specFor(connector).forEach((f) => {
    // A select whose options depend on the connection starts empty: there is
    // nothing to pick from until the operator has named some attributes.
    out[f.id] = f.default != null ? f.default : Array.isArray(f.options) ? f.options[0] : ''
  })
  if (out.port !== undefined) out.port = profileFor(connector).port || ''
  if (kindOf(connector) === 'Custom') {
    out.errorClasses = blankErrorClasses()
    out.authExtras = blankAuthExtras()
  }
  if (isCustomApiConnector(connector)) {
    out.getUserMappings = []
    out.createMappings = []
    out.updateMappings = []
    out.deleteMappings = []
  }
  return out
}

// ---------------------------------------------------------------------------
// Custom API attribute mappings.
//
// Operation-specific: Get, Create and Update each carry their own table, so
// the attributes read back from the target and the attributes written on a
// create can differ, as they do on most real APIs. A Get row is a pair; a
// Create or Update row also says whether the value may be blank, whether the
// key must be present at all, how the value is formatted, and whether the
// application attribute name was typed by hand.
// ---------------------------------------------------------------------------

/**
 * Every value-bearing key of a JSON payload, nested keys as dot paths
 * (profile.email) and arrays of objects through their first element
 * (emails[0].value). A payload that does not parse offers nothing.
 */
export const payloadPaths = (text) => {
  let doc
  try {
    doc = JSON.parse(String(text || '').trim() || '{}')
  } catch {
    return []
  }
  const out = []
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      if (node.length && node[0] && typeof node[0] === 'object') walk(node[0], `${path}[0]`)
      else if (path) out.push(path)
      return
    }
    if (node && typeof node === 'object') {
      const keys = Object.keys(node)
      if (!keys.length) {
        if (path) out.push(path)
        return
      }
      keys.forEach((k) => walk(node[k], path ? `${path}.${k}` : k))
      return
    }
    if (path) out.push(path)
  }
  walk(doc, '')
  return [...new Set(out)]
}

export const blankGetUserMapping = (rows = []) => ({
  id: rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
  applicationAttribute: '',
  idamAttribute: '',
})

export const blankLifecycleMapping = (rows = []) => ({
  id: rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
  idamAttribute: '',
  applicationAttribute: '',
  manualInputAttribute: false,
  valueFormat: CUSTOM_API_VALUE_FORMATS[0],
  mandatory: false,
  notNull: false,
})

const mappingRowIssues = (rows, label) => {
  const out = []
  if (rows.some((r) => !String(r.applicationAttribute || '').trim() || !String(r.idamAttribute || '').trim())) {
    out.push(`Every ${label} attribute mapping row needs both an application attribute and an IDAM attribute.`)
  }
  const seen = new Set()
  rows.forEach((r) => {
    const key = String(r.applicationAttribute || '').trim().toLowerCase()
    if (!key) return
    if (seen.has(key)) out.push(`${r.applicationAttribute} is mapped more than once in the ${label} attribute mapping. Only the first row is written.`)
    seen.add(key)
  })
  return out
}

/** Everything wrong with a Custom API connection that is not a single field. */
export const customApiMappingIssues = (conn = {}, ctx = {}) => {
  const out = [...mappingRowIssues(conn.getUserMappings || [], 'Get User')]
  if (canCreate(conn, ctx)) out.push(...mappingRowIssues(conn.createMappings || [], 'Create'))
  if (canUpdate(conn, ctx)) out.push(...mappingRowIssues(conn.updateMappings || [], 'Update'))
  if (canDelete(conn, ctx)) out.push(...mappingRowIssues(conn.deleteMappings || [], 'Delete'))
  return [...new Set(out)]
}

/**
 * A stored provisioning facet, read forward.
 *
 * Applications registered while Custom API was a sub-type of the REST
 * connector carry `connector: 'api'` with `apiType: 'Custom API'` on the
 * connection. They are moved onto the Custom API connector here, with each
 * value carried to the field that now holds it, so the record opens on the
 * form it was configured on. A REST record simply loses the sub-type key.
 */
const LEGACY_CUSTOM_KEYS = {
  timeoutSeconds: 'maxAPIRequestTimeout',
  getTokenApiUrl: 'getTokenAPIUrl',
  getTokenApiMethod: 'getTokenAPIMethod',
  getTokenApiPayload: 'getTokenAPIPayload',
  getUserApiUrl: 'getUserAPIUrl',
  getUserApiMethod: 'getUserAPIMethod',
  getUserApiPayload: 'getUserAPIPayload',
  createPath: 'createUserAPIUrl',
  createMethod: 'createUserAPIMethod',
  createPayload: 'createUserAPIPayload',
  updatePath: 'updateUserAPIUrl',
  updateMethod: 'updateUserAPIMethod',
  updatePayload: 'updateUserAPIPayload',
  deletePath: 'deleteUserAPIUrl',
  deleteMethod: 'deleteUserAPIMethod',
}

export const migrateProvisioningFacet = (facet) => {
  if (!facet || !facet.connection) return facet
  const { apiType, ...rest } = facet.connection
  const legacyCustom = facet.connector === REST_API_CONNECTOR && (apiType === 'Custom API' || facet.method === 'Custom API')
  if (!legacyCustom) {
    return apiType === undefined ? facet : { ...facet, connection: rest }
  }
  const conn = blankConnection(CUSTOM_API_CONNECTOR)
  Object.entries(rest).forEach(([k, v]) => {
    const key = LEGACY_CUSTOM_KEYS[k] || k
    if (key in conn || k === 'errorClasses' || k === 'authExtras') conn[key] = v
  })
  if (facet.uniqueTargetAttribute) conn.uniqueAppAttribute = facet.uniqueTargetAttribute
  if (facet.uniqueAttribute) conn.uniqueIdamAttribute = facet.uniqueAttribute
  return {
    ...facet,
    connector: CUSTOM_API_CONNECTOR,
    method: CONNECTORS[CUSTOM_API_CONNECTOR] ? CONNECTORS[CUSTOM_API_CONNECTOR].name : 'Custom API',
    connection: conn,
  }
}

export const connectionIssues = (connector, conn = {}, ctx = {}) => {
  // The message names the connector — "required for a Custom API connector" —
  // so an operator reading the save bar is told which form it belongs to.
  const name = CONNECTORS[connector] ? CONNECTORS[connector].name : connector
  const out = specFor(connector).map((f) => fieldIssue(f, conn, name, ctx)).filter(Boolean)
  if (kindOf(connector) === 'Custom') {
    out.push(...errorClassIssues(conn))
    out.push(...authExtraIssues(conn))
  }
  if (isCustomApiConnector(connector)) out.push(...customApiMappingIssues(conn, ctx))
  return out
}

export const connectionEndpoint = (connector, conn = {}) => {
  if (conn.host) return conn.port ? `${conn.host}:${conn.port}` : conn.host
  // A Custom API connector has no base URL: the user read is the address it is
  // reachable at, and the token endpoint stands in until one is configured.
  return conn.connectionUrl || conn.baseUrl || conn.endpoint || conn.tenantId || conn.getUserAPIUrl || conn.getTokenAPIUrl || '—'
}

/* The illustrative configuration from the connector's specification, for a
   seeded application on the Custom API connector. */
const customApiSeed = (a) => {
  const s = settingsFor(a)
  const base = s.container
  return {
    ...blankConnection(CUSTOM_API_CONNECTOR),
    authType: AUTH_BEARER_TYPE,
    authMethod: BEARER_DEFAULT,
    maxAPIRequestTimeout: String(s.timeout),
    getTokenAPIUrl: `${base}/oauth/token`,
    getTokenAPIMethod: 'POST',
    clientId: s.principal,
    clientSecret: 'stored',
    getTokenAPIPayload: '{ "grant_type": "client_credentials" }',
    successKey: 'status',
    successValue: 'success',
    messageKey: 'message',
    errorKey: 'error',
    getUserAPIUrl: `${base}${s.object}`,
    getUserAPIMethod: 'GET',
    getUserAPIPayload: '{}',
    getUserMappings: [
      { id: 1, applicationAttribute: 'employeeId', idamAttribute: 'username' },
      { id: 2, applicationAttribute: 'emailAddress', idamAttribute: 'email' },
      { id: 3, applicationAttribute: 'firstName', idamAttribute: 'firstName' },
      { id: 4, applicationAttribute: 'lastName', idamAttribute: 'lastName' },
    ],
    createUserAPIUrl: `${base}${s.object}`,
    createUserAPIMethod: 'POST',
    createUserAPIPayload: '{\n  "employeeId": "{username}",\n  "emailAddress": "{email}",\n  "firstName": "{firstName}",\n  "lastName": "{lastName}"\n}',
    uniqueAppAttribute: 'employeeId',
    uniqueIdamAttribute: 'username',
    createMappings: [
      { id: 1, idamAttribute: 'username', applicationAttribute: 'employeeId', manualInputAttribute: true, valueFormat: 'Direct', mandatory: true, notNull: true },
      { id: 2, idamAttribute: 'email', applicationAttribute: 'emailAddress', manualInputAttribute: true, valueFormat: 'Lowercase', mandatory: true, notNull: true },
      { id: 3, idamAttribute: 'firstName', applicationAttribute: 'FirstName', manualInputAttribute: false, valueFormat: 'Direct', mandatory: false, notNull: false },
      { id: 4, idamAttribute: 'lastName', applicationAttribute: 'LastName', manualInputAttribute: false, valueFormat: 'Direct', mandatory: false, notNull: false },
    ],
    updateUserAPIUrl: `${base}${s.object}/{id}`,
    updateUserAPIMethod: 'PUT',
    updateUserAPIPayload: '{\n  "emailAddress": "{email}",\n  "firstName": "{firstName}",\n  "lastName": "{lastName}"\n}',
    updateMappings: [
      { id: 1, idamAttribute: 'email', applicationAttribute: 'emailAddress', manualInputAttribute: true, valueFormat: 'Lowercase', mandatory: true, notNull: true },
      { id: 2, idamAttribute: 'firstName', applicationAttribute: 'FirstName', manualInputAttribute: false, valueFormat: 'Direct', mandatory: false, notNull: false },
      { id: 3, idamAttribute: 'lastName', applicationAttribute: 'LastName', manualInputAttribute: false, valueFormat: 'Direct', mandatory: false, notNull: false },
    ],
    deleteUserAPIUrl: `${base}${s.object}/{id}`,
    deleteUserAPIMethod: 'DELETE',
    errorClasses: blankErrorClasses(),
    authExtras: blankAuthExtras(),
  }
}

const connectionSeed = (a) => {
  const s = settingsFor(a)
  if (isCustomApiConnector(a.connector)) return customApiSeed(a)
  switch (kindOf(a.connector)) {
    case 'Database':
      return { host: a.host, port: a.port, database: s.container, username: s.principal, password: 'stored', accountTable: s.object }
    case 'Directory': {
      const url = `${s.tls ? 'ldaps' : 'ldap'}://${a.host}:${a.port}`
      return { connectionUrl: url, bindDn: s.principal, bindPassword: 'stored' }
    }
    case 'Custom':
      return {
        baseUrl: s.container,
        authType: AUTH_BEARER_TYPE,
        authMethod: BEARER_DEFAULT,
        getTokenAPIUrl: `${s.container}/oauth/token`,
        getTokenAPIMethod: 'POST',
        clientId: s.principal,
        clientSecret: 'stored',
        getTokenAPIPayload: '{ "grant_type": "client_credentials" }',
        resourcePath: s.object,
        timeoutSeconds: String(s.timeout),
      }
    case 'Cloud':
      return { tenantId: 'tanflow.onmicrosoft.com', clientId: s.principal, clientSecret: 'stored', timeoutSeconds: String(s.timeout) }
    case 'Standard':
      return { endpoint: s.container, bearerToken: 'stored', timeoutSeconds: String(s.timeout) }
    default:
      return {}
  }
}

// Simulated connection probe, spec-aware. Shape matches <TestResult probe={..} />.
export const probeConnection = (connector, conn = {}) => {
  const endpoint = connectionEndpoint(connector, conn)
  const missing = connectionIssues(connector, conn)
  const secretField = visibleSpec(connector, conn).find((f) => f.secret)
  // A secret that is not required — LDAP's bind password, left blank for an
  // anonymous bind — is not a failed authentication, it is a choice.
  const secretOk = !secretField || !fieldRequired(secretField, conn) || !!String(conn[secretField.id] || '').trim()
  const seed = [...String(endpoint)].reduce((a, c) => a + c.charCodeAt(0), 7)

  const steps = []
  const push = (label, state, detail, ms) => steps.push({ id: steps.length + 1, label, state, detail, ms })
  let stopped = false

  if (endpoint === '—') {
    push('Resolve endpoint', 'fail', 'No endpoint has been supplied for this connector type.', 8)
    stopped = true
  } else {
    push('Resolve endpoint', 'ok', `${endpoint} resolved to 10.42.${seed % 200}.${(seed * 7) % 250}`, 14 + (seed % 20))
  }

  if (stopped) push('Open transport', 'skip', 'Not attempted.', 0)
  else push('Open transport', 'ok', 'TLS 1.3 negotiated, certificate chain trusted to the platform store.', 26 + (seed % 30))

  if (stopped) push('Authenticate', 'skip', 'Not attempted.', 0)
  else if (!secretOk) {
    push('Authenticate', 'fail', `No ${secretField.label.toLowerCase()} is stored for this connector.`, 12)
    stopped = true
  } else push('Authenticate', 'ok', 'The service credential authenticated against the target.', 44 + (seed % 30))

  if (stopped) push('Read account object', 'skip', 'Not attempted.', 0)
  else if (missing.length) {
    push('Read account object', 'fail', missing[0], 9)
    stopped = true
  } else push('Read account object', 'ok', `First page returned ${100 + (seed % 900)} rows.`, 58 + (seed % 90))

  const failed = steps.some((s) => s.state === 'fail')
  const at = new Date()
  return {
    ok: !failed,
    level: failed ? 'bad' : 'ok',
    ms: steps.reduce((a, s) => a + s.ms, 0),
    at: `${at.toISOString().slice(11, 19)} UTC`,
    steps,
    summary: failed
      ? 'The connector cannot reach the target with the current settings.'
      : 'The target is reachable and the stored credential can read the account object.',
  }
}

// ---------------------------------------------------------------------------
// SSO / SAML model
// ---------------------------------------------------------------------------

// OAuth Mobile is its own protocol, not a variant of OAuth: a mobile client is
// public, cannot hold a secret, and is bound to a custom URI scheme rather than
// an https origin — so it validates differently and is named differently.
/* Link is a first-class application type: it asserts nothing and issues no
   token, it puts a tile in the catalog that opens a URL. It is registered here
   so it is offered alongside the protocols rather than only reachable on a
   record that already carries one. */
export const PROTOCOLS = ['SAML', 'OIDC', 'OAuth', 'OAuth Mobile', 'JWT', 'Link']

export const NAMEID_FORMATS = [
  'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
]

export const SIG_ALGORITHMS = ['RSA-SHA256', 'RSA-SHA512', 'ECDSA-SHA256']

export const DIGEST_ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512']

export const ACS_BINDINGS = [
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
]

export const SAML_NAME_FORMATS = [
  'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
  'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
  'urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified',
]

export const ssoEndpoints = (name) => {
  const slug = name || 'new_application'
  return {
    entityId: `${SSO_BASE}/${slug}`,
    metadata: `${SSO_BASE}/saml2/${slug}/metadata`,
    acs: `${SSO_BASE}/saml2/${slug}/acs`,
    slo: `${SSO_BASE}/saml2/${slug}/logout`,
    login: `${SSO_BASE}/start/${slug}`,
    jwks: `${SSO_BASE}/.well-known/jwks.json`,
  }
}

// The SAML facet is grouped into the four things an operator actually reasons
// about: who the service provider is, how the subject is named, what is signed,
// and how the session behaves. The wizard and the SSO tab render it in exactly
// those groups (client items 2 and 3).
export const blankSaml = () => ({
  // Service provider identity
  entityId: '',
  acs: '',
  acsExtra: '',
  acsBinding: ACS_BINDINGS[0],
  slo: '',
  sloBinding: ACS_BINDINGS[1],
  audience: '',
  // Subject
  nameId: NAMEID_FORMATS[0],
  nameIdAttribute: 'mail',
  // Signing and encryption
  sigAlgorithm: SIG_ALGORITHMS[0],
  digestAlgorithm: DIGEST_ALGORITHMS[0],
  signAssertion: true,
  signResponse: true,
  encryptAssertion: false,
  wantAuthnRequestsSigned: false,
  // Session and flow
  relayState: '',
  idpInitiated: true,
  forceAuthn: false,
  assertionLifetime: '5',
  sessionLifetime: '480',
  attributeFormat: SAML_NAME_FORMATS[0],
  // Advanced: the secondary endpoints and capability switches a service
  // provider only asks for when it needs them. Behind a disclosure because a
  // form that leads with them buries the four fields most SPs actually use.
  secondaryAcs: '',
  secondarySlo: '',
  artifactResolution: '',
  ecpEndpoint: '',
  wantAssertionsEncrypted: false,
  signMetadata: false,
  allowUnsolicited: false,
  includeAuthnContext: true,
  authnContextClass: 'PasswordProtectedTransport',
  allowCreateNameId: true,
  spNameQualifier: '',
})

/* What the service provider must present at sign-in for the assertion to be
   issued. Escalating from "any password" to a phishing-resistant factor. */
/* A JWT relying party is handed a signed token directly — there is no redirect
   and no code exchange — so what matters is who it is issued to, how it is
   signed, how long it lives and where the key comes from. A Link application
   only launches a URL and asserts nothing, so it carries neither. */
export const blankJwt = () => ({
  audience: '',
  issuer: '',
  algorithm: 'RS256',
  keySource: 'Platform signing key',
  sharedSecret: '',
  jwksUrl: '',
  lifetime: '15',
  clockSkew: '60',
  includeGroups: true,
  includeEmail: true,
})

export const JWT_KEY_SOURCES = [
  { value: 'Platform signing key', label: 'Platform signing key (RS256 / published JWKS)' },
  { value: 'Shared secret', label: 'Shared secret (HS256)' },
  { value: 'External JWKS', label: 'External JWKS endpoint' },
]

/* A link opens in the browser's own tab handling; the "open in" choice the
   form used to ask for was removed with the field. */
export const blankLink = () => ({
  targetUrl: '',
})

export const jwtIssues = (j = {}) => {
  const out = []
  if (!String(j.audience || '').trim()) out.push('An audience is required — it names the application the token is issued to.')
  if (j.keySource === 'Shared secret' && !String(j.sharedSecret || '').trim()) out.push('A shared secret is required for HS256.')
  if (j.keySource === 'External JWKS' && !String(j.jwksUrl || '').trim()) out.push('A JWKS endpoint is required.')
  return out
}

export const linkIssues = (l = {}) => {
  const out = []
  const url = String(l.targetUrl || '').trim()
  if (!url) out.push('A target URL is required — a link application does nothing without one.')
  else if (!/^https?:\/\//i.test(url)) out.push('Use an absolute http:// or https:// URL.')
  return out
}

export const AUTHN_CONTEXTS = [
  'PasswordProtectedTransport',
  'Password',
  'TLSClient',
  'X509',
  'MobileTwoFactorContract',
  'unspecified',
]

// ---------------------------------------------------------------------------
// OIDC / OAuth client model (client item 3)
// ---------------------------------------------------------------------------

export const CLIENT_TYPES = [
  { value: 'confidential', label: 'Confidential — the client can keep a secret' },
  { value: 'public', label: 'Public — browser or native client, no secret' },
]

export const APPLICATION_TYPES = ['Web application', 'Single-page application', 'Native / mobile', 'Machine to machine']

export const PKCE_METHODS = [
  { value: 'S256', label: 'Required · S256' },
  { value: 'plain', label: 'Required · plain' },
  { value: 'none', label: 'Not required' },
]

export const ID_TOKEN_ALGORITHMS = ['RS256', 'RS512', 'ES256', 'PS256']

export const SUBJECT_TYPES = [
  { value: 'public', label: 'Public — the same subject for every client' },
  { value: 'pairwise', label: 'Pairwise — a per-client subject identifier' },
]

export const GRANT_SPECS = [
  { id: 'authorizationCode', label: 'Standard flow', hint: 'The authorization code flow — the standard browser redirect.' },
  { id: 'directAccess', label: 'Direct access grants', hint: 'Resource owner password credentials. The client handles the password itself.' },
  { id: 'refreshToken', label: 'Refresh token', hint: 'Lets the client renew an access token without a new sign-in.' },
  { id: 'clientCredentials', label: 'Service account roles', hint: 'Client credentials — machine-to-machine access with no user present.' },
  { id: 'implicit', label: 'Implicit flow', hint: 'Legacy browser flow. Refused for new confidential clients.' },
  { id: 'deviceCode', label: 'Device authorization grant', hint: 'For input-constrained devices that show a user code.' },
  { id: 'ciba', label: 'CIBA', hint: 'Client-initiated backchannel authentication — the client asks, the identity approves elsewhere.' },
  { id: 'tokenExchange', label: 'Token exchange', hint: 'Trades one token for another, for delegation and impersonation.' },
]

/* Fine-grain algorithm selection. The platform signs and encrypts five distinct
   artefacts and a tenant may be required to use a different algorithm for each,
   so each is chosen rather than inherited from one global setting. */
export const JWS_ALGORITHMS = ['RS256', 'RS384', 'RS512', 'PS256', 'PS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS512']
export const JWE_ALG = ['none', 'RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5', 'A128KW', 'A256KW']
export const JWE_ENC = ['none', 'A128GCM', 'A192GCM', 'A256GCM', 'A128CBC-HS256', 'A256CBC-HS512']

export const ALGORITHM_SLOTS = [
  { id: 'accessToken', label: 'Access token', sign: true, encrypt: false, hint: 'Signature on the access token itself.' },
  { id: 'idToken', label: 'ID token', sign: true, encrypt: true, hint: 'Signature and optional encryption of the ID token.' },
  { id: 'userInfo', label: 'User info response', sign: true, encrypt: true, hint: 'Applied to the userinfo endpoint response.' },
  { id: 'requestObject', label: 'Request object', sign: true, encrypt: true, hint: 'What the platform will accept on an inbound signed request object.' },
  { id: 'authzResponse', label: 'Authorization response', sign: true, encrypt: true, hint: 'JARM — the signed authorization response.' },
]

export const CLIENT_AUTH_METHODS = [
  { value: 'client_secret_basic', label: 'Client secret · basic auth header' },
  { value: 'client_secret_post', label: 'Client secret · request body' },
  { value: 'client_secret_jwt', label: 'Client secret · signed JWT' },
  { value: 'private_key_jwt', label: 'Signed JWT · private key' },
  { value: 'tls_client_auth', label: 'Mutual TLS · PKI-bound' },
  { value: 'none', label: 'None — public client' },
]

/* Behaviours a tenant turns on only because an older relying party needs them.
   Named as compatibility so nobody enables one by accident. */
export const COMPATIBILITY_MODES = [
  { id: 'excludeSessionState', label: 'Exclude session state from the authentication response', hint: 'For clients that reject the unrecognised session_state parameter.' },
  { id: 'useRefreshTokenForClientCredentials', label: 'Issue a refresh token for client credentials', hint: 'Not permitted by the specification; some legacy clients expect it.' },
  { id: 'useLowerCaseBearer', label: 'Lower-case bearer token type', hint: 'Returns "bearer" rather than "Bearer" in the token response.' },
  { id: 'allowLegacyLogout', label: 'Accept the legacy logout endpoint', hint: 'Honours a GET logout without an id_token_hint.' },
]

export const blankOidc = () => ({
  // Client identity
  clientType: 'confidential',
  applicationType: APPLICATION_TYPES[0],
  clientSecret: '',
  applicationUrl: '',
  rootUrl: '',
  homeUrl: '',
  adminUrl: '',
  logoUrl: '',
  policyUrl: '',
  termsUrl: '',
  // Capability
  clientAuthentication: 'client_secret_basic',
  authorizationEnabled: false,
  // Endpoints
  redirectUris: '',
  postLogoutRedirectUris: '',
  webOrigins: '',
  validRequestUris: '',
  frontchannelLogout: '',
  backchannelLogout: '',
  backchannelSessionRequired: true,
  backchannelRevokeOffline: false,
  // Grants and flows
  grants: {
    authorizationCode: true,
    directAccess: false,
    refreshToken: true,
    clientCredentials: false,
    implicit: false,
    deviceCode: false,
    ciba: false,
    tokenExchange: false,
  },
  pkce: 'S256',
  // Tokens and claims
  scopes: 'openid profile email',
  idTokenAlgorithm: ID_TOKEN_ALGORITHMS[0],
  subjectType: 'public',
  accessTokenTtl: '15',
  idTokenTtl: '15',
  refreshTokenTtl: '30',
  // Fine-grain algorithms, per artefact
  algorithms: {
    accessToken: { sign: 'RS256' },
    idToken: { sign: 'RS256', alg: 'none', enc: 'none' },
    userInfo: { sign: 'RS256', alg: 'none', enc: 'none' },
    requestObject: { sign: 'RS256', alg: 'none', enc: 'none' },
    authzResponse: { sign: 'RS256', alg: 'none', enc: 'none' },
  },
  // Compatibility
  compatibility: {},
  // Advanced session and token lifespans, in minutes unless stated
  clientSessionIdle: '30',
  clientSessionMax: '600',
  offlineSessionIdle: '4320',
  offlineSessionMax: '5256000',
  // Client scope
  fullScopeAllowed: true,
  scopeRoles: [],
  // Consent
  requireConsent: false,
  consentText: '',
})

export const oidcIssues = (o = {}, protocol = 'OIDC') => {
  const out = []
  const grants = o.grants || {}
  const mobile = protocol === 'OAuth Mobile'
  const needsRedirect = grants.authorizationCode || grants.implicit
  if (needsRedirect && !String(o.redirectUris || '').trim()) out.push('At least one redirect URI is required for the selected grants.')
  if (!Object.values(grants).some(Boolean)) out.push('Select at least one grant type.')
  if (o.clientType === 'confidential' && grants.implicit) out.push('The implicit flow cannot be enabled on a confidential client.')
  if (o.clientType === 'public' && grants.clientCredentials) out.push('Client credentials require a confidential client.')
  if (!String(o.scopes || '').trim()) out.push('At least one scope is required.')
  // A mobile client cannot keep a secret, so a confidential configuration is
  // not merely discouraged — it cannot be honoured on the device.
  if (mobile && o.clientType === 'confidential') out.push('A mobile client is public by definition and cannot hold a client secret.')
  if (mobile && o.pkce === 'none') out.push('PKCE is required for a mobile client.')
  if (mobile && !String(o.applicationUrl || '').trim()) out.push('The application URL is required for a mobile client.')
  if (o.clientType === 'public' && o.clientAuthentication !== 'none') out.push('A public client cannot authenticate; set client authentication to None.')
  if (!o.fullScopeAllowed && !(o.scopeRoles || []).length) out.push('Full scope is off, so at least one role must be assigned to the client scope.')
  return out
}

// ---------------------------------------------------------------------------
// Client scope
//
// Which of the identity's roles an application is told about. It began as a
// setting of the OIDC client record, but a SAML service provider and a JWT
// application receive roles too, so it is read and written through one pair
// of helpers whatever the protocol. OIDC-family records keep the values on
// their `oidc` object as well, so nothing that reads them there changes.
// ---------------------------------------------------------------------------

export const clientScopeOf = (facet) => {
  const src = (facet && (facet.clientScope || facet.oidc)) || {}
  return {
    fullScopeAllowed: src.fullScopeAllowed !== false,
    scopeRoles: src.scopeRoles || [],
  }
}

export const withClientScope = (facet, patch) => {
  const next = { ...clientScopeOf(facet), ...patch }
  const oidcFamily = ['OIDC', 'OAuth', 'OAuth Mobile'].includes(facet.protocol)
  return {
    ...facet,
    clientScope: next,
    ...(oidcFamily ? { oidc: { ...(facet.oidc || {}), ...next } } : {}),
  }
}

const samlSeed = (s) => {
  const spHost = `https://${s.name.replace(/_/g, '-')}.example.com`
  return {
    entityId: `${spHost}/saml/metadata`,
    acs: `${spHost}/saml/acs`,
    acsExtra: '',
    slo: `${spHost}/saml/logout`,
    acsBinding: ACS_BINDINGS[0],
    sloBinding: ACS_BINDINGS[1],
    audience: `${spHost}/saml/metadata`,
    nameId: NAMEID_FORMATS[0],
    nameIdAttribute: 'mail',
    sigAlgorithm: SIG_ALGORITHMS[0],
    digestAlgorithm: DIGEST_ALGORITHMS[0],
    signAssertion: true,
    signResponse: s.id % 3 !== 0,
    encryptAssertion: s.id % 4 === 0,
    wantAuthnRequestsSigned: false,
    relayState: '',
    idpInitiated: true,
    forceAuthn: false,
    assertionLifetime: '5',
    sessionLifetime: '480',
    attributeFormat: SAML_NAME_FORMATS[0],
  }
}

// Very small, forgiving SAML metadata reader used by the upload control (item 6).
export const parseMetadataXml = (text) => {
  const grab = (re) => {
    const m = re.exec(text)
    return m ? m[1] : ''
  }
  return {
    entityId: grab(/entityID\s*=\s*"([^"]+)"/i),
    acs: grab(/AssertionConsumerService[^>]*Location\s*=\s*"([^"]+)"/i),
    slo: grab(/SingleLogoutService[^>]*Location\s*=\s*"([^"]+)"/i),
    certificate: grab(/<(?:[a-z0-9]+:)?X509Certificate>\s*([^<]+?)\s*<\//i),
  }
}

// ---------------------------------------------------------------------------
// The published field register, read off a stored facet.
//
// Onboarding writes the register (`sso.ssoSpec`) and the SSO tab edits it, so
// the two surfaces cannot drift. Records written before the register existed
// carry the older `saml` and `oidc` objects instead; rather than opening on a
// form full of blanks, they are read through the mapping below. The legacy
// objects are left on the record untouched — nothing is thrown away, it is
// simply no longer the thing being edited.
// ---------------------------------------------------------------------------

/** Which of the two published specifications a protocol is edited against. */
export const specNameFor = (protocol) => {
  if (protocol === 'SAML') return 'SAML'
  if (protocol === 'JWT') return 'JWT'
  if (protocol === 'Link') return 'Link'
  return 'OIDC'
}

const originOf = (url) => {
  const m = /^(https?:\/\/[^/?#]+)/i.exec(String(url || ''))
  return m ? m[1] : ''
}

export const specFromFacet = (facet) => {
  if (!facet) return {}
  const host = `https://${String(facet.sourceName || 'application').replace(/_/g, '-')}.example.com`
  const common = {
    displayName: facet.sourceDisplayName || '',
    clientId: facet.clientId || '',
  }
  if (facet.protocol === 'SAML') {
    const s = facet.saml || {}
    return {
      ...common,
      configMode: 'Manual',
      clientId: s.entityId || facet.clientId || '',
      acsUrl: s.acs || '',
      applicationUrl: originOf(s.acs) || originOf(s.entityId) || host,
      idpInitiatedSsoRelayState: s.relayState || '',
      logoutPostUrl: s.sloBinding === ACS_BINDINGS[0] ? s.slo || '' : '',
      logoutRedirectUrl: s.sloBinding === ACS_BINDINGS[1] ? s.slo || '' : '',
      signDocuments: !!s.signResponse,
      signAssertions: !!s.signAssertion,
      clientSignature: !!s.wantAuthnRequestsSigned,
      encryptAssertion: !!s.encryptAssertion,
      assertionLifespan: Number(s.assertionLifetime || 5) * 60,
    }
  }
  const o = facet.oidc || {}
  const grants = o.grants || {}
  const appUrl = o.applicationUrl || o.rootUrl || host
  return {
    ...common,
    applicationUrl: appUrl,
    rootUrl: o.rootUrl || '',
    homeUrl: o.homeUrl || '',
    adminUrl: o.adminUrl || '',
    redirectUris: o.redirectUris || `${appUrl}/callback`,
    postLogoutRedirectUris: o.postLogoutRedirectUris || '',
    webOrigins: o.webOrigins || appUrl,
    clientAuthentication: o.clientType !== 'public',
    standardFlow: !!grants.authorizationCode,
    directAccessGrants: !!grants.directAccess,
    implicitFlow: !!grants.implicit,
    serviceAccountsRoles: !!grants.clientCredentials,
    deviceAuthGrant: !!grants.deviceCode,
    cibaGrant: !!grants.ciba,
    tokenExchange: !!grants.tokenExchange,
    frontChannelLogoutUrl: o.frontchannelLogout || '',
    backChannelLogoutUrl: o.backchannelLogout || '',
  }
}

/** The register values a facet is edited against, defaults included. */
export const specValuesFor = (facet) => ({
  ...defaultsFor(specNameFor(facet ? facet.protocol : 'SAML')),
  ...specFromFacet(facet),
  ...((facet && facet.ssoSpec) || {}),
})

// ---------------------------------------------------------------------------
// Certificates (item 3)
// ---------------------------------------------------------------------------

// 32-bit safe LCG. Plain multiplication overflows 2^53 and collapses the low
// bytes to zero, which rendered fingerprints as 00:00:00…, so use Math.imul.
const hexStr = (seed, len) => {
  let v = Math.imul(seed || 7, 2654435761) >>> 0
  const out = []
  for (let i = 0; i < len; i += 1) {
    v = (Math.imul(v, 1103515245) + 12345) >>> 0
    out.push(((v >>> 16) & 0xff).toString(16).padStart(2, '0').toUpperCase())
  }
  return out.join(':')
}

export const daysUntil = (iso) => Math.round((Date.parse(iso) - Date.parse(TODAY)) / 86400000)

export const platformCert = (seed = 1) => {
  const notAfter = ['2027-04-18', '2027-09-22', '2027-02-12', '2028-05-07'][seed % 4]
  return {
    subject: 'CN=sso.tanflow.com, OU=Federation, O=Tanflow Corp, C=IN',
    issuer: 'CN=Tanflow Internal Issuing CA 02, O=Tanflow Corp',
    algorithm: 'SHA-256 with RSA, 2048 bit',
    fingerprint: hexStr(seed + 41, 20),
    notBefore: '2025-04-18',
    notAfter,
    daysLeft: daysUntil(notAfter),
    source: 'Platform signing certificate',
  }
}

export const certFromText = (text, source = 'Uploaded certificate') => {
  const body = String(text || '').trim()
  if (!body) return null
  const seed = [...body.slice(0, 400)].reduce((a, c) => a + c.charCodeAt(0), 11)
  const cn = /CN\s*=\s*([^,\n/]+)/.exec(body)
  const notAfter = `202${7 + (seed % 2)}-${String(1 + (seed % 12)).padStart(2, '0')}-${String(1 + (seed % 27)).padStart(2, '0')}`
  return {
    subject: cn ? `CN=${cn[1].trim()}` : 'CN=uploaded.certificate',
    issuer: 'Parsed from the supplied certificate',
    algorithm: 'SHA-256 with RSA, 2048 bit',
    fingerprint: hexStr(seed, 20),
    notBefore: '2026-01-01',
    notAfter,
    daysLeft: daysUntil(notAfter),
    source,
  }
}

// ---------------------------------------------------------------------------
// SAML attributes read from an LDAP application (items 5 & 7)
// ---------------------------------------------------------------------------

export const LDAP_APPS = DIRECTORIES.map((d) => ({ value: String(d.id), label: `${d.displayName} · ${d.name}` }))

export const ldapAppLabel = (id) => {
  const d = DIRECTORIES.find((x) => String(x.id) === String(id))
  return d ? d.displayName : '—'
}

export const LDAP_ATTRS = [
  ...new Set([
    ...ATTR_MAPPINGS.map((m) => m.ldap),
    'cn', 'displayName', 'employeeNumber', 'telephoneNumber', 'title', 'memberOf', 'sAMAccountName', 'userPrincipalName',
  ]),
]

const dirIdByName = Object.fromEntries(DIRECTORIES.map((d) => [d.displayName, String(d.id)]))

/**
 * The mappers a seeded application carries.
 *
 * A SAML service provider is sent named attributes with a NameFormat; an OIDC
 * client is written claims with a JSON type and a set of tokens to appear in.
 * The two share no fields, so the seed is written per family rather than once
 * and reinterpreted.
 */
export const defaultAttributes = (protocol = 'SAML') => {
  if (protocol === 'Link') return []
  if (protocol === 'SAML') {
    return [
      {
        id: 1,
        name: 'Name identifier',
        mapperType: 'saml-nameid',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        userAttribute: 'email',
        required: true,
      },
      ...ATTR_MAPPINGS.slice(0, 4).map((m, i) => ({
        id: i + 2,
        name: `${m.idam} attribute`,
        mapperType: 'saml-user-attribute',
        userAttribute: m.idam,
        samlAttributeName: m.idam,
        nameFormat: SAML_NAME_FORMATS[i === 0 ? 1 : 0],
        aggregateAttributes: false,
        required: i < 2,
      })),
    ]
  }
  return ATTR_MAPPINGS.slice(0, 4).map((m, i) => ({
    id: i + 1,
    name: `${m.idam} claim`,
    mapperType: 'oidc-user-attribute',
    userAttribute: m.idam,
    tokenClaimName: m.idam,
    claimType: 'String',
    multivalued: false,
    aggregateAttributes: false,
    addToIdToken: true,
    addToAccessToken: i < 2,
    addToLightweightToken: false,
    addToUserInfo: true,
    addToIntrospection: true,
    required: i < 2,
  }))
}

// ---------------------------------------------------------------------------
// URL configurations (item 8)
// ---------------------------------------------------------------------------

export const patternAttrs = (pattern) =>
  [...new Set([...String(pattern || '').matchAll(/\{([a-zA-Z0-9_.]+)\}/g)].map((m) => m[1]))]
    .filter((n) => n !== NONCE_TOKEN)

// ---------------------------------------------------------------------------
// URL configuration
//
// A launch URL is stored as one pattern string, and edited as a base address
// plus a list of parameters. Each parameter states three things: how it is
// joined to what precedes it, what it is called, and where its value comes
// from.
//
// The join used to be implied — the first parameter got `?` and the rest `&` —
// which cannot express an application whose launch path ends in a slash before
// the query (`/launch/?user=...`), and there are real ones that do. The value
// used to be an attribute and nothing else, so a parameter carrying a constant
// or a single-use token had no way to be configured at all.
// ---------------------------------------------------------------------------

/**
 * How a parameter is joined to what precedes it.
 *
 * One choice per parameter. The first decides how the query string is opened
 * after the base address — `?`, `&` because the address already carries a
 * query, or `/?` because the launch path ends in a slash — and the rest almost
 * always join with `&`, but a launch path that nests a second query is not
 * unheard of, so each parameter states its own join.
 */
/* How the query string is opened. Chosen once per URL: every parameter after
   the first is joined with `&`. */
export const QUERY_JOINS = ['?', '/?']

export const DEFAULT_PARAM_SEPARATOR = '?'

/* Reserved: a parameter of this name in a pattern is the generated token, not
   an attribute the application releases. */
export const NONCE_TOKEN = 'nonce'

/** Where a parameter's value comes from. Stored values are stable; the label
 *  is what the picker shows. */
export const PARAM_INPUT_TYPES = [
  { value: 'Manual', label: 'Manual' },
  { value: 'IDAM Attribute', label: 'IDAM Attribute' },
  { value: NONCE_TOKEN, label: 'Nonce' },
]

export const paramInputLabel = (t) => {
  const hit = PARAM_INPUT_TYPES.find((x) => x.value === (t || 'Manual'))
  return hit ? hit.label : 'Manual'
}

/** The IDAM attribute picker, spelled so the stored value is visible beside
 *  the label an administrator recognises it by. */
export const IDAM_ATTR_PARAM_OPTIONS = IDAM_ATTRS.map((a) => ({
  value: a.value,
  label: `${String(a.label).split(' · ')[0]} ( value = ${a.value})`,
}))

/** A blank parameter. How it is joined is decided by the URL, not the row. */
export const blankParam = () => ({
  key: '',
  inputType: 'Manual',
  attr: '',
  value: '',
})

/** The stored `key=value` half of one parameter. */
export const paramValueText = (p) => {
  if (p.inputType === NONCE_TOKEN) return `{${NONCE_TOKEN}}`
  if (p.inputType === 'IDAM Attribute') return p.attr ? `{${p.attr}}` : ''
  return String(p.value || '')
}

/** Whether a parameter is complete enough to be written into the pattern. */
export const paramReady = (p) => Boolean(p && p.key && (
  p.inputType === NONCE_TOKEN
  || (p.inputType === 'IDAM Attribute' ? p.attr : String(p.value || '').trim())
))

/** Build the stored pattern from a base address and its parameters: the
 *  first parameter opens the query string with `join`, the rest follow `&`. */
export const buildPattern = (base, params = [], join = DEFAULT_PARAM_SEPARATOR) => {
  const head = String(base || '').trim()
  if (!head) return ''
  return params.filter(paramReady).reduce(
    (acc, p, i) => `${acc}${i === 0 ? join : '&'}${p.key}=${paramValueText(p)}`,
    head,
  )
}

/**
 * Read a stored pattern back into a base and parameters.
 *
 * Tokenises on every join rather than splitting on `?`, so a `/?` survives a
 * round trip instead of being rewritten as `?` with a stray slash left on the
 * base, and a parameter joined with something other than `&` keeps its join.
 */
export const parsePattern = (raw) => {
  const s = String(raw || '')
  const at = s.search(/\/\?|\?|&/)
  if (at === -1) return { base: s, params: [], join: DEFAULT_PARAM_SEPARATOR }
  const base = s.slice(0, at)
  const rest = s.slice(at)
  const params = []
  const re = /(\/\?|\?|&)([^?&]*)/g
  let m = re.exec(rest)
  while (m) {
    const [, , chunk] = m
    const eq = chunk.indexOf('=')
    const key = eq === -1 ? chunk : chunk.slice(0, eq)
    const value = eq === -1 ? '' : chunk.slice(eq + 1)
    const token = /^\{([^}]+)\}$/.exec(value)
    if (key) {
      if (token && token[1] === NONCE_TOKEN) params.push({ key, inputType: NONCE_TOKEN, attr: '', value: NONCE_TOKEN })
      else if (token) params.push({ key, inputType: 'IDAM Attribute', attr: token[1], value: '' })
      else params.push({ key, inputType: 'Manual', attr: '', value })
    }
    m = re.exec(rest)
  }
  // The URL has one opening join; a stored pattern that began with `&` reads
  // back as the default rather than an invalid query string.
  const opening = /^(\/\?|\?)/.exec(rest)
  return { base, params, join: opening ? opening[1] : DEFAULT_PARAM_SEPARATOR }
}

/* The values a launch preview substitutes: one real identity from the seed for
   every IDAM attribute, and a fresh token for the nonce. Deterministic per
   call apart from the nonce, which is the point of a nonce. */
const SAMPLE_USER = USERS[0]

const sampleValueFor = (attr) => {
  const direct = SAMPLE_USER[attr]
  if (direct != null && direct !== '') return String(direct)
  const alias = { mail: SAMPLE_USER.email, userName: SAMPLE_USER.username, uid: SAMPLE_USER.username }
  return alias[attr] || `<${attr}>`
}

export const sampleNonce = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')).join('')

/** What the launch URL looks like for one identity, with a nonce generated. */
export const sampleLaunchUrl = (pattern, nonce = sampleNonce()) =>
  String(pattern || '').replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, name) => (
    name === NONCE_TOKEN ? nonce : encodeURIComponent(sampleValueFor(name))
  ))

export const URL_LIMIT = 1

const urlHost = (slug) => `https://${String(slug || 'app').replace(/_/g, '-')}.example.com`

/** The single URL configuration a newly registered application starts with. */
export const defaultUrlConfig = (slug) => ({ id: 1, pattern: `${urlHost(slug)}/launch?user={username}&mail={email}`, enabled: true })

/**
 * The historic seed.
 *
 * An application now carries one URL configuration, but records written before
 * that hold several. They are seeded as they were so the constraint is enforced
 * where it belongs — on adding another — rather than by deleting configuration
 * an operator never asked to lose.
 */
export const defaultUrlConfigs = (slug) => [
  defaultUrlConfig(slug),
  { id: 2, name: 'Department deep link', pattern: `${urlHost(slug)}/teams?dept={lastName}`, enabled: false },
]

/** How a URL configuration is named in a message now that it has no name field. */
export const urlConfigLabel = (row) => (row && row.name ? row.name : (row && row.pattern) || 'the URL configuration')

// ---------------------------------------------------------------------------
// Provisioning attribute mapping (item 13: Not Null + Manual)
// ---------------------------------------------------------------------------

export const provMappingsFor = (connector) =>
  mappingsFor({ connector }).map((r) => ({
    id: r.id,
    idam: r.idam,
    label: r.label,
    target: r.target,
    transform: r.transform,
    notNull: !!r.required,
    /* Mandatory and Not null are two different promises. Mandatory says the
       payload must carry the key at all; not null says the value it carries
       cannot be empty. A target that rejects a missing field and one that
       rejects a blank one are both real, and one flag cannot express both. */
    mandatory: !!r.required,
    // Update decides whether a run overwrites this attribute on an account that
    // already exists (client item 9). Manual is independent of it.
    update: true,
    manual: false,
  }))

export const MAPPING_TRANSFORMS = ['Direct', 'Lowercase', 'Uppercase', 'Trim', 'Concatenate', 'Lookup']

// ---------------------------------------------------------------------------
// Unique attribute (client item 2)
//
// Matching an account to an identity is one decision with two sides: the
// attribute the identity is known by here, and the attribute the account is
// known by on the target. Both are stored on the provisioning facet —
// `uniqueAttribute` holds the IDAM side and `uniqueTargetAttribute` the
// application side — so the wizard and the Provisioning tab designate the same
// pair rather than each keeping a key of its own.
//
// Without the pair a run cannot tell an update from a create and reconciliation
// has nothing to correlate against, so a record missing either side is
// surfaced rather than silently defaulted at run time.
// ---------------------------------------------------------------------------

export const defaultUniqueAttribute = (rows = []) => {
  const has = (v) => rows.some((r) => r.idam === v)
  return ['username', 'email', 'empCode'].find(has) || (rows[0] ? rows[0].idam : '')
}

/** The target-side name of the mapping the IDAM side points at. */
export const uniqueTargetFor = (rows = [], unique) => {
  const row = rows.find((r) => r.idam === unique)
  return row ? row.target || '' : ''
}

export const connectorMappingIssues = (rows = []) =>
  (rows.some((r) => !String(r.target || '').trim() || !String(r.idam || '').trim())
    ? ['Every attribute mapping row needs both an application attribute and an IDAM attribute.']
    : [])

/** Both sides of the pair as a record should carry them. */
export const defaultUniquePair = (rows = []) => {
  const idam = defaultUniqueAttribute(rows)
  return { uniqueAttribute: idam, uniqueTargetAttribute: uniqueTargetFor(rows, idam) }
}

export const uniqueAttributeIssues = (rows = [], unique, target) => {
  const out = []
  if (!String(unique || '').trim()) {
    out.push('No unique IDAM attribute is designated. A run cannot match an account on the target without one.')
  } else if (!rows.some((r) => r.idam === unique)) {
    out.push(`The unique IDAM attribute ${unique} is not mapped, so no value is written for it. Map it, or designate a mapped attribute instead.`)
  }
  // Only judged when it has been asked for. Callers that designate the IDAM
  // side alone are reading a record written before the pair existed.
  if (target !== undefined && !String(target || '').trim()) {
    out.push('No unique app attribute is designated. The connector needs the name the account is matched on at the target.')
  }
  return out
}


// ---------------------------------------------------------------------------
// Target attributes offered by each connector type (client items 8 and 10).
//
// The Target attribute field is a dropdown of what the connector can actually
// write. Ticking Manual swaps it for a free-text box, because a manual row is
// exactly the case where the operator knows a name the platform does not.
// ---------------------------------------------------------------------------

const TARGET_ATTR_CATALOG = {
  Directory: [
    'sAMAccountName', 'userPrincipalName', 'cn', 'displayName', 'givenName', 'sn', 'mail',
    'department', 'title', 'mobile', 'telephoneNumber', 'employeeID', 'employeeType',
    'manager', 'physicalDeliveryOfficeName', 'description', 'userAccountControl', 'memberOf',
  ],
  Database: [
    'user_name', 'email_address', 'first_name', 'last_name', 'dept_code', 'job_title',
    'mobile_no', 'user_type', 'employee_no', 'manager_id', 'status_flag', 'created_at', 'updated_at',
  ],
  Standard: [
    'userName', 'externalId', 'name.givenName', 'name.familyName', 'name.formatted', 'displayName',
    'emails[0].value', 'phoneNumbers[0].value', 'title', 'userType', 'active',
    'enterprise.department', 'enterprise.employeeNumber', 'enterprise.manager.value',
  ],
  Cloud: [
    'userPrincipalName', 'mailNickname', 'mail', 'givenName', 'surname', 'displayName',
    'department', 'jobTitle', 'mobilePhone', 'employeeId', 'employeeType', 'officeLocation',
    'usageLocation', 'accountEnabled',
    'passwordProfile.forceChangePasswordNextSignIn', 'passwordProfile.password',
    'onPremisesExtensionAttributes.extensionAttribute1',
  ],
  Custom: [
    'Username', 'Email', 'FirstName', 'LastName', 'Department', 'Title', 'MobilePhone',
    'UserType', 'EmployeeNumber', 'ManagerEmail', 'IsActive',
    'Profile.FirstName', 'Profile.LastName', 'Profile.Email',
    'Profile.Contact.PrimaryPhone', 'Profile.Contact.SecondaryPhone',
  ],
  Manual: [
    'Username', 'Email', 'FirstName', 'LastName', 'Department', 'Title', 'MobilePhone',
    'UserType', 'EmployeeNumber', 'ManagerEmail', 'IsActive',
  ],
}

// Anything already mapped is kept in the list even when the catalogue does not
// know it, so an existing row never loses the value it is showing.
export const targetAttrsFor = (connector, rows = []) => {
  const base = TARGET_ATTR_CATALOG[kindOf(connector)] || TARGET_ATTR_CATALOG.Custom
  const extra = rows.map((r) => r.target).filter((t) => t && !base.includes(t))
  return [...base, ...new Set(extra)]
}

// ---------------------------------------------------------------------------
// Manual payload (MS-Entra, SCIM, REST API)
//
// These three connectors have no JSON body of their own — their attributes
// come from the static catalogue above, not from a payload an operator
// authors. A manual payload lets an operator hand-write the body sent to the
// target anyway, pre-filled from that same catalogue so it starts as
// something real rather than an empty object.
// ---------------------------------------------------------------------------

export const manualPayloadSupported = (connector) =>
  connector === REST_API_CONNECTOR || ['Cloud', 'Standard'].includes(kindOf(connector))

/* A flat dot/bracket path, such as emails[0].value, written into the nested
   object it describes — the inverse of payloadPaths' walk. */
const setPath = (obj, path, value) => {
  const parts = path.split('.')
  let cur = obj
  parts.forEach((part, i) => {
    const last = i === parts.length - 1
    const m = /^([^[]+)\[(\d+)\]$/.exec(part)
    if (m) {
      const [, key, idx] = m
      if (!Array.isArray(cur[key])) cur[key] = []
      if (last) { cur[key][idx] = value; return }
      if (!cur[key][idx] || typeof cur[key][idx] !== 'object') cur[key][idx] = {}
      cur = cur[key][idx]
    } else if (last) {
      cur[part] = value
    } else {
      if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {}
      cur = cur[part]
    }
  })
}

/** A starting body for the manual payload field, built from the same
 *  catalogue the target attribute picker offers for this connector. */
export const manualPayloadTemplate = (connector) => {
  const obj = {}
  targetAttrsFor(connector, []).forEach((path) => setPath(obj, path, ''))
  return JSON.stringify(obj, null, 2)
}

// ---------------------------------------------------------------------------
// Operation configuration (client item 11)
// ---------------------------------------------------------------------------

export { EXTRA_OPERATION_SPECS, OPERATION_SPECS } from '../shared/provisioning/shared'

export const blankOperations = () => ({
  create: true,
  update: true,
  remove: false,
  updateExisting: false,
  deactivate: true,
  password: false,
})

// Delete and Deactivate on leaver are alternative leaver behaviours, so turning
// one on turns the other off instead of leaving a conflict to resolve.
export const withLeaverChoice = (prev = {}, next = {}) => {
  if (next.remove && !prev.remove) return { ...next, deactivate: false }
  if (next.deactivate && !prev.deactivate) return { ...next, remove: false }
  return next
}

export const operationIssues = (ops = {}) => {
  const out = []
  if (!ops.create && !ops.update && !ops.remove && !ops.updateExisting) {
    out.push('Select at least one provisioning operation.')
  }
  if (ops.remove && ops.deactivate) {
    out.push('Delete and deactivate-on-leaver conflict. Choose one leaver behaviour.')
  }
  return out
}

/**
 * A custom API connector needs an endpoint per operation, so an operation that
 * is ticked with no endpoint behind it is a run that will fail at the first
 * record. Create is required by the field spec; update and delete are optional
 * there because a connector may legitimately not offer them — which is only
 * true while the matching operation is off.
 */
export const operationSummary = (ops = {}) =>
  [
    ops.create && 'Create',
    ops.update && 'Update',
    ops.remove && 'Delete',
    ops.updateExisting && 'Update existing',
  ].filter(Boolean).join(' · ') || 'No operations enabled'

// ---------------------------------------------------------------------------
// Unified application records
// ---------------------------------------------------------------------------

const SSO_BRANDS = {
  workspace: 'gmail',
  salesforce_sso: 'salesforce',
  confluence: 'atlassian',
  servicedesk: 'jira',
}

export const brandOf = (app) => {
  if (app.sso && SSO_BRANDS[app.sso.sourceName]) return SSO_BRANDS[app.sso.sourceName]
  if (app.provisioning) return provisioningBrand({ name: app.provisioning.sourceName, connector: app.provisioning.connector })
  return ''
}

const OWNER_ORG = {
  'IT Operations': 'Tanflow · IT Ops',
  Finance: 'Tanflow · Finance',
  Engineering: 'Tanflow · Engineering',
  'Human Resources': 'Tanflow · HR',
  Sales: 'Tanflow · Sales',
}

const orgForOwner = (owner) => OWNER_ORG[owner] || 'Tanflow'

const provFacet = (a) => {
  const mappings = provMappingsFor(a.connector)
  const connection = connectionSeed(a)
  // The account key lives on the facet for every connector. A Custom API
  // connection names it in its Create section, so the facet mirrors that pair
  // rather than designating a second one.
  const unique = isCustomApiConnector(a.connector)
    ? { uniqueAttribute: connection.uniqueIdamAttribute, uniqueTargetAttribute: connection.uniqueAppAttribute }
    : defaultUniquePair(mappings)
  return migrateProvisioningFacet({
    sourceName: a.name,
    connector: a.connector,
    method: a.method,
    status: a.status,
    accounts: a.accounts,
    lastSync: a.lastSync,
    host: a.host,
    port: a.port,
    description: a.description,
    connection,
    operations: operationsFor(a),
    mappings,
    ...unique,
  })
}

const ssoFacet = (s) => ({
  sourceName: s.name,
  sourceDisplayName: s.displayName,
  // A link application is its own protocol. It was previously relabelled as
  // SAML, which gave it a certificate, an ACS URL and an assertion it never
  // issues — the record claimed federation it does not perform.
  protocol: s.protocol,
  clientId: s.clientId,
  enabled: s.enabled,
  status: s.status,
  users: s.users,
  createdOn: s.createdOn,
  saml: samlSeed(s),
  link: s.protocol === 'Link'
    ? { ...blankLink(), targetUrl: `https://${s.name.replace(/_/g, '-')}.tanflow.internal` }
    : blankLink(),
  jwt: s.protocol === 'JWT'
    ? { ...blankJwt(), audience: `https://${s.name.replace(/_/g, '-')}.example.com`, issuer: 'https://id.tanflow.com' }
    : blankJwt(),
  // A link asserts nothing, so it has no signing certificate to present.
  cert: s.protocol === 'Link' ? null : platformCert(s.id),
  attrs: defaultAttributes(s.protocol),
  urls: defaultUrlConfigs(s.name),
})

// Historic one-to-one linkage pairs, folded into merged records.
const LINK_PAIRS = [
  { sso: 'workspace', prov: 'ENTRA_TENANT' },
  { sso: 'salesforce_sso', prov: 'SALESFORCE' },
  { sso: 'confluence', prov: 'AD_CORP' },
  { sso: 'servicedesk', prov: 'MYSQL_BILLING' },
  { sso: 'analytics_portal', prov: 'PG_ANALYTICS' },
]

export const buildSeed = () => {
  const provs = APPLICATIONS.map(withDescription)
  const usedProv = new Set()
  const usedSso = new Set()
  const rows = []
  let id = 1

  LINK_PAIRS.forEach((pair) => {
    const p = provs.find((x) => x.name === pair.prov)
    const s = SSO_APPS.find((x) => x.name === pair.sso)
    if (!p || !s) return
    usedProv.add(p.name)
    usedSso.add(s.name)
    rows.push({
      id: id++,
      name: p.name,
      displayName: s.displayName,
      description: p.description,
      org: orgForOwner(p.owner),
      owner: p.owner,
      createdOn: s.createdOn,
      provisioning: provFacet(p),
      sso: ssoFacet(s),
    })
  })

  provs.filter((p) => !usedProv.has(p.name)).forEach((p) => {
    rows.push({
      id: id++,
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      org: orgForOwner(p.owner),
      owner: p.owner,
      createdOn: p.lastSync ? p.lastSync.slice(0, 10) : '—',
      provisioning: provFacet(p),
      sso: null,
    })
  })

  SSO_APPS.filter((s) => !usedSso.has(s.name)).forEach((s) => {
    rows.push({
      id: id++,
      name: systemName(s.name),
      displayName: s.displayName,
      description: `${s.protocol} relying party owned by ${s.owner}.`,
      org: orgForOwner(s.owner),
      owner: s.owner,
      createdOn: s.createdOn,
      provisioning: null,
      sso: ssoFacet(s),
    })
  })

  return rows
}

export const nextAppId = (rows) => rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1

export const capabilitiesOf = (app) => [
  ...(app.provisioning ? ['Provisioning'] : []),
  ...(app.sso ? ['SSO'] : []),
]

export const healthOf = (app) => {
  if (app.provisioning) {
    if (app.provisioning.status === 'Failed') return { label: 'Failed', tone: 'bad' }
    if (app.provisioning.status === 'Degraded') return { label: 'Degraded', tone: 'warn' }
    if (app.provisioning.status === 'Disabled') return { label: 'Disabled', tone: 'mut' }
  }
  if (app.sso && !app.sso.enabled && !app.provisioning) return { label: 'Disabled', tone: 'mut' }
  return { label: 'Healthy', tone: 'ok' }
}
