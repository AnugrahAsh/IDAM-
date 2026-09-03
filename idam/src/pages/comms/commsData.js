import { USERS, EMAIL_TEMPLATES, CONSENTS, USEFUL_LINKS } from '../../data/seed'
import { NOW_MS } from '../../lib/clock'

const CLOCK_HOUR = new Date(NOW_MS).getUTCHours()
const pad = (v) => String(v).padStart(2, '0')

/**
 * A stamp on the platform clock's timeline.
 *
 * `n` is whole days back from the clock — negative for something still
 * scheduled — and `h` is the hour of that day. An hour that has not arrived yet
 * lands on the day before, because a message stamped after "now" reads as one
 * sent in the future. Minutes are taken from the absolute distance so a
 * scheduled row cannot render a negative minute.
 */
export const stamp = (n, h = 9) => {
  const hour = ((h % 24) + 24) % 24
  const back = n + (n >= 0 && hour > CLOCK_HOUR ? 1 : 0)
  const d = new Date(NOW_MS - back * 86400000)
  return `${d.toISOString().slice(0, 10)} ${pad(hour)}:${pad(Math.abs(n * 11) % 60)}`
}

export const PLACEHOLDERS = [
  { token: '{{firstName}}', desc: 'Given name of the recipient' },
  { token: '{{lastName}}', desc: 'Surname of the recipient' },
  { token: '{{username}}', desc: 'Directory login identifier' },
  { token: '{{email}}', desc: 'Primary email address' },
  { token: '{{organization}}', desc: 'Organization the identity belongs to' },
  { token: '{{actionUrl}}', desc: 'Single-use link for the action' },
  { token: '{{expiryHours}}', desc: 'Hours until the link expires' },
  { token: '{{supportEmail}}', desc: 'Tenant support mailbox' },
  { token: '{{tenantName}}', desc: 'Display name of the tenant' },
]

/* Every event a template may bind to. The seeded templates fire the second
   half of this list, so a template opened for edit always finds its own event
   in the select rather than silently falling back to the first entry. */
export const EMAIL_EVENTS = [
  'user.created', 'password.set', 'password.reset', 'password.expiring',
  'mfa.reset', 'mfa.enrolled', 'user.locked', 'user.unlocked',
  'account.recovery', 'smtp.test', 'consent.initiated',
  'recert.auditor', 'recert.manager', 'recert.user', 'recert.reminder',
  'request.approved', 'request.rejected',
]

const TEMPLATE_META = {
  Welcome: ['Sent once when a new identity is provisioned, carrying the enrollment link.',
    'Your {{tenantName}} account is ready. Use the button below to set a password and enrol a second factor. The link expires in {{expiryHours}} hours.'],
  'Set password': ['Delivers the single-use credential link when an identity first sets a password.',
    'An account was created for {{username}}. Choose a password to finish setting it up.'],
  'Reset password': ['Delivers the single-use credential link after a reset is requested.',
    'A password reset was requested for {{username}}. Follow the link below to choose a new one. If you did not ask for this, no action is needed.'],
  'Account recovery': ['Sent when an identity starts the account recovery flow.',
    'We received a request to recover access to {{username}}. Confirm it was you, and you will be able to sign in again.'],
  'Test SMTP configuration': ['Sent by the Test connection action on the email configuration screen.',
    'This is a test message from {{tenantName}}. If you are reading it, the SMTP configuration works and the platform can send mail.'],
  'Auditor recertification': ['Tells an auditor that a campaign is ready for their independent sign-off.',
    'An access review campaign has completed its review stage and is ready for audit sign-off. Nothing is revoked until you confirm.'],
  'Manager recertification': ['Asks a line manager to review the access their reports hold.',
    'You have {{itemCount}} access items to review for your team. Undecided items are revoked by default when the campaign closes.'],
  'User recertification': ['Asks an identity to confirm the access they still need.',
    'Please confirm which of your access rights you still need. Anything you do not confirm is revoked when the review closes.'],
  'Recertification reminder': ['Nudges reviewers whose certification items are still undecided.',
    'You have access review items awaiting a decision. The campaign closes shortly and undecided items are revoked by default.'],
  'Consent initiation': ['Tells an identity that a notice is waiting for their acceptance.',
    'A notice needs your acceptance before you can continue using {{tenantName}}. It takes less than a minute to read.'],
  'MFA reset': ['Confirms that every registered factor has been removed.',
    'Every multi-factor method registered to {{username}} has been removed. You will be asked to enrol again at your next sign-in.'],
  'Account locked': ['Notifies the identity that repeated failures locked the account.',
    'Your account {{username}} has been locked after repeated failed sign-in attempts. Contact {{supportEmail}} to regain access.'],
}

