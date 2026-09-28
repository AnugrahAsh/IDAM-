// ---------------------------------------------------------------------------
// The provider runtime engine.
//
// A provider binding is a small request specification: which engine builds the
// request, how the body is serialised, how it is authenticated, whether the
// payload is encrypted, and how a delivered message is told apart from a
// rejected one. Every carrier answers those questions differently, so each is
// configured rather than assumed.
//
// No secret is ever a value here. Keys, tokens and passwords are named by the
// environment variable that holds them, so the record can be exported, diffed
// and audited without carrying a credential.
// ---------------------------------------------------------------------------

/* Each engine is a different request builder, so the type drives what the rest
   of the form means: an encrypted binding sends ciphertext as text/plain
   whatever the serializer says, and a generic binding posts the payload as-is. */
export const PROVIDER_TYPES = [
  { value: 'STANDARD', label: 'Standard', icon: 'server' },
  { value: 'GENERIC_JSON', label: 'Generic JSON', icon: 'code' },
  { value: 'ENCRYPTED_PAYLOAD', label: 'Encrypted Payload', icon: 'lock', tone: 'bad' },
]

export const SERIALIZERS = [
  { value: 'application/json', label: 'application/json', short: 'json' },
  { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded', short: 'form-urlencoded' },
  { value: 'text/plain', label: 'text/plain', short: 'text/plain' },
]

export const HTTP_METHODS = ['POST', 'GET', 'PUT']

/* The bracketed prefix groups the list by what the operator has to supply — a
   static key, a token, a credential pair or a signing secret — which is the
   only distinction that changes what the form asks for next. */
export const AUTH_TYPES = [
  { value: 'NONE', label: '[No Auth] None', short: 'None' },
  { value: 'API_KEY_HEADER', label: '[Static Key] API Key (Header)', short: 'API Key (Header)' },
  { value: 'API_KEY_PAYLOAD', label: '[Static Key] API Key (Payload Field)', short: 'API Key (Payload)' },
  { value: 'BEARER_STATIC', label: '[Token] Bearer Token (Static)', short: 'Bearer Token' },
  { value: 'OAUTH_TOKEN', label: '[Token] OAuth / Acquired Token', short: 'OAuth / Acquired Token' },
  { value: 'BASIC', label: '[Credential] Basic Auth (user:pass)', short: 'Basic Auth' },
  { value: 'HMAC_SHA256', label: '[Signature] HMAC-SHA256 Signature', short: 'HMAC-SHA256 Signature' },
  { value: 'HMAC_SHA512', label: '[Signature] HMAC-SHA512 Signature', short: 'HMAC-SHA512 Signature' },
]

/* What each auth type actually needs. Anything not listed for the selected
   type is neither rendered nor validated, so a binding is never blocked on a
   field belonging to a method it does not use. */
export const AUTH_FIELDS = {
  NONE: [],
  API_KEY_HEADER: [
    { key: 'authHeaderName', label: 'Header Name', required: true, placeholder: 'e.g. X-API-Key' },
    { key: 'authEnvRef', label: 'Key Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BESCOM_API_KEY', mono: true },
  ],
  API_KEY_PAYLOAD: [
    { key: 'authFieldName', label: 'Payload Field Name', required: true, placeholder: 'e.g. apiKey' },
    { key: 'authEnvRef', label: 'Key Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BESCOM_API_KEY', mono: true },
  ],
  BEARER_STATIC: [
    { key: 'authEnvRef', label: 'Token Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BTS_BEARER_TOKEN', mono: true, span: 2 },
  ],
  OAUTH_TOKEN: [
    { key: 'authTokenUrl', label: 'Token URL', required: true, placeholder: 'https://provider.com/oauth2/token', span: 2 },
    { key: 'authClientId', label: 'Client ID', required: true, placeholder: 'e.g. tanflow-idam' },
    { key: 'authEnvRef', label: 'Client Secret Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. RE_OAUTH_CLIENT_SECRET', mono: true },
  ],
  BASIC: [
    { key: 'authUsername', label: 'Username', required: true, placeholder: 'e.g. tanflow' },
    { key: 'authEnvRef', label: 'Password Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BESCOM_SMS_PASSWORD', mono: true },
  ],
  // The rest of a signature binding is the builder below the auth type: the
  // digest, its inputs in order, and where the result goes.
  HMAC_SHA256: [
    { key: 'authEnvRef', label: 'Secret Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BESCOM1_HMAC_SECRET', mono: true, span: 2 },
  ],
  HMAC_SHA512: [
    { key: 'authEnvRef', label: 'Secret Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. BESCOM1_HMAC_SECRET', mono: true, span: 2 },
  ],
}

/* ---------------------------------------------------------------------------
   Request signing.

   A gateway that authenticates by signature does not take a credential — it
   takes a digest of named parts of the request, in an order both sides agree
   on. "Signed Fields" was a comma-separated string, which cannot say where a
   part comes from: `content` might be a payload field, a transformed field or
   a header, and the three hash to different bytes. So the inputs are a list of
   {source, field} rows, ordered, and the digest, the separator between parts,
   and where the result is injected are configuration rather than convention.
   --------------------------------------------------------------------------- */

/* The digest is the auth type — one source of truth, so the register's Auth
   column and this control can never disagree about which algorithm signs. */
export const SIG_ALGORITHMS = [
  { value: 'HMAC_SHA256', label: 'SHA-256' },
  { value: 'HMAC_SHA512', label: 'SHA-512' },
]

export const SIG_TARGETS = [
  { value: 'PAYLOAD', label: 'Payload Field' },
  { value: 'HEADER', label: 'Header' },
  { value: 'QUERY', label: 'Query Parameter' },
]

/* Where one input to the digest is read from. `TRANSFORMED` is a field the
   serializer has already rewritten — a number normalised to E.164, say — which
   is a different string from the one the caller supplied. */
export const SIG_SOURCES = [
  { value: 'PAYLOAD', label: 'Payload Field' },
  { value: 'TRANSFORMED', label: 'Transformed Field' },
  { value: 'HEADER', label: 'Header' },
  { value: 'SECRET', label: 'Secret' },
  { value: 'STATIC', label: 'Static Value' },
]

export const isSignatureAuth = (v) => v === 'HMAC_SHA256' || v === 'HMAC_SHA512'

export const blankSigInput = () => ({ source: 'PAYLOAD', field: '' })

export const ENCRYPTION_ALGORITHMS = ['AES-256-CBC', 'AES-192-CBC', 'AES-128-CBC', 'AES-256-GCM']

/* A gateway that answers 200 with a failure in the body is common enough that
   the status code alone cannot decide whether a message was delivered. */
export const RESPONSE_CHECKS = [
  { value: 'HTTP_STATUS', label: 'HTTP Status Code — Check response HTTP status code' },
  { value: 'BODY_STARTS_WITH', label: 'Body starts with — Match the opening of the response body' },
  { value: 'BODY_CONTAINS', label: 'Body contains — Match anywhere in the response body' },
  { value: 'JSON_PATH_EQUALS', label: 'JSON path equals — Compare one field of the JSON response' },
]

export const CHECK_FIELDS = {
  HTTP_STATUS: [
    { key: 'successCodes', label: 'Success Codes', labelHint: 'comma-separated', placeholder: '200,202', mono: true },
  ],
  BODY_STARTS_WITH: [
    { key: 'responseValue', label: 'Expected Opening', required: true, labelHint: 'matched against the start of the body', placeholder: 'e.g. SUCCESS', mono: true },
  ],
  BODY_CONTAINS: [
    { key: 'responseValue', label: 'Expected Text', required: true, labelHint: 'matched anywhere in the body', placeholder: 'e.g. accepted', mono: true },
  ],
  JSON_PATH_EQUALS: [
    { key: 'responsePath', label: 'JSON Path', required: true, labelHint: 'dotted path into the response', placeholder: 'e.g. data.status', mono: true },
    { key: 'responseValue', label: 'Expected Value', required: true, placeholder: 'e.g. QUEUED', mono: true },
  ],
}

export const TEMPLATE_CODES = ['otp_sms', 'resetPassword_sms', 'setPassword_sms']

/* What the body of the message is. The distinction is not cosmetic: a one-time
   code is generated and expired by the platform, while an ordinary message can
   carry a link — which is why only an SMS template may hold the password
   creation link. The stored values are the contract with the send pipeline;
   only the labels are ours to read. */
export const SMS_TEMPLATE = 'sms_template'
export const OTP_TEMPLATE = 'otp_template'

export const TEMPLATE_TYPES = [
  { value: SMS_TEMPLATE, label: 'SMS template', icon: 'sms' },
  { value: OTP_TEMPLATE, label: 'OTP template', icon: 'key', tone: 'viol' },
]

export const DEFAULT_HEADERS = '{\n  "Content-Type": "application/json"\n}'

export const DEFAULT_PAYLOAD = '{\n  "to": "{{mobileNumber}}",\n  "message": "{{message}}"\n}'

const find = (list, v) => list.find((o) => o.value === v)

export const providerType = (v) => find(PROVIDER_TYPES, v) || { value: v, label: v, icon: 'server' }

export const authType = (v) => find(AUTH_TYPES, v) || { value: v, label: v, short: v }

export const templateType = (v) => find(TEMPLATE_TYPES, v) || TEMPLATE_TYPES[0]

/* Seeded templates predate the type, so one is read off the template code —
   the otp_ bodies are one-time codes and everything else is an ordinary
   message. A record that already carries a type keeps it. */
export const withTemplateType = (t) => ({
  ...t,
  type: t.type || (String(t.code || '').startsWith('otp') ? OTP_TEMPLATE : SMS_TEMPLATE),
  passwordCreationLinkSms: !!t.passwordCreationLinkSms,
})

/** The template that carries the password creation link today, if any. */
export const passwordLinkHolder = (list, exceptId = null) => list
  .find((t) => t.passwordCreationLinkSms && t.id !== exceptId) || null

export const serializerShort = (v) => (find(SERIALIZERS, v) || {}).short || v

// The register shows the algorithm the way the gateway names it in its own
// documentation — AES256CBC — while the form keeps the readable spelling.
export const encryptionShort = (v) => (v ? String(v).replace(/-/g, '') : '')

export const authFieldsFor = (v) => AUTH_FIELDS[v] || []

export const checkFieldsFor = (v) => CHECK_FIELDS[v] || []

// Commit helpers shared by the provider, template and client forms.

export const nextRowId = (list) => list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1

export const addRow = (list, row) => [...list, { ...row, id: nextRowId(list) }]

export const upsertRow = (list, record, patch) => (record
  ? list.map((r) => (r.id === record.id ? { ...r, ...patch } : r))
  : addRow(list, patch))

/**
 * Commit a template, holding the password creation link to one record.
 *
 * A password creation link has exactly one body, so switching the role on for
 * one template has to switch it off everywhere else — a register with two
 * claimants would send whichever the pipeline happened to read first. The row
 * being written is identified before the write, because a new row is only
 * given its id inside `addRow`, using this same counter.
 */
export const commitTemplate = (list, record, patch) => {
  const written = record ? record.id : nextRowId(list)
  const next = upsertRow(list, record, patch)
  if (!patch.passwordCreationLinkSms) return next
  return next.map((t) => (t.id === written || !t.passwordCreationLinkSms
    ? t
    : { ...t, passwordCreationLinkSms: false }))
}

export const toggleStatus = (s) => (s === 'Active' ? 'Inactive' : 'Active')

// Validation — returns null when the draft may be committed.

const req = (e, d, key, message) => {
  if (!String(d[key] ?? '').trim()) e[key] = message
}

export const providerErrors = (d) => {
  const e = {}
  if (!String(d.code || '').trim()) e.code = 'A provider code is required.'
  else if (!/^[A-Za-z0-9_]+$/.test(d.code)) e.code = 'Use letters, digits and underscores only.'
  req(e, d, 'name', 'A provider name is required.')
  req(e, d, 'type', 'A provider type is required.')
  req(e, d, 'auth', 'An auth type is required.')
  authFieldsFor(d.auth).forEach((f) => f.required && req(e, d, f.key, `${f.label} is required.`))
  if (d.encryptionOn) {
    req(e, d, 'encryption', 'An algorithm is required.')
    req(e, d, 'encryptionKeyRef', 'A key env ref is required.')
  }
  /* A signature with nothing to hash is not a signature. The gateway would be
     sent a digest of the empty string on every message and reject all of them,
     so the binding is refused here rather than at send time. */
  if (isSignatureAuth(d.auth)) {
    req(e, d, 'sigOutputField', 'An output field name is required.')
    const inputs = (d.sigInputs || []).filter((i) => String(i.field || '').trim())
    if (inputs.length === 0) e.sigInputs = 'A signature needs at least one input to hash.'
  }
  req(e, d, 'responseCheck', 'A detection method is required.')
  checkFieldsFor(d.responseCheck).forEach((f) => f.required && req(e, d, f.key, `${f.label} is required.`))
  return Object.keys(e).length ? e : null
}

/* Headers and payload are hand-written JSON, so a malformed brace is the most
   likely reason a template fails — worth catching here rather than at send
   time, and worth quoting the parser's own message back. */
export const jsonError = (text) => {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'Must be a JSON object.'
    return null
  } catch (err) {
    return err.message
  }
}

