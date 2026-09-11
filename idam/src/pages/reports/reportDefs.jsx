// Report catalog: one entry per report type. Each entry declares the filters it
// can honestly answer, the dataset it draws from and the columns it
// renders/exports.

import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { num, statusTone } from '../../lib/format'
import {
  SUCCESSFUL_LOGINS, FAILED_LOGINS, USER_ACCESS, LOCKED_ACCOUNTS,
  PASSWORD_RESETS, EMAIL_DELIVERY, SMS_DELIVERY, ROLE_MAPPING_LOGS,
  USER_GROUP_LOGS, SMS_OTP_LOGS, AUDIT_TRAIL,
  APPLICATION_OPTIONS, DEPARTMENT_OPTIONS, ORG_OPTIONS,
  authMethodOf, eventLabel, eventOptions, methodLabel, methodOptions, mfaFactorOf,
  optionsOf,
} from './reportData'

export const CATEGORIES = [
  { id: 'Access & Authentication', icon: 'unlock', blurb: 'Who signed in, from where, and what was refused.' },
  { id: 'Identity & Entitlements', icon: 'users', blurb: 'What every identity holds and which accounts are out of service.' },
  { id: 'Credentials & Notifications', icon: 'key', blurb: 'Credential lifecycle activity and outbound message delivery.' },
  { id: 'Audit & Compliance', icon: 'logs', blurb: 'Administrative activity retained for the auditor.' },
]

const dt = (r) => <span className="td-mono">{r.ts || '—'}</span>
const outcomePill = (v) => <Pill tone={statusTone(v === 'Failed' ? 'Failed' : v === 'Denied' ? 'Denied' : v === 'Completed' ? 'Succeeded' : v)} dot>{v}</Pill>

const LEVEL_TONE = { ERROR: 'bad', WARN: 'warn', INFO: 'ok', DEBUG: 'mut' }

/* ---------------------------------------------------------------- filters ---
   Four shapes cover every report. A closed set the data actually holds becomes
   a chooser — several values at once where picking two is a real question, one
   value where the list is long enough to need a dropdown. Free-form columns
   (a username fragment, part of an address) stay text. Nothing is declared for
   a column the report does not carry: an empty field that never matches is
   worse than an absent one. */

const dateOn = (label = 'Date range', field = 'ts', id = 'date') =>
  ({ id, label, type: 'dateRange', field })

const text = (id, label, fields, placeholder) =>
  ({ id, label, type: 'text', fields, placeholder })

const one = (id, label, field, options, placeholder) =>
  ({ id, label, type: 'select', field, options, placeholder })

const anyOf = (id, label, field, options) =>
  ({ id, label, type: 'multi', field, options })

const org = () => one('organization', 'Organization', 'organization', ORG_OPTIONS, 'All organizations')
const dept = () => one('department', 'Department', 'department', DEPARTMENT_OPTIONS, 'All departments')
const ipAddress = () => text('ip', 'IP address', ['ip'], 'Whole or partial address')

/* --------------------------------------------------------------- summaries ---
   What "Show details" says about a row without quoting the payload at it. The
   summary is a property of the report because only the report knows which
   recorded fields answer the question its reader is actually asking. */

const codeRow = (r) => ({
  k: 'Status code',
  icon: 'bolt',
  v: r.statusCode == null ? 'Nothing returned' : String(r.statusCode),
})

const sessionSummary = (r) => {
  const d = (r.response && Array.isArray(r.response.data) ? r.response.data[0] : null) || {}
  return [
    { k: 'Outcome', icon: 'checkC', node: outcomePill(r.outcome || 'Allowed') },
    codeRow(r),
    { k: 'Login method', icon: 'key', v: authMethodOf(r) ? methodLabel(authMethodOf(r)) : '—' },
    { k: 'Second factor', icon: 'shield', v: mfaFactorOf(r) === 'None' ? 'Not required' : mfaFactorOf(r) },
    { k: 'Application', icon: 'apps', v: r.application },
    { k: 'Client', icon: 'device', v: r.client },
    { k: 'Source IP', icon: 'globe', v: r.ip },
    { k: 'Session reference', icon: 'link', v: d.session_id },
    { k: 'Session lifetime', icon: 'clock', v: d.expires_in ? `${Math.round(d.expires_in / 60)} minutes` : '—' },
    { k: 'Trace reference', icon: 'tag', v: d.uniqueid },
  ]
}