/* Bodies are HTML because that is what the platform actually sends: the editor
   shows the source and the preview renders it, so an author can see both. */
const templateHtml = (name) => {
  const [, lead] = TEMPLATE_META[name] || ['', 'A notice from {{tenantName}}.']
  return [
    '<h2>{{tenantName}}</h2>',
    '<p>Hello {{firstName}},</p>',
    `<p>${lead}</p>`,
    '<p><a class="btn" href="{{actionUrl}}">Continue</a></p>',
    '<p class="muted">If the button does not work, paste this address into your browser:<br>{{actionUrl}}</p>',
    '<hr>',
    '<p class="muted">If you did not expect this message, contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>',
    '<p class="muted">The {{tenantName}} identity team</p>',
  ].join('\n')
}

/* A template code is the identifier the platform sends against, so it is
   derived from the name rather than invented separately — two templates with
   the same name would collide in the API the same way they collide here. */
const templateCode = (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_email`

export const TEMPLATES = EMAIL_TEMPLATES.map((t, i) => ({
  ...t,
  code: templateCode(t.name),
  // A template is bound to the provider that carries it, the same way an SMS
  // template is: most transactional mail leaves through the primary relay, and
  // the two API senders carry the rest.
  provider: i % 4 === 3 ? 'SES_API' : i % 5 === 2 ? 'GRAPH_MAIL' : 'SMTP_PRIMARY',
  description: (TEMPLATE_META[t.name] || [])[0] || 'Transactional notice issued by the platform.',
  sender: 'no-reply@tanflow.com',
  replyTo: 'support@tanflow.com',
  enabled: t.status === 'Active',
  body: templateHtml(t.name),
}))

export const OUTBOX = Array.from({ length: 26 }, (_, i) => {
  const u = USERS[(i * 5) % USERS.length]
  const t = TEMPLATES[i % TEMPLATES.length]
  const state = i % 7 === 3 ? 'Failed' : i % 4 === 0 ? 'Queued' : 'Sent'
  return {
    id: i + 1,
    template: t.name,
    templateId: t.id,
    user: `${u.firstName} ${u.lastName}`,
    username: u.username,
    email: u.email,
    subject: t.subject,
    sent: state === 'Queued' ? '' : stamp(Math.floor(i / 4), 20 - (i % 16)),
    status: state,
    attempts: state === 'Failed' ? 3 : 1,
    gateway: state === 'Failed' ? '550 mailbox unavailable' : state === 'Queued' ? 'awaiting dispatch' : '250 OK',
  }
})

// Delivery-side fields (latency, gateway error) sit on the message rather than
// on a separate log: the SMS tab is the place an operator asks "what happened to
// this message", and splitting the answer across two records helps nobody.
const SMS_ERRORS = ['DND registry rejection', 'Handset unreachable', 'Invalid destination number', 'Gateway timeout', 'Insufficient balance']

/* The rendered text travels on the message, not on the template. A template is
   an API binding now — endpoint, headers, payload shape — so it no longer holds
   the words a recipient read, and the delivery detail has to keep its own copy. */
const SMS_BODIES = {
  'OTP verification': '{{code}} is your Tanflow verification code. Valid for {{expiryMinutes}} minutes. Do not share it.',
  'MFA enrollment': 'A new authentication factor was registered on your Tanflow account. If this was not you, contact {{supportEmail}}.',
  'Password reset': 'A password reset was requested for {{username}}. Use {{actionUrl}} within {{expiryHours}} hours.',
  'Access approved': 'Your request {{requestId}} was approved. Access is active from {{startDate}}.',
  'Account locked': 'Your Tanflow account {{username}} has been locked after repeated failed sign-ins.',
}

export const SMS_QUEUE = Array.from({ length: 22 }, (_, i) => {
  const u = USERS[(i * 7) % USERS.length]
  const names = ['OTP verification', 'MFA enrollment', 'Password reset', 'Access approved', 'Account locked']
  const template = names[i % names.length]
  const state = i % 8 === 5 ? 'Failed' : i % 5 === 0 ? 'Queued' : 'Sent'
  return {
    id: i + 1,
    template,
    body: SMS_BODIES[template],
    user: `${u.firstName} ${u.lastName}`,
    username: u.username,
    phone: u.mobileNo,
    sent: state === 'Queued' ? '' : stamp(Math.floor(i / 5), 19 - (i % 14)),
    status: state,
    provider: ['BESCOM1', 'BTS', 'RE'][i % 3],
    segments: 1 + (i % 2),
    // Queued messages have not been handed to a gateway, so they have no
    // latency to report — 0 here means "not measured", never "instant".
    latencyMs: state === 'Queued' ? 0 : 240 + ((i * 137) % 1900),
    error: state === 'Failed' ? SMS_ERRORS[i % SMS_ERRORS.length] : '',
    gateway: state === 'Failed' ? SMS_ERRORS[i % SMS_ERRORS.length] : state === 'Queued' ? 'awaiting dispatch' : 'DELIVRD',
  }
})

/**
 * A provider is the runtime specification of one carrier binding: which engine
 * builds the request, how the body is serialised, how it is authenticated,
 * whether the payload is encrypted, and how a delivered message is told apart
 * from a rejected one. Every credential is an environment-variable reference —
 * `authEnvRef`, `encryptionKeyRef` — because the key itself is resolved from
 * `process.env` at send time and is never held in the record.
 */
export const SMS_PROVIDERS = [
  {
    id: 1, code: 'BESCOM1', name: 'BESCOM HMAC Gateway', type: 'STANDARD',
    serializer: 'application/x-www-form-urlencoded', method: 'POST',
    auth: 'HMAC_SHA512', authEnvRef: 'BESCOM1_HMAC_SECRET',
    authSignedFields: 'username,password,mobileNumber,message',
    encryption: '', encryptionKeyRef: '',
    responseCheck: 'BODY_STARTS_WITH', responseValue: 'SUCCESS', responsePath: '',
    successCodes: '200,202', messageIdField: 'msgId',
    timeout: 30000, retries: 1, status: 'Active',
  },
  {
    id: 2, code: 'BESCOM', name: 'BESCOM JSON Gateway', type: 'GENERIC_JSON',
    serializer: 'application/json', method: 'POST',
    auth: 'NONE', authEnvRef: '', authSignedFields: '',
    encryption: '', encryptionKeyRef: '',
    responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
    successCodes: '200,202', messageIdField: '',
    timeout: 30000, retries: 0, status: 'Active',
  },
  {
    id: 3, code: 'UPCL', name: 'UPCL Encrypted Gateway', type: 'ENCRYPTED_PAYLOAD',
    serializer: 'text/plain', method: 'POST',
    auth: 'NONE', authEnvRef: '', authSignedFields: '',
    encryption: 'AES-256-CBC', encryptionKeyRef: 'UPCL_AES_KEY',
    responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
    successCodes: '200,202', messageIdField: '',
    timeout: 30000, retries: 0, status: 'Active',
  },
  {
    id: 4, code: 'BTS', name: 'Bitchief Technology Services', type: 'GENERIC_JSON',
    serializer: 'application/json', method: 'POST',
    auth: 'NONE', authEnvRef: '', authSignedFields: '',
    encryption: '', encryptionKeyRef: '',
    responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
    successCodes: '200,202', messageIdField: 'messageId',
    timeout: 30000, retries: 0, status: 'Active',
  },
  {
    id: 5, code: 'BSPHCL', name: 'BIHAR', type: 'GENERIC_JSON',
    serializer: 'application/json', method: 'POST',
    auth: 'NONE', authEnvRef: '', authSignedFields: '',
    encryption: '', encryptionKeyRef: '',
    responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
    successCodes: '200,202', messageIdField: '',
    timeout: 30000, retries: 0, status: 'Inactive',
  },
  {
    id: 6, code: 'RE', name: 'Royal Enfield', type: 'GENERIC_JSON',
    serializer: 'application/json', method: 'POST',
    auth: 'OAUTH_TOKEN', authEnvRef: 'RE_OAUTH_CLIENT_SECRET',
    authTokenUrl: 'https://sms.royalenfield.com/oauth2/token', authClientId: 'tanflow-idam',
    authSignedFields: '',
    encryption: '', encryptionKeyRef: '',
    responseCheck: 'HTTP_STATUS', responseValue: '', responsePath: '',
    successCodes: '200,202', messageIdField: 'id',
    timeout: 30000, retries: 0, status: 'Active',
  },
]

/* A template binds one platform event to one provider's endpoint. The same
   code appears once per provider, which is why the register is filtered by
   provider rather than assuming codes are unique. */
export const SMS_TEMPLATES = [
  { id: 1, code: 'otp_sms', name: 'OTP SMS', provider: 'BESCOM1', apiUrl: 'https://sms.bescom.co.in/api/v2/send', method: 'POST', headers: '{\n  "Content-Type": "application/x-www-form-urlencoded"\n}', payload: '{\n  "username": "{{username}}",\n  "mobileNumber": "{{mobileNumber}}",\n  "message": "{{message}}",\n  "key": ""\n}', status: 'Active', updated: stamp(4) },
  { id: 2, code: 'resetPassword_sms', name: 'Reset Password SMS', provider: 'BESCOM1', apiUrl: 'https://sms.bescom.co.in/api/v2/send', method: 'POST', headers: '{\n  "Content-Type": "application/x-www-form-urlencoded"\n}', payload: '{\n  "username": "{{username}}",\n  "mobileNumber": "{{mobileNumber}}",\n  "message": "{{message}}",\n  "key": ""\n}', status: 'Active', updated: stamp(11) },
  { id: 3, code: 'otp_sms', name: 'OTP SMS', provider: 'UPCL', apiUrl: 'https://msgapi.upcl.org/secure/v1/dispatch', method: 'POST', headers: '{\n  "Content-Type": "application/json"\n}', payload: '{\n  "to": "{{mobileNumber}}",\n  "message": "{{message}}"\n}', status: 'Active', updated: stamp(18) },
  { id: 4, code: 'otp_sms', name: 'OTP SMS', provider: 'BTS', apiUrl: 'https://api.bitchief.in/sms/v1/messages', method: 'POST', headers: '{\n  "Content-Type": "application/json"\n}', payload: '{\n  "to": "{{mobileNumber}}",\n  "message": "{{message}}"\n}', status: 'Active', updated: stamp(26) },
  { id: 5, code: 'setPassword_sms', name: 'Set Password SMS', provider: 'RE', apiUrl: 'https://sms.royalenfield.com/v1/messages', method: 'POST', headers: '{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer {{token}}"\n}', payload: '{\n  "to": "{{mobileNumber}}",\n  "message": "{{message}}"\n}', status: 'Active', updated: stamp(33) },
  { id: 6, code: 'otp_sms', name: 'OTP SMS', provider: 'BSPHCL', apiUrl: 'https://sms.bsphcl.co.in/api/send', method: 'POST', headers: '{\n  "Content-Type": "application/json"\n}', payload: '{\n  "to": "{{mobileNumber}}",\n  "message": "{{message}}"\n}', status: 'Inactive', updated: stamp(44) },
]

/* A client is the tenant whose traffic a provider carries. */
export const SMS_CLIENTS = [
  { id: 1, code: 'BESCOM', name: 'Bangalore Electricity Supply Company', provider: 'BESCOM1', status: 'Active' },
  { id: 2, code: 'UPCL', name: 'Uttarakhand Power Corporation', provider: 'UPCL', status: 'Active' },
  { id: 3, code: 'BTS', name: 'Bitchief Technology Services', provider: 'BTS', status: 'Active' },
  { id: 4, code: 'BSPHCL', name: 'Bihar State Power Holding Company', provider: 'BSPHCL', status: 'Inactive' },
  { id: 5, code: 'RE', name: 'Royal Enfield', provider: 'RE', status: 'Active' },
]

export const ANNOUNCEMENTS = [
  { id: 1, title: 'Access recertification due', description: 'Q3 access review for Finance applications closes in 4 days. 128 items remain undecided.', audience: 'Finance', channel: 'In-app + Email', severity: 'high', scheduleOn: stamp(0, 16), status: 'Published', reach: 412 },
  { id: 2, title: 'MFA enforcement enabled', description: 'Passkey and FIDO2 are now required for every administrator account, effective immediately.', audience: 'Privileged identities', channel: 'In-app', severity: 'critical', scheduleOn: stamp(2, 10), status: 'Published', reach: 84 },
  { id: 3, title: 'Scheduled maintenance', description: 'Provisioning connectors pause on 12 August, 01:00 to 03:00 UTC.', audience: 'All users', channel: 'In-app + Email', severity: 'info', scheduleOn: stamp(5, 9), status: 'Published', reach: 3892 },
  { id: 4, title: 'New joiner onboarding guide', description: 'An updated first-week guide is available in the knowledge base.', audience: 'All users', channel: 'In-app', severity: 'info', scheduleOn: stamp(-3, 9), status: 'Scheduled', reach: 0 },
  { id: 5, title: 'Legacy intranet retirement', description: 'The legacy intranet is retired on 30 September. Bookmarks will stop resolving.', audience: 'All users', channel: 'In-app + Email', severity: 'warn', scheduleOn: '', status: 'Draft', reach: 0 },
]

export const AUDIENCES = ['All users', 'Privileged identities', 'Finance', 'Engineering', 'Human Resources', 'Contractors', 'Administrators']
// A pop-up is shown as a modal the next time the identity signs in, rather than
// waiting in the notification centre to be noticed.
export const CHANNELS = ['In-app', 'Pop-up', 'Email', 'SMS', 'In-app + Email', 'Pop-up + Email']
export const POPUP_FREQUENCIES = ['Once per identity', 'Once a day', 'Every sign-in until acknowledged']
export const POPUP_SIZES = ['Compact', 'Standard', 'Full']
export const SEVERITIES = ['info', 'warn', 'high', 'critical']

export const LINKS = USEFUL_LINKS.map((l, i) => ({
  ...l,
  createdOn: stamp(120 - i * 18),
  createdBy: 'admin',
  visibility: i === 3 ? 'Administrators' : 'All users',
}))

const BROWSERS = [
  'Chrome 128 on Windows 11', 'Safari 18 on macOS 15', 'Edge 128 on Windows 11',
  'Firefox 130 on Ubuntu 24.04', 'Chrome 128 on Android 15', 'Safari 18 on iOS 18',
]
const ACTIONS = ['Accepted', 'Accepted', 'Withdrawn', 'Viewed', 'Accepted', 'Declined']

export const CONSENT_RECORDS = Array.from({ length: 28 }, (_, i) => {
  const u = USERS[(i * 3) % USERS.length]
  const c = CONSENTS[i % CONSENTS.length]
  const action = ACTIONS[i % ACTIONS.length]
  return {
    id: i + 1,
    username: u.username,
    userId: u.id,
    consentName: c.name,
    consentVersion: c.version,
    status: action === 'Accepted' ? 'Accepted' : action === 'Withdrawn' ? 'Withdrawn' : action === 'Declined' ? 'Declined' : 'Pending',
    actionType: action,
    ip: `10.${(i * 7) % 40}.${(i * 13) % 250}.${(i % 240) + 2}`,
    timestamp: stamp(Math.floor(i / 3), 22 - (i % 20)),
    browser: BROWSERS[i % BROWSERS.length],
    channel: i % 4 === 0 ? 'Mobile app' : 'Web portal',
  }
})

export const CONSENT_DEFS = CONSENTS.map((c, i) => ({
  ...c,
  code: ['PRIVACY_NOTICE', 'ACCEPTABLE_USE', 'BIOMETRIC'][i] || `CONSENT_${i + 1}`,
  owner: ['Legal', 'Compliance', 'Security'][i % 3],
  body: [
    `${c.name} (version ${c.version})`,
    '',
    'This notice explains what personal data Tanflow processes about you in the course of',
    'operating the identity platform, the lawful basis for that processing, how long records',
    'are retained, and the rights you may exercise.',
    '',
    'By accepting you confirm that you have read and understood this notice. You may withdraw',
    'consent at any time from your profile; withdrawal does not affect processing already carried',
    'out on the previous basis.',
  ].join('\n'),
  attributes: ['username', 'email', 'organization', 'department', 'ipAddress', 'timestamp'],
}))

/* The settings the platform shipped with, kept as the seed for the primary
   provider binding. The relay password is named, never held: a masked string
   here would still be a credential the record claims to carry. */
export const SMTP_DEFAULTS = {
  host: 'smtp.tanflow.com',
  port: '587',
  encryption: 'STARTTLS',
  username: 'idam-relay@tanflow.com',
  passwordEnvRef: 'SMTP_RELAY_PASSWORD',
  fromName: 'Tanflow Identity',
  fromAddress: 'no-reply@tanflow.com',
  replyTo: 'support@tanflow.com',
  retries: '3',
  retryInterval: '5 minutes',
  dailyCap: '25000',
  poolSize: '8',
}

/**
 * An email provider is the runtime specification of one outbound binding: an
 * SMTP relay the platform hands mail to, or an API sender it posts mail to.
 * Between them they answer the same questions an SMS provider answers — where
 * the request goes, how it is authenticated, how the transport is secured, how
 * long to wait and how often to retry — plus the two email adds: the identity
 * the recipient sees in the From header, and the volume the binding will carry.
 *
 * No credential is a value here. Passwords, API keys and client secrets are
 * named by the environment variable that holds them, so a binding can be
 * exported, diffed and audited without carrying a secret.
 */
export const EMAIL_PROVIDERS = [
  {
    id: 1, code: 'SMTP_PRIMARY', name: 'Tanflow SMTP Relay', type: 'SMTP_RELAY',
    host: SMTP_DEFAULTS.host, port: SMTP_DEFAULTS.port,
    timeout: 30000, retries: Number(SMTP_DEFAULTS.retries),
    auth: 'BASIC', authUsername: SMTP_DEFAULTS.username, authEnvRef: SMTP_DEFAULTS.passwordEnvRef,
    authHeaderName: '', authTokenUrl: '', authClientId: '',
    encryption: SMTP_DEFAULTS.encryption,
    fromName: SMTP_DEFAULTS.fromName, fromAddress: SMTP_DEFAULTS.fromAddress, replyTo: SMTP_DEFAULTS.replyTo,
    dailyCap: SMTP_DEFAULTS.dailyCap, poolSize: SMTP_DEFAULTS.poolSize,
    dkim: true, bounceHandling: true, sandbox: false, status: 'Active',
  },
  {
    id: 2, code: 'SMTP_BACKUP', name: 'Frankfurt Standby Relay', type: 'SMTP_RELAY',
    host: 'smtp-eu.tanflow.com', port: '465',
    timeout: 30000, retries: 2,
    auth: 'BASIC', authUsername: 'idam-relay@tanflow.com', authEnvRef: 'SMTP_BACKUP_PASSWORD',
    authHeaderName: '', authTokenUrl: '', authClientId: '',
    encryption: 'TLS',
    fromName: 'Tanflow Identity', fromAddress: 'no-reply@tanflow.com', replyTo: 'support@tanflow.com',
    dailyCap: '10000', poolSize: '4',
    dkim: true, bounceHandling: true, sandbox: false, status: 'Inactive',
  },
  {
    id: 3, code: 'SES_API', name: 'Amazon SES (eu-west-1)', type: 'API_SENDER',
    host: 'https://email.eu-west-1.amazonaws.com/v2/email/outbound-emails', port: '443',
    timeout: 15000, retries: 1,
    auth: 'API_KEY', authUsername: '', authEnvRef: 'SES_API_KEY',
    authHeaderName: 'Authorization', authTokenUrl: '', authClientId: '',
    encryption: 'TLS',
    fromName: 'Tanflow Identity', fromAddress: 'no-reply@tanflow.com', replyTo: 'support@tanflow.com',
    dailyCap: '50000', poolSize: '16',
    dkim: true, bounceHandling: true, sandbox: false, status: 'Active',
  },
  {
    id: 4, code: 'GRAPH_MAIL', name: 'Microsoft Graph Mail', type: 'API_SENDER',
    host: 'https://graph.microsoft.com/v1.0/users/idam/sendMail', port: '443',
    timeout: 20000, retries: 1,
    auth: 'OAUTH2', authUsername: '', authEnvRef: 'GRAPH_CLIENT_SECRET',
    authHeaderName: '', authTokenUrl: 'https://login.microsoftonline.com/tanflow/oauth2/v2.0/token',
    authClientId: 'tanflow-idam',
    encryption: 'TLS',
    fromName: 'Tanflow Identity', fromAddress: 'idam@tanflow.com', replyTo: 'support@tanflow.com',
    dailyCap: '20000', poolSize: '8',
    dkim: true, bounceHandling: false, sandbox: false, status: 'Active',
  },
]

/* A client is the tenant whose mail a provider carries. */
export const EMAIL_CLIENTS = [
  { id: 1, code: 'BESCOM', name: 'Bangalore Electricity Supply Company', provider: 'SMTP_PRIMARY', status: 'Active' },
  { id: 2, code: 'UPCL', name: 'Uttarakhand Power Corporation', provider: 'SMTP_PRIMARY', status: 'Active' },
  { id: 3, code: 'BTS', name: 'Bitchief Technology Services', provider: 'SES_API', status: 'Active' },
  { id: 4, code: 'RE', name: 'Royal Enfield', provider: 'GRAPH_MAIL', status: 'Active' },
  { id: 5, code: 'BSPHCL', name: 'Bihar State Power Holding Company', provider: 'SMTP_BACKUP', status: 'Inactive' },
]