export const templateErrors = (d) => {
  const e = {}
  req(e, d, 'provider', 'A provider is required.')
  req(e, d, 'type', 'A template type is required.')
  req(e, d, 'code', 'A template code is required.')
  req(e, d, 'name', 'A template name is required.')
  if (!String(d.apiUrl || '').trim()) e.apiUrl = 'An API URL is required.'
  else if (!/^https?:\/\//i.test(d.apiUrl)) e.apiUrl = 'The URL must start with http:// or https://.'
  const headers = jsonError(d.headers)
  if (headers) e.headers = headers
  const payload = jsonError(d.payload)
  if (payload) e.payload = payload
  return Object.keys(e).length ? e : null
}

export const clientErrors = (d) => {
  const e = {}
  req(e, d, 'code', 'A client code is required.')
  req(e, d, 'name', 'A client name is required.')
  req(e, d, 'provider', 'A provider is required.')
  return Object.keys(e).length ? e : null
}

export const blankProvider = () => ({
  id: null, code: '', name: '', type: 'STANDARD',
  serializer: 'application/json', method: 'POST',
  auth: 'NONE', authHeaderName: '', authFieldName: '', authEnvRef: '',
  authUsername: '', authTokenUrl: '', authClientId: '', authSignedFields: '',
  sigSeparator: '', sigOutputField: 'signature', sigOutputTarget: 'PAYLOAD',
  sigInputs: [{ source: 'PAYLOAD', field: '' }],
  encryptionOn: false, encryption: 'AES-256-CBC', encryptionKeyRef: '',
  responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
  successCodes: '200,202', messageIdField: '',
  timeout: 30000, retries: 0, status: 'Active',
})

export const blankTemplate = (provider = '') => ({
  id: null, provider, type: SMS_TEMPLATE, code: TEMPLATE_CODES[0], name: '', apiUrl: '', method: 'POST',
  headers: DEFAULT_HEADERS, payload: DEFAULT_PAYLOAD, passwordCreationLinkSms: false, status: 'Active',
})

/* The password-link toggle is only rendered for an SMS template, so a draft
   switched to OTP after the toggle was set must not be committed as true —
   nothing would ever show the operator that the flag is still there. */
export const fromTemplateDraft = (d) => ({
  ...d,
  passwordCreationLinkSms: d.type === SMS_TEMPLATE && !!d.passwordCreationLinkSms,
})

export const blankClient = (provider = '') => ({ id: null, code: '', name: '', provider, status: 'Active' })

/* The stored record has no `encryptionOn` flag — an algorithm is either set or
   it is not — so the checkbox state is derived when a record is opened and
   folded back into the algorithm when it is saved. */
export const toProviderDraft = (record) => {
  const base = blankProvider()
  /* A binding written before the builder existed carries its signed fields as
     a comma string. Read it as payload fields in the order it lists them,
     which is what that string always meant. */
  const legacy = String(record.authSignedFields || '').split(',').map((f) => f.trim()).filter(Boolean)
  const sigInputs = Array.isArray(record.sigInputs) && record.sigInputs.length
    ? record.sigInputs.map((i) => ({ ...i }))
    : legacy.length
      ? legacy.map((field) => ({ source: 'PAYLOAD', field }))
      : base.sigInputs
  return {
    ...base,
    ...record,
    sigInputs,
    encryptionOn: !!record.encryption,
    encryption: record.encryption || 'AES-256-CBC',
  }
}

export const fromProviderDraft = (d) => {
  const { encryptionOn, ...rest } = d
  return {
    ...rest,
    encryption: encryptionOn ? d.encryption : '',
    encryptionKeyRef: encryptionOn ? d.encryptionKeyRef : '',
    timeout: Number(d.timeout) || 30000,
    retries: Number(d.retries) || 0,
  }
}

/* ---------------------------------------------------------------------------
   What the binding actually sends.

   A provider is eight controls spread over five groups, and none of them says
   what the gateway receives. An operator could read every field correctly and
   still be surprised by the request — the serializer decides the Content-Type
   until encryption overrides it, the auth type decides whether the credential
   is a header or a payload field, and the signature lands wherever its target
   says. So the request is derived from the draft and shown, rather than left
   to be assembled in the reader's head.

   Everything below is computed on render from the draft in hand. Nothing here
   is stored, and no value is a real credential: a secret appears as the name of
   the environment variable that holds it, which is all the record ever knows.
   --------------------------------------------------------------------------- */

/* One seeded send, used for every preview on the page so the message, the
   character count and the body are describing the same message. */
export const SAMPLE_SEND = {
  to: '+91 98861 04455',
  sender: 'TANFLW',
  message: 'Your Tanflow verification code is 418302. It expires in 10 minutes. Do not share it with anyone.',
}

const envRef = (d) => `\${${String(d.authEnvRef || '').trim() || 'ENV_REF'}}`

/* The default alphabet a carrier bills in. Characters outside it force the
   whole message to UCS-2, and the seven characters in the extension table cost
   two septets each — which is why a single curly brace can push a body that
   looks like one message into two. */
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM7_EXT = '^{}\\[~]|€'

export const smsSegments = (text) => {
  const chars = [...String(text || '')]
  const gsm = chars.every((c) => GSM7.includes(c) || GSM7_EXT.includes(c))
  const units = gsm
    ? chars.reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0)
    : chars.length
  // A concatenated message spends part of every segment on the header that
  // says how the parts reassemble, so the per-segment room drops once there
  // is more than one.
  const single = gsm ? 160 : 70
  const joined = gsm ? 153 : 67
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / joined)
  return { chars: chars.length, units, segments, single, encoding: gsm ? 'GSM-7' : 'UCS-2' }
}