const denialSummary = (r) => {
  const e = (r.response && r.response.error) || {}
  return [
    { k: 'Outcome', icon: 'noentry', node: outcomePill(r.outcome) },
    codeRow(r),
    { k: 'Failure reason', icon: 'warn', v: r.reason },
    { k: 'Attempts made', icon: 'refresh', v: String(r.attempts) },
    {
      k: 'Attempts remaining',
      icon: 'target',
      v: e.attempts_remaining == null ? '—' : String(e.attempts_remaining),
    },
    { k: 'Account locked', icon: 'lock', v: e.locked ? 'Yes — a manual unlock is required' : 'No' },
    { k: 'Retry allowed', icon: 'play', v: e.retryable === false ? 'No' : 'Yes' },
    { k: 'Application', icon: 'apps', v: r.application },
    { k: 'Source IP', icon: 'globe', v: r.ip },
    { k: 'Trace reference', icon: 'tag', v: ((r.response && r.response.data && r.response.data[0]) || {}).uniqueid },
  ]
}

const deliverySummary = (recipientLabel) => (r) => {
  const d = (r.response && Array.isArray(r.response.data) ? r.response.data[0] : null) || {}
  const failed = r.status !== 'Delivered'
  return [
    { k: 'Delivery status', icon: 'checkC', node: <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    codeRow(r),
    { k: recipientLabel, icon: 'at', v: r.recipient },
    { k: 'Sent for', icon: 'bell', v: eventLabel(r.event) },
    { k: 'Identity', icon: 'user', v: r.username },
    { k: 'Organization', icon: 'building', v: r.organization },
    { k: failed ? 'Failure reason' : 'Provider response', icon: failed ? 'warn' : 'info', v: r.detail },
    failed && { k: 'Retry allowed', icon: 'play', v: 'No — the provider rejected the message' },
    { k: 'Message reference', icon: 'tag', v: d.uniqueid },
  ]
}

export const REPORTS = [
  {
    id: 'successful-logins',
    name: 'Successful Login Logs',
    category: 'Access & Authentication',
    icon: 'unlock',
    tone: 'ok',
    description: 'Every identity that authenticated successfully, with the application, client and source address of the session.',
    summary: 'Sign-in successes',
    filters: [
      dateOn(),
      text('user', 'User', ['name', 'email'], 'Full name or email'),
      text('username', 'Username', ['username'], 'Whole or partial username'),
      ipAddress(),
      {
        id: 'method',
        label: 'Login method',
        type: 'multi',
        // Recorded on the grant, not on the row: how the session was proved.
        value: authMethodOf,
        options: methodOptions(SUCCESSFUL_LOGINS),
      },
      anyOf('client', 'Client', 'client', optionsOf(SUCCESSFUL_LOGINS, 'client')),
      anyOf('status', 'Status', 'outcome', optionsOf(SUCCESSFUL_LOGINS, 'outcome')),
      anyOf('source', 'Evidence source', 'source', optionsOf(SUCCESSFUL_LOGINS, 'source')),
      org(),
      one('application', 'Application', 'application', APPLICATION_OPTIONS, 'All applications'),
    ],
    rows: () => SUCCESSFUL_LOGINS,
    stats: (rows) => [
      { k: 'Sign-ins', v: num(rows.length), icon: 'unlock' },
      { k: 'Distinct identities', v: num(new Set(rows.map((r) => r.username)).size), icon: 'users' },
      { k: 'Applications', v: num(new Set(rows.map((r) => r.application)).size), icon: 'apps' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'organization', label: 'Organization' },
      { key: 'department', label: 'Department' },
      { key: 'application', label: 'Application', render: (r) => <Tag>{r.application}</Tag> },
      { key: 'client', label: 'Client' },
      { key: 'ip', label: 'Source IP', cls: 'td-mono' },
      {
        key: 'statusCode', label: 'Status code', align: 'right', cls: 'td-mono',
        render: (r) => (r.statusCode == null ? <Pill tone="bad">N/A</Pill> : <span className="num">{r.statusCode}</span>),
        csv: (r) => (r.statusCode == null ? 'N/A' : r.statusCode),
      },
      { key: 'source', label: 'Evidence', render: (r) => <Tag>{r.source}</Tag> },
    ],
    detail: {
      kind: 'response',
      label: 'Session',
      column: 'Session',
      summary: sessionSummary,
      note: 'What the platform issued when it let this sign-in through.',
    },
  },
  {
    id: 'failed-logins',
    name: 'Failed Login Attempts',
    category: 'Access & Authentication',
    icon: 'noentry',
    tone: 'bad',
    description: 'Authentication failures and denials grouped by identity, reason and source network.',
    summary: 'Sign-in failures',
    filters: [
      dateOn(),
      text('username', 'Username', ['username'], 'Whole or partial username'),
      ipAddress(),
      one('reason', 'Failure reason', 'reason', optionsOf(FAILED_LOGINS, 'reason'), 'Any reason'),
      anyOf('outcome', 'Outcome', 'outcome', optionsOf(FAILED_LOGINS, 'outcome')),
      anyOf('statusCode', 'Status code', 'statusCode', optionsOf(FAILED_LOGINS, 'statusCode')),
      org(),
      dept(),
      one('application', 'Application', 'application', APPLICATION_OPTIONS, 'All applications'),
    ],
    rows: () => FAILED_LOGINS,
    stats: (rows) => [
      { k: 'Failures', v: num(rows.length), icon: 'noentry' },
      { k: 'Identities affected', v: num(new Set(rows.map((r) => r.username)).size), icon: 'users' },
      { k: 'Total attempts', v: num(rows.reduce((a, r) => a + r.attempts, 0)), icon: 'refresh' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'organization', label: 'Organization' },
      { key: 'department', label: 'Department' },
      { key: 'application', label: 'Application', render: (r) => <Tag>{r.application}</Tag> },
      { key: 'reason', label: 'Reason' },
      { key: 'attempts', label: 'Attempts', align: 'right', render: (r) => <span className="num">{r.attempts}</span> },
      { key: 'ip', label: 'Source IP', cls: 'td-mono' },
      {
        key: 'statusCode', label: 'Status code', align: 'right', cls: 'td-mono',
        render: (r) => (r.statusCode == null ? <Pill tone="bad">N/A</Pill> : <span className="num">{r.statusCode}</span>),
        csv: (r) => (r.statusCode == null ? 'N/A' : r.statusCode),
      },
      { key: 'outcome', label: 'Outcome', render: (r) => outcomePill(r.outcome) },
    ],
    detail: {
      kind: 'response',
      label: 'Denial',
      column: 'Denial',
      summary: denialSummary,
      note: 'Why the platform refused this attempt, and what it left open.',
    },
  },
  {
    id: 'user-access',
    name: 'User Access Report',
    category: 'Identity & Entitlements',
    icon: 'users',
    tone: 'acc',
    description: 'Every identity with the groups and entitlements it holds, the applications reached and any toxic combinations.',
    summary: 'Identities and entitlements',
    filters: [
      text('user', 'User', ['username', 'name', 'email'], 'Username, name or email'),
      org(),
      dept(),
      anyOf('employeeType', 'Identity type', 'employeeType', optionsOf(USER_ACCESS, 'employeeType')),
      anyOf('status', 'Status', 'status', optionsOf(USER_ACCESS, 'status')),
      text('entitlement', 'Entitlement', ['groups'], 'Group name, whole or partial'),
      {
        id: 'application',
        label: 'Application reached',
        type: 'select',
        options: APPLICATION_OPTIONS,
        placeholder: 'All applications',
        // The row flattens the set of applications to one string, so the match
        // is containment rather than equality.
        match: (r, v) => String(r.applications || '').includes(v),
      },
      {
        id: 'privileged',
        label: 'Privilege',
        type: 'select',
        options: [
          { value: 'yes', label: 'Privileged only' },
          { value: 'no', label: 'Standard only' },
        ],
        placeholder: 'Any privilege',
        match: (r, v) => (v === 'yes' ? r.privileged : !r.privileged),
      },
      {
        id: 'sod',
        label: 'Segregation of duties',
        type: 'select',
        options: [
          { value: 'flagged', label: 'With open conflicts' },
          { value: 'clear', label: 'No conflicts' },
        ],
        placeholder: 'Any',
        match: (r, v) => (v === 'flagged' ? r.sodFlags > 0 : r.sodFlags === 0),
      },
      dateOn('Last sign-in', 'lastLogin', 'lastLogin'),
    ],
    rows: () => USER_ACCESS,
    stats: (rows) => [
      { k: 'Identities', v: num(rows.length), icon: 'users' },
      { k: 'Entitlements held', v: num(rows.reduce((a, r) => a + r.groupCount, 0)), icon: 'group' },
      { k: 'Privileged', v: num(rows.filter((r) => r.privileged).length), icon: 'shield' },
      { k: 'SoD flags', v: num(rows.reduce((a, r) => a + r.sodFlags, 0)), icon: 'sod' },
    ],
    columns: [
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'organization', label: 'Organization' },
      { key: 'department', label: 'Department' },
      { key: 'employeeType', label: 'Type', render: (r) => <Tag>{r.employeeType}</Tag> },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
      { key: 'groupCount', label: 'Groups', align: 'right', render: (r) => <span className="num">{r.groupCount}</span> },
      { key: 'groups', label: 'Entitlements', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 320 }} title={r.groups}>{r.groups}</span> },
      { key: 'applications', label: 'Applications', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 240 }} title={r.applications}>{r.applications}</span> },
      { key: 'privileged', label: 'Privileged', render: (r) => (r.privileged ? <Pill tone="warn" dot>Privileged</Pill> : <span className="t-faint">Standard</span>), csv: (r) => (r.privileged ? 'Yes' : 'No') },
      { key: 'manager', label: 'Manager' },
      { key: 'lastLogin', label: 'Last sign-in', cls: 'td-mono' },
    ],
    detail: { kind: 'lists', label: 'Access', column: 'Access' },
  },
  {
    id: 'locked-accounts',
    name: 'Locked / Disabled Accounts',
    category: 'Identity & Entitlements',
    icon: 'lock',
    tone: 'warn',
    description: 'Accounts the directory refuses to authenticate, how long they have been dormant and the entitlements they still hold.',
    summary: 'Out-of-service accounts',
    filters: [
      text('user', 'User', ['username', 'name', 'email'], 'Username, name or email'),
      anyOf('status', 'Account state', 'status', optionsOf(LOCKED_ACCOUNTS, 'status')),
      one('reason', 'Reason', 'reason', optionsOf(LOCKED_ACCOUNTS, 'reason'), 'Any reason'),
      org(),
      dept(),
      anyOf('employeeType', 'Identity type', 'employeeType', optionsOf(LOCKED_ACCOUNTS, 'employeeType')),
      {
        id: 'dormant',
        label: 'Dormant for',
        type: 'select',
        options: [30, 60, 90, 180].map((d) => ({ value: String(d), label: `${d} days or more` })),
        placeholder: 'Any length',
        match: (r, v) => (r.dormantDays ?? 0) >= Number(v),
      },
      dateOn('Last sign-in', 'lastLogin', 'lastLogin'),
    ],
    rows: () => LOCKED_ACCOUNTS,
    stats: (rows) => [
      { k: 'Accounts', v: num(rows.length), icon: 'lock' },
      { k: 'Locked', v: num(rows.filter((r) => r.status === 'Locked').length), icon: 'noentry' },
      { k: 'Disabled', v: num(rows.filter((r) => r.status === 'Disabled').length), icon: 'ban' },
      { k: 'Entitlements still held', v: num(rows.reduce((a, r) => a + r.entitlements, 0)), icon: 'group' },
    ],
    columns: [
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'organization', label: 'Organization' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
      { key: 'reason', label: 'Reason', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 300 }} title={r.reason}>{r.reason}</span> },
      { key: 'lastLogin', label: 'Last sign-in', cls: 'td-mono' },
      { key: 'dormantDays', label: 'Dormant', align: 'right', render: (r) => <span className="num">{r.dormantDays == null ? '—' : `${r.dormantDays} d`}</span> },
      { key: 'entitlements', label: 'Entitlements', align: 'right', render: (r) => <span className="num">{r.entitlements}</span> },
    ],
    detail: { kind: 'changes', label: 'State change', column: 'State change' },
  },
  {
    id: 'password-resets',
    name: 'Password Reset Activity',
    category: 'Credentials & Notifications',
    icon: 'key',
    tone: 'acc',
    description: 'Credential resets by channel, who performed them and whether the identity was successfully notified.',
    summary: 'Credential resets',
    filters: [
      dateOn(),
      text('username', 'Username', ['username'], 'Whole or partial username'),
      anyOf('channel', 'Channel', 'channel', optionsOf(PASSWORD_RESETS, 'channel')),
      anyOf('outcome', 'Outcome', 'outcome', optionsOf(PASSWORD_RESETS, 'outcome')),
      text('performedBy', 'Performed by', ['performedBy'], 'Operator or system account'),
      ipAddress(),
      org(),
      dept(),
    ],
    rows: () => PASSWORD_RESETS,
    stats: (rows) => [
      { k: 'Resets', v: num(rows.length), icon: 'key' },
      { k: 'Identities', v: num(new Set(rows.map((r) => r.username)).size), icon: 'users' },
      { k: 'Self-service', v: num(rows.filter((r) => r.channel === 'Self-service portal').length), icon: 'refresh' },
      { k: 'Not completed', v: num(rows.filter((r) => r.outcome !== 'Completed').length), icon: 'warn' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'organization', label: 'Organization' },
      { key: 'department', label: 'Department' },
      { key: 'channel', label: 'Channel', render: (r) => <Tag>{r.channel}</Tag> },
      { key: 'performedBy', label: 'Performed by', cls: 'td-mono' },
      { key: 'ip', label: 'Source IP', cls: 'td-mono' },
      { key: 'outcome', label: 'Outcome', render: (r) => outcomePill(r.outcome) },
    ],
    detail: { kind: 'changes', label: 'Credential change', column: 'Changes' },
  },
  {
    id: 'email-delivery',
    name: 'Email Delivery Logs',
    category: 'Credentials & Notifications',
    icon: 'mail',
    tone: 'acc',
    description: 'Every email the platform dispatched, the triggering event and the response returned by the mail relay.',
    summary: 'Email delivery',
    filters: [
      dateOn(),
      text('recipient', 'Recipient', ['recipient'], 'Mailbox, whole or partial'),
      /* The register stores one event key per message, and that key is also the
         template the message was rendered from — so "email type" and "event"
         are the same column here rather than two. */
      one('event', 'Email type / event', 'event', eventOptions(EMAIL_DELIVERY), 'All types'),
      anyOf('status', 'Delivery status', 'status', optionsOf(EMAIL_DELIVERY, 'status')),
      anyOf('statusCode', 'Relay status code', 'statusCode', optionsOf(EMAIL_DELIVERY, 'statusCode')),
      one('detail', 'Failure reason', 'detail',
        optionsOf(EMAIL_DELIVERY.filter((r) => r.status !== 'Delivered'), 'detail'), 'Any reason'),
      text('username', 'Username', ['username'], 'Whole or partial username'),
      org(),
    ],
    rows: () => EMAIL_DELIVERY,
    stats: (rows) => [
      { k: 'Emails sent', v: num(rows.length), icon: 'mail' },
      { k: 'Delivered', v: num(rows.filter((r) => r.status === 'Delivered').length), icon: 'checkC' },
      { k: 'Failed', v: num(rows.filter((r) => r.status === 'Failed').length), icon: 'warn' },
      { k: 'Recipients', v: num(new Set(rows.map((r) => r.recipient)).size), icon: 'users' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'event', label: 'Event', cls: 'td-mono' },
      { key: 'recipient', label: 'Mailbox', cls: 'td-main', locked: true },
      { key: 'username', label: 'Username' },
      { key: 'organization', label: 'Organization' },
      {
        key: 'statusCode', label: 'Status code', align: 'right', cls: 'td-mono',
        render: (r) => (r.statusCode == null ? <Pill tone="bad">N/A</Pill> : <span className="num">{r.statusCode}</span>),
        csv: (r) => (r.statusCode == null ? 'N/A' : r.statusCode),
      },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
      { key: 'detail', label: 'Relay response', cls: 'td-mono' },
    ],
    detail: {
      kind: 'response',
      label: 'Response',
      column: 'Response',
      summary: deliverySummary('Mailbox'),
      note: 'What the mail relay recorded for this message.',
    },
  },
  {
    id: 'sms-delivery',
    name: 'SMS Delivery Logs',
    category: 'Credentials & Notifications',
    icon: 'sms',
    tone: 'acc',
    description: 'Every SMS the platform dispatched, the triggering event and the response returned by the gateway.',
    summary: 'SMS delivery',
    filters: [
      dateOn(),
      text('recipient', 'Mobile number', ['recipient'], 'Digits, whole or partial'),
      one('event', 'SMS type / event', 'event', eventOptions(SMS_DELIVERY), 'All types'),
      anyOf('status', 'Delivery status', 'status', optionsOf(SMS_DELIVERY, 'status')),
      anyOf('statusCode', 'Gateway status code', 'statusCode', optionsOf(SMS_DELIVERY, 'statusCode')),
      one('detail', 'Failure reason', 'detail',
        optionsOf(SMS_DELIVERY.filter((r) => r.status !== 'Delivered'), 'detail'), 'Any reason'),
      text('username', 'Username', ['username'], 'Whole or partial username'),
      org(),
    ],
    rows: () => SMS_DELIVERY,
    stats: (rows) => [
      { k: 'Messages sent', v: num(rows.length), icon: 'sms' },
      { k: 'Delivered', v: num(rows.filter((r) => r.status === 'Delivered').length), icon: 'checkC' },
      { k: 'Failed', v: num(rows.filter((r) => r.status === 'Failed').length), icon: 'warn' },
      { k: 'Handsets', v: num(new Set(rows.map((r) => r.recipient)).size), icon: 'users' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'event', label: 'Event', cls: 'td-mono' },
      { key: 'recipient', label: 'Mobile number', cls: 'td-main', locked: true },
      { key: 'username', label: 'Username' },
      { key: 'organization', label: 'Organization' },
      {
        key: 'statusCode', label: 'Status code', align: 'right', cls: 'td-mono',
        render: (r) => (r.statusCode == null ? <Pill tone="bad">N/A</Pill> : <span className="num">{r.statusCode}</span>),
        csv: (r) => (r.statusCode == null ? 'N/A' : r.statusCode),
      },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
      { key: 'detail', label: 'Gateway response', cls: 'td-mono' },
    ],
    detail: {
      kind: 'response',
      label: 'Response',
      column: 'Response',
      summary: deliverySummary('Mobile number'),
      note: 'What the SMS gateway recorded for this message.',
    },
  },
  {
    id: 'sms-otp',
    name: 'SMS-OTP Log Report',
    category: 'Credentials & Notifications',
    icon: 'key',
    tone: 'warn',
    description: 'One-time passcodes issued over SMS, what they were issued for and whether the identity completed the challenge.',
    summary: 'One-time passcodes',
    filters: [
      dateOn(),
      text('user', 'User', ['username', 'name'], 'Username or name'),
      text('mobile', 'Mobile number', ['mobile'], 'Digits, whole or partial'),
      anyOf('purpose', 'Issued for', 'purpose', optionsOf(SMS_OTP_LOGS, 'purpose')),
      anyOf('gateway', 'Gateway', 'gateway', optionsOf(SMS_OTP_LOGS, 'gateway')),
      anyOf('status', 'Status', 'status', optionsOf(SMS_OTP_LOGS, 'status')),
      org(),
    ],
    rows: () => SMS_OTP_LOGS,
    stats: (rows) => [
      { k: 'Codes issued', v: num(rows.length), icon: 'key' },
      { k: 'Verified', v: num(rows.filter((r) => r.status === 'Verified').length), icon: 'checkC' },
      { k: 'Expired', v: num(rows.filter((r) => r.status === 'Expired').length), icon: 'clock' },
      { k: 'Failed', v: num(rows.filter((r) => r.status === 'Failed').length), icon: 'warn' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'mobile', label: 'Mobile number', cls: 'td-mono' },
      { key: 'purpose', label: 'Issued for', render: (r) => <Tag>{r.purpose}</Tag> },
      { key: 'gateway', label: 'Gateway' },
      { key: 'attempts', label: 'Attempts', align: 'right' },
      { key: 'validity', label: 'Validity' },
      { key: 'organization', label: 'Organization', optional: true },
      {
        // The gateway's own answer to the send, which is a different question
        // from whether the identity then completed the challenge.
        key: 'statusCode', label: 'Status code', align: 'right', cls: 'td-mono',
        render: (r) => (r.statusCode == null
          ? <Pill tone="bad">N/A</Pill>
          : <span className="num">{r.statusCode}</span>),
        csv: (r) => (r.statusCode == null ? 'N/A' : r.statusCode),
      },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status === 'Verified' ? 'Succeeded' : r.status)} dot>{r.status}</Pill> },
      { key: 'detail', label: 'Detail', cls: 'td-mono' },
    ],
    detail: {
      kind: 'response',
      label: 'Response',
      column: 'Response',
      /* The only report that exposes the payload. An OTP that never arrived is
         chased with the gateway, and the gateway asks for its own document
         back — so this one report keeps it, and every other report shows the
         fields a reader can act on instead. */
      raw: true,
      summary: (r) => [
        { k: 'Challenge status', icon: 'checkC', node: <Pill tone={statusTone(r.status === 'Verified' ? 'Succeeded' : r.status)} dot>{r.status}</Pill> },
        codeRow(r),
        { k: 'Issued for', icon: 'key', v: r.purpose },
        { k: 'Gateway', icon: 'cloud', v: r.gateway },
        { k: 'Mobile number', icon: 'phone', v: r.mobile },
        { k: 'Attempts', icon: 'refresh', v: String(r.attempts) },
        { k: 'Validity', icon: 'clock', v: r.validity },
        { k: 'Detail', icon: 'info', v: r.detail },
      ],
      note: 'The send, the challenge, and the document the gateway returned.',
    },
  },
  {
    id: 'role-mapping',
    name: 'Role Mapping Logs',
    category: 'Identity & Entitlements',
    icon: 'roles',
    tone: 'viol',
    description: 'Every role assigned to or revoked from an identity, who made the change and how it was authorised.',
    summary: 'Role assignment activity',
    filters: [
      dateOn(),
      text('user', 'User', ['username', 'name'], 'Username or name'),
      one('role', 'Role', 'role', optionsOf(ROLE_MAPPING_LOGS, 'role'), 'All roles'),
      one('scope', 'Scope', 'scope', optionsOf(ROLE_MAPPING_LOGS, 'scope'), 'All scopes'),
      anyOf('operation', 'Operation', 'operation', optionsOf(ROLE_MAPPING_LOGS, 'operation')),
      anyOf('source', 'Raised by', 'source', optionsOf(ROLE_MAPPING_LOGS, 'source')),
      anyOf('status', 'Status', 'status', optionsOf(ROLE_MAPPING_LOGS, 'status')),
      one('actor', 'Performed by', 'actor', optionsOf(ROLE_MAPPING_LOGS, 'actor'), 'Anyone'),
      org(),
    ],
    rows: () => ROLE_MAPPING_LOGS,
    stats: (rows) => [
      { k: 'Changes', v: num(rows.length), icon: 'roles' },
      { k: 'Assigned', v: num(rows.filter((r) => r.operation === 'Assigned').length), icon: 'plus' },
      { k: 'Revoked', v: num(rows.filter((r) => r.operation === 'Revoked').length), icon: 'ban' },
      { k: 'Identities', v: num(new Set(rows.map((r) => r.username)).size), icon: 'users' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role', render: (r) => <Tag>{r.role}</Tag> },
      { key: 'scope', label: 'Scope' },
      { key: 'operation', label: 'Operation', render: (r) => <Pill tone={r.operation === 'Revoked' ? 'bad' : 'ok'} dot>{r.operation}</Pill> },
      { key: 'source', label: 'Raised by' },
      { key: 'actor', label: 'Performed by', cls: 'td-mono' },
      { key: 'organization', label: 'Organization', optional: true },
      { key: 'status', label: 'Status', render: (r) => outcomePill(r.status) },
      { key: 'detail', label: 'Detail', cls: 'td-mono' },
    ],
    detail: { kind: 'changes', label: 'Binding change', column: 'Changes' },
  },
  {
    id: 'user-group',
    name: 'User-Group Logs',
    category: 'Identity & Entitlements',
    icon: 'groups',
    tone: 'acc',
    description: 'Group membership granted to or revoked from an identity, with the application the group belongs to.',
    summary: 'Group membership activity',
    filters: [
      dateOn(),
      text('user', 'User', ['username', 'name'], 'Username or name'),
      one('group', 'Group', 'group', optionsOf(USER_GROUP_LOGS, 'group'), 'All groups'),
      anyOf('kind', 'Group kind', 'kind', optionsOf(USER_GROUP_LOGS, 'kind')),
      one('application', 'Application', 'application', optionsOf(USER_GROUP_LOGS, 'application'), 'All applications'),
      anyOf('operation', 'Operation', 'operation', optionsOf(USER_GROUP_LOGS, 'operation')),
      anyOf('source', 'Raised by', 'source', optionsOf(USER_GROUP_LOGS, 'source')),
      anyOf('status', 'Status', 'status', optionsOf(USER_GROUP_LOGS, 'status')),
      one('actor', 'Performed by', 'actor', optionsOf(USER_GROUP_LOGS, 'actor'), 'Anyone'),
      org(),
    ],
    rows: () => USER_GROUP_LOGS,
    stats: (rows) => [
      { k: 'Changes', v: num(rows.length), icon: 'groups' },
      { k: 'Added', v: num(rows.filter((r) => r.operation === 'Added').length), icon: 'plus' },
      { k: 'Removed', v: num(rows.filter((r) => r.operation === 'Removed').length), icon: 'ban' },
      { k: 'Groups touched', v: num(new Set(rows.map((r) => r.group)).size), icon: 'layers' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'username', label: 'Username', cls: 'td-main', locked: true },
      { key: 'name', label: 'Name' },
      { key: 'group', label: 'Group', cls: 'td-mono' },
      { key: 'kind', label: 'Kind', render: (r) => <Tag>{r.kind}</Tag> },
      { key: 'application', label: 'Application' },
      { key: 'operation', label: 'Operation', render: (r) => <Pill tone={r.operation === 'Removed' ? 'bad' : 'ok'} dot>{r.operation}</Pill> },
      { key: 'source', label: 'Raised by' },
      { key: 'actor', label: 'Performed by', cls: 'td-mono' },
      { key: 'organization', label: 'Organization', optional: true },
      { key: 'status', label: 'Status', render: (r) => outcomePill(r.status) },
      { key: 'detail', label: 'Detail', cls: 'td-mono' },
    ],
    detail: { kind: 'changes', label: 'Membership change', column: 'Changes' },
  },
  {
    id: 'audit-trail',
    name: 'Admin Audit Trail',
    category: 'Audit & Compliance',
    icon: 'logs',
    tone: 'viol',
    description: 'Administrative and platform activity retained for the auditor, excluding routine sign-in noise.',
    summary: 'Administrative activity',
    filters: [
      dateOn(),
      text('actor', 'Actor', ['actor'], 'Username or system account'),
      anyOf('level', 'Level', 'level', optionsOf(AUDIT_TRAIL, 'level')),
      one('category', 'Event category', 'category', optionsOf(AUDIT_TRAIL, 'category'), 'All categories'),
      one('action', 'Action', 'action', optionsOf(AUDIT_TRAIL, 'action'), 'All actions'),
      anyOf('outcome', 'Outcome', 'outcome', optionsOf(AUDIT_TRAIL, 'outcome')),
      text('target', 'Target', ['target'], 'Group, application or record'),
      ipAddress(),
      org(),
    ],
    rows: () => AUDIT_TRAIL,
    stats: (rows) => [
      { k: 'Events', v: num(rows.length), icon: 'logs' },
      { k: 'Actors', v: num(new Set(rows.map((r) => r.actor)).size), icon: 'users' },
      { k: 'Denied', v: num(rows.filter((r) => r.outcome === 'Denied').length), icon: 'noentry' },
      { k: 'Errors', v: num(rows.filter((r) => r.level === 'ERROR').length), icon: 'warn' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'level', label: 'Level', render: (r) => <Pill tone={LEVEL_TONE[r.level] || 'mut'}>{r.level}</Pill> },
      { key: 'category', label: 'Category', render: (r) => <Tag>{r.category}</Tag> },
      { key: 'actor', label: 'Actor', cls: 'td-main', locked: true },
      { key: 'organization', label: 'Organization' },
      { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 240 }} title={r.target}>{r.target}</span> },
      { key: 'ip', label: 'Source IP', cls: 'td-mono' },
      { key: 'outcome', label: 'Outcome', render: (r) => outcomePill(r.outcome) },
    ],
    detail: { kind: 'changes', label: 'Changes', column: 'Changes' },
  },
]

export const reportById = (id) => REPORTS.find((r) => r.id === id) || null
