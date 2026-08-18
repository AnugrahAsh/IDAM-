import './styles/AuthenticationPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DetailHeader, { Fact } from '../components/shell/DetailHeader'
import StickyActions from '../components/shell/StickyActions'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import IconButton from '../components/primitives/IconButton'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Meter from '../components/primitives/Meter'
import Switch from '../components/primitives/Switch'
import Field from '../components/primitives/Field'
import Select from '../components/primitives/Select'
import TextInput from '../components/primitives/TextInput'
import KeyValue from '../components/primitives/KeyValue'
import Tabs from '../components/primitives/Tabs'
import Banner from '../components/primitives/Banner'
import Avatar from '../components/primitives/Avatar'
import EmptyState from '../components/primitives/EmptyState'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { num, pct } from '../lib/format'
import { EMAIL_TEMPLATES, LOGS, MFA_METHODS, USERS } from '../data/seed'

const BASE_PATH = '/iam/mfa'
const DIRECTORY = 3892
const CONSOLE_TABS = ['factors', 'providers', 'policy', 'enrollment']

const STRENGTH = {
  strongest: { tone: 'ok', label: 'Phishing-resistant' },
  strong: { tone: 'ok', label: 'Strong' },
  weak: { tone: 'warn', label: 'Weak' },
  weakest: { tone: 'bad', label: 'Discouraged' },
}

const SESSION_LIFETIMES = ['1 hour', '4 hours', '8 hours', '12 hours', '24 hours', '7 days']
const REAUTH_INTERVALS = ['Every 15 minutes', 'Every hour', 'Every 4 hours', 'Every 12 hours', 'Once per session']
const GRACE_PERIODS = ['No grace period', '24 hours', '3 days', '7 days', '14 days', '30 days']

