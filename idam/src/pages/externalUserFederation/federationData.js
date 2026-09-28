import {
  PROVIDER_DEFAULTS, VENDOR_ATTR_KEYS, VENDOR_DEFAULTS, VENDORS, vendorLabel,
} from './federationSeed'

export { VENDORS, vendorLabel }

export const BASE = '/iam/externalUserFederation'

/* Every provider on this screen is an LDAP provider; Select Option names the
   vendor behind it. The card tag says which kind of provider it is, the Vendor
   row says whose server it is — the same two facts the client's list shows. */
export const PROVIDER_KIND = 'LDAP'

/* ---------------------------------------------------------------------------
   Option lists.
   ------------------------------------------------------------------------- */

export const TRUSTSTORE_SPI = ['Always', 'Only for ldaps', 'Never']

export const BIND_TYPES = [
  { value: 'simple', label: 'simple' },
  { value: 'none', label: 'none' },
]

export const EDIT_MODES = [
  { value: 'READ_ONLY', label: 'READ_ONLY' },
  { value: 'WRITABLE', label: 'WRITABLE' },
  { value: 'UNSYNCED', label: 'UNSYNCED' },
]

export const SEARCH_SCOPES = ['One Level', 'Subtree']

export const REFERRALS = [
  { value: 'ignore', label: 'ignore' },
  { value: 'follow', label: 'follow' },
]

export const CACHE_POLICIES = ['DEFAULT', 'EVICT_DAILY', 'EVICT_WEEKLY', 'MAX_LIFESPAN', 'NO_CACHE']

/* ---------------------------------------------------------------------------
   The six collapsible sections, as data.

   The form renders from this and so does the error routing: a save that fails
   validation has to open the section holding the rejected fields, and a
   hand-written list of which field sits where would drift from the markup the
   first time a field moved. Only fields that can be rejected are listed — the
   toggles cannot.

   `open` is the section's starting state, which the client's screens set per
   section rather than per screen: Connection and Searching carry everything
   that has to be answered before a provider can do anything, so they are what
   the form opens on.

   `size` is how many of the thirty-five fields the section holds and `required`
   is which of them the client marks with a star. Both are here rather than
   counted off the markup because a closed heading has to say what is behind it
   before the markup exists to be counted.
   ------------------------------------------------------------------------- */
export const SECTIONS = [
  {
    id: 'connection',
    title: 'Connection and Authentication Settings',
    icon: 'plug',
    open: true,
    size: 8,
    required: ['connectionUrl', 'bindType', 'bindDn', 'bindCredentials'],
    fields: ['connectionUrl', 'connectionTimeout', 'bindType', 'bindDn', 'bindCredentials'],
  },
  {
    id: 'searching',
    title: 'Searching and Updating',
    icon: 'search',
    open: true,
    size: 12,
    required: ['editMode', 'usersDn', 'usernameAttr', 'rdnAttr', 'uuidAttr', 'userObjectClasses'],
    fields: ['editMode', 'usersDn', 'usernameAttr', 'rdnAttr', 'uuidAttr', 'userObjectClasses', 'userLdapFilter', 'readTimeout'],
  },
  {
    id: 'sync',
    title: 'Synchronization Settings',
    icon: 'refresh',
    size: 6,
    required: [],
    fields: ['batchSize'],
  },
  { id: 'kerberos', title: 'Kerberos Integration', icon: 'key', size: 2, required: [], fields: [] },
  { id: 'cache', title: 'Cache Settings', icon: 'db', size: 1, required: [], fields: [] },
  { id: 'advanced', title: 'Advanced Settings', icon: 'sliders', size: 4, required: [], fields: [] },
]

/* The header pair sits above the sections and belongs to no section, so the
   two starred fields on it are named here rather than inside SECTIONS. */
export const HEADER_REQUIRED = ['name', 'vendor']

export const openSections = () => SECTIONS
  .filter((s) => s.open)
  .reduce((acc, s) => ({ ...acc, [s.id]: true }), {})

/* ---------------------------------------------------------------------------
   How much of the form is left.

   Six sections, four of them closed, is a form that can hide its own remaining
   work behind a heading. This counts the starred fields that are still empty,
   so the bar at the foot and the meta on each heading can say so before the
   operator presses Submit and is told by a rejection instead.

   It counts emptiness and nothing else: a malformed URL is a rejection, not an
   unanswered question, and `providerErrors` remains the only thing that decides
   whether a provider can be saved.
   ------------------------------------------------------------------------- */
