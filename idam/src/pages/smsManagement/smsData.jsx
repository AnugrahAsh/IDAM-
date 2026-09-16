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
