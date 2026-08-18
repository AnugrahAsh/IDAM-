// Report catalog: one entry per report type. Each entry declares which filters
// it honours, the dataset it draws from and the columns it renders/exports.

import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { num, statusTone } from '../../lib/format'
import {
  SUCCESSFUL_LOGINS, FAILED_LOGINS, USER_ACCESS, LOCKED_ACCOUNTS,
  PASSWORD_RESETS, DELIVERY_REPORT, AUDIT_TRAIL, niceDate, optionsOf,
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

export const REPORTS = [
  {
    id: 'successful-logins',
    name: 'Successful Login Logs',
    category: 'Access & Authentication',
    icon: 'unlock',
    tone: 'ok',
    description: 'Every identity that authenticated successfully, with the application, client and source address of the session.',
    summary: 'Sign-in successes',
    filters: ['dateRange', 'user', 'org', 'application'],
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
      { key: 'source', label: 'Evidence', render: (r) => <Tag>{r.source}</Tag> },
    ],
  },
  {
    id: 'failed-logins',
    name: 'Failed Login Attempts',
    category: 'Access & Authentication',
    icon: 'noentry',
    tone: 'bad',
    description: 'Authentication failures and denials grouped by identity, reason and source network.',
    summary: 'Sign-in failures',
    filters: ['dateRange', 'user', 'org', 'application', 'outcome'],
    outcomeOptions: optionsOf(FAILED_LOGINS, 'outcome'),
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
      { key: 'outcome', label: 'Outcome', render: (r) => outcomePill(r.outcome) },
    ],
  },
  {
    id: 'user-access',
    name: 'User Access Report',
    category: 'Identity & Entitlements',
    icon: 'users',
    tone: 'acc',
    description: 'Every identity with the groups and entitlements it holds, the applications reached and any toxic combinations.',
    summary: 'Identities and entitlements',
    filters: ['user', 'org', 'status'],
    statusOptions: optionsOf(USER_ACCESS, 'status'),
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
  },
  {
    id: 'locked-accounts',
    name: 'Locked / Disabled Accounts',
    category: 'Identity & Entitlements',
    icon: 'lock',
    tone: 'warn',
    description: 'Accounts the directory refuses to authenticate, how long they have been dormant and the entitlements they still hold.',
    summary: 'Out-of-service accounts',
    filters: ['user', 'org', 'status'],
    statusOptions: optionsOf(LOCKED_ACCOUNTS, 'status'),
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
  },
  {
    id: 'password-resets',
    name: 'Password Reset Activity',
    category: 'Credentials & Notifications',
    icon: 'key',
    tone: 'acc',
    description: 'Credential resets by channel, who performed them and whether the identity was successfully notified.',
    summary: 'Credential resets',
    filters: ['dateRange', 'user', 'org', 'outcome'],
    outcomeOptions: optionsOf(PASSWORD_RESETS, 'outcome'),
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
  },
  {
    id: 'delivery',
    name: 'Notification Delivery Report',
    category: 'Credentials & Notifications',
    icon: 'comms',
    tone: 'acc',
    description: 'Every SMS and email the platform dispatched, the triggering event and the gateway response.',
    summary: 'SMS and email delivery',
    filters: ['dateRange', 'user', 'org', 'channel', 'status'],
    channelOptions: optionsOf(DELIVERY_REPORT, 'channel'),
    statusOptions: optionsOf(DELIVERY_REPORT, 'status'),
    rows: () => DELIVERY_REPORT,
    stats: (rows) => [
      { k: 'Messages', v: num(rows.length), icon: 'comms' },
      { k: 'Email', v: num(rows.filter((r) => r.channel === 'Email').length), icon: 'mail' },
      { k: 'SMS', v: num(rows.filter((r) => r.channel === 'SMS').length), icon: 'sms' },
      { k: 'Failed', v: num(rows.filter((r) => r.status === 'Failed').length), icon: 'warn' },
    ],
    columns: [
      { key: 'ts', label: 'Timestamp', cls: 'td-mono', render: dt },
      { key: 'channel', label: 'Channel', render: (r) => <Tag tone={r.channel === 'SMS' ? 'acc' : undefined}>{r.channel}</Tag> },
      { key: 'event', label: 'Event', cls: 'td-mono' },
      { key: 'recipient', label: 'Recipient', cls: 'td-main', locked: true },
      { key: 'username', label: 'Username' },
      { key: 'organization', label: 'Organization' },
      { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
      { key: 'detail', label: 'Gateway response', cls: 'td-mono' },
    ],
  },
  {
    id: 'audit-trail',
    name: 'Admin Audit Trail',
    category: 'Audit & Compliance',
    icon: 'logs',
    tone: 'viol',
    description: 'Administrative and platform activity retained for the auditor, excluding routine sign-in noise.',
    summary: 'Administrative activity',
    filters: ['dateRange', 'user', 'category', 'outcome'],
    outcomeOptions: optionsOf(AUDIT_TRAIL, 'outcome'),
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
  },
]

export const reportById = (id) => REPORTS.find((r) => r.id === id) || null

export const AUDIT_CATEGORIES = [...new Set(AUDIT_TRAIL.map((r) => r.category))].sort()

export const rangeLabel = (from, to) => {
  if (!from && !to) return 'All time'
  if (from && to) return `${niceDate(from)} – ${niceDate(to)}`
  if (from) return `From ${niceDate(from)}`
  return `Up to ${niceDate(to)}`
}