const unanswered = (draft, key, credentialStored) => {
  if (!shows(draft, key)) return false
  /* On Edit the stored credential never comes back to the browser, so an empty
     box means "keep it" rather than "not answered yet". */
  if (key === 'bindCredentials' && credentialStored) return false
  return !String(draft[key] ?? '').trim()
}

export const requiredEmptyIn = (draft, keys, credentialStored = false) =>
  keys.filter((k) => unanswered(draft, k, credentialStored)).length

export function requiredProgress(draft, credentialStored = false) {
  const keys = [...HEADER_REQUIRED, ...SECTIONS.flatMap((s) => s.required)]
  const asked = keys.filter((k) => shows(draft, k))
  const left = asked.filter((k) => unanswered(draft, k, credentialStored)).length
  return { total: asked.length, left, done: asked.length - left }
}

/* ---------------------------------------------------------------------------
   Field help.

   The client's screens put a ? beside every label and the copy below is theirs,
   word for word. This console already has a place for it — Field's `hint` — so
   that is what carries it: under the control, read by everyone, rather than
   behind a hover only a mouse can reach.
   ------------------------------------------------------------------------- */
export const HELP = {
  name: 'Name used to identify this provider in the console.',
  vendor: 'Vendor of the directory being federated. The searching and updating defaults change with the vendor.',

  connectionUrl: 'Connection URL to your LDAP server. For example ldap://10.0.0.10:389',
  startTls: 'Encrypts the connection to the LDAP server using STARTTLS, which disables connection pooling.',
  truststoreSpi: 'Specifies whether the LDAP connection uses the truststore SPI with the truststore configured in the server.',
  connectionPooling: 'Determines if the LDAP connections are pooled and reused.',
  connectionTimeout: 'LDAP connection timeout in milliseconds.',
  bindType: 'The type of the authentication method used during the LDAP bind operation.',
  bindDn: 'Distinguished Name of the LDAP admin, which will be used to access the LDAP server.',
  bindCredentials: 'Password of the LDAP admin used for the bind.',

  editMode: 'READ_ONLY is a read only LDAP store. WRITABLE means data will be synced back to LDAP on demand. UNSYNCED means user data will be imported but not synced back to LDAP.',
  usersDn: 'Full DN of the LDAP tree where your users are located.',
  relativeCreationDn: 'The DN relative to the Users DN where new users are created.',
  usernameAttr: 'Name of the LDAP attribute which is mapped as the username. For Active Directory it is usually cn or sAMAccountName.',
  rdnAttr: 'Name of the LDAP attribute which is used as the RDN of a typical user DN.',
  uuidAttr: 'Name of the LDAP attribute which is used as a unique object identifier for objects in LDAP.',
  userObjectClasses: 'All values of the LDAP objectClass attribute for users, divided by commas.',
  userLdapFilter: 'Additional LDAP filter for filtering the searched users. Leave it empty if no additional filter is required.',
  searchScope: 'For one level, the search applies only to users in the DN specified. For subtree, it applies to the whole subtree.',
  readTimeout: 'LDAP read timeout in milliseconds.',
  pagination: 'Whether the LDAP server supports pagination.',
  referral: 'Specifies if LDAP referrals are followed or ignored.',

  importUsers: 'If true, the users are imported into the IDAM user database.',
  syncRegistrations: 'Should newly created users be created within the LDAP store?',
  batchSize: 'Count of LDAP users to be imported from LDAP to IDAM within a single transaction.',
  removeInvalid: 'If true, during the search the users that are no longer valid in LDAP are removed.',
  periodicFullSync: 'Whether or not a periodic full synchronization of LDAP users to IDAM should be enabled.',
  periodicChangedSync: 'Whether or not a periodic synchronization of changed or newly created LDAP users should be enabled.',

  allowKerberos: 'Enables Kerberos/SPNEGO authentication in the realm with users data provisioned from LDAP.',
  kerberosPasswordAuth: 'Use Kerberos login module to authenticate the username / password against the Kerberos server instead of authenticating against the LDAP server.',

  cachePolicy: 'Cache policy for this storage provider. DEFAULT uses the global cache settings of the realm, NO_CACHE disables the cache for this provider.',

  ldapv3PasswordModify: 'Use the LDAPv3 password modify extended operation to update the password instead of writing the password attribute directly.',
  validatePasswordPolicy: 'Should the password be validated against the realm password policy before it is updated?',
  trustEmail: 'If enabled, the email provided by this LDAP server is not verified even if the verification is enabled for the realm.',
  connectionTrace: 'Write additional LDAP connection trace to the server logs. Use it for debugging only.',
}