/** The request line. The endpoint itself belongs to the template, not here. */
export const previewRequestLine = (d) => {
  const query = isSignatureAuth(d.auth) && d.sigOutputTarget === 'QUERY'
    ? `?${String(d.sigOutputField || 'signature').trim()}=<digest>`
    : ''
  return `${d.method || 'POST'} {{template endpoint}}${query}`
}

export const previewHeaders = (d) => {
  // Encryption rewrites the body to ciphertext, so the declared type is what
  // the gateway is handed rather than what the serializer produced.
  const rows = [['Content-Type', d.encryptionOn ? 'text/plain' : d.serializer]]
  if (d.auth === 'API_KEY_HEADER') rows.push([String(d.authHeaderName || 'X-API-Key').trim(), envRef(d)])
  else if (d.auth === 'BEARER_STATIC' || d.auth === 'OAUTH_TOKEN') rows.push(['Authorization', `Bearer ${envRef(d)}`])
  else if (d.auth === 'BASIC') rows.push(['Authorization', `Basic base64(${String(d.authUsername || 'user').trim()}:${envRef(d)})`])
  if (isSignatureAuth(d.auth) && d.sigOutputTarget === 'HEADER') {
    rows.push([String(d.sigOutputField || 'signature').trim(), '<digest>'])
  }
  return rows
}

