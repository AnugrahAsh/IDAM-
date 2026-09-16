import { EMAIL_TEMPLATES, MFA_METHODS, USERS } from '../../data/seed'
import { fieldsOf, seedOf, validateProvider } from './authData'
/* Providers and Policy were removed from this console: a factor's provider is
   configured where the factor is, and session policy belongs to the tenant
   settings rather than to a screen about factors. Recent activity earned a tab
   of its own — it was the tail of the Factors page, which made that page twice
   as long as the thing it was about. */
export const CONSOLE_TABS = ['factors', 'enrollment', 'events']

export const SESSION_LIFETIMES = ['1 hour', '4 hours', '8 hours', '12 hours', '24 hours', '7 days']

export const REAUTH_INTERVALS = ['Every 15 minutes', 'Every hour', 'Every 4 hours', 'Every 12 hours', 'Once per session']

export const GRACE_PERIODS = ['No grace period', '24 hours', '3 days', '7 days', '14 days', '30 days']

export const RISK_RULES = [
  {
    id: 'newDevice',
    icon: 'device',
    label: 'Step up on a new device',
    detail: 'Challenge for an additional factor the first time an identity authenticates from an unrecognized device fingerprint.',
  },
  {
    id: 'impossibleTravel',
    icon: 'globe',
    label: 'Step up on impossible travel',
    detail: 'Challenge when two sign-ins originate from locations that cannot be reached in the elapsed time.',
  },
  {
    id: 'legacyProtocols',
    icon: 'noentry',
    label: 'Block legacy protocols',
    detail: 'Reject IMAP, POP3 and SMTP AUTH, which cannot present a second factor and bypass step-up entirely.',
  },
  {
    id: 'untrustedNetwork',
    icon: 'noentry',
    label: 'Step up outside a trusted network',
    detail: 'Challenge whenever the client address falls outside the ranges declared in the IP restriction policy.',
  },
  {
    id: 'privilegedAlways',
    icon: 'key',
    label: 'Always challenge privileged identities',
    detail: 'Ignore device memory and network trust for any identity holding a privileged role.',
  },
]