/* The client's own placeholders, kept beside their help text so the two halves
   of the same contract are read and corrected together. A placeholder is an
   example, never a value — `shows`/`providerErrors` treat every field carrying
   one as empty until somebody types. */
export const PLACEHOLDER = {
  connectionUrl: 'ldap://10.0.0.00:389',
  connectionTimeout: 'in milliseconds',
  bindDn: 'cn=Manager,dc=example,dc=com',
  editMode: 'Select Edit Mode',
  usersDn: 'ou=users,dc=example,dc=com',
  userObjectClasses: 'person, organizationalPerson, user',
  userLdapFilter: '(objectClass=person)',
  readTimeout: 'in milliseconds',
  referral: 'Select Referral',
}

/* ---------------------------------------------------------------------------
   Select Option drives four fields.

   The client's note under Searching and Updating says the attribute defaults
   are the ones for vendor Other and that they change with the vendor. They do —
   but only where the outgoing vendor's default is still what is in the box.
   A value somebody typed is an answer about a real directory, and losing it to
   a dropdown is how a working provider stops resolving anyone.
   ------------------------------------------------------------------------- */
const vendorAttrs = (vendor) => VENDOR_DEFAULTS[vendor] || VENDOR_DEFAULTS.other

export function vendorPatch(draft, vendor) {
  const from = vendorAttrs(draft.vendor)
  const to = vendorAttrs(vendor)
  const patch = { vendor }
  VENDOR_ATTR_KEYS.forEach((key) => {
    const current = String(draft[key] || '').trim()
    if (!current || current === from[key]) patch[key] = to[key]
  })
  return patch
}

/* ---------------------------------------------------------------------------
   The demo directory fabric.

   What the two test buttons are tested against. Every verdict the form reports
   is read off this: a host that is not here does not answer, and a bind DN that
   is not in `binds` is rejected the way a directory rejects an account it does
   not hold. The seeded provider statuses agree with it by construction — the
   provider seeded as Failed carries a bind DN this fabric does not have, so the
   sidebar badge and the form report the same failure for the same reason.
   ------------------------------------------------------------------------- */
const DIRECTORIES = [
  {
    host: '10.0.0.231',
    port: 389,
    startTls: true,
    baseDn: 'dc=tanflow,dc=com',
    binds: ['cn=manager,dc=tanflow,dc=com'],
  },
  {
    host: 'dc01.corp.tanflow.com',
    port: 636,
    startTls: false,
    baseDn: 'dc=corp,dc=tanflow,dc=com',
    binds: ['cn=svc_idam,ou=service accounts,dc=corp,dc=tanflow,dc=com'],
  },
  {
    host: 'ds-partners.tanflow.io',
    port: 389,
    startTls: true,
    baseDn: 'dc=partners,dc=tanflow,dc=io',
    /* svc_partner is deliberately absent: the account was removed, which is why
       the partner provider is seeded Failed and switched off. */
    binds: ['cn=directory manager,dc=partners,dc=tanflow,dc=io'],
  },
]

const URL_RE = /^(ldaps?):\/\/([A-Za-z0-9._-]+)(?::(\d{1,5}))?\/?$/i

/* A stable stand-in for a round trip. Derived from the host, so the same server
   reports the same latency every time — a figure that changes on every press is
   noise, and this screen has no real clock to read one off. */
const latency = (seed, floor, spread) => {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000
  return floor + (h % spread)
}

const normDn = (dn) => String(dn || '')
  .split(',')
  .map((p) => p.trim().toLowerCase().replace(/\s*=\s*/, '='))
  .filter(Boolean)
  .join(',')

const underDn = (dn, base) => {
  const d = normDn(dn)
  const b = normDn(base)
  return !!d && !!b && (d === b || d.endsWith(`,${b}`))
}

export const parseUrl = (value) => {
  const m = URL_RE.exec(String(value || '').trim())
  if (!m) return null
  const scheme = m[1].toLowerCase()
  return { scheme, host: m[2].toLowerCase(), port: Number(m[3] || (scheme === 'ldaps' ? 636 : 389)) }
}

/* What each test needs before it has anything to say. A blank form offers them
   greyed out, as the client's screens do: a verdict on a server nobody has
   named would be a failure the operator caused by pressing the button, dressed
   up as a fact about their directory. Both screens ask these, so there is one
   answer rather than two that drift. */
export const canTestConnection = (d) => !!String(d.connectionUrl || '').trim()

export const canTestAuthentication = (d) => canTestConnection(d) && (
  d.bindType === 'none'
  || (!!String(d.bindDn || '').trim() && !!String(d.bindCredentials || '').trim())
)