const RISK_RULES = [
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

const PROVIDERS = [
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

const seedOf = (text) => [...String(text)].reduce((a, c) => a + c.charCodeAt(0), 0)

const dayStr = (n) => new Date(Date.UTC(2026, 7, 5) - n * 86400000).toISOString().slice(0, 10)

const stampNow = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

const providerHealth = (p) => {
  const s = seedOf(p.id)
  const method = MFA_METHODS.find((m) => m.id === p.factor)
  const challenges = (method ? method.enrolled : 500) * 4 + (s % 400)
  const failures = Math.round(challenges * (0.004 + (s % 17) / 1000))
  return {
    challenges7d: challenges,
    failures7d: failures,
    successRate: 100 - (failures / challenges) * 100,
    latencyMs: 40 + (s % 380),
    lastTest: `${dayStr(s % 5)} 09:${String(s % 60).padStart(2, '0')}:00`,
  }
}

const providerSeries = (p) => {
  const s = seedOf(p.id)
  const health = providerHealth(p)
  const daily = Math.round(health.challenges7d / 7)
  return Array.from({ length: 14 }, (_, i) => {
    const wave = Math.abs(Math.sin((s % 71) + i * 0.94))
    const issued = Math.round(daily * (0.6 + wave * 0.85))
    return {
      d: dayStr(13 - i).slice(5),
      issued,
      failed: Math.max(0, Math.round(issued * (0.006 + wave / 300))),
    }
  })
}

const fieldsOf = (p) => p.groups.flatMap((g) => g.fields)

const validateProvider = (p, values) => {
  const missing = fieldsOf(p).filter((f) => f.required && !String(values[f.key] === undefined ? '' : values[f.key]).trim())
  if (missing.length > 0) {
    return { field: missing[0].label, message: `${missing.map((f) => f.label).join(', ')} must be set before a connection can be attempted.` }
  }
  if (p.endpointKey && !/^https:\/\//i.test(String(values[p.endpointKey]))) {
    return { field: 'Endpoint', message: 'The endpoint must use https. The connector refuses to send credentials over plain http.' }
  }
  if (p.id === 'email') {
    if (!/^\d+$/.test(String(values.port)) || Number(values.port) < 1 || Number(values.port) > 65535) {
      return { field: 'Port', message: 'The port must be a number between 1 and 65535.' }
    }
    if (values.encryption === 'None') {
      return { field: 'Encryption', message: 'Unencrypted SMTP is refused. Select STARTTLS or TLS.' }
    }
    if (!String(values.senderAddress).includes('@')) {
      return { field: 'Sender address', message: 'The sender address must be a complete mailbox address.' }
    }
  }
  if (p.id === 'passkey') {
    const origins = String(values.origins).split('\n').map((o) => o.trim()).filter(Boolean)
    const bad = origins.find((o) => !o.startsWith('https://'))
    if (bad) return { field: 'Permitted origins', message: `${bad} is not an https origin. WebAuthn refuses every other scheme.` }
    const mismatch = origins.find((o) => !o.replace('https://', '').endsWith(String(values.rpId)))
    if (mismatch) return { field: 'Relying party id', message: `${mismatch} is not covered by the relying party id ${values.rpId}. Registration would fail in the browser.` }
  }
  if (p.id === 'totp' && Number(values.skew) > 2) {
    return { field: 'Acceptance skew', message: 'A skew above two windows accepts codes for more than five minutes and is refused by the engine.' }
  }
  return null
}

const runProviderTest = (p, values) => {
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

const FACTOR_NAME = Object.fromEntries(MFA_METHODS.map((m) => [m.id, m.name]))

const ENROLMENTS = USERS.map((u, i) => {
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

function Control({ f, value, onChange }) {
  const [reveal, setReveal] = useState(false)
  if (f.type === 'switch') {
    return (
      <div className="row" style={{ height: 31 }}>
        <Switch checked={!!value} onChange={(v) => onChange(v)} label={f.label} />
        <span className="t-sm t-mut">{value ? 'Enabled' : 'Disabled'}</span>
      </div>
    )
  }
  if (f.type === 'select') {
    return <Select id={f.id} value={value} options={f.options} onChange={(e) => onChange(e.target.value)} />
  }
  if (f.type === 'textarea') {
    return (
      <TextInput
        as="textarea"
        id={f.id}
        rows={3}
        className={f.mono ? 'mono' : ''}
        spellCheck="false"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (f.type === 'secret') {
    return (
      <div className="row" style={{ gap: 6 }}>
        <TextInput
          id={f.id}
          className="mono"
          type={reveal ? 'text' : 'password'}
          value={value}
          autoComplete="off"
          spellCheck="false"
          onChange={(e) => onChange(e.target.value)}
        />
        <IconButton
          icon={reveal ? 'eyeoff' : 'eye'}
          label={reveal ? `Hide ${f.label}` : `Reveal ${f.label}`}
          onClick={() => setReveal((r) => !r)}
        />
      </div>
    )
  }
  return (
    <TextInput
      id={f.id}
      type={f.type === 'number' ? 'number' : 'text'}
      className={f.mono ? 'mono' : ''}
      value={value}
      autoComplete="off"
      spellCheck="false"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function TestResult({ result }) {
  if (!result) return null
  return (
    <div style={{ marginTop: 14 }}>
      <Banner tone={result.ok ? 'ok' : 'bad'}>
        <b>{result.title}.</b> {result.detail}
      </Banner>
      {result.steps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {result.steps.map((s) => (
            <div className="factor" key={s.label}>
              <span className="factor-l">
                <Icon name={s.ok ? 'check' : 'x'} size={12} style={{ display: 'inline-block', color: s.ok ? 'var(--ok)' : 'var(--bad)' }} />
                {' '}{s.label}
              </span>
              <span className="factor-bar">
                <i style={{ width: `${Math.min(100, (s.ms / 220) * 100)}%`, background: s.ok ? 'var(--ok)' : 'var(--bad)' }} />
              </span>
              <span className="factor-d">{s.ms} ms</span>
            </div>
          ))}
        </div>
      )}
      <div className="t-xs t-faint" style={{ marginTop: 8 }}>
        {result.ts} · {result.ok ? `${result.totalMs} ms total` : 'no call was made'} · simulation only
      </div>
    </div>
  )
}

function ProviderBlock({ provider, values, enabled, onChange, onToggle, onTest, result, onOpen }) {
  const health = providerHealth(provider)
  return (
    <Card
      title={
        <span className="row" style={{ gap: 8 }}>
          <Icon name={provider.icon} size={14} />
          {provider.name}
        </span>
      }
      sub={`${provider.vendor} · ${provider.protocol} · ${provider.hosting}`}
      actions={
        <>
          <Pill tone={enabled ? 'ok' : 'mut'} dot>{enabled ? 'Enabled' : 'Disabled'}</Pill>
          <Switch checked={enabled} onChange={onToggle} label={`Enable ${provider.name}`} />
          {onOpen && <Button size="sm" iconRight="chevR" onClick={onOpen}>Open</Button>}
        </>
      }
      footer={
        <>
          <Icon name="activity" size={12} />
          <span>{num(health.challenges7d)} challenges in 7 days · {pct(health.successRate, 2)} succeeded · {health.latencyMs} ms median</span>
          <span className="spacer" />
          <span>Last tested {health.lastTest}</span>
        </>
      }
    >
      {provider.groups.map((g) => (
        <div key={g.label}>
          <div className="t-micro t-mut" style={{ margin: '0 0 10px' }}>{g.label}</div>
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            {g.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                required={f.required}
                hint={f.hint}
                span={f.span}
                htmlFor={`${provider.id}-${f.key}`}
              >
                <Control
                  f={{ ...f, id: `${provider.id}-${f.key}` }}
                  value={values[f.key]}
                  onChange={(v) => onChange(f.key, v)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}

      <div className="row">
        <Button icon="bolt" onClick={onTest}>Test Connection</Button>
        <span className="t-xs t-mut">
          Runs the probe sequence against the values currently in the form. Nothing is saved and no challenge is issued.
        </span>
      </div>

      <TestResult result={result} />
    </Card>
  )
}

function ProviderPage({ provider, values, enabled, onChange, onToggle, onTest, result, onSave, onCancel, dirty }) {
  const [tab, setTab] = useState('config')
  const health = providerHealth(provider)
  const series = useMemo(() => providerSeries(provider), [provider])
  const method = MFA_METHODS.find((m) => m.id === provider.factor)
  const problem = validateProvider(provider, values)

  return (
    <>
      <DetailHeader
        backTo={`${BASE_PATH}/providers`}
        backLabel="Providers"
        eyebrow="Authentication provider"
        title={provider.name}
        sub={`${provider.vendor} over ${provider.protocol}. Configuration applies to every enrollment and every challenge issued for this factor.`}
        media={
          <span className="feed-ic" data-tone={enabled ? 'acc' : 'mut'} style={{ width: 56, height: 56, borderRadius: 6 }}>
            <Icon name={provider.icon} size={22} />
          </span>
        }
        badges={
          <>
            <Pill tone={enabled ? 'ok' : 'mut'} dot>{enabled ? 'Enabled' : 'Disabled'}</Pill>
            <Pill tone={problem ? 'bad' : 'ok'} dot>{problem ? 'Configuration invalid' : 'Configuration valid'}</Pill>
            <Tag>{provider.hosting}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="swap" label="Protocol" value={provider.protocol} />
            <Fact icon="globe" label="Endpoint" value={<span className="mono t-xs">{provider.endpoint}</span>} />
            <Fact icon="server" label="Region" value={provider.region} />
            <Fact icon="users" label="Enrolled" value={num(method ? method.enrolled : 0)} />
            <Fact icon="activity" label="Success rate" value={pct(health.successRate, 2)} />
          </>
        }
        actions={
          <>
            <Button icon="bolt" onClick={onTest}>Test Connection</Button>
            <Button icon={enabled ? 'ban' : 'checkC'} onClick={() => onToggle(!enabled)}>
              {enabled ? 'Disable factor' : 'Enable factor'}
            </Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'config', label: 'Configuration', icon: 'sliders' },
              { id: 'health', label: 'Delivery health', icon: 'activity' },
              { id: 'history', label: 'Change history', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {problem && (
              <Banner tone="bad">
                <b>{problem.field}.</b> {problem.message}
              </Banner>
            )}

            {tab === 'config' && provider.groups.map((g) => (
              <Card key={g.label} title={g.label} sub={`Applies to every ${provider.name.toLowerCase()} enrollment and challenge`}>
                <div className="grid grid-2">
                  {g.fields.map((f) => (
                    <Field
                      key={f.key}
                      label={f.label}
                      required={f.required}
                      hint={f.hint}
                      span={f.span}
                      htmlFor={`page-${provider.id}-${f.key}`}
                    >
                      <Control
                        f={{ ...f, id: `page-${provider.id}-${f.key}` }}
                        value={values[f.key]}
                        onChange={(v) => onChange(f.key, v)}
                      />
                    </Field>
                  ))}
                </div>
              </Card>
            ))}

            {tab === 'health' && (
              <>
                <Card title="Delivery" sub="Rolling seven-day window">
                  <KeyValue
                    rows={[
                      { k: 'Challenges issued', v: num(health.challenges7d), icon: 'activity' },
                      { k: 'Challenges failed', v: num(health.failures7d), icon: 'warn' },
                      { k: 'Success rate', v: pct(health.successRate, 2), icon: 'checkC' },
                      { k: 'Median latency', v: `${health.latencyMs} ms`, icon: 'clock' },
                      { k: 'Identities enrolled', v: num(method ? method.enrolled : 0), icon: 'users' },
                      { k: 'Last connection test', v: health.lastTest, icon: 'bolt' },
                    ]}
                  />
                </Card>
              </>
            )}

            {tab === 'history' && (
              <Card title="Change history" sub="Every recorded change to this provider configuration">
                <div className="tl">
                  <div className="tl-it" data-tone="acc">
                    <span className="tl-dot"><Icon name="plus" size={8} stroke={3} /></span>
                    <div className="tl-t">Provider registered</div>
                    <div className="tl-s">{provider.vendor} was registered as the {provider.name.toLowerCase()} provider.</div>
                    <div className="tl-time">{dayStr(220)} · SHUBHAM_JAIN</div>
                  </div>
                  <div className="tl-it" data-tone="ok">
                    <span className="tl-dot"><Icon name="check" size={8} stroke={3} /></span>
                    <div className="tl-t">Connection verified</div>
                    <div className="tl-s">The probe sequence completed against {provider.endpoint}.</div>
                    <div className="tl-time">{health.lastTest} · VANSH_MAKHIJA</div>
                  </div>
                  <div className="tl-it" data-tone={enabled ? 'ok' : 'warn'}>
                    <span className="tl-dot"><Icon name={enabled ? 'checkC' : 'ban'} size={8} stroke={3} /></span>
                    <div className="tl-t">{enabled ? 'Factor enabled for enrollment' : 'Factor withdrawn from enrollment'}</div>
                    <div className="tl-s">
                      {enabled
                        ? 'The factor is offered at enrollment and accepted at challenge across every SSO application.'
                        : 'No new enrollment is offered and existing credentials for this factor are not accepted.'}
                    </div>
                    <div className="tl-time">{dayStr(34)} · PRIYA_NAIR</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="stack">
            <Card title="Connection test" sub="Runs against the values currently in the form">
              <Button variant="pri" icon="bolt" onClick={onTest}>Test Connection</Button>
              <div className="t-micro t-mut" style={{ margin: '16px 0 6px' }}>Probe sequence</div>
              {provider.probe.map((step, i) => (
                <div className="feed-it" key={step}>
                  <span className="feed-ic" data-tone="mut">{i + 1}</span>
                  <div className="feed-m"><div className="feed-t">{step}</div></div>
                </div>
              ))}
              <TestResult result={result} />
            </Card>

            <Card title="Adoption" sub="Directory coverage for this factor">
              {method ? (
                <>
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{ flex: 1 }}>
                      <Meter value={(method.enrolled / DIRECTORY) * 100} tone={STRENGTH[method.strength].tone} />
                    </span>
                    <span className="t-xs num" style={{ fontWeight: 600 }}>{pct((method.enrolled / DIRECTORY) * 100)}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <KeyValue
                      cols={1}
                      rows={[
                        { k: 'Identities enrolled', v: num(method.enrolled), icon: 'users' },
                        { k: 'Assurance', v: STRENGTH[method.strength].label, icon: 'shield' },
                        { k: 'Description', v: method.sub, icon: 'info' },
                      ]}
                    />
                  </div>
                </>
              ) : (
                <EmptyState size="sm" icon="shield" title="No adoption data" body="This provider is not mapped to an enrollment factor." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved provider configuration' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!!problem} onClick={onSave}>Save changes</Button>
      </StickyActions>
    </>
  )
}

export default function AuthenticationPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [methods, setMethods] = useState(MFA_METHODS)
  const [config, setConfig] = useState(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...p.values }])))
  const [saved, setSaved] = useState(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, { ...p.values }])))
  const [results, setResults] = useState({})
  const [enrollments, setEnrollments] = useState(ENROLMENTS)
  const [policy, setPolicy] = useState({
    sessionLifetime: '8 hours',
    reauthInterval: 'Every 4 hours',
    enrollmentGrace: '7 days',
    rememberDevice: true,
    newDevice: true,
    impossibleTravel: true,
    legacyProtocols: false,
    untrustedNetwork: true,
    privilegedAlways: true,
  })
  const [policyDirty, setPolicyDirty] = useState(false)

  const enabled = methods.filter((m) => m.enabled)
  const resistant = methods.find((m) => m.strength === 'strongest')
  const resistantEnrolled = resistant ? resistant.enrolled : 0
  const phishingPct = (resistantEnrolled / DIRECTORY) * 100
  const gaps = DIRECTORY - resistantEnrolled

  const events = useMemo(() => LOGS.filter((l) => l.category === 'Authentication').slice(0, 9), [])

  const providersDirty = useMemo(
    () => PROVIDERS.some((p) => fieldsOf(p).some((f) => config[p.id][f.key] !== saved[p.id][f.key])),
    [config, saved],
  )

  const isEnabled = (p) => {
    const m = methods.find((x) => x.id === p.factor)
    return m ? m.enabled : false
  }

  const setValue = (providerId, key, value) => {
    setConfig((c) => ({ ...c, [providerId]: { ...c[providerId], [key]: value } }))
  }

  const toggleFactor = (m) => {
    if (m.enabled && enabled.length === 1) {
      toast('warn', 'At least one factor must stay enabled', `Disabling ${m.name} would leave the tenant with no way to satisfy a challenge.`)
      return
    }
    setMethods((ms) => ms.map((x) => (x.id === m.id ? { ...x, enabled: !x.enabled } : x)))
    toast(
      m.enabled ? 'warn' : 'ok',
      m.enabled ? 'Factor disabled' : 'Factor enabled',
      `${m.name} ${m.enabled ? 'is no longer offered at enrollment or challenge.' : 'is now available to every identity in scope.'}`,
    )
  }

  const toggleProviderFactor = (p, next) => {
    const m = methods.find((x) => x.id === p.factor)
    if (!m) return
    if (m.enabled && !next && enabled.length === 1) {
      toast('warn', 'At least one factor must stay enabled', `Disabling ${m.name} would leave the tenant with no way to satisfy a challenge.`)
      return
    }
    setMethods((ms) => ms.map((x) => (x.id === p.factor ? { ...x, enabled: next } : x)))
    toast(next ? 'ok' : 'warn', next ? 'Factor enabled' : 'Factor disabled', m.name)
  }

  const testProvider = (p) => {
    const result = runProviderTest(p, config[p.id])
    setResults((r) => ({ ...r, [p.id]: result }))
    toast(result.ok ? 'ok' : 'bad', result.title, result.detail)
  }

  const saveProviders = (only) => {
    const list = only ? [only] : PROVIDERS
    const blocked = list.map((p) => ({ p, problem: validateProvider(p, config[p.id]) })).filter((x) => x.problem)
    if (blocked.length > 0) {
      toast('bad', 'Configuration rejected', `${blocked[0].p.name}: ${blocked[0].problem.message}`)
      return
    }
    setSaved((s) => {
      const next = { ...s }
      list.forEach((p) => { next[p.id] = { ...config[p.id] } })
      return next
    })
    toast('ok', 'Provider configuration saved', only
      ? `${only.name} is live for every new enrollment and challenge.`
      : `${list.length} provider configurations were published to every authentication node.`)
  }

  const revertProviders = (only) => {
    const list = only ? [only] : PROVIDERS
    setConfig((c) => {
      const next = { ...c }
      list.forEach((p) => { next[p.id] = { ...saved[p.id] } })
      return next
    })
    toast('info', 'Changes discarded', 'The form was returned to the published configuration.')
  }

  const setPolicyField = (key, value) => {
    setPolicy((p) => ({ ...p, [key]: value }))
    setPolicyDirty(true)
  }

  const resetFactors = (ids, label) => {
    const set = new Set(ids.map(String))
    setEnrollments((es) => es.map((e) => (set.has(String(e.id))
      ? { ...e, factors: [], primary: null, primaryLabel: 'Not enrolled', devices: 0, resets: e.resets + 1 }
      : e)))
    toast('warn', 'Factors reset', `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} must re-enrol at the next sign-in. ${label}`)
  }

  const confirmReset = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Reset every factor for this identity?' : `Reset every factor for ${ids.length} identities?`,
    body: 'All enrolled factors and remembered devices are removed. Each identity must re-enrol at the next sign-in using a single-use enrollment link.',
    confirmLabel: `Reset ${ids.length}`,
    onConfirm: () => { resetFactors(ids, 'An enrollment link has been mailed.'); if (clear) clear() },
  })

  const providerSegment = segments[0] === 'providers' ? segments[1] : null

  if (providerSegment) {
    const provider = PROVIDERS.find((p) => p.id === providerSegment)
    if (!provider) {
      return (
        <>
          <PageBar
            title="Provider not found"
            sub="No authentication provider is registered under that identifier."
            crumbs={[{ label: 'MFA', to: BASE_PATH }, { label: 'Providers', to: `${BASE_PATH}/providers` }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="shield"
            title="Unknown provider"
            body="Registered providers are TOTP, SMS, email, passkey and push."
            actions={<Button variant="pri" iconRight="chevR" onClick={() => navigate(`${BASE_PATH}/providers`)}>Back to providers</Button>}
          />
        </>
      )
    }
    const dirty = fieldsOf(provider).some((f) => config[provider.id][f.key] !== saved[provider.id][f.key])
    return (
      <ProviderPage
        provider={provider}
        values={config[provider.id]}
        enabled={isEnabled(provider)}
        dirty={dirty}
        result={results[provider.id]}
        onChange={(k, v) => setValue(provider.id, k, v)}
        onToggle={(next) => toggleProviderFactor(provider, next)}
        onTest={() => testProvider(provider)}
        onSave={() => { saveProviders(provider); navigate(`${BASE_PATH}/providers`) }}
        onCancel={() => { revertProviders(provider); navigate(`${BASE_PATH}/providers`) }}
      />
    )
  }

  const tab = CONSOLE_TABS.includes(segments[0]) ? segments[0] : 'factors'
  const goTab = (id) => navigate(`${BASE_PATH}/${id}`)

  const enrolStats = {
    enrolled: enrollments.filter((e) => e.factors.length > 0).length,
    none: enrollments.filter((e) => e.factors.length === 0).length,
    passkey: enrollments.filter((e) => e.factors.includes('passkey')).length,
    smsOnly: enrollments.filter((e) => e.factors.includes('sms') && !e.factors.includes('passkey')).length,
  }

  const enrolColumns = [
    {
      key: 'username', label: 'Username', locked: true, cls: 'td-main',
      value: (e) => `${e.username} ${e.email}`,
      render: (e) => (
        <span className="cell-id">
          <Avatar first={e.firstName} last={e.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{e.username}</span>
            <span className="cell-sub">{e.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'organization', label: 'Organization' },
    {
      key: 'factors', label: 'Factors held', sortable: false,
      render: (e) => (e.factors.length === 0
        ? <Pill tone="warn" dot>Not enrolled</Pill>
        : (
          <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {e.factors.map((f) => (
              <Tag key={f} tone={f === 'passkey' ? 'acc' : undefined}>{FACTOR_NAME[f]}</Tag>
            ))}
          </span>
        )),
    },
    { key: 'primaryLabel', label: 'Primary' },
    { key: 'devices', label: 'Devices', align: 'right', render: (e) => <span className="num">{e.devices}</span> },
    { key: 'challenges30d', label: 'Challenges 30d', align: 'right', render: (e) => <span className="num">{num(e.challenges30d)}</span> },
    {
      key: 'failures30d', label: 'Failed', align: 'right',
      render: (e) => <span className="num" style={{ color: e.failures30d > 5 ? 'var(--warn-core)' : undefined }}>{e.failures30d}</span>,
    },
    { key: 'lastChallenge', label: 'Last challenge', cls: 'td-mono' },
    { key: 'resets', label: 'Resets', align: 'right', render: (e) => <span className="num">{e.resets}</span> },
  ]

  const enrolRowActions = (e) => [
    { id: 'user', label: 'Open identity', icon: 'user', onSelect: () => navigate('/iam/users') },
    { divider: true },
    { label: 'Reset a single factor', header: true },
    ...(e.factors.length === 0
      ? [{ id: 'nofactors', label: 'No factors enrolled', icon: 'ban', disabled: true }]
      : e.factors.map((f) => ({
        id: `reset-${f}`,
        label: `Reset ${FACTOR_NAME[f]}`,
        icon: 'refresh',
        onSelect: () => {
          setEnrollments((es) => es.map((x) => {
            if (x.id !== e.id) return x
            const factors = x.factors.filter((k) => k !== f)
            const primary = factors[0] || null
            return { ...x, factors, primary, primaryLabel: primary ? FACTOR_NAME[primary] : 'Not enrolled', resets: x.resets + 1 }
          }))
          toast('warn', 'Factor reset', `${FACTOR_NAME[f]} was removed from ${e.username}.`)
        },
      }))),
    { divider: true },
    { id: 'reset-all', label: 'Reset all factors', icon: 'shield', danger: true, disabled: e.factors.length === 0, onSelect: () => confirmReset([e.id]) },
  ]

  const enrolBulk = (ids, clear) => (
    <>
      <Button size="sm" icon="shield" variant="danger" onClick={() => confirmReset(ids, clear)}>Reset all factors</Button>
      <Button
        size="sm"
        icon="mail"
        onClick={() => { toast('ok', 'Enrollment mailed', `${ids.length} single-use enrollment links were queued.`); clear() }}
      >
        Send enrollment link
      </Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} enrollment records queued for CSV export.`)}>Export</Button>
    </>
  )

  return (
    <>
      <PageBar
        title="Authentication"
        sub="Which factors identities may enrol, how each provider is configured, how long a session survives, and when the platform demands another challenge."
        crumbs={[{ label: 'Core' }, { label: 'MFA' }]}
        badge={<Pill tone={phishingPct >= 70 ? 'ok' : 'warn'} dot>{pct(phishingPct)} phishing-resistant</Pill>}
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Factor enrollment report is being generated.')}>Enrollment report</Button>
            <Button
              variant="pri"
              icon="save"
              disabled={!providersDirty && !policyDirty}
              onClick={() => {
                if (providersDirty) saveProviders()
                if (policyDirty) { setPolicyDirty(false); toast('ok', 'Policy published', 'Authentication policy is live across every SSO application.') }
              }}
            >
              Publish changes
            </Button>
          </>
        }
        rail={
          <>
            <StatChip icon="users" title="Identities in the directory that this policy covers">
              {num(DIRECTORY)} enrolled identities
            </StatChip>
            <StatChip
              icon="shield"
              active={tab === 'enrollment'}
              onClick={() => goTab('enrollment')}
              title="Open the enrollment breakdown"
            >
              {num(resistantEnrolled)} hold a strong factor
            </StatChip>
            <StatChip icon="key" active={tab === 'factors'} onClick={() => goTab('factors')}>
              {enabled.length} of {methods.length} factors enabled
            </StatChip>
            <StatChip icon="sliders" active={tab === 'providers'} onClick={() => goTab('providers')}>
              {PROVIDERS.length} providers configured
            </StatChip>
            <StatChip
              icon="warn"
              active={tab === 'enrollment'}
              onClick={() => goTab('enrollment')}
              title="Open the enrollment breakdown to chase the identities still without a phishing-resistant factor"
            >
              {num(gaps)} without a strong factor
            </StatChip>
          </>
        }
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={goTab}
          tabs={[
            { id: 'factors', label: 'Factors', icon: 'shield', count: methods.length },
            { id: 'providers', label: 'Providers', icon: 'sliders', count: PROVIDERS.length },
            { id: 'policy', label: 'Policy', icon: 'policy' },
            { id: 'enrollment', label: 'Enrollment', icon: 'users', count: enrolStats.none },
          ]}
        />

        {tab === 'factors' && (
          <>
            <div className="stat-strip">
              <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/users')}>
                <span className="stat-k"><Icon name="users" size={12} />Enrolled identities</span>
                <span className="stat-v">{num(DIRECTORY)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="shield" size={12} />Phishing-resistant</span>
                <span className="stat-v">{pct(phishingPct)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="key" size={12} />Factors enabled</span>
                <span className="stat-v">{enabled.length} of {methods.length}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="sliders" size={12} />Providers configured</span>
                <span className="stat-v">{PROVIDERS.length}</span>
              </div>
              <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/users')}>
                <span className="stat-k"><Icon name="warn" size={12} />Without a strong factor</span>
                <span className="stat-v" style={{ color: gaps > 0 ? 'var(--warn-core)' : undefined }}>{num(gaps)}</span>
              </div>
            </div>

            <div className="mfa-tilegrid">
              {methods.map((m) => {
                const strength = STRENGTH[m.strength] || STRENGTH.weak
                const share = (m.enrolled / DIRECTORY) * 100
                const provider = PROVIDERS.find((p) => p.factor === m.id)
                return (
                  <div className="mfa-tile" key={m.id} data-off={!m.enabled || undefined}>
                    <div className="mfa-tile-top">
                      <span className="feed-ic mfa-tile-ic" data-tone={m.enabled ? strength.tone : 'mut'}>
                        <Icon name={m.icon} size={15} />
                      </span>
                      <span className="mfa-tile-badges">
                        <Pill tone={m.enabled ? strength.tone : 'mut'} dot>{strength.label}</Pill>
                      </span>
                      <Switch checked={m.enabled} onChange={() => toggleFactor(m)} label={`Enable ${m.name}`} />
                    </div>
                    <div className="mfa-tile-name">{m.name}</div>
                    <div className="mfa-tile-sub">{m.sub}</div>
                    <div className="mfa-tile-meter">
                      <div className="row-between">
                        <span className="t-xs t-mut num">{num(m.enrolled)} enrolled</span>
                        <span className="t-xs num" style={{ fontWeight: 600 }}>{pct(share)}</span>
                      </div>
                      <Meter value={share} tone={m.enabled ? strength.tone : undefined} />
                    </div>
                    <div className="mfa-tile-foot">
                      <span className="t-xs t-mut trunc">{m.enabled ? provider ? provider.vendor : 'Built-in' : 'Not offered at enrollment'}</span>
                      <Button
                        size="sm"
                        icon="sliders"
                        disabled={!provider}
                        onClick={() => provider && navigate(`${BASE_PATH}/providers/${provider.id}`)}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <Card
              title="Recent factor events"
              sub="Authentication-category entries from the control-plane log"
              actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/syslogs')}>Audit log</Button>}
              footer={
                <>
                  <Icon name="info" size={12} />
                  <span>{num(gaps)} identities hold no phishing-resistant factor</span>
                  <span className="spacer" />
                  <button className="link" onClick={() => navigate('/iam/users')}>Review gaps<Icon name="chevR" size={10} /></button>
                </>
              }
            >
              {events.length === 0 ? (
                <EmptyState
                  icon="shield"
                  title="No authentication events"
                  body="Factor enrollments, resets and challenges will appear here as they are recorded."
                />
              ) : (
                <div className="tl">
                  {events.map((e) => (
                    <div
                      className="tl-it"
                      key={e.id}
                      data-tone={e.outcome === 'Denied' || e.level === 'ERROR' ? 'bad' : e.level === 'WARN' ? 'warn' : 'acc'}
                    >
                      <span className="tl-dot">
                        <Icon name={e.outcome === 'Denied' ? 'ban' : 'check'} size={8} stroke={3} />
                      </span>
                      <div className="tl-t">{e.action}</div>
                      <div className="tl-s">{e.actor} · {e.target}</div>
                      <div className="tl-time">{e.ts} · {e.ip} · {e.outcome}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {tab === 'providers' && (
          <>
            <Banner tone="info">
              Each factor is served by a provider. Configuration is validated on save and again at every challenge, so
              an endpoint or credential that fails here will fail for identities as well. Use <b>Test Connection</b> to
              run the probe sequence against the values currently in the form before publishing.
            </Banner>

            {PROVIDERS.map((p) => (
              <ProviderBlock
                key={p.id}
                provider={p}
                values={config[p.id]}
                enabled={isEnabled(p)}
                result={results[p.id]}
                onChange={(k, v) => setValue(p.id, k, v)}
                onToggle={(next) => toggleProviderFactor(p, next)}
                onTest={() => testProvider(p)}
                onOpen={() => navigate(`${BASE_PATH}/providers/${p.id}`)}
              />
            ))}

            <StickyActions dirty={providersDirty} message={providersDirty ? 'Unsaved provider configuration' : 'No changes'}>
              <Button onClick={() => revertProviders()} disabled={!providersDirty}>Cancel</Button>
              <Button variant="pri" icon="save" disabled={!providersDirty} onClick={() => saveProviders()}>Submit</Button>
            </StickyActions>
          </>
        )}

        {tab === 'policy' && (
          <>
            <Card
              title="Session"
              sub="Applies to every SSO application unless an application-level override is configured"
              actions={policyDirty ? <Pill tone="warn" dot>Unpublished changes</Pill> : <Pill tone="ok" dot>Published</Pill>}
            >
              <div className="grid grid-4">
                <Field label="Session lifetime" hint="Maximum age of a session before a full sign-in is required." htmlFor="auth-session">
                  <Select
                    id="auth-session"
                    options={SESSION_LIFETIMES}
                    value={policy.sessionLifetime}
                    onChange={(e) => setPolicyField('sessionLifetime', e.target.value)}
                  />
                </Field>
                <Field label="Re-authentication interval" hint="How often a privileged operation demands a fresh factor." htmlFor="auth-reauth">
                  <Select
                    id="auth-reauth"
                    options={REAUTH_INTERVALS}
                    value={policy.reauthInterval}
                    onChange={(e) => setPolicyField('reauthInterval', e.target.value)}
                  />
                </Field>
                <Field label="Enrollment grace period" hint="How long a new identity may sign in before a factor is mandatory." htmlFor="auth-grace">
                  <Select
                    id="auth-grace"
                    options={GRACE_PERIODS}
                    value={policy.enrollmentGrace}
                    onChange={(e) => setPolicyField('enrollmentGrace', e.target.value)}
                  />
                </Field>
                <Field label="Remember this device" hint="Suppress the factor prompt for 30 days on devices that pass a posture check.">
                  <div className="row" style={{ height: 31 }}>
                    <Switch
                      checked={policy.rememberDevice}
                      onChange={(v) => setPolicyField('rememberDevice', v)}
                      label="Remember this device"
                    />
                    <span className="t-sm t-mut">{policy.rememberDevice ? 'Trusted for 30 days' : 'Challenge every sign-in'}</span>
                  </div>
                </Field>
              </div>
            </Card>

            <Card title="Risk rules" sub="Conditions that force an additional challenge or refuse the attempt outright">
              {RISK_RULES.map((rule) => (
                <div className="feed-it" key={rule.id}>
                  <span className="feed-ic" data-tone={policy[rule.id] ? 'ok' : 'mut'}>
                    <Icon name={rule.icon} size={13} />
                  </span>
                  <div className="feed-m">
                    <div className="feed-t"><b>{rule.label}</b></div>
                    <div className="feed-s"><span>{rule.detail}</span></div>
                  </div>
                  <span className="t-xs t-mut" style={{ alignSelf: 'center', marginRight: 4 }}>
                    {policy[rule.id] ? 'Enforced' : 'Off'}
                  </span>
                  <span style={{ alignSelf: 'center' }}>
                    <Switch
                      checked={policy[rule.id]}
                      onChange={(v) => setPolicyField(rule.id, v)}
                      label={rule.label}
                    />
                  </span>
                </div>
              ))}
            </Card>

            <Card title="Assurance" sub="What each enabled factor is permitted to satisfy">
              <KeyValue
                rows={[
                  { k: 'Sign-in', v: enabled.map((m) => m.name).join(', ') || 'No factor enabled', icon: 'shield' },
                  { k: 'Step-up for privileged operations', v: methods.filter((m) => m.enabled && (m.strength === 'strongest' || m.strength === 'strong')).map((m) => m.name).join(', ') || 'None', icon: 'key' },
                  { k: 'Self-service credential reset', v: methods.filter((m) => m.enabled && m.strength !== 'weakest').map((m) => m.name).join(', ') || 'None', icon: 'refresh' },
                  { k: 'Network trust', v: policy.untrustedNetwork ? 'Evaluated against the IP restriction policy' : 'Not evaluated', icon: 'noentry' },
                ]}
              />
              <div className="row" style={{ marginTop: 14 }}>
                <Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/ip/restriction/policy')}>IP restriction policy</Button>
                <Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/passwordPolicy')}>Password policy</Button>
              </div>
            </Card>

            <StickyActions dirty={policyDirty} message={policyDirty ? 'Unsaved policy changes' : 'No changes'}>
              <Button disabled={!policyDirty} onClick={() => { setPolicyDirty(false); toast('info', 'Changes discarded', 'The published policy is unchanged.') }}>Cancel</Button>
              <Button
                variant="pri"
                icon="save"
                disabled={!policyDirty}
                onClick={() => { setPolicyDirty(false); toast('ok', 'Policy published', 'Authentication policy is live across every SSO application.') }}
              >
                Save changes
              </Button>
            </StickyActions>
          </>
        )}

        {tab === 'enrollment' && (
          <>
            <div className="stat-strip">
              <div className="stat-cell">
                <span className="stat-k"><Icon name="users" size={12} />Enrolled</span>
                <span className="stat-v">{num(enrolStats.enrolled)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="key" size={12} />Hold a passkey</span>
                <span className="stat-v">{num(enrolStats.passkey)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="sms" size={12} />SMS without a passkey</span>
                <span className="stat-v">{num(enrolStats.smsOnly)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="warn" size={12} />Not enrolled</span>
                <span className="stat-v" style={{ color: enrolStats.none > 0 ? 'var(--warn-core)' : undefined }}>{num(enrolStats.none)}</span>
              </div>
            </div>

            <DataWorkbench
              id="mfa-enrollment"
              rows={enrollments}
              columns={enrolColumns}
              selectable
              searchPlaceholder="Search by username, email or organization…"
              bulkActions={enrolBulk}
              rowActions={enrolRowActions}
              toolbar={
                <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Every enrollment record is being written to CSV.')}>Export</Button>
              }
              emptyTitle="No identities match"
              emptyBody="Adjust the search to widen the result set."
              emptyIcon="users"
              footNote="Enrollment state synchronized with the directory 6 minutes ago"
            />
          </>
        )}
      </div>
    </>
  )
}
