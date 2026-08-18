import { USERS, EMAIL_TEMPLATES, CONSENTS, USEFUL_LINKS } from '../../data/seed'

const day = (n) => new Date(Date.UTC(2026, 7, 6) - n * 86400000).toISOString().slice(0, 10)
export const stamp = (n, h = 9) => `${day(n)} ${String(h % 24).padStart(2, '0')}:${String((n * 11) % 60).padStart(2, '0')}`

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

export const EMAIL_EVENTS = [
  'user.created', 'password.set', 'password.expiring', 'mfa.reset', 'mfa.enrolled',
  'user.locked', 'user.unlocked', 'recert.reminder', 'request.approved', 'request.rejected',
]

const TEMPLATE_DESCRIPTIONS = {
  Welcome: 'Sent once when a new identity is provisioned, carrying the enrollment link.',
  'Set password': 'Delivers the single-use credential link after a reset.',
  'MFA reset': 'Confirms that every registered factor has been removed.',
  'Attestation reminder': 'Nudges reviewers whose certification items are still undecided.',
  'Account locked': 'Notifies the identity that repeated failures locked the account.',
}

export const TEMPLATES = EMAIL_TEMPLATES.map((t, i) => ({
  ...t,
  description: TEMPLATE_DESCRIPTIONS[t.name] || 'Transactional notice issued by the platform.',
  sender: 'no-reply@tanflow.com',
  replyTo: 'support@tanflow.com',
  body: [
    'Hello {{firstName}},',
    '',
    t.name === 'Welcome'
      ? 'Your Tanflow account is ready. Use the link below to set a password and enrol a second factor. The link expires in {{expiryHours}} hours.'
      : t.name === 'Set password'
        ? 'A password reset was requested for {{username}}. Follow the link below to choose a new one.'
        : t.name === 'MFA reset'
          ? 'Every multi-factor method registered to {{username}} has been removed. You will be asked to enrol again at your next sign-in.'
          : t.name === 'Attestation reminder'
            ? 'You have access review items awaiting a decision. The campaign closes shortly and undecided items are revoked by default.'
            : 'Your account {{username}} has been locked after repeated failed sign-in attempts. Contact {{supportEmail}} to regain access.',
    '',
    '{{actionUrl}}',
    '',
    'If you did not expect this message, contact {{supportEmail}}.',
    '',
    'The {{tenantName}} identity team',
  ].join('\n'),
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

export const SMS_QUEUE = Array.from({ length: 22 }, (_, i) => {
  const u = USERS[(i * 7) % USERS.length]
  const names = ['OTP verification', 'MFA enrollment', 'Password reset', 'Access approved', 'Account locked']
  const state = i % 8 === 5 ? 'Failed' : i % 5 === 0 ? 'Queued' : 'Sent'
  return {
    id: i + 1,
    template: names[i % names.length],
    user: `${u.firstName} ${u.lastName}`,
    username: u.username,
    phone: u.mobileNo,
    sent: state === 'Queued' ? '' : stamp(Math.floor(i / 5), 19 - (i % 14)),
    status: state,
    provider: ['TWILIO', 'MSG91', 'GUPSHUP'][i % 3],
    segments: 1 + (i % 2),
    gateway: state === 'Failed' ? 'DND registry rejection' : state === 'Queued' ? 'awaiting dispatch' : 'DELIVRD',
  }
})

export const SMS_PROVIDERS = [
  { id: 1, code: 'TWILIO', name: 'Twilio Programmable SMS', type: 'REST', auth: 'Basic', serializer: 'JSON', encryption: 'TLS 1.3', responseCheck: 'HTTP_200', timeout: 8000, retries: 3, status: 'Active', endpoint: 'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json', senderId: 'TANFLW' },
  { id: 2, code: 'MSG91', name: 'MSG91 Transactional', type: 'REST', auth: 'Token', serializer: 'JSON', encryption: 'TLS 1.2', responseCheck: 'BODY_MATCH', timeout: 6000, retries: 2, status: 'Active', endpoint: 'https://api.msg91.com/api/v5/flow/', senderId: 'TNFLOW' },
  { id: 3, code: 'GUPSHUP', name: 'Gupshup Enterprise', type: 'REST', auth: 'HMAC', serializer: 'FORM', encryption: 'TLS 1.2', responseCheck: 'HTTP_200', timeout: 10000, retries: 3, status: 'Active', endpoint: 'https://enterprise.smsgupshup.com/GatewayAPI/rest', senderId: 'TANFLW' },
  { id: 4, code: 'KALEYRA', name: 'Kaleyra Gateway', type: 'REST', auth: 'Token', serializer: 'JSON', encryption: 'TLS 1.3', responseCheck: 'BODY_MATCH', timeout: 7000, retries: 2, status: 'Inactive', endpoint: 'https://api.kaleyra.io/v1/messages', senderId: 'TANFLW' },
  { id: 5, code: 'AWSSNS', name: 'Amazon SNS', type: 'REST', auth: 'SigV4', serializer: 'JSON', encryption: 'TLS 1.3', responseCheck: 'HTTP_200', timeout: 5000, retries: 4, status: 'Active', endpoint: 'https://sns.ap-south-1.amazonaws.com', senderId: 'TANFLOW' },
  { id: 6, code: 'SMPPCORE', name: 'Legacy SMPP Bind', type: 'SMPP', auth: 'Basic', serializer: 'XML', encryption: 'None', responseCheck: 'ACK', timeout: 12000, retries: 1, status: 'Inactive', endpoint: 'smpp://smpp-core.tanflow.internal:2775', senderId: 'TANFLW' },
]

export const SMS_TEMPLATES = [
  { id: 1, name: 'OTP verification', body: '{{code}} is your Tanflow verification code. Valid for {{expiryMinutes}} minutes. Do not share it.', event: 'mfa.otp', provider: 'TWILIO', status: 'Active', updated: stamp(4) },
  { id: 2, name: 'MFA enrollment', body: 'A new authentication factor was registered on your Tanflow account. If this was not you, contact {{supportEmail}}.', event: 'mfa.enrolled', provider: 'TWILIO', status: 'Active', updated: stamp(11) },
  { id: 3, name: 'Password reset', body: 'A password reset was requested for {{username}}. Use {{actionUrl}} within {{expiryHours}} hours.', event: 'password.set', provider: 'MSG91', status: 'Active', updated: stamp(18) },
  { id: 4, name: 'Access approved', body: 'Your request {{requestId}} was approved. Access is active from {{startDate}}.', event: 'request.approved', provider: 'MSG91', status: 'Active', updated: stamp(26) },
  { id: 5, name: 'Account locked', body: 'Your Tanflow account {{username}} has been locked after repeated failed sign-ins.', event: 'user.locked', provider: 'GUPSHUP', status: 'Inactive', updated: stamp(44) },
]

export const SMS_CLIENTS = [
  { id: 1, code: 'CORP-IN', name: 'Corporate India', provider: 'TWILIO', rateLimit: 600, window: 'per minute', status: 'Active', countries: 'IN' },
  { id: 2, code: 'CORP-APAC', name: 'Corporate APAC', provider: 'AWSSNS', rateLimit: 300, window: 'per minute', status: 'Active', countries: 'SG, AE' },
  { id: 3, code: 'PARTNER', name: 'Partner network', provider: 'MSG91', rateLimit: 120, window: 'per minute', status: 'Active', countries: 'IN' },
  { id: 4, code: 'FIELD', name: 'Field operations', provider: 'GUPSHUP', rateLimit: 90, window: 'per minute', status: 'Inactive', countries: 'IN' },
]

export const ANNOUNCEMENTS = [
  { id: 1, title: 'Access recertification due', description: 'Q3 access review for Finance applications closes in 4 days. 128 items remain undecided.', audience: 'Finance', channel: 'In-app + Email', severity: 'high', scheduleOn: stamp(0, 16), status: 'Published', reach: 412 },
  { id: 2, title: 'MFA enforcement enabled', description: 'Passkey and FIDO2 are now required for every administrator account, effective immediately.', audience: 'Privileged identities', channel: 'In-app', severity: 'critical', scheduleOn: stamp(2, 10), status: 'Published', reach: 84 },
  { id: 3, title: 'Scheduled maintenance', description: 'Provisioning connectors pause on 12 August, 01:00 to 03:00 UTC.', audience: 'All users', channel: 'In-app + Email', severity: 'info', scheduleOn: stamp(5, 9), status: 'Published', reach: 3892 },
  { id: 4, title: 'New joiner onboarding guide', description: 'An updated first-week guide is available in the knowledge base.', audience: 'All users', channel: 'In-app', severity: 'info', scheduleOn: stamp(-3, 9), status: 'Scheduled', reach: 0 },
  { id: 5, title: 'Legacy intranet retirement', description: 'The legacy intranet is retired on 30 September. Bookmarks will stop resolving.', audience: 'All users', channel: 'In-app + Email', severity: 'warn', scheduleOn: '', status: 'Draft', reach: 0 },
]

export const AUDIENCES = ['All users', 'Privileged identities', 'Finance', 'Engineering', 'Human Resources', 'Contractors', 'Administrators']
export const CHANNELS = ['In-app', 'Email', 'SMS', 'In-app + Email']
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

export const SMTP_DEFAULTS = {
  host: 'smtp.tanflow.com',
  port: '587',
  encryption: 'STARTTLS',
  username: 'idam-relay@tanflow.com',
  password: '••••••••••••',
  fromName: 'Tanflow Identity',
  fromAddress: 'no-reply@tanflow.com',
  replyTo: 'support@tanflow.com',
  retries: '3',
  retryInterval: '5 minutes',
  dailyCap: '25000',
  poolSize: '8',
}