const fail = (text, steps) => ({ ok: false, summary: text, steps: [...steps, { tone: 'bad', text }] })

/**
 * Reachability, transport and the server's own answer — everything short of
 * authenticating. Returns the shape the SMTP connection test on Email
 * Management renders: a line per step, and a summary for the toast.
 */
export function testConnection(d) {
  const steps = []
  const url = parseUrl(d.connectionUrl)
  if (!url) {
    return fail('Connection URL is not an LDAP URL. Expected ldap://host:389 or ldaps://host:636.', steps)
  }

  const timeout = String(d.connectionTimeout || '').trim()
  if (timeout && !/^\d+$/.test(timeout)) {
    return fail('Connection timeout must be a whole number of milliseconds.', steps)
  }

  steps.push({ tone: 'dim', text: `connect ${url.host}:${url.port}${timeout ? ` · timeout ${timeout}ms` : ''}` })

  const dir = DIRECTORIES.find((s) => s.host === url.host)
  if (!dir) return fail(`No route to ${url.host} — nothing answered on port ${url.port}.`, steps)
  if (dir.port !== url.port) return fail(`${url.host} is listening on ${dir.port}, not ${url.port}.`, steps)

  const ms = latency(url.host, 18, 90)
  steps.push({ tone: 'ok', text: `socket open · ${ms}ms` })

  if (url.scheme === 'ldaps') {
    if (d.startTls) {
      return fail('StartTLS cannot be negotiated on an ldaps:// URL — that connection is encrypted already.', steps)
    }
    steps.push({ tone: 'ok', text: 'TLS negotiated on connect · TLS_AES_256_GCM_SHA384' })
  } else if (d.startTls) {
    if (!dir.startTls) {
      return fail(`${url.host} did not offer the StartTLS extended operation (1.3.6.1.4.1.1466.20037).`, steps)
    }
    steps.push({ tone: 'ok', text: 'StartTLS accepted · TLS_AES_128_GCM_SHA256' })
  } else {
    steps.push({ tone: 'warn', text: 'no transport security — a bind would cross the network in the clear' })
  }

  steps.push({
    tone: d.truststoreSpi === 'Never' ? 'warn' : 'dim',
    text: d.truststoreSpi === 'Never'
      ? 'certificate not verified — Use Truststore SPI is set to Never'
      : `certificate verified against the platform truststore (${d.truststoreSpi})`,
  })
  steps.push({ tone: 'dim', text: `rootDSE read · naming context ${dir.baseDn}` })

  const summary = `${url.host}:${url.port} answered in ${ms}ms`
  steps.push({ tone: 'ok', text: `connection successful · ${summary}` })
  return { ok: true, summary, steps }
}

/**
 * The bind itself. It runs the connection first, because an authentication
 * verdict on a server that never answered would be a lie about which of the two
 * is broken.
 */
export function testAuthentication(d) {
  const conn = testConnection(d)
  if (!conn.ok) return conn

  const steps = [...conn.steps]
  const url = parseUrl(d.connectionUrl)
  const dir = DIRECTORIES.find((s) => s.host === url.host)

  if (d.bindType === 'none') {
    return {
      ok: true,
      summary: 'Anonymous bind accepted.',
      steps: [...steps, { tone: 'ok', text: 'anonymous bind accepted — no credentials were sent' }],
    }
  }

  const dn = String(d.bindDn || '').trim()
  if (!dn) return fail('Bind DN is required for a simple bind.', steps)
  if (!String(d.bindCredentials || '').trim()) {
    return fail('Retype the bind credentials before testing — the stored one is never sent back to the browser.', steps)
  }

  steps.push({ tone: 'dim', text: `simple bind as ${dn}` })

  if (!underDn(dn, dir.baseDn)) {
    return fail(`Invalid credentials (LDAP result 49) — ${dn} is not under ${dir.baseDn}.`, steps)
  }
  if (!dir.binds.includes(normDn(dn))) {
    return fail(`Invalid credentials (LDAP result 49) — ${dir.baseDn} holds no entry for ${dn}.`, steps)
  }

  const ms = latency(dn, 9, 40)
  steps.push({ tone: 'ok', text: `bind accepted · ${ms}ms` })
  /* Worth saying on a successful bind, because it is the next thing that will
     go wrong: the credentials are right and every search still returns nothing. */
  if (d.usersDn && !underDn(d.usersDn, dir.baseDn)) {
    steps.push({ tone: 'warn', text: `Users DN ${d.usersDn} is outside ${dir.baseDn} — searches will return nothing` })
  }
  return { ok: true, summary: `bound as ${dn} in ${ms}ms`, steps }
}