/** The body before the serializer and before encryption — field order included. */
export const previewFields = (d) => {
  const body = { to: SAMPLE_SEND.to, message: SAMPLE_SEND.message }
  if (d.auth === 'API_KEY_PAYLOAD') body[String(d.authFieldName || 'apiKey').trim()] = envRef(d)
  if (isSignatureAuth(d.auth) && d.sigOutputTarget === 'PAYLOAD') {
    body[String(d.sigOutputField || 'signature').trim()] = '<digest>'
  }
  return body
}

export const previewBody = (d) => {
  const fields = previewFields(d)
  if (d.encryptionOn) {
    const key = String(d.encryptionKeyRef || '').trim() || 'KEY_ENV_REF'
    return `<${encryptionShort(d.encryption) || 'AES'} ciphertext of the JSON body, keyed from process.env.${key}>`
  }
  if (d.serializer === 'application/x-www-form-urlencoded') {
    return Object.entries(fields).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  }
  return JSON.stringify(fields, null, 2)
}

/** How the answer is read, said as a sentence rather than as four controls. */
export const successRule = (d) => {
  const value = String(d.responseValue || '').trim()
  switch (d.responseCheck) {
    case 'HTTP_STATUS':
      return `Delivered when the response status is one of ${String(d.successCodes || '200,202').trim()}.`
    case 'BODY_STARTS_WITH':
      return `Delivered when the response body starts with ${value ? `"${value}"` : 'the expected opening'}.`
    case 'BODY_CONTAINS':
      return `Delivered when the response body contains ${value ? `"${value}"` : 'the expected text'}.`
    case 'JSON_PATH_EQUALS':
      return `Delivered when ${String(d.responsePath || 'the named path').trim()} in the JSON response equals ${value ? `"${value}"` : 'the expected value'}.`
    default:
      return 'No detection method is selected, so no response can be judged.'
  }
}