export const PROVIDERS = [
  {
    id: 'totp',
    factor: 'totp',
    name: 'Authenticator app',
    protocol: 'RFC 6238 TOTP',
    vendor: 'Tanflow TOTP engine',
    hosting: 'Built-in',
    icon: 'device',
    endpoint: 'internal://totp-engine',
    region: 'In process',
    probe: ['Load the engine keyring', 'Derive a probe secret', 'Generate a code at T0', 'Validate inside the skew window'],
    values: {
      issuer: 'Tanflow IDAM',
      label: '{issuer}:{email}',
      algorithm: 'SHA-1',
      digits: '6',
      period: '30',
      skew: '1',
      secretBits: '160 bit',
      rejectReuse: true,
    },
    groups: [
      {
        label: 'Issuer',
        fields: [
          { key: 'issuer', label: 'Issuer', type: 'text', required: true, hint: 'Shown above the code in the authenticator app.' },
          { key: 'label', label: 'Account label format', type: 'text', mono: true, hint: 'Tokens: {issuer}, {username}, {email}.' },
        ],
      },
      {
        label: 'Code generation',
        fields: [
          { key: 'algorithm', label: 'Algorithm', type: 'select', options: ['SHA-1', 'SHA-256', 'SHA-512'], hint: 'SHA-1 has the widest client support.' },
          { key: 'digits', label: 'Digits', type: 'select', options: ['6', '8'] },
          { key: 'period', label: 'Period', type: 'select', options: ['30', '60'], hint: 'Seconds each code remains valid.' },
          { key: 'skew', label: 'Acceptance skew', type: 'select', options: ['0', '1', '2', '3'], hint: 'Windows accepted either side of the current period.' },
          { key: 'secretBits', label: 'Shared secret length', type: 'select', options: ['128 bit', '160 bit', '256 bit'] },
          { key: 'rejectReuse', label: 'Reject code reuse', type: 'switch', hint: 'A code already presented cannot satisfy a second challenge.' },
        ],
      },
    ],
  },
  {
    id: 'sms',
    factor: 'sms',
    name: 'SMS one-time code',
    protocol: 'HTTPS gateway',
    vendor: 'Kaleyra',
    hosting: 'External gateway',
    icon: 'sms',
    endpoint: 'https://api.kaleyra.io/v1/messages',
    region: 'ap-south-1',
    probe: ['Resolve the gateway host', 'Negotiate TLS', 'Authenticate with the account credentials', 'Submit a probe message', 'Await the delivery receipt'],
    endpointKey: 'endpoint',
    values: {
      gateway: 'Kaleyra',
      endpoint: 'https://api.kaleyra.io/v1/messages',
      senderId: 'TANFLW',
      accountSid: 'kal_live_8842xr91',
      authToken: 'sk_live_9f31b7c04a2e5d68',
      dltTemplate: '1307161234567890123',
      route: 'Transactional',
      codeLength: '6',
      codeTtl: '300',
      rateLimit: '5',
      retries: '2',
    },
    groups: [
      {
        label: 'Gateway',
        fields: [
          { key: 'gateway', label: 'Gateway provider', type: 'select', required: true, options: ['Kaleyra', 'Twilio', 'MessageBird', 'Vonage', 'AWS SNS', 'On-premise SMPP'] },
          { key: 'endpoint', label: 'Endpoint', type: 'text', required: true, mono: true, span: 2, hint: 'Must be an https endpoint. Plain http is refused by the connector.' },
          { key: 'senderId', label: 'Sender id', type: 'text', required: true, hint: 'Alphanumeric header shown on the handset.' },
          { key: 'route', label: 'Route', type: 'select', options: ['Transactional', 'Promotional', 'OTP'], hint: 'Transactional and OTP routes bypass do-not-disturb registries.' },
        ],
      },
      {
        label: 'Credentials',
        fields: [
          { key: 'accountSid', label: 'Account identifier', type: 'text', required: true, mono: true },
          { key: 'authToken', label: 'Auth token', type: 'secret', required: true, hint: 'Stored in the platform key vault and never returned to the browser after save.' },
          { key: 'dltTemplate', label: 'DLT template id', type: 'text', mono: true, hint: 'Required for Indian carriers under TRAI registration.' },
        ],
      },
      {
        label: 'Code delivery',
        fields: [
          { key: 'codeLength', label: 'Code length', type: 'select', options: ['4', '6', '8'] },
          { key: 'codeTtl', label: 'Code lifetime', type: 'number', hint: 'Seconds before the code expires.' },
          { key: 'rateLimit', label: 'Codes per hour', type: 'number', hint: 'Per identity. Further requests are refused.' },
          { key: 'retries', label: 'Delivery retries', type: 'number', hint: 'Attempts before the challenge is failed.' },
        ],
      },
    ],
  },
  {
    id: 'email',
    factor: 'email',
    name: 'Email one-time code',
    protocol: 'SMTP',
    vendor: 'Tanflow relay',
    hosting: 'External relay',
    icon: 'mail',
    endpoint: 'smtp.tanflow.com:587',
    region: 'eu-west-1',
    probe: ['Resolve the SMTP host', 'Open the connection and issue STARTTLS', 'Authenticate', 'Submit an RCPT probe', 'Close the connection'],
    values: {
      host: 'smtp.tanflow.com',
      port: '587',
      encryption: 'STARTTLS',
      username: 'idam-mailer@tanflow.com',
      password: 'mail_9c41ba77e2',
      senderName: 'Tanflow Identity',
      senderAddress: 'no-reply@tanflow.com',
      replyTo: 'servicedesk@tanflow.com',
      template: 'MFA reset',
      codeLength: '6',
      codeTtl: '600',
    },
    groups: [
      {
        label: 'Transport',
        fields: [
          { key: 'host', label: 'SMTP host', type: 'text', required: true, mono: true },
          { key: 'port', label: 'Port', type: 'number', required: true, hint: '587 for STARTTLS, 465 for implicit TLS.' },
          { key: 'encryption', label: 'Encryption', type: 'select', options: ['STARTTLS', 'TLS', 'None'], hint: 'None is refused unless the relay is on the loopback interface.' },
        ],
      },
      {
        label: 'Credentials',
        fields: [
          { key: 'username', label: 'Username', type: 'text', required: true, mono: true },
          { key: 'password', label: 'Password', type: 'secret', required: true, hint: 'Stored in the platform key vault.' },
        ],
      },
      {
        label: 'Message',
        fields: [
          { key: 'senderName', label: 'Sender name', type: 'text', required: true },
          { key: 'senderAddress', label: 'Sender address', type: 'text', required: true, mono: true },
          { key: 'replyTo', label: 'Reply-to address', type: 'text', mono: true },
          { key: 'template', label: 'Template', type: 'select', options: EMAIL_TEMPLATES.map((t) => t.name), hint: 'Maintained under Email Templates.' },
          { key: 'codeLength', label: 'Code length', type: 'select', options: ['6', '8'] },
          { key: 'codeTtl', label: 'Code lifetime', type: 'number', hint: 'Seconds before the code expires.' },
        ],
      },
    ],
  },
  {
    id: 'passkey',
    factor: 'passkey',
    name: 'Passkey and FIDO2',
    protocol: 'WebAuthn Level 3',
    vendor: 'Built-in relying party',
    hosting: 'Built-in',
    icon: 'key',
    endpoint: 'https://idam.tanflow.com',
    region: 'In process',
    probe: ['Validate the relying party id', 'Fetch the origin allow-list', 'Build a registration challenge', 'Verify the attestation trust anchors'],
    values: {
      rpId: 'tanflow.com',
      rpName: 'Tanflow Identity',
      origins: 'https://idam.tanflow.com\nhttps://apps.tanflow.com',
      attestation: 'direct',
      userVerification: 'required',
      attachment: 'Any authenticator',
      residentKey: 'required',
      timeout: '60000',
      algorithms: 'ES256, RS256',
      allowSoftware: false,
    },
    groups: [
      {
        label: 'Relying party',
        fields: [
          { key: 'rpId', label: 'Relying party id', type: 'text', required: true, mono: true, hint: 'Must be a registrable suffix of every origin below.' },
          { key: 'rpName', label: 'Relying party name', type: 'text', required: true, hint: 'Shown by the authenticator during registration.' },
          { key: 'origins', label: 'Permitted origins', type: 'textarea', required: true, mono: true, span: 2, hint: 'One https origin per line.' },
        ],
      },
      {
        label: 'Ceremony',
        fields: [
          { key: 'attestation', label: 'Attestation conveyance', type: 'select', options: ['none', 'indirect', 'direct', 'enterprise'], hint: 'Direct or enterprise is required to enforce an authenticator allow-list.' },
          { key: 'userVerification', label: 'User verification', type: 'select', options: ['required', 'preferred', 'discouraged'] },
          { key: 'attachment', label: 'Authenticator attachment', type: 'select', options: ['Any authenticator', 'Platform only', 'Cross-platform only'] },
          { key: 'residentKey', label: 'Discoverable credential', type: 'select', options: ['required', 'preferred', 'discouraged'], hint: 'Required for username-less sign-in.' },
          { key: 'timeout', label: 'Ceremony timeout', type: 'number', hint: 'Milliseconds before the browser abandons the ceremony.' },
          { key: 'algorithms', label: 'Signature algorithms', type: 'text', mono: true },
          { key: 'allowSoftware', label: 'Permit software authenticators', type: 'switch', hint: 'Allows credentials with no hardware-backed attestation.' },
        ],
      },
    ],
  },
  {
    id: 'push',
    factor: 'push',
    name: 'Push notification',
    protocol: 'HTTPS gateway',
    vendor: 'Tanflow Mobile',
    hosting: 'External gateway',
    icon: 'bell',
    endpoint: 'https://push.tanflow.io/v2/dispatch',
    region: 'ap-south-1',
    endpointKey: 'endpoint',
    probe: ['Resolve the gateway host', 'Exchange the service account for a token', 'Register a probe device', 'Dispatch a silent push'],
    values: {
      gateway: 'Tanflow Mobile',
      endpoint: 'https://push.tanflow.io/v2/dispatch',
      projectId: 'tanflow-idam-prod',
      serviceKey: 'svc_push_3ba71c05f9',
      numberMatching: true,
      challengeDigits: '2',
      ttl: '90',
      showContext: true,
    },
    groups: [
      {
        label: 'Gateway',
        fields: [
          { key: 'gateway', label: 'Gateway provider', type: 'select', required: true, options: ['Tanflow Mobile', 'Firebase Cloud Messaging', 'APNs relay'] },
          { key: 'endpoint', label: 'Endpoint', type: 'text', required: true, mono: true, span: 2, hint: 'Must be an https endpoint.' },
          { key: 'projectId', label: 'Project identifier', type: 'text', required: true, mono: true },
          { key: 'serviceKey', label: 'Service account key', type: 'secret', required: true, hint: 'Stored in the platform key vault.' },
        ],
      },
      {
        label: 'Prompt',
        fields: [
          { key: 'numberMatching', label: 'Number matching', type: 'switch', hint: 'The identity must type a number shown in the browser, which defeats prompt bombing.' },
          { key: 'challengeDigits', label: 'Matching digits', type: 'select', options: ['2', '3'] },
          { key: 'ttl', label: 'Prompt lifetime', type: 'number', hint: 'Seconds before the prompt expires.' },
          { key: 'showContext', label: 'Show request context', type: 'switch', hint: 'Displays the application, city and client address inside the prompt.' },
        ],
      },
    ],
  },
]

