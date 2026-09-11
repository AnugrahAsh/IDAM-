import {
  APPLICATIONS, ATTR_MAPPINGS, DIRECTORIES, ORGS, SSO_APPS,
} from '../../data/seed'
import {
  CONNECTORS, IDAM_ATTRS, brandFor as provisioningBrand, kindOf, mappingsFor, operationsFor,
  profileFor, settingsFor, withDescription,
} from '../provisioning/shared'
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

export const AUTH_METHODS = ['API token', 'Basic authentication', 'Bearer token', 'OAuth2 client credentials']
export const AUTH_BEARER = 'Bearer token'
export const AUTH_OAUTH2 = 'OAuth2 client credentials'

/**
 * How a custom API connector authenticates.
 *
 * Two decisions, not one. `authType` says what kind of credential the target
 * accepts; for a bearer target `authMethod` says where the token comes from —
 * minted by the platform from a token API, or supplied here because something
 * upstream already holds it. They used to be one four-option dropdown, which
 * could express "bearer" but not which of those two it meant, so the token API
 * fields were shown to connectors that had no use for them and the header a
 * dynamic connector needs had nowhere to live at all.
 */
export const AUTH_TYPES = ['Basic Auth', 'Bearer Token']
export const AUTH_BASIC = AUTH_TYPES[0]
export const AUTH_BEARER_TYPE = AUTH_TYPES[1]

export const BEARER_METHODS = ['Default', 'Dynamic']
export const BEARER_DEFAULT = BEARER_METHODS[0]
export const BEARER_DYNAMIC = BEARER_METHODS[1]

/**
 * API connector sub-type (client items 6 and 9).
 *
 * This is a sub-type rather than a second top-level connector because both
 * variants speak HTTP to the same base URL with the same credential — only the
 * shape of the call differs. Making it a connector of its own would have forked
 * the id, and every application already pointing at `api` would have had to be
 * migrated to keep working.
 */
export const API_TYPES = ['REST API', 'Custom API']
export const API_REST = API_TYPES[0]
export const API_CUSTOM = API_TYPES[1]

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

// Categories the platform knows how to act on: a validation error is a bad
// record and is not retried, an auth error stops the run, a server error and a
// rate limit are both retried but on different backoffs. The list is closed
// because the behaviour behind each entry is closed.
export const ERROR_CATEGORIES = [
  'Validation error', 'Authentication error', 'Server error', 'Rate limited', 'Unknown',
]