/* The handshake, run on demand. It negotiates and authenticates without
   handing over a message, so it proves reachability and the credential without
   putting a text on anybody's handset — the same trade the email side makes
   with its SMTP test. */
export const connectionTestLog = (d) => {
  const auth = authType(d.auth)
  return [
    { tone: 'dim', text: `resolve gateway ${String(d.code || '').trim() || '(unnamed)'} · ${providerType(d.type).label} engine` },
    { tone: 'ok', text: `200 endpoint reachable · ${d.method} ${serializerShort(d.serializer)}` },
    {
      tone: d.auth === 'NONE' ? 'warn' : 'ok',
      text: d.auth === 'NONE'
        ? 'no authentication configured — the gateway is trusted to accept anonymous posts'
        : `authenticated with ${auth.short} from process.env.${String(d.authEnvRef || '').trim() || '(unset)'}`,
    },
    {
      tone: d.encryptionOn ? 'ok' : 'dim',
      text: d.encryptionOn
        ? `payload encrypted with ${encryptionShort(d.encryption)} · sent as text/plain`
        : 'payload sent in the clear',
    },
    { tone: 'dim', text: `success detection · ${d.responseCheck}` },
    {
      tone: d.status === 'Active' ? 'ok' : 'bad',
      text: d.status === 'Active'
        ? `gateway healthy · round trip 168 ms · timeout ${Number(d.timeout) || 30000} ms, ${Number(d.retries) || 0} retries`
        : 'provider inactive — nothing is dispatched through this binding',
    },
  ]
}

