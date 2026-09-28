// ---------------------------------------------------------------------------
// The email provider runtime engine.
//
// A provider binding says how one outbound channel behaves: whether mail is
// handed to an SMTP relay or posted to a sender API, where it goes, how the
// connection is secured, how it is authenticated, what the recipient sees in
// the From header, and how much traffic the binding will carry in a day.
//
// No secret is ever a value here. Passwords, API keys and client secrets are
// named by the environment variable that holds them, so a record can be
// exported, diffed and audited without carrying a credential.
// ---------------------------------------------------------------------------

/* The two engines build entirely different requests — an SMTP conversation on
   a mail port, or a signed HTTPS call to a sender API — so the type decides
   what the rest of the form means. */
export const PROVIDER_TYPES = [
  { value: 'SMTP_RELAY', label: 'SMTP relay', icon: 'server' },
  { value: 'API_SENDER', label: 'API sender', icon: 'cloud', tone: 'acc' },
]

/* The bracketed prefix groups the list by what the operator has to supply — a
   credential pair, a static key or a client registration — which is the only
   distinction that changes what the form asks for next. */
export const AUTH_TYPES = [
  { value: 'NONE', label: '[No Auth] None', short: 'None' },
  { value: 'BASIC', label: '[Credential] Username and password', short: 'Username and password' },
  { value: 'API_KEY', label: '[Static Key] API key', short: 'API key' },
  { value: 'OAUTH2', label: '[Token] OAuth2 client credentials', short: 'OAuth2' },
]

/* What each auth type actually needs. Anything not listed for the selected type
   is neither rendered nor validated, so a binding is never blocked on a field
   belonging to a method it does not use. Every secret is an env var name. */
export const AUTH_FIELDS = {
  NONE: [],
  BASIC: [
    { key: 'authUsername', label: 'Username', required: true, placeholder: 'e.g. idam-relay@tanflow.com' },
    { key: 'authEnvRef', label: 'Password Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. SMTP_RELAY_PASSWORD', mono: true },
  ],
  API_KEY: [
    { key: 'authHeaderName', label: 'Header Name', required: true, placeholder: 'e.g. Authorization' },
    { key: 'authEnvRef', label: 'Key Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. SES_API_KEY', mono: true },
  ],
  OAUTH2: [
    { key: 'authTokenUrl', label: 'Token URL', required: true, placeholder: 'https://login.example.com/oauth2/v2.0/token', span: 2 },
    { key: 'authClientId', label: 'Client ID', required: true, placeholder: 'e.g. tanflow-idam' },
    { key: 'authEnvRef', label: 'Client Secret Env Ref', required: true, labelHint: 'env var name', placeholder: 'e.g. GRAPH_CLIENT_SECRET', mono: true },
  ],
}

/* Transport security, not payload encryption: mail is secured by the
   connection it travels over, so the choice is when TLS is negotiated rather
   than which cipher wraps the body. */
export const ENCRYPTION_MODES = [
  { value: '', label: 'None — plain connection', short: 'None' },
  { value: 'STARTTLS', label: 'STARTTLS — upgrade after the greeting', short: 'STARTTLS' },
  { value: 'TLS', label: 'TLS (SMTPS) — negotiated before the greeting', short: 'TLS' },
]

/* How long the relay waits before trying a transiently rejected message again.
   A list rather than a free number: the values a relay is actually configured
   with are a handful, and a typed-in "90" is ambiguous between seconds and
   minutes in a field that has to be read by whoever is on call. */
export const RETRY_INTERVALS = ['1 minute', '5 minutes', '15 minutes', '30 minutes', '1 hour']

export const DEFAULT_BODY = [
  '<h2>{{tenantName}}</h2>',
  '<p>Hello {{firstName}},</p>',
  '<p></p>',
  '<p><a class="btn" href="{{actionUrl}}">Continue</a></p>',
  '<hr>',
  '<p class="muted">The {{tenantName}} identity team</p>',
].join('\n')

const find = (list, v) => list.find((o) => o.value === v)

export const providerType = (v) => find(PROVIDER_TYPES, v) || { value: v, label: v, icon: 'server' }

export const authType = (v) => find(AUTH_TYPES, v) || { value: v, label: v, short: v }

export const encryptionShort = (v) => (find(ENCRYPTION_MODES, v || '') || {}).short || v

export const authFieldsFor = (v) => AUTH_FIELDS[v] || []

// Commit helpers shared by the provider, template and client forms.