const isBearer = (c) => c.authType === AUTH_BEARER_TYPE
const isBasic = (c) => c.authType === AUTH_BASIC
const isDynamicBearer = (c) => isBearer(c) && c.authMethod === BEARER_DYNAMIC
const isDefaultBearer = (c) => isBearer(c) && c.authMethod !== BEARER_DYNAMIC
const isCustomApi = (c) => c.apiType === API_CUSTOM

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
  Directory: [
    { id: 'host', label: 'Host', required: true, mono: true, placeholder: 'dc01.tanflow.internal' },
    { id: 'port', label: 'Port', required: true, mono: true, numeric: true },
    { id: 'baseDn', label: 'Base DN', required: true, mono: true, span: 2, placeholder: 'dc=tanflow,dc=com' },
    { id: 'bindDn', label: 'Bind DN', required: true, mono: true, span: 2, placeholder: 'cn=idam,ou=svc,dc=tanflow,dc=com' },
    { id: 'bindPassword', label: 'Bind credential', required: true, secret: true },
    { id: 'objectClass', label: 'Object class', mono: true, hint: 'Defaults to the standard class for this directory type.' },
  ],
  /**
   * The custom API connector.
   *
   * Grouped, because it is not one form: it is authentication, response
   * handling, and one configuration per lifecycle operation the application is
   * actually allowed to perform. A flat list of twenty-six fields asked an
   * operator to work out for themselves which six of them belonged to Create.
   *
   * The lifecycle groups are gated on the operations ticked for the
   * application — a connector that may not delete is not asked for a delete
   * endpoint.
   */
  Custom: [
    { group: 'Connection', id: 'baseUrl', label: 'Base URL', required: true, mono: true, span: 2, placeholder: 'https://api.example.com/v1' },
    { group: 'Connection', id: 'apiType', label: 'API connector type', options: API_TYPES, hint: 'A REST API connector drives one resource path. A custom API connector takes an endpoint and a verb for each operation.' },
    {
      group: 'Connection',
      id: 'timeoutSeconds',
      label: 'API request timeout (seconds)',
      required: true,
      numeric: true,
      default: '30',
      min: 1,
      max: 600,
      placeholder: '30',
      hint: 'How long an outgoing call may wait for a response before the run gives up on it. Applies to every API configured below.',
    },

    // -- Authentication. Applied to every API in this configuration. ---------
    { group: 'Authentication', id: 'authType', label: 'Auth type', required: true, options: AUTH_TYPES, default: AUTH_BEARER_TYPE, hint: 'The credential this target accepts. It is applied to every API configured below.' },
    { group: 'Authentication', id: 'username', label: 'Username', mono: true, when: isBasic, required: isBasic },
    { group: 'Authentication', id: 'password', label: 'Password', secret: true, when: isBasic },
    { group: 'Authentication', id: 'authMethod', label: 'Auth method', options: BEARER_METHODS, default: BEARER_DEFAULT, when: isBearer, required: isBearer, hint: 'Default mints a token from the token API below. Dynamic sends an authorization value supplied here.' },
    {
      group: 'Authentication',
      id: 'authorization',
      label: 'Authorization',
      secret: true,
      span: 2,
      when: isDynamicBearer,
      required: isDynamicBearer,
      hint: 'Sent as the authorization value on every request. Include the scheme if the target expects one.',
    },

    // -- Token API. Only a default bearer connector mints its own token. -----
    { group: 'Token API', id: 'getTokenApiUrl', label: 'Get token API URL', mono: true, span: 2, when: isDefaultBearer, required: isDefaultBearer, placeholder: 'https://api.example.com/oauth/token' },
    { group: 'Token API', id: 'getTokenApiMethod', label: 'Get token API method', options: HTTP_METHODS, default: 'POST', when: isDefaultBearer, required: isDefaultBearer },
    { group: 'Token API', id: 'clientId', label: 'Client ID', mono: true, when: isDefaultBearer, required: isDefaultBearer },
    { group: 'Token API', id: 'clientSecret', label: 'Client secret', secret: true, when: isDefaultBearer, required: isDefaultBearer },
    {
      group: 'Token API',
      id: 'getTokenApiPayload',
      label: 'Get token API payload',
      type: 'textarea',
      mono: true,
      rows: 4,
      span: 2,
      json: true,
      when: isDefaultBearer,
      required: isDefaultBearer,
      placeholder: '{\n  "grant_type": "client_credentials"\n}',
      hint: 'Body sent to the token endpoint. Validated as JSON when the field loses focus.',
    },

    // -- How a response is read. --------------------------------------------
    { group: 'Response handling', id: 'successKey', label: 'Success key', mono: true, placeholder: 'status', hint: 'Key in the response body the platform reads to decide a call succeeded. Defaults to the HTTP status when left blank.' },
    { group: 'Response handling', id: 'successValue', label: 'Success value', mono: true, placeholder: 'success', hint: 'The value that key must carry for the call to count as successful.' },
    { group: 'Response handling', id: 'messageKey', label: 'Message key', mono: true, placeholder: 'message', hint: 'Key carrying the human-readable outcome, written to the run log.' },
    { group: 'Response handling', id: 'errorKey', label: 'Error key', mono: true, placeholder: 'error.code', hint: 'Key that carries the failure reason when a call did not succeed.' },

    // -- Get User. Always configured: nothing else can run without it. -------
    { group: 'Get User API', id: 'getUserApiUrl', label: 'Get API URL', mono: true, span: 2, placeholder: 'https://api.example.com/v1/users', hint: 'Endpoint the connector reads accounts from.' },
    { group: 'Get User API', id: 'getUserApiMethod', label: 'Get API method', options: HTTP_METHODS, default: 'GET' },
    {
      group: 'Get User API',
      id: 'getUserApiPayload',
      label: 'Get API payload',
      type: 'textarea',
      mono: true,
      rows: 4,
      span: 2,
      json: true,
      placeholder: '{}',
      hint: 'Body sent on the read. Validated as JSON when the field loses focus.',
    },

    // -- Create. Shown only when the application may create accounts. --------
    { group: 'Create User API', id: 'createPath', label: 'Create API URL', mono: true, span: 2, url: true, when: canCreate, required: canCreate, placeholder: 'https://api.example.com/v1/users' },
    { group: 'Create User API', id: 'createMethod', label: 'Create API method', options: HTTP_METHODS, default: 'POST', when: canCreate, required: canCreate },
    {
      group: 'Create User API',
      id: 'createPayload',
      label: 'Create API payload',
      type: 'textarea',
      mono: true,
      rows: 6,
      span: 2,
      json: true,
      when: canCreate,
      required: canCreate,
      placeholder: '{\n  "userName": "{username}",\n  "email": "{email}"\n}',
      hint: 'A {token} is replaced with the value the attribute mapping writes for it. Left blank, the connector sends the mapped attributes as a flat JSON object.',
    },

    // -- Update. Identical to Create, against the update endpoint. ----------
    { group: 'Update User API', id: 'updatePath', label: 'Update API URL', mono: true, span: 2, url: true, when: canUpdate, required: canUpdate, placeholder: 'https://api.example.com/v1/users/{id}' },
    { group: 'Update User API', id: 'updateMethod', label: 'Update API method', options: HTTP_METHODS, default: 'PUT', when: canUpdate, required: canUpdate },
    {
      group: 'Update User API',
      id: 'updatePayload',
      label: 'Update API payload',
      type: 'textarea',
      mono: true,
      rows: 6,
      span: 2,
      json: true,
      when: canUpdate,
      required: canUpdate,
      placeholder: '{\n  "email": "{email}"\n}',
      hint: 'Sent when an account this connector owns is updated.',
    },

    // -- Delete. An endpoint and a verb; there is no body to send. -----------
    { group: 'Delete User API', id: 'deletePath', label: 'Delete API URL', mono: true, span: 2, url: true, when: canDelete, required: canDelete, placeholder: 'https://api.example.com/v1/users/{id}' },
    { group: 'Delete User API', id: 'deleteMethod', label: 'Delete API method', options: HTTP_METHODS, default: 'DELETE', when: canDelete, required: canDelete },
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

export const specFor = (connector) => CONNECTION_SPECS[kindOf(connector)] || CONNECTION_SPECS.Custom

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

export const blankErrorClasses = () => [
  { id: 1, match: '400', category: 'Validation error' },
  { id: 2, match: '401', category: 'Authentication error' },
  { id: 3, match: '500', category: 'Server error' },
]

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
    out[f.id] = f.default != null ? f.default : f.options ? f.options[0] : ''
  })
  if (out.port !== undefined) out.port = profileFor(connector).port || ''
  if (kindOf(connector) === 'Custom') {
    out.errorClasses = blankErrorClasses()
    out.authExtras = blankAuthExtras()
  }
  return out
}

