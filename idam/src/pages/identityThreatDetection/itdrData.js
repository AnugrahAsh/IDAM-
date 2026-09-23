import { NOW_MS, stampText } from '../../lib/clock'

export const BASE = '/iam/itdr'

/* A stamp `mins` minutes before the platform clock — every time on this page is
   measured from the same instant as the rest of the console. */
const ago = (mins) => stampText(new Date(NOW_MS - mins * 60000))
const ahead = (mins) => stampText(new Date(NOW_MS + mins * 60000))

/* ---------------------------------------------------------------------------
   Tunable parameters.

   A rule carries only the parameters its detector reads. `unit` is what the
   operator types in; `short` is how the parameter reads as a chip on the
   register, where "window 2m" says more at a glance than "window 120".
   ------------------------------------------------------------------------- */
export const PARAM_META = {
  threshold: {
    label: 'Event threshold', short: 'threshold', unit: 'events', min: 1, max: 10000,
    hint: 'Matching events inside the detection window before the rule fires.',
  },
  window: {
    label: 'Detection window', short: 'window', unit: 'seconds', min: 10, max: 86400,
    hint: 'The rolling window the threshold is measured over.',
  },
  ipThreshold: {
    label: 'Source address threshold', short: 'IPs', unit: 'addresses', min: 2, max: 500,
    hint: 'Distinct source addresses presenting the same credentials inside the window.',
  },
  daysAfter: {
    label: 'Inactivity period', short: 'inactive', unit: 'days', min: 1, max: 3650,
    hint: 'Days without a sign-in after which any activity on the account raises the rule.',
  },
  speedKmh: {
    label: 'Travel speed limit', short: 'speed', unit: 'km/h', min: 100, max: 5000,
    hint: 'The speed implied by two consecutive sign-ins above which the travel is treated as impossible.',
  },
  denials: {
    label: 'Denied prompts', short: 'denials', unit: 'prompts', min: 1, max: 100,
    hint: 'Push prompts denied or left unanswered inside the window before the rule fires.',
  },
}