export const nextRowId = (list) => list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1

export const addRow = (list, row) => [...list, { ...row, id: nextRowId(list) }]

export const upsertRow = (list, record, patch) => (record
  ? list.map((r) => (r.id === record.id ? { ...r, ...patch } : r))
  : addRow(list, patch))

export const toggleStatus = (s) => (s === 'Active' ? 'Inactive' : 'Active')

// Validation — returns null when the draft may be committed.

const req = (e, d, key, message) => {
  if (!String(d[key] ?? '').trim()) e[key] = message
}

// Deliberately loose: an address is checked for shape, not for existence, and a
// stricter pattern would reject valid addresses the relay would have accepted.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const address = (e, d, key, message, required) => {
  const v = String(d[key] || '').trim()
  if (!v) { if (required) e[key] = message; return }
  if (!EMAIL_RE.test(v)) e[key] = 'Enter a valid email address.'
}

export const providerErrors = (d) => {
  const e = {}
  if (!String(d.code || '').trim()) e.code = 'A provider code is required.'
  else if (!/^[A-Za-z0-9_]+$/.test(d.code)) e.code = 'Use letters, digits and underscores only.'
  req(e, d, 'name', 'A provider name is required.')
  req(e, d, 'type', 'A provider type is required.')
  // An API sender is addressed by URL; a relay by hostname. Only the first can
  // be checked for a scheme without rejecting the second.
  if (!String(d.host || '').trim()) e.host = d.type === 'API_SENDER' ? 'An endpoint is required.' : 'A host is required.'
  else if (d.type === 'API_SENDER' && !/^https?:\/\//i.test(d.host)) e.host = 'The endpoint must start with http:// or https://.'
  const port = Number(d.port)
  if (!String(d.port ?? '').trim()) e.port = 'A port is required.'
  else if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = 'A port is a whole number between 1 and 65535.'
  req(e, d, 'auth', 'An auth type is required.')
  authFieldsFor(d.auth).forEach((f) => f.required && req(e, d, f.key, `${f.label} is required.`))
  address(e, d, 'fromAddress', 'A from address is required.', true)
  address(e, d, 'replyTo', '', false)
  return Object.keys(e).length ? e : null
}

export const templateErrors = (d) => {
  const e = {}
  req(e, d, 'provider', 'A provider is required.')
  if (!String(d.code || '').trim()) e.code = 'A template code is required.'
  else if (!/^[A-Za-z0-9_]+$/.test(d.code)) e.code = 'Use letters, digits and underscores only.'
  req(e, d, 'name', 'A template name is required.')
  req(e, d, 'subject', 'A subject line is required.')
  req(e, d, 'event', 'An event is required.')
  req(e, d, 'body', 'The body cannot be empty.')
  return Object.keys(e).length ? e : null
}

export const blankProvider = () => ({
  id: null, code: '', name: '', type: 'SMTP_RELAY',
  host: '', port: '587', timeout: 30000, retries: 0,
  auth: 'NONE', authUsername: '', authEnvRef: '', authHeaderName: '',
  authTokenUrl: '', authClientId: '',
  encryption: 'STARTTLS',
  fromName: 'Tanflow Identity', fromAddress: '', replyTo: '',
  dailyCap: '25000', poolSize: '8', retryInterval: '5 minutes',
  dkim: true, bounceHandling: true, sandbox: false,
  status: 'Active',
})

export const blankTemplate = (provider = '', event = '') => ({
  id: null, provider, code: '', name: '', description: '', subject: '', event,
  sender: 'no-reply@tanflow.com', replyTo: 'support@tanflow.com',
  body: DEFAULT_BODY, status: 'Active',
})

export const toProviderDraft = (record) => ({ ...blankProvider(), ...record })

// Numbers arrive from text inputs as strings; the register renders them as
// numbers, so they are coerced once here rather than at every read site.
export const fromProviderDraft = (d) => ({
  ...d,
  timeout: Number(d.timeout) || 30000,
  retries: Number(d.retries) || 0,
})

// ---------------------------------------------------------------------------
// Per-client health.
//
// A client is the tenant whose mail a binding carries, and each one relays
// through its own. An operator triaging a bad morning had no way to see any of
// them from here: the health screen answered for the default relay and nothing
// else, so the only way to find out whether a tenant was sending was to sign
// into that tenant.
//
// A client carries exactly the four connection facts and the three queue
// outcomes the default relay reports — nothing extra, so the two readouts
// cannot drift into different answers to the same question.
// ---------------------------------------------------------------------------

export const EMAIL_HEALTH_CLIENTS = [
  {
    id: 'bescom', code: 'BESCOM', name: 'Bangalore Electricity Supply Company',
    host: 'smtp.bescom.co.in', port: '587', encryption: 'STARTTLS', auth: 'BASIC',
    status: 'Active', checkedAt: '2 minutes ago',
    queue: { Queued: 3, Sent: 1842, Failed: 0 },
  },
  {
    id: 'upcl', code: 'UPCL', name: 'Uttarakhand Power Corporation',
    host: 'smtp.upcl.org', port: '465', encryption: 'TLS', auth: 'BASIC',
    status: 'Active', checkedAt: '4 minutes ago',
    queue: { Queued: 214, Sent: 908, Failed: 6 },
  },
  {
    id: 'bsphcl', code: 'BSPHCL', name: 'Bihar State Power Holding Company',
    host: 'smtp.bsphcl.co.in', port: '587', encryption: 'STARTTLS', auth: 'BASIC',
    status: 'Active', checkedAt: 'a minute ago',
    queue: { Queued: 512, Sent: 60, Failed: 448 },
  },
  {
    id: 're', code: 'RE', name: 'Royal Enfield',
    host: 'smtp.royalenfield.com', port: '465', encryption: 'TLS', auth: 'API_KEY',
    status: 'Active', checkedAt: '9 minutes ago',
    queue: { Queued: 0, Sent: 2604, Failed: 1 },
  },
  {
    id: 'bts', code: 'BTS', name: 'Bitchief Technology Services',
    host: 'smtp.bitchief.in', port: '587', encryption: '', auth: 'BASIC',
    status: 'Inactive', checkedAt: '31 minutes ago',
    queue: { Queued: 77, Sent: 0, Failed: 0 },
  },
]

/* The head says what is happening to the mail, not what the socket did: a
   binding that answers 220 and then rejects four messages in ten is failing,
   however healthy the handshake looked. `attention` is what the summary counts
   — a relay somebody switched off is a decision, not an incident, so it reads
   the way every other inactive record in the console reads and is not counted
   against the tenant. */
export const HEALTH_STATES = {
  ok: { id: 'ok', label: 'Healthy', tone: 'ok', attention: false },
  warn: { id: 'warn', label: 'Degraded', tone: 'warn', attention: true },
  bad: { id: 'bad', label: 'Failing', tone: 'bad', attention: true },
  off: { id: 'off', label: 'Inactive', tone: 'mut', attention: false },
}

/* The thresholds operations triages on. A binding rejecting a quarter of what
   it is handed is failing whatever it answered on the wire; one rejection in a
   hundred is worth a look; and a queue this deep means mail is arriving faster
   than the binding is clearing it. */
const FAIL_FAILING = 0.25
const FAIL_DEGRADED = 0.01
const BACKLOG_DEGRADED = 50

/* Counting is done here rather than in the seed so the tiles and the head
   figure are the same arithmetic, and so a client whose queue is edited cannot
   end up with a total that no longer adds up. */
export const queueCounts = (queue = {}) => {
  const Queued = Number(queue.Queued) || 0
  const Sent = Number(queue.Sent) || 0
  const Failed = Number(queue.Failed) || 0
  return { Queued, Sent, Failed, Total: Queued + Sent + Failed }
}

/* Read from the figures, never stored beside them: a seeded "degraded" flag
   disagrees with the tiles under it the first time either is touched, and the
   flag is what an operator would believe.

   `drivers` is why this returns an object rather than a label. Two independent
   thresholds raise the same amber pill, so the state alone does not say which
   figure tripped it — a binding rejecting six of eleven hundred is well inside
   tolerance and amber only because two hundred messages are sitting in its
   queue. A head showing that six, coloured, tells the operator the opposite of
   what the arithmetic said. So the keys that actually crossed a threshold come
   back with the state: the head colours those and leaves every other figure
   neutral, and the recheck toast names the same cause the head did. They are
   queue keys, so they index `queueCounts` directly. */
export const clientHealth = (c) => {
  const settled = (state) => ({ ...state, drivers: [] })
  if (!c) return settled(HEALTH_STATES.bad)
  if (c.status !== 'Active') return settled(HEALTH_STATES.off)
  // Nothing in the queue explains this one: there is no relay to blame it on.
  if (!c.host || !c.port) return settled(HEALTH_STATES.bad)
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