export const connectionIssues = (connector, conn = {}, ctx = {}) => {
  // An HTTP connector is named by its sub-type in the message, so an operator
  // reading "required for a Custom API connector" is told which of the two
  // shapes the requirement belongs to.
  const named = CONNECTORS[connector] ? CONNECTORS[connector].name : connector
  const name = kindOf(connector) === 'Custom' ? conn.apiType || named : named
  const out = specFor(connector).map((f) => fieldIssue(f, conn, name, ctx)).filter(Boolean)
  if (kindOf(connector) === 'Custom') {
    out.push(...errorClassIssues(conn))
    out.push(...authExtraIssues(conn))
  }
  return out
}

export const connectionEndpoint = (connector, conn = {}) => {
  if (conn.host) return conn.port ? `${conn.host}:${conn.port}` : conn.host
  return conn.baseUrl || conn.endpoint || conn.tenantId || '—'
}

const connectionSeed = (a) => {
  const s = settingsFor(a)
  switch (kindOf(a.connector)) {
    case 'Database':
      return { host: a.host, port: a.port, database: s.container, username: s.principal, password: 'stored', accountTable: s.object }
    case 'Directory':
      return { host: a.host, port: a.port, baseDn: s.container, bindDn: s.principal, bindPassword: 'stored', objectClass: s.object }
    case 'Custom':
      return {
        baseUrl: s.container,
        apiType: API_REST,
        timeoutSeconds: String(s.timeout),
        authType: AUTH_BEARER_TYPE,
        authMethod: BEARER_DEFAULT,
        getTokenApiUrl: `${s.container}/oauth/token`,
        getTokenApiMethod: 'POST',
        clientId: 'idam-provisioning',
        clientSecret: 'stored',
        getTokenApiPayload: '{ "grant_type": "client_credentials" }',
        authExtras: blankAuthExtras(),
        successKey: 'status',
        successValue: 'success',
        messageKey: 'message',
        errorKey: 'error.code',
        getUserApiUrl: `${s.container}${s.object}`,
        getUserApiMethod: 'GET',
        getUserApiPayload: '{}',
        createPath: `${s.container}${s.object}`,
        createMethod: 'POST',
        createPayload: '{\n  "userName": "{username}",\n  "email": "{email}"\n}',
        updatePath: `${s.container}${s.object}/{id}`,
        updateMethod: 'PUT',
        updatePayload: '{\n  "email": "{email}"\n}',
        deletePath: `${s.container}${s.object}/{id}`,
        deleteMethod: 'DELETE',
        errorClasses: blankErrorClasses(),
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
  const secretOk = !secretField || !!String(conn[secretField.id] || '').trim()
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

export const blankLink = () => ({
  targetUrl: '',
  openIn: 'New tab',
  passIdentity: false,
  identityParam: 'user',
})

export const LINK_TARGETS = ['New tab', 'Same tab']

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
  if (l.passIdentity && !String(l.identityParam || '').trim()) out.push('Name the query parameter the username is passed in.')
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
 * How the query string is opened.
 *
 * One choice per configuration, not per parameter: the launch path decides
 * whether the parameters hang off `?`, off `&` because the address already
 * carries a query, or off `/?` because the path ends in a slash. Everything
 * after the first parameter is joined with `&`, which is not a decision anyone
 * needs to make.
 */
export const PARAM_SEPARATORS = ['/?', '?', '&']

export const DEFAULT_PARAM_SEPARATOR = '?'

/** Where a parameter's value comes from. */
export const PARAM_INPUT_TYPES = ['Manual', 'IDAM Attribute', 'nonce']

/* Reserved: a parameter of this name in a pattern is the generated token, not
   an attribute the application releases. */
export const NONCE_TOKEN = 'nonce'

/** The IDAM attribute picker, spelled so the stored value is visible beside
 *  the label an administrator recognises it by. */
export const IDAM_ATTR_PARAM_OPTIONS = IDAM_ATTRS.map((a) => ({
  value: a.value,
  label: `${String(a.label).split(' · ')[0]} ( value = ${a.value})`,
}))

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

/** Build the stored pattern from a base address, its separator and parameters. */
export const buildPattern = (base, separator, params = []) => {
  const head = String(base || '').trim()
  if (!head) return ''
  const ready = params.filter(paramReady)
  if (!ready.length) return head
  const query = ready.map((p) => `${p.key}=${paramValueText(p)}`).join('&')
  return `${head}${separator || DEFAULT_PARAM_SEPARATOR}${query}`
}

/**
 * Read a stored pattern back into a base, a separator and parameters.
 *
 * Scans for the separator rather than splitting on `?`, so a `/?` survives a
 * round trip instead of being rewritten as `?` with a stray slash left on the
 * base.
 */
export const parsePattern = (raw) => {
  const s = String(raw || '')
  let at = -1
  let separator = DEFAULT_PARAM_SEPARATOR
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '?') { at = s[i - 1] === '/' ? i - 1 : i; separator = s[i - 1] === '/' ? '/?' : '?'; break }
    if (s[i] === '&') { at = i; separator = '&'; break }
  }
  if (at === -1) return { base: s, separator: DEFAULT_PARAM_SEPARATOR, params: [] }
  const params = s.slice(at + separator.length).split('&').map((chunk) => {
    const eq = chunk.indexOf('=')
    const key = eq === -1 ? chunk : chunk.slice(0, eq)
    const value = eq === -1 ? '' : chunk.slice(eq + 1)
    const token = /^\{([^}]+)\}$/.exec(value)
    if (token && token[1] === NONCE_TOKEN) return { key, inputType: NONCE_TOKEN, attr: '', value: NONCE_TOKEN }
    if (token) return { key, inputType: 'IDAM Attribute', attr: token[1], value: '' }
    return { key, inputType: 'Manual', attr: '', value }
  }).filter((p) => p.key)
  return { base: s.slice(0, at), separator, params }
}

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
    // already exists (client item 9). Manual hands the target value to an
    // operator, so a manual row is never written by a run whatever Update says.
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
  ],
  Custom: [
    'Username', 'Email', 'FirstName', 'LastName', 'Department', 'Title', 'MobilePhone',
    'UserType', 'EmployeeNumber', 'ManagerEmail', 'IsActive',
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
// Operation configuration (client item 11)
// ---------------------------------------------------------------------------

export { EXTRA_OPERATION_SPECS, OPERATION_SPECS } from '../provisioning/shared'

export const blankOperations = () => ({
  create: true,
  update: true,
  remove: false,
  updateExisting: false,
  deactivate: true,
  password: false,
})

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
  return {
    sourceName: a.name,
    connector: a.connector,
    method: a.method,
    status: a.status,
    accounts: a.accounts,
    lastSync: a.lastSync,
    host: a.host,
    port: a.port,
    description: a.description,
    connection: connectionSeed(a),
    operations: operationsFor(a),
    mappings,
    ...defaultUniquePair(mappings),
  }
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
    ? { ...blankLink(), targetUrl: `https://${s.name.replace(/_/g, '-')}.tanflow.internal`, openIn: 'New tab' }
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