/* ---------------------------------------------------------------------------
   Record and draft.
   ------------------------------------------------------------------------- */

/* The credential is not part of the record, so the draft carries it separately:
   empty means "leave the stored one alone", and anything typed replaces it.
   PROVIDER_DEFAULTS underneath fills keys a record predates; it never overrides
   one, so a saved provider always renders what was saved for it. */
export const draftOf = (record) => ({ ...PROVIDER_DEFAULTS, ...record, bindCredentials: '' })

export const blankDraft = () => ({ ...PROVIDER_DEFAULTS, name: '', vendor: 'other', bindCredentials: '' })

export const recordOf = (draft, id) => {
  const { bindCredentials, ...rest } = draft
  return {
    ...PROVIDER_DEFAULTS,
    ...rest,
    id,
    name: String(draft.name || '').trim(),
    credentialStored: !!draft.credentialStored || !!String(bindCredentials || '').trim(),
    rev: 0,
  }
}

/* ---------------------------------------------------------------------------
   Validation.

   `shows` is the single answer to "is this field on screen", and the form and
   the validator both ask it — a field hidden behind a switch that is off must
   not be able to block a save whose reason the operator cannot see.
   ------------------------------------------------------------------------- */
export const shows = (d, key) => {
  /* Only a simple bind sends a DN and a credential. The client's screens show
     `simple`, where both are marked required and both are required here. */
  if (key === 'bindDn' || key === 'bindCredentials') return d.bindType !== 'none'
  return true
}

const req = (d, key, label, errors) => {
  if (shows(d, key) && !String(d[key] || '').trim()) errors[key] = `${label} is required.`
}

const whole = (d, key, label, errors, min = 0) => {
  const raw = String(d[key] || '').trim()
  if (!shows(d, key) || !raw || errors[key]) return
  if (!/^\d+$/.test(raw)) errors[key] = `${label} must be a whole number.`
  else if (Number(raw) < min) errors[key] = `${label} must be ${min} or more.`
}

/* The header pair. Split out because the name is the one field whose rejection
   depends on the other providers rather than on itself. */
function nameErrors(draft, rows = [], selfId = null) {
  const errors = {}
  req(draft, 'name', 'UI display name', errors)
  req(draft, 'vendor', 'Select Option', errors)
  const name = String(draft.name || '').trim().toLowerCase()
  if (name && rows.some((r) => String(r.id) !== String(selfId) && String(r.name).toLowerCase() === name)) {
    errors.name = 'Another provider already uses this name.'
  }
  return errors
}

/* The eleven the client marks required, plus the shape checks the console can
   make without asking the directory. Both screens run this: Add and Edit save
   the same provider, so they cannot disagree about what a valid one is. */
export function providerErrors(draft, rows = [], selfId = null) {
  const errors = nameErrors(draft, rows, selfId)

  req(draft, 'connectionUrl', 'Connection URL', errors)
  if (!errors.connectionUrl && !parseUrl(draft.connectionUrl)) {
    errors.connectionUrl = 'Expected ldap://host:389 or ldaps://host:636.'
  }
  whole(draft, 'connectionTimeout', 'Connection timeout', errors)
  req(draft, 'bindType', 'Bind type', errors)
  req(draft, 'bindDn', 'Bind DN', errors)
  if (shows(draft, 'bindCredentials') && !draft.credentialStored && !String(draft.bindCredentials || '').trim()) {
    errors.bindCredentials = 'Bind credentials are required.'
  }

  req(draft, 'editMode', 'Edit mode', errors)
  req(draft, 'usersDn', 'Users DN', errors)
  req(draft, 'usernameAttr', 'Username LDAP attribute', errors)
  req(draft, 'rdnAttr', 'RDN LDAP attribute', errors)
  req(draft, 'uuidAttr', 'UUID LDAP attribute', errors)
  req(draft, 'userObjectClasses', 'User object classes', errors)
  const filter = String(draft.userLdapFilter || '').trim()
  if (filter && !(filter.startsWith('(') && filter.endsWith(')'))) {
    errors.userLdapFilter = 'An LDAP filter must be wrapped in parentheses.'
  }
  whole(draft, 'readTimeout', 'Read timeout', errors)

  whole(draft, 'batchSize', 'Batch size', errors, 1)

  return Object.keys(errors).length ? errors : null
}

/* Which sections hold a rejected field, so a failed save can open them rather
   than leave the operator hunting behind six closed headings. */
export const sectionsWithErrors = (errors) => SECTIONS
  .filter((s) => s.fields.some((f) => errors[f]))
  .map((s) => s.id)