/* 120 → 2m, 1800 → 30m, 3600 → 1h. Seconds that do not divide evenly stay seconds. */
export const durationText = (sec) => {
  const s = Number(sec) || 0
  if (s >= 86400 && s % 86400 === 0) return `${s / 86400}d`
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600}h`
  if (s >= 60 && s % 60 === 0) return `${s / 60}m`
  return `${s}s`
}

/* The value a parameter chip shows: windows as durations, days with a "d". */
export const paramValueText = (key, value) => {
  if (key === 'window') return durationText(value)
  if (key === 'daysAfter') return `${value}d`
  if (key === 'speedKmh') return `${value} km/h`
  return String(value)
}

/* The three things a matching rule can do. The register shows them as icons;
   the configure drawer as switches. */
export const RESPONSES = [
  {
    id: 'alert', icon: 'bell', label: 'Raise alert', taken: 'Alert raised',
    on: 'Raises an alert', off: 'Raises no alert',
    body: 'Writes a record into the alert register when the rule matches, with the evidence that tripped it.',
  },
  {
    id: 'block', icon: 'ban', label: 'Automatic response', taken: 'IP blocked',
    on: 'Blocks the source IP', off: 'Does not block',
    body: 'Blocks the offending source IP automatically and adds it to the blocked IP list for 24 hours.',
  },
  {
    id: 'email', icon: 'mail', label: 'Email notification', taken: 'Administrators emailed',
    on: 'Emails the administrators', off: 'Sends no email',
    body: 'Sends the configured security administrators an email the moment the rule fires.',
  },
]

/* ---------------------------------------------------------------------------
   Detection rules.

   Predefined by the detection engine: an operator can switch a rule on or off,
   tune its thresholds and choose its responses, but cannot add a detector the
   engine does not implement. `code` is the engine's own identifier for the use
   case and is what the alert records point back at.
   ------------------------------------------------------------------------- */
export const DETECTION_RULES = [
  {
    id: 1, code: 'bruteForce', name: 'Brute Force Detection', category: 'Credential attacks',
    summary: 'Repeated failed sign-ins against one account from the same source address.',
    response: 'Blocks the source IP address generating the malicious authentication requests and raises a security alert.',
    severity: 'high', params: { threshold: 2, window: 120 },
    actions: { alert: true, block: true, email: true }, enabled: true, lastTriggered: ago(18), hits7d: 41,
  },
  {
    id: 2, code: 'credentialStuffing', name: 'Password Spraying Attack', category: 'Credential attacks',
    summary: 'Failed sign-ins spread across many accounts from one source inside the window.',
    response: 'Blocks the source address spreading failed sign-ins across the directory and raises an alert.',
    severity: 'medium', params: { threshold: 20, window: 1800 },
    actions: { alert: true, block: true, email: false }, enabled: true, lastTriggered: ago(96), hits7d: 12,
  },
  {
    id: 3, code: 'passwordSpraying', name: 'One password attempted across many accounts', category: 'Credential attacks',
    summary: 'The same password presented against many different accounts.',
    response: 'Blocks the source address trying one password against many accounts and raises an alert.',
    severity: 'medium', params: { threshold: 20, window: 600 },
    actions: { alert: true, block: true, email: false }, enabled: true, lastTriggered: ago(310), hits7d: 7,
  },
  {
    id: 4, code: 'disabledCredentials', name: 'Attempts to login using disabled accounts', category: 'Account misuse',
    summary: 'A sign-in attempted with the credentials of a disabled account.',
    response: 'Raises a high-severity alert and emails the security administrators — a disabled account should never authenticate.',
    severity: 'high', params: {},
    actions: { alert: true, block: true, email: true }, enabled: true, lastTriggered: ago(52), hits7d: 5,
  },
  {
    id: 5, code: 'dormantAccount', name: 'Dormant Account Activity', category: 'Account misuse',
    summary: 'Activity on an account with no sign-in for the inactivity period.',
    response: 'Raises an alert so the owner of a long-idle account confirms the activity is theirs.',
    severity: 'medium', params: { daysAfter: 15 },
    actions: { alert: true, block: false, email: false }, enabled: true, lastTriggered: ago(1440 + 200), hits7d: 3,
  },
  {
    id: 6, code: 'sharedCredentialUse', name: 'Shared Credential Use', category: 'Account misuse',
    summary: 'Multiple IP addresses using the same credentials within a short duration.',
    response: 'Raises an alert when one set of credentials is presented from several addresses at once.',
    severity: 'medium', params: { threshold: 5, window: 300, ipThreshold: 3 },
    actions: { alert: true, block: false, email: true }, enabled: true, lastTriggered: ago(230), hits7d: 4,
  },
  {
    id: 7, code: 'impossibleTravel', name: 'Impossible Travel', category: 'Anomalous sign-in',
    summary: 'Two sign-ins for one account from places farther apart than the time between them allows.',
    response: 'Raises an alert and emails the security administrators with both sign-in locations.',
    severity: 'high', params: { speedKmh: 900 },
    actions: { alert: true, block: false, email: true }, enabled: true, lastTriggered: ago(140), hits7d: 6,
  },
  {
    id: 8, code: 'mfaFatigue', name: 'MFA Fatigue Attack', category: 'Anomalous sign-in',
    summary: 'A burst of push prompts denied or ignored for one account.',
    response: 'Blocks the source address flooding the account with push prompts and raises an alert.',
    severity: 'high', params: { denials: 5, window: 600 },
    actions: { alert: true, block: true, email: true }, enabled: true, lastTriggered: ago(75), hits7d: 9,
  },
  {
    id: 9, code: 'anonymizerSignIn', name: 'Sign-in from an anonymizing network', category: 'Anomalous sign-in',
    summary: 'A sign-in from a known Tor exit node or commercial VPN range.',
    response: 'Blocks the anonymizing address and raises an alert.',
    severity: 'medium', params: {},
    actions: { alert: true, block: true, email: false }, enabled: true, lastTriggered: ago(480), hits7d: 11,
  },
  {
    id: 10, code: 'serviceAccountInteractive', name: 'Interactive sign-in by a service account', category: 'Account misuse',
    summary: 'A service account used for an interactive sign-in instead of its API flow.',
    response: 'Raises an alert and emails the application owner — service credentials are meant for machines.',
    severity: 'high', params: {},
    actions: { alert: true, block: false, email: true }, enabled: false, lastTriggered: null, hits7d: 0,
  },
  {
    id: 11, code: 'privilegeGrant', name: 'Privilege granted outside an approved request', category: 'Privilege',
    summary: 'A privileged role or group granted directly, with no approved access request behind it.',
    response: 'Raises a critical alert and emails the security administrators with the grant and who made it.',
    severity: 'critical', params: {},
    actions: { alert: true, block: false, email: true }, enabled: true, lastTriggered: ago(33), hits7d: 2,
  },
]

export const ruleById = (rules, id) => rules.find((r) => String(r.id) === String(id))

/* ---------------------------------------------------------------------------
   Alerts raised by the rules.
   ------------------------------------------------------------------------- */
export const ALERT_STATUSES = ['Open', 'Acknowledged', 'Resolved', 'False positive']
export const alertTone = (s) => ({ Open: 'bad', Acknowledged: 'warn', Resolved: 'ok', 'False positive': 'mut' }[s] || 'mut')

const A = (id, ruleId, severity, user, ip, location, evidence, mins, status, taken, extra = {}) => ({
  id: `ITDR-${id}`, ruleId, severity, user, ip, location, evidence, raised: ago(mins), status, taken, ...extra,
})

/* Identities are the directory's own (data/seed USERS), so an alert's user opens
   the same record the Users register shows. */
export const ITDR_ALERTS = [
  A(2081, 11, 'critical', 'NIKHIL_VERMA', '10.20.4.17', 'Mumbai, IN', 'Global Identity Administrator granted directly to NIKHIL_VERMA by the provisioning service account YUSUF_SINGH — no access request on file.', 33, 'Open', ['alert', 'email']),
  A(2080, 1, 'high', 'NEHA_MEHTA', '185.220.101.4', 'Frankfurt, DE', '14 failed sign-ins in 2m against NEHA_MEHTA.', 18, 'Open', ['alert', 'block', 'email']),
  A(2079, 8, 'high', 'ARJUN_BOSE', '103.152.36.40', 'Jakarta, ID', '7 push prompts denied in 6m — the eighth was approved.', 75, 'Open', ['alert', 'block', 'email']),
  A(2078, 4, 'high', 'SANA_GUPTA', '49.36.112.9', 'Pune, IN', 'Sign-in attempted with the password of a disabled account.', 52, 'Open', ['alert', 'block', 'email']),
  A(2077, 2, 'medium', null, '45.141.84.126', 'Bucharest, RO', '38 failed sign-ins across 27 accounts in 30m.', 96, 'Open', ['alert', 'block']),
  A(2076, 7, 'high', 'ZOYA_FERRER', '81.2.69.160', 'London, GB', 'Sign-in from London 41m after a sign-in from Bengaluru — an implied 11,200 km/h.', 140, 'Open', ['alert', 'email']),
  A(2075, 6, 'medium', 'TARA_RAO', '203.0.113.24', 'Dubai, AE', 'Service account TARA_RAO used from 4 addresses inside 5m.', 230, 'Open', ['alert', 'email']),
  A(2074, 3, 'medium', null, '91.240.118.172', 'Moscow, RU', 'One password tried against 23 accounts in 10m.', 310, 'Open', ['alert', 'block']),
  A(2073, 9, 'medium', 'VIKAS_MALHOTRA', '185.107.47.215', 'Amsterdam, NL', 'Sign-in from a known Tor exit node.', 480, 'Open', ['alert', 'block']),
  A(2072, 1, 'high', 'SAMEER_KHAN', '194.26.29.110', 'Kyiv, UA', '9 failed sign-ins in 2m against SAMEER_KHAN.', 640, 'Open', ['alert', 'block', 'email']),
  A(2071, 5, 'medium', 'MIRA_NOVAK', '10.40.2.88', 'Chennai, IN', 'First sign-in in 47 days (inactivity period 15 days).', 1640, 'Open', ['alert']),
  A(2070, 1, 'high', 'AARAV_MEHTA', '172.105.40.9', 'Singapore, SG', '6 failed sign-ins in 2m — the account owner confirmed a forgotten password.', 1900, 'Acknowledged', ['alert', 'block', 'email'], { assignee: 'Shubham Jain' }),
  A(2069, 8, 'high', 'DIYA_VERMA', '152.58.96.21', 'Bengaluru, IN', '5 push prompts left unanswered in 10m.', 2600, 'Acknowledged', ['alert', 'block', 'email'], { assignee: 'Shubham Jain' }),
  A(2068, 11, 'critical', 'RAVI_CHANDRA', '10.20.4.12', 'Mumbai, IN', 'Tenant administrator role granted to RAVI_CHANDRA outside change window CHG-4471.', 3400, 'Resolved', ['alert', 'email'], { assignee: 'Shubham Jain', resolution: 'Emergency grant under an approved break-glass ticket; request raised retrospectively.' }),
  A(2067, 7, 'high', 'KABIR_BHAT', '104.28.14.7', 'Toronto, CA', 'Sign-in from Toronto 2h after a sign-in from Mumbai — an implied 6,100 km/h.', 4100, 'False positive', ['alert', 'email'], { assignee: 'Shubham Jain', resolution: 'Corporate VPN egress in Toronto; the user never left Mumbai.' }),
  A(2066, 2, 'medium', null, '5.188.206.14', 'Saint Petersburg, RU', '26 failed sign-ins across 21 accounts in 30m.', 5200, 'Resolved', ['alert', 'block'], { assignee: 'Shubham Jain', resolution: 'Source blocked for 24 hours; no account reached the threshold.' }),
]

/* ---------------------------------------------------------------------------
   Blocked source addresses.

   An automatic block is raised by a rule's automatic response and lifts itself
   after 24 hours; a manual block lasts as long as the operator chose.
   ------------------------------------------------------------------------- */
export const BLOCK_DURATIONS = [
  { value: '60', label: '1 hour' },
  { value: '1440', label: '24 hours' },
  { value: '10080', label: '7 days' },
  { value: '43200', label: '30 days' },
  { value: 'permanent', label: 'Permanent' },
]

export const BLOCKED_IPS = [
  { id: 1, ip: '185.220.101.4', location: 'Frankfurt, DE', reason: 'Brute Force Detection', ruleId: 1, source: 'Automatic', by: 'Brute Force Detection', blockedAt: ago(18), expiresAt: ahead(1440 - 18), refused: 212 },
  { id: 2, ip: '103.152.36.40', location: 'Jakarta, ID', reason: 'MFA Fatigue Attack', ruleId: 8, source: 'Automatic', by: 'MFA Fatigue Attack', blockedAt: ago(75), expiresAt: ahead(1440 - 75), refused: 64 },
  { id: 3, ip: '45.141.84.0/24', location: 'Bucharest, RO', reason: 'Repeat source of password spraying across the directory', ruleId: null, source: 'Manual', by: 'Shubham Jain', blockedAt: ago(4200), expiresAt: null, refused: 1870 },
  { id: 4, ip: '5.188.206.14', location: 'Saint Petersburg, RU', reason: 'Password Spraying Attack', ruleId: 2, source: 'Automatic', by: 'Password Spraying Attack', blockedAt: ago(5200), expiresAt: ago(5200 - 1440), refused: 391 },
]

/* A block is in force until its expiry passes; a permanent block has none. */
export const isActiveBlock = (b) => !b.releasedAt && (!b.expiresAt || Date.parse(`${b.expiresAt.replace(' ', 'T')}Z`) > NOW_MS)
export const blockStatus = (b) => (b.releasedAt ? 'Released' : isActiveBlock(b) ? 'Active' : 'Expired')

/* An IPv4 address, optionally with a CIDR prefix. */
export const isIpOrCidr = (v) => {
  const m = String(v || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/)
  if (!m) return false
  const parts = m.slice(1, 5).map(Number)
  if (parts.some((p) => p > 255)) return false
  return m[5] === undefined || Number(m[5]) <= 32
}

export const stampAhead = ahead
export const stampAgo = ago