/* A template's payload is written with placeholders, so the JSON in the field
   is never the JSON that leaves. Substituting the seeded send shows the shape
   the gateway sees, and leaves any placeholder the sample cannot fill visible
   as itself rather than blanking it. */
export const TEMPLATE_TOKENS = {
  mobileNumber: SAMPLE_SEND.to,
  to: SAMPLE_SEND.to,
  message: SAMPLE_SEND.message,
  sender: SAMPLE_SEND.sender,
  otp: '418302',
}

export const resolveTokens = (text) => String(text || '')
  .replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (whole, key) => (
    TEMPLATE_TOKENS[key] === undefined ? whole : TEMPLATE_TOKENS[key]
  ))

/* ---------------------------------------------------------------------------
   Per-client health.

   A client is the tenant whose texts a binding carries, and each one posts to
   its own gateway. The health screen answered for the default gateway and
   nothing else, so "is this tenant's OTP going out" had five answers and the
   screen gave one of them — the other four meant signing into four other
   tenants.

   A client carries exactly the connection facts and the delivery outcomes the
   default gateway reports, and nothing extra, so the two readouts cannot drift
   into different answers to the same question. The codes and the routing match
   SMS_CLIENTS in the shared seed: a tenant that reads Inactive on the clients
   register must not read Active here.
   --------------------------------------------------------------------------- */