export const stampNow = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

export const runProviderTest = (p, values) => {
  const ts = stampNow()
  const problem = validateProvider(p, values)
  if (problem) {
    return {
      ok: false,
      ts,
      totalMs: 0,
      title: `${p.name} configuration rejected`,
      detail: problem.message,
      steps: [{ label: `Validate ${problem.field.toLowerCase()}`, ms: 0, ok: false }],
    }
  }
  const salt = seedOf(fieldsOf(p).map((f) => String(values[f.key])).join('|'))
  let total = 0
  const steps = p.probe.map((label, i) => {
    const ms = 6 + ((salt + i * 61) % 190)
    total += ms
    return { label, ms, ok: true }
  })
  return {
    ok: true,
    ts,
    totalMs: total,
    title: `${p.name} reachable`,
    detail: p.hosting === 'Built-in'
      ? `The engine answered every probe in ${total} ms. No external call was made.`
      : `${p.vendor} answered every probe in ${total} ms from ${p.region}. No production challenge was issued.`,
    steps,
  }
}

export const FACTOR_NAME = Object.fromEntries(MFA_METHODS.map((m) => [m.id, m.name]))

export const ENROLMENTS = USERS.map((u, i) => {
  const held = []
  if (i % 6 !== 0) {
    if (i % 3 === 0) held.push('passkey')
    held.push('totp')
    if (i % 4 === 1) held.push('push')
    if (i % 5 === 2) held.push('sms')
    held.push('email')
  }
  const primary = held[0] || null
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    organization: u.organization,
    department: u.department,
    employeeType: u.employeeType,
    status: u.status,
    factors: held,
    primary,
    primaryLabel: primary ? FACTOR_NAME[primary] : 'Not enrolled',
    devices: held.length === 0 ? 0 : 1 + (i % 3),
    challenges30d: held.length === 0 ? 0 : 12 + ((i * 17) % 180),
    failures30d: held.length === 0 ? 0 : (i * 7) % 9,
    lastChallenge: held.length === 0 ? '' : u.lastLogin,
    resets: i % 11 === 0 ? 1 + (i % 3) : 0,
    enrolledOn: u.createdOn.slice(0, 10),
  }
})