export const SMS_HEALTH_CLIENTS = [
  {
    id: 'bescom', code: 'BESCOM', name: 'Bangalore Electricity Supply Company',
    gateway: 'BESCOM1', method: 'POST', serializer: 'application/x-www-form-urlencoded',
    encryption: '', auth: 'HMAC_SHA512',
    status: 'Active', checkedAt: '2 minutes ago',
    queue: { Queued: 4, Delivered: 1624, Failed: 1 },
  },
  {
    id: 'upcl', code: 'UPCL', name: 'Uttarakhand Power Corporation',
    gateway: 'UPCL', method: 'POST', serializer: 'text/plain',
    encryption: 'AES-256-CBC', auth: 'NONE',
    status: 'Active', checkedAt: '4 minutes ago',
    queue: { Queued: 186, Delivered: 742, Failed: 5 },
  },
  {
    id: 'bts', code: 'BTS', name: 'Bitchief Technology Services',
    gateway: 'BTS', method: 'POST', serializer: 'application/json',
    encryption: '', auth: 'NONE',
    status: 'Active', checkedAt: 'a minute ago',
    queue: { Queued: 318, Delivered: 61, Failed: 402 },
  },
  {
    id: 're', code: 'RE', name: 'Royal Enfield',
    gateway: 'RE', method: 'POST', serializer: 'application/json',
    encryption: '', auth: 'OAUTH_TOKEN',
    status: 'Active', checkedAt: '9 minutes ago',
    queue: { Queued: 0, Delivered: 2318, Failed: 31 },
  },
  {
    id: 'bsphcl', code: 'BSPHCL', name: 'Bihar State Power Holding Company',
    gateway: 'BSPHCL', method: 'POST', serializer: 'application/json',
    encryption: '', auth: 'NONE',
    status: 'Inactive', checkedAt: '31 minutes ago',
    queue: { Queued: 63, Delivered: 0, Failed: 0 },
  },
]

/* The head says what is happening to the traffic, not what the socket did: a
   gateway that answers 200 and then returns four failed receipts in ten is
   failing, however healthy the handshake looked. `attention` is what the
   summary counts — a binding somebody switched off is a decision, not an
   incident, so it reads the way every other inactive record in the console
   reads and is not counted against the tenant. */
export const HEALTH_STATES = {
  ok: { id: 'ok', label: 'Healthy', tone: 'ok', attention: false },
  warn: { id: 'warn', label: 'Degraded', tone: 'warn', attention: true },
  bad: { id: 'bad', label: 'Failing', tone: 'bad', attention: true },
  off: { id: 'off', label: 'Inactive', tone: 'mut', attention: false },
}

/* The thresholds operations triages on. A binding whose receipts come back
   undelivered a quarter of the time is failing whatever it answered on the
   wire; one in a hundred is worth a look; and a queue this deep means texts
   are arriving faster than the gateway is clearing them. */
const FAIL_FAILING = 0.25
const FAIL_DEGRADED = 0.01
const BACKLOG_DEGRADED = 50

/* Counting is done here rather than in the seed so the tiles and the head
   figure are the same arithmetic, and so a client whose queue is edited cannot
   end up with a total that no longer adds up. */
export const queueCounts = (queue = {}) => {
  const Queued = Number(queue.Queued) || 0
  const Delivered = Number(queue.Delivered) || 0
  const Failed = Number(queue.Failed) || 0
  return { Queued, Delivered, Failed, Total: Queued + Delivered + Failed }
}

/* Read from the figures, never stored beside them: a seeded "degraded" flag
   disagrees with the tiles under it the first time either is touched, and the
   flag is what an operator would believe.

   `drivers` is why this returns an object rather than a label. Two independent
   thresholds raise the same amber pill, so the state alone does not say which
   figure tripped it — a binding whose receipts are fine and whose queue holds
   two hundred messages is amber for the backlog alone. A head showing the
   handful of failures, coloured, tells the operator the opposite of what the
   arithmetic said. So the keys that actually crossed a threshold come back with
   the state: the head colours those and leaves every other figure neutral, and
   the recheck toast names the same cause the head did. They are queue keys, so
   they index `queueCounts` directly. */
export const clientHealth = (c) => {
  const settled = (state) => ({ ...state, drivers: [] })
  if (!c) return settled(HEALTH_STATES.bad)
  if (c.status !== 'Active') return settled(HEALTH_STATES.off)
  // Nothing in the queue explains this one: there is no gateway to blame it on.
  if (!c.gateway) return settled(HEALTH_STATES.bad)
  const q = queueCounts(c.queue)
  const rate = q.Total ? q.Failed / q.Total : 0
  // Both are collected rather than the first to match: a binding can be
  // rejecting and backed up at once, and the head has room to say so.
  const drivers = []
  if (rate >= FAIL_DEGRADED) drivers.push('Failed')
  if (q.Queued > BACKLOG_DEGRADED) drivers.push('Queued')
  if (rate >= FAIL_FAILING) return { ...HEALTH_STATES.bad, drivers }
  if (drivers.length) return { ...HEALTH_STATES.warn, drivers }
  return { ...HEALTH_STATES.ok, drivers }
}
