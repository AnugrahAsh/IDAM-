import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tabs from '../../components/primitives/Tabs'
import KeyValue from '../../components/primitives/KeyValue'
import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import SearchSelect from '../../components/primitives/SearchSelect'
import TextInput from '../../components/primitives/TextInput'
import Meter from '../../components/primitives/Meter'
import EmptyState from '../../components/primitives/EmptyState'
import MemberCsv from './MemberCsv'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { GroupPanelSkeleton, GroupRecordSkeleton } from './GroupsSkeleton'
import { DIRECTORIES, POLICIES, REQUESTS, ROLES, SOD_RULES, USERS } from '../../data/seed'

export const TAB_IDS = ['information', 'members', 'schedule', 'sod', 'activity']

export const dayOf = (n) => new Date(Date.UTC(2026, 7, 5) - n * 86400000).toISOString().slice(0, 10)

const SOURCES = [
  { id: 'direct', label: 'Direct assignment', icon: 'user', tone: 'mut' },
  { id: 'policy', label: 'Dynamic policy', icon: 'policy', tone: 'info' },
  { id: 'role', label: 'Role inheritance', icon: 'roles', tone: 'acc' },
  { id: 'request', label: 'Access request', icon: 'request', tone: 'ok' },
  { id: 'directory', label: 'Directory synchronization', icon: 'directory', tone: 'mut' },
  { id: 'schedule', label: 'Time-bound grant', icon: 'calendar', tone: 'warn' },
]

export const SOURCE_LABELS = SOURCES.map((s) => s.label)

const SOURCE_ROUTE = {
  policy: '/iam/dynamicPolicy',
  role: '/iam/roles',
  request: '/iam/requests',
  directory: '/iam/ldapapplications',
}

const STATE_TONE = { Active: 'ok', Expiring: 'warn', Dormant: 'mut', 'Pending sync': 'info' }
const GRANT_TONE = { Active: 'ok', Scheduled: 'info', Expired: 'mut', Revoked: 'bad' }

const CONFLICT_RULES = SOD_RULES.filter((r) => r.type === 'Anti-affinity')

const JUSTIFICATIONS = [
  'Quarter-end close cover for the finance desk.',
  'Incident 4821 remediation, approved by the change board.',
  'Parental leave cover for the accountable owner.',
  'Audit evidence collection for the current campaign.',
  'Project onboarding, reviewed at the next attestation.',
  'Vendor migration cutover window.',
]

const detailFor = (kind, group, i) => {
  if (kind === 'policy') return POLICIES[(group.id + i) % POLICIES.length].name
  if (kind === 'role') return ROLES[(group.id + i * 2) % ROLES.length].name
  if (kind === 'request') return REQUESTS[(group.id * 3 + i) % REQUESTS.length].id
  if (kind === 'directory') return DIRECTORIES[(group.id + i) % DIRECTORIES.length].displayName
  if (kind === 'schedule') return 'Approved window, auto-revoked at expiry'
  return 'Assigned by an administrator'
}

const actorFor = (kind) =>
  kind === 'policy' ? 'policy engine' : kind === 'directory' ? 'directory sync' : kind === 'role' ? 'role engine' : 'SHUBHAM_JAIN'

export function memberRoster(group, stride = 5, cap = 18) {
  if (!group || !group.members) return []
  const size = Math.min(cap, group.members)
  return Array.from({ length: size }, (_, i) => {
    const u = USERS[(group.id * 13 + i * stride) % USERS.length]
    const src = SOURCES[(group.id * 4 + i * 5) % SOURCES.length]
    const grantedDays = 4 + ((group.id * 17 + i * 23) % 470)
    const timeBound = src.id === 'schedule'
    const aheadDays = timeBound ? 3 + ((i * 11 + group.id * 5) % 64) : null
    const lastUsedDays = (i + group.id) % 7 === 0 ? 94 + ((i * 13) % 130) : (i * 3 + group.id) % 22
    const state = timeBound && aheadDays <= 14
      ? 'Expiring'
      : lastUsedDays > 90
        ? 'Dormant'
        : (i + group.id) % 11 === 0
          ? 'Pending sync'
          : 'Active'
    return {
      id: `${group.id}-${u.id}`,
      userId: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      department: u.department,
      employeeType: u.employeeType,
      organization: u.organization,
      designation: u.designation,
      sourceKind: src.id,
      source: src.label,
      sourceIcon: src.icon,
      sourceTone: src.tone,
      sourceDetail: detailFor(src.id, group, i),
      grantedOn: dayOf(grantedDays),
      grantedDays,
      grantedBy: actorFor(src.id),
      expiresOn: timeBound ? dayOf(-aheadDays) : null,
      expiresInDays: aheadDays,
      // The longest-standing permanent member holds the primary by default,
      // which is what the target reports back on a reconciliation run.
      primary: i === 0 && !timeBound,
      lastUsed: dayOf(lastUsedDays),
      lastUsedDays,
      state,
    }
  })
}

export function scheduleFor(group, stride = 7) {
  if (!group) return []
  const count = 2 + (group.id % 4)
  return Array.from({ length: count }, (_, i) => {
    const u = USERS[(group.id * stride + i * 11) % USERS.length]
    const startDays = 46 - i * 21 - (group.id % 11)
    const length = 7 + ((group.id + i * 5) % 44)
    const endDays = startDays - length
    const status = startDays < 0 ? 'Scheduled' : endDays > 0 ? 'Expired' : 'Active'
    return {
      id: `${group.id}-s${i}`,
      userId: u.id,
      username: u.username,
      department: u.department,
      employeeType: u.employeeType,
      firstName: u.firstName,
      lastName: u.lastName,
      from: dayOf(startDays),
      to: dayOf(endDays),
      days: length,
      status,
      requestedBy: REQUESTS[(group.id + i * 3) % REQUESTS.length].requester,
      ticket: REQUESTS[(group.id + i * 3) % REQUESTS.length].id,
      approvedBy: group.owner,
      justification: JUSTIFICATIONS[(group.id + i) % JUSTIFICATIONS.length],
      autoRevoke: true,
    }
  })
}

export function sodFor(group, peers = [], members = []) {
  if (!group) return []
  const count = group.id % 3 === 0 ? 1 : 0
  const pool = peers.filter((p) => p.id !== group.id)
  return Array.from({ length: count }, (_, k) => {
    const rule = CONFLICT_RULES[(group.id + k * 2) % CONFLICT_RULES.length]
    const other = pool.length ? pool[(group.id * 3 + k * 5) % pool.length] : null
    const breaching = members.filter((_, i) => (i + k) % 4 === 0).slice(0, 2 + k)
    return {
      id: `${group.id}-r${rule.id}`,
      ruleId: rule.id,
      rule: rule.name,
      description: rule.description,
      severity: rule.severity,
      framework: rule.framework,
      type: rule.type,
      owner: rule.owner,
      conflicting: other,
      breaching,
      status: k === 0 ? 'Open' : 'Accepted risk',
      detected: dayOf(8 + k * 23 + (group.id % 15)),
    }
  })
}

/**
 * Membership history is a register of joins and leaves, not a narrative: the
 * activity feed's prose entries could not answer "when did this identity join
 * and when did it go", so each change is emitted as a row with an explicit
 * Added/Removed action against a named identity.
 */
export function membershipHistoryFor(group, ctx = {}) {
  if (!group) return []
  const age = Math.max(20, group.ageDays || 60)
  const grantVerb = ctx.grantVerb || 'provisioned'
  const revokeVerb = ctx.revokeVerb || 'deprovisioned'
  const target = ctx.target || 'the target application'
  const count = 12 + (group.id % 5)
  return Array.from({ length: count }, (_, i) => {
    const u = USERS[(group.id * 23 + i * 29) % USERS.length]
    const src = SOURCES[(group.id * 3 + i * 7) % SOURCES.length]
    // Every third entry is a departure, so both directions are always visible
    // without the operator having to filter for them.
    const added = i % 3 !== 1
    const days = Math.round((age * (i + 1)) / (count + 1))
    const hour = (group.id * 5 + i * 7) % 24
    return {
      id: `${group.id}-mh${i}`,
      userId: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department,
      action: added ? 'Added' : 'Removed',
      on: dayOf(days),
      at: `${dayOf(days)} ${String(hour).padStart(2, '0')}:${String((group.id * 11 + i * 13) % 60).padStart(2, '0')}`,
      source: src.label,
      sourceIcon: src.icon,
      sourceTone: src.tone,
      reason: added
        ? `${detailFor(src.id, group, i)} · ${grantVerb} on ${target} at the following run.`
        : `${detailFor(src.id, group, i)} · ${revokeVerb} on ${target} at the following run.`,
      actor: actorFor(src.id),
    }
  })
}

export function usageFor(group, salt = 3) {
  const base = Math.max(3, group.members || 2)
  const series = Array.from({ length: 12 }, (_, i) =>
    Math.max(0, Math.round(base * (1.05 + Math.sin((i + group.id * 0.7) / 1.9) * 0.42) + ((group.id * salt + i * 11) % 9))))
  const total = series.reduce((a, b) => a + b, 0)
  const requests = 2 + ((group.id * salt) % 19)
  const denied = (group.id + salt) % 5
  return {
    series,
    total,
    peak: Math.max(...series),
    requests,
    approved: Math.max(0, requests - denied),
    denied,
    lastUsedDays: (group.id * salt) % 9,
  }
}

export function GroupMark({ icon = 'group', tone = 'acc', size = 54 }) {
  const inner = Math.round(size * 0.42)
  return (
    <span className="feed-ic" data-tone={tone} style={{ width: size, height: size, borderRadius: 'var(--r-lg)' }}>
      <Icon name={icon} size={inner} style={{ width: inner, height: inner }} />
    </span>
  )
}

function AddMembers({ group, roster, hint, onAdd }) {
  const [picked, setPicked] = useState([])
  const [error, setError] = useState('')

  // Anyone who already holds the entitlement is not a candidate for it.
  const pool = useMemo(
    () => USERS.filter((u) => !roster.some((m) => m.userId === u.id)),
    [roster],
  )

  const options = useMemo(
    () => pool.map((u) => ({ value: u.id, label: `${u.username} · ${u.department} · ${u.employeeType}` })),
    [pool],
  )

  const submit = () => {
    const users = pool.filter((u) => picked.some((v) => String(v) === String(u.id)))
    if (users.length === 0) return setError('Select at least one identity that should hold this entitlement.')
    setError('')
    setPicked([])
    return onAdd(users)
  }

  return (
    <Card
      title="Add members"
      sub={hint || `Every addition is written to the membership history for ${group.name}.`}
    >
      <div className="grid grid-4" style={{ alignItems: 'start' }}>
        <Field
          label="Identities"
          required
          error={error}
          span={3}
          hint={picked.length > 1
            ? `${picked.length} identities receive ${group.name} in one change.`
            : 'Search by username, department or employee type. More than one identity can be selected.'}
        >
          <SearchSelect
            multiple
            value={picked}
            options={options}
            placeholder="Select identities"
            searchPlaceholder="Search identities…"
            emptyLabel="No identity matches the search"
            onChange={(e) => { setPicked(e.target.value.map(String)); setError('') }}
          />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: 2 }}>
          <Button variant="pri" icon="plus" onClick={submit}>
            {picked.length > 1 ? `Add ${picked.length} members` : 'Add member'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function AddSchedule({ group, onSchedule }) {
  const [identity, setIdentity] = useState([])
  const [from, setFrom] = useState(dayOf(0))
  const [to, setTo] = useState(dayOf(-30))
  /* Scheduled access always releases itself at expiry. The toggle that made
     that optional is gone: a window with an end date that does not end is a
     standing grant wearing a schedule's clothes. */
  const autoRevoke = true
  const [error, setError] = useState('')

  const options = USERS.slice(0, 48).map((u) => ({ value: u.id, label: `${u.username} · ${u.department}` }))

  const submit = () => {
    const users = USERS.filter((u) => identity.includes(String(u.id)))
    if (!users.length) return setError('Select at least one identity to receive the entitlement.')
    if (to <= from) return setError('The end date must fall after the start date.')
    setError('')
    setIdentity([])
    return onSchedule({ users, from, to, autoRevoke })
  }

  return (
    <Card
      title="Grant time-bound access"
      sub={`Access is granted at the start date and removed at the end date without a further approval on ${group.name}.`}
    >
      <div className="grid grid-4" style={{ alignItems: 'start' }}>
        <Field
          label="Identities"
          required
          error={error}
          span={2}
          hint={identity.length > 1 ? `${identity.length} identities receive the same window.` : 'One window, granted to everyone selected.'}
        >
          <SearchSelect
            multiple
            value={identity}
            options={options}
            placeholder="Select identities"
            searchPlaceholder="Search identities…"
            onChange={(e) => { setIdentity(e.target.value.map(String)); setError('') }}
          />
        </Field>
        <Field label="Access starts" required>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Access ends" required>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="pri" icon="calendar" onClick={submit}>
            {identity.length > 1 ? `Schedule ${identity.length} grants` : 'Schedule access'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

const RESPONSE_STATE = {
  Active: { code: 200, state: 'provisioned', tone: 'ok' },
  Scheduled: { code: 202, state: 'queued', tone: 'info' },
  Expired: { code: 200, state: 'completed', tone: 'mut' },
  Revoked: { code: 409, state: 'closed', tone: 'bad' },
}

/* The scheduler answers every window with a job, and the question an operator
   asks after scheduling one is always what came back — so the answer is on the
   record rather than in the job log of another page. */
function scheduleResponse(group, grant) {
  const shape = RESPONSE_STATE[grant.status] || RESPONSE_STATE.Scheduled
  const attempts = grant.status === 'Revoked' ? 2 : 1
  return {
    ...shape,
    jobId: `JOB-${7200 + group.id * 13 + String(grant.id).length}`,
    acceptedAt: `${grant.from} 02:00`,
    target: group.application,
    payload: {
      ticket: grant.ticket,
      identity: grant.username,
      group: group.name,
      target: group.application,
      window: { from: grant.from, to: grant.to, days: grant.days },
      autoRevoke: grant.autoRevoke,
      approvedBy: grant.approvedBy,
    },
    result: {
      state: shape.state,
      httpStatus: shape.code,
      attempts,
      revokeAt: grant.autoRevoke ? `${grant.to} 23:59` : null,
      message: grant.status === 'Revoked'
        ? 'Window closed before expiry, entitlement removed on the next run'
        : grant.status === 'Expired'
          ? 'Window completed and the entitlement was removed automatically'
          : grant.status === 'Active'
            ? 'Entitlement written to the target and held for the remainder of the window'
            : 'Accepted and held until the start date',
    },
  }
}

function ScheduleResponse({ group, grant }) {
  const res = scheduleResponse(group, grant)
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        <Pill tone={res.tone} dot>{grant.status}</Pill>
        <Tag>{res.code}</Tag>
        <Tag>{res.jobId}</Tag>
      </div>
      <KeyValue
        cols={1}
        rows={[
          { k: 'Identity', v: grant.username, icon: 'user' },
          { k: 'Window', v: `${grant.from} to ${grant.to} · ${num(grant.days)} days`, icon: 'calendar' },
          { k: 'Accepted at', v: res.acceptedAt, icon: 'clock' },
          { k: 'Target', v: res.target, icon: 'provision' },
          { k: 'Auto-revoke', v: grant.autoRevoke ? res.result.revokeAt : 'Not set', icon: 'ban' },
          { k: 'Attempts', v: num(res.result.attempts), icon: 'refresh' },
          { k: 'Outcome', v: res.result.message, icon: 'info' },
        ]}
      />
      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Response payload</div>
        <div className="code mono" style={{ display: 'block', padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({ request: res.payload, response: res.result }, null, 2)}
        </div>
      </div>
    </div>
  )
}

export default function GroupDetail({
  group,
  basePath,
  backLabel,
  eyebrow,
  kindNoun = 'group',
  wbId,
  media,
  badges,
  facts = [],
  notices,
  extraActions,
  infoRows = [],
  targetTitle = 'Target binding',
  targetSub,
  targetRows = [],
  memberFoot,
  memberHint,
  memberNotice,
  scheduleNote,
  usageLabel = 'Usage · last 12 weeks',
  usageUnit = 'events',
  activityCtx = {},
  seed = {},
  peers = [],
  tab = 'information',
  onTab,
  onPatch,
  onDelete,
}) {
  const { navigate, toast, confirm, setDrawer } = useApp()
  const [roster, setRoster] = useState(() => memberRoster(group, seed.memberStride || 5, seed.memberCap || 18))
  const [grants, setGrants] = useState(() => scheduleFor(group, seed.scheduleStride || 7))
  // Landing on an empty group — which is where the create flow now leaves the
  // administrator — the first thing to do is add someone, so the panel is open.
  const [showAdd, setShowAdd] = useState(() => group.members === 0)
  const [showCsv, setShowCsv] = useState(false)

  const usage = useMemo(() => usageFor(group, seed.usageSalt || 3), [group, seed.usageSalt])
  const conflicts = useMemo(() => sodFor(group, peers, roster), [group, peers, roster])
  /* Two scopes off one timer. `arriving` is the record — masthead, tab strip
     and panel resolve on the same tick, so landing on a group settles as one
     thing. `settling` is the panel alone, which is all a tab change fetches:
     the tab bar is chrome and stays where the pointer left it. Both start
     together on mount, so arrival is one wait and not two. */
  const arriving = useLoading(group.id)
  const settling = useLoading(`${group.id}:${tab}`)

  // Tab badges count the array their table renders, so a badge always matches the
  // row count under it. `activeGrants` is a narrower summary stat, never a badge.
  const shown = roster.length
  const grantCount = grants.length
  const activeGrants = grants.filter((g) => g.status === 'Active' || g.status === 'Scheduled').length

  const setTab = (id) => (onTab ? onTab(id) : undefined)

  const dropMembers = (ids, done) => {
    const set = new Set(ids.map(String))
    const removed = roster.filter((m) => set.has(String(m.id)))
    setRoster((rs) => rs.filter((m) => !set.has(String(m.id))))
    if (onPatch) onPatch({ members: Math.max(0, group.members - removed.length) })
    if (done) done()
    toast('ok', 'Membership updated', `${removed.length} ${removed.length === 1 ? 'identity loses' : 'identities lose'} ${group.name} at the next run.`)
  }

  const confirmDrop = (ids, done) => confirm({
    title: ids.length === 1 ? 'Remove this member?' : `Remove ${ids.length} members?`,
    body: `The entitlement is revoked on ${activityCtx.target || 'the target application'} at the next run and the change is written to the membership history.`,
    confirmLabel: ids.length === 1 ? 'Remove member' : `Remove ${ids.length}`,
    onConfirm: () => dropMembers(ids, done),
  })

  /* Members are added in one change now that the picker takes several
     identities and a file can carry many more: one write to the roster, one
     entry in the history, one toast. */
  const addMembers = (users) => {
    const records = users.map((user) => ({
      id: `${group.id}-${user.id}`,
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      employeeType: user.employeeType,
      organization: user.organization,
      designation: user.designation,
      sourceKind: 'direct',
      source: 'Direct assignment',
      sourceIcon: 'user',
      sourceTone: 'mut',
      sourceDetail: 'Assigned by an administrator',
      grantedOn: dayOf(0),
      grantedDays: 0,
      grantedBy: 'SHUBHAM_JAIN',
      expiresOn: null,
      expiresInDays: null,
      lastUsed: dayOf(0),
      lastUsedDays: 0,
      state: 'Pending sync',
    }))
    setRoster((rs) => [...records, ...rs])
    if (onPatch) onPatch({ members: group.members + records.length })
    toast(
      'ok',
      records.length === 1 ? 'Member added' : `${records.length} members added`,
      records.length === 1
        ? `${records[0].username} holds ${group.name}.`
        : `${records.length} identities hold ${group.name}.`,
    )
  }

  const makeTimeBound = (ids) => {
    const set = new Set(ids.map(String))
    const until = dayOf(-30)
    setRoster((rs) => rs.map((m) => (set.has(String(m.id))
      ? { ...m, sourceKind: 'schedule', source: 'Time-bound grant', sourceIcon: 'calendar', sourceTone: 'warn', sourceDetail: 'Converted from a standing grant', expiresOn: until, state: 'Active' }
      : m)))
    toast('ok', 'Converted to time-bound', `${ids.length} ${ids.length === 1 ? 'membership expires' : 'memberships expire'} on ${until}.`)
  }

  const openResponse = (row) => setDrawer({
    title: 'Schedule response',
    sub: `${row.username} · ${row.from} to ${row.to}`,
    children: <ScheduleResponse group={group} grant={row} />,
  })

  const addGrant = ({ users, from, to, autoRevoke }) => {
    const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000))
    const records = users.map((user, i) => ({
      id: `${group.id}-s${Date.now()}-${i}`,
      userId: user.id,
      username: user.username,
      department: user.department,
      employeeType: user.employeeType,
      firstName: user.firstName,
      lastName: user.lastName,
      from,
      to,
      days,
      status: from <= dayOf(0) ? 'Active' : 'Scheduled',
      requestedBy: 'SHUBHAM_JAIN',
      ticket: 'REQ-NEW',
      approvedBy: group.owner,
      justification: 'Scheduled from the group record.',
      autoRevoke,
    }))
    setGrants((gs) => [...records, ...gs])
    toast(
      'ok',
      records.length === 1 ? 'Access scheduled' : `${records.length} grants scheduled`,
      records.length === 1
        ? `${users[0].username} holds ${group.name} from ${from} until ${to}.`
        : `${records.length} identities hold ${group.name} from ${from} until ${to}.`,
    )
  }

  /* Bulk update and bulk delete over the selection. A window that has to be
     shortened or closed usually has to be shortened or closed for everyone it
     was granted to at once — the alternative is editing eight rows by hand and
     leaving the ninth behind. */
  const bulkExtend = (ids, days, clear) => {
    const set = new Set(ids.map(String))
    setGrants((gs) => gs.map((g) => (set.has(String(g.id)) && g.status !== 'Revoked'
      ? { ...g, days: g.days + days, status: g.status === 'Expired' ? 'Active' : g.status }
      : g)))
    if (clear) clear()
    toast('ok', 'Windows extended', `${ids.length} ${ids.length === 1 ? 'grant keeps' : 'grants keep'} ${group.name} for a further ${days} days.`)
  }

  const bulkRevoke = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Revoke this window?' : `Revoke ${ids.length} windows?`,
    body: `The entitlement is removed from ${group.application} at the next run. The window stays on the attestation record as evidence of what was held and when.`,
    confirmLabel: `Revoke ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setGrants((gs) => gs.map((g) => (set.has(String(g.id)) ? { ...g, status: 'Revoked' } : g)))
      if (clear) clear()
      toast('ok', 'Windows revoked', `${ids.length} ${ids.length === 1 ? 'grant was' : 'grants were'} closed.`)
    },
  })

  /* One primary per identity on this group's application: promoting a member
     demotes whoever held it, because two defaults mean the target has none. */
  const setMemberPrimary = (row) => {
    setRoster((rs) => rs.map((m) => ({ ...m, primary: m.id === row.id })))
    toast('ok', 'Primary membership set', `${row.username} now holds ${group.name} as their primary group on ${group.application}.`)
  }

  const memberColumns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main', width: 230,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Type', render: (r) => <span className="tag">{r.employeeType}</span> },
    {
      key: 'source', label: 'How access was granted', width: 250,
      render: (r) => (
        <span className="cell-stack">
          <Pill tone={r.sourceTone} icon={r.sourceIcon}>{r.source}</Pill>
          <span className="cell-sub trunc" title={r.sourceDetail}>{r.sourceDetail}</span>
        </span>
      ),
    },
    { key: 'grantedOn', label: 'Granted', cls: 'td-mono' },
    {
      key: 'expiresOn', label: 'Expires', cls: 'td-mono',
      render: (r) => (r.expiresOn ? <Pill tone="warn" dot>{r.expiresOn}</Pill> : <span className="t-faint">Permanent</span>),
    },
    { key: 'lastUsed', label: 'Last used', cls: 'td-mono' },
    {
      // An identity can hold several groups on the same application; the
      // primary is the one the target treats as their default. Exactly one
      // member carries it, so the column answers "who" without opening a row.
      key: 'primaryStatus', label: 'Primary status', width: 138,
      value: (r) => (r.primary ? 1 : 0),
      render: (r) => (r.primary
        ? <Pill tone="acc" icon="star">Primary</Pill>
        : <span className="t-faint">Secondary</span>),
    },
    { key: 'state', label: 'State', render: (r) => <Pill tone={STATE_TONE[r.state] || 'mut'} dot>{r.state}</Pill> },
  ]

  const memberRowActions = (r) => [
    { id: 'open', label: 'Open identity', icon: 'user', onSelect: () => navigate(`/iam/users/${r.userId}`) },
    {
      id: 'src', label: 'Open the source record', icon: 'external',
      disabled: !SOURCE_ROUTE[r.sourceKind],
      onSelect: () => (SOURCE_ROUTE[r.sourceKind] ? navigate(SOURCE_ROUTE[r.sourceKind]) : setTab('schedule')),
    },
    {
      id: 'primary',
      label: r.primary ? 'Already this identity’s primary group' : 'Set as primary for this identity',
      icon: 'star',
      disabled: !!r.primary,
      onSelect: () => setMemberPrimary(r),
    },
    { id: 'bound', label: 'Convert to time-bound', icon: 'calendar', disabled: !!r.expiresOn, onSelect: () => makeTimeBound([r.id]) },
    { divider: true },
    { id: 'drop', label: 'Remove from group', icon: 'trash', danger: true, onSelect: () => confirmDrop([r.id]) },
  ]

  const memberBulk = (ids, clear) => (
    <>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} memberships queued for CSV export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => confirmDrop(ids, clear)}>Remove</Button>
    </>
  )

  const scheduleColumns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main', width: 210,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.department}</span>
          </span>
        </span>
      ),
    },
    { key: 'from', label: 'Starts', cls: 'td-mono' },
    { key: 'to', label: 'Ends', cls: 'td-mono' },
    { key: 'days', label: 'Days', align: 'right' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={GRANT_TONE[r.status]} dot>{r.status}</Pill> },
    { key: 'requestedBy', label: 'Requested by' },
    { key: 'ticket', label: 'Ticket', cls: 'td-mono' },
    { key: 'justification', label: 'Justification', width: 260, render: (r) => <span className="trunc" title={r.justification}>{r.justification}</span> },
    {
      // The response payload belongs on the row it describes, not behind a
      // toolbar menu that made the operator re-pick the identity they had
      // already found in the table.
      key: 'response', label: 'Response', sortable: false, align: 'right',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Button size="sm" icon="code" onClick={() => openResponse(r)}>Schedule response</Button>
        </span>
      ),
    },
  ]

  const tabs = [
    { id: 'information', label: 'Information', icon: 'info' },
    { id: 'members', label: 'Members', icon: 'users', count: shown },
    { id: 'schedule', label: 'Schedule', icon: 'calendar', count: grantCount },
    { id: 'sod', label: 'SoD', icon: 'sod', count: conflicts.length },
    { id: 'activity', label: 'Activity', icon: 'history' },
  ]

  // The activity tab answers one question — who joined or left this group and
  // when. It is a register, so it is rendered as one, with the direction of
  // each change stated per row rather than inferred from prose.
  const membershipHistory = useMemo(() => membershipHistoryFor(group, activityCtx), [group, activityCtx])

  const historyColumns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main', width: 210,
      value: (r) => `${r.username} ${r.department}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.department}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'action', label: 'Change',
      render: (r) => (r.action === 'Added'
        ? <Pill tone="ok" icon="plus">Added to group</Pill>
        : <Pill tone="bad" icon="minus">Removed from group</Pill>),
    },
    { key: 'at', label: 'When', cls: 'td-mono' },
    {
      key: 'source', label: 'Source',
      render: (r) => <Tag tone={r.sourceTone}>{r.source}</Tag>,
    },
    { key: 'reason', label: 'Reason', width: 300, render: (r) => <span className="trunc" title={r.reason}>{r.reason}</span> },
    { key: 'actor', label: 'Performed by' },
  ]

  if (arriving) return <GroupRecordSkeleton tab={tab} />

  return (
    <>
      <DetailHeader
        backTo={basePath}
        backLabel={backLabel}
        eyebrow={eyebrow}
        title={group.name}
        sub={group.description}
        media={media}
        badges={badges}
        meta={facts.map((f) => <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />)}
        actions={
          <>
            {extraActions}
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `${group.name} and its ${num(group.members)} memberships are being written to CSV.`)}>Export</Button>
            <Button icon="trash" variant="danger" onClick={onDelete}>Delete</Button>
            <Button variant="pri" icon="edit" onClick={() => navigate(`${basePath}/${group.id}/edit`)}>Edit {kindNoun}</Button>
          </>
        }
        tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}
      />

      <div className="detail-body">
        {/* The card tabs are redrawn as shapes while they settle; the register
            tabs keep their own chrome and settle their rows instead. */}
        {settling && (tab === 'information' || tab === 'sod') && <GroupPanelSkeleton tab={tab} />}

        {tab === 'information' && !settling && (
          <div className="detail-cols">
            <div className="stack">
              {notices}
              <Card title="Definition" sub={`Serial number ${group.sno} in the register.`}>
                <KeyValue cols={2} rows={infoRows} />
              </Card>

              <Card title={targetTitle} sub={targetSub}>
                <KeyValue cols={2} rows={targetRows} />
              </Card>
            </div>

            <div className="stack">
              <Card title="Membership">
                <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="t-display num">{num(group.members)}</span>
                  <span className="t-xs t-mut">identities hold this {kindNoun}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Meter value={Math.min(100, (group.members / 260) * 100)} tone={group.members > 200 ? 'warn' : 'ok'} />
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 7 }}>
                  <span className="t-xs t-mut">{shown} shown on the members tab</span>
                  <span className="t-xs t-mut">{grantCount} time-bound · {activeGrants} active</span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="t-micro t-mut" style={{ marginBottom: 7 }}>{usageLabel}</div>
                  <span className="t-xs t-mut">{num(usage.total)} {usageUnit} · peak {num(usage.peak)}</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="stack">
            {group.members === 0 && (
              <Banner tone="info">
                No identity holds this {kindNoun} yet — this is where members are added. Pick identities below, or
                upload a file of usernames. The definition stays in the request catalog and is excluded from
                certification campaigns until the first member is assigned.
              </Banner>
            )}
            {typeof memberNotice === 'function' ? memberNotice(roster) : memberNotice}
            {showAdd && <AddMembers group={group} roster={roster} hint={memberHint} onAdd={addMembers} />}
            {showCsv && (
              <MemberCsv
                group={group}
                roster={roster}
                onAdd={addMembers}
                onRemove={(ids) => confirmDrop(ids)}
                onClose={() => setShowCsv(false)}
              />
            )}
            <DataWorkbench
              id={`${wbId}-members`}
              rows={roster}
              loading={settling}
              columns={memberColumns}
              selectable
              searchPlaceholder="Search members by username, department or source…"
              toolbar={
                <>
                  <Button size="sm" icon={showAdd ? 'x' : 'plus'} onClick={() => setShowAdd((v) => !v)}>
                    {showAdd ? 'Close' : 'Add members'}
                  </Button>
                  <Button size="sm" icon={showCsv ? 'x' : 'upload'} onClick={() => setShowCsv((v) => !v)}>
                    {showCsv ? 'Close file upload' : 'Upload CSV'}
                  </Button>
                </>
              }
              bulkActions={memberBulk}
              rowActions={memberRowActions}
              onRowClick={(r) => navigate(`/iam/users/${r.userId}`)}
              emptyTitle="No members to show"
              emptyBody="Add an identity directly, or let a dynamic policy assign the entitlement on the next evaluation."
              emptyIcon="users"
              footNote={memberFoot}
              pageSize={25}
            />
          </div>
        )}

        {tab === 'schedule' && (
          <div className="stack">
            <Banner tone="warn">
              {scheduleNote || 'Scheduled access is granted at the start date and revoked at the end date without a further approval. Every window is written to the attestation record for this group.'}
            </Banner>
            <AddSchedule group={group} onSchedule={addGrant} />
            <DataWorkbench
              id={`${wbId}-schedule`}
              rows={grants}
              loading={settling}
              columns={scheduleColumns}
              selectable
              searchPlaceholder="Search by identity, ticket or justification…"
              bulkActions={(ids, clear) => (
                <>
                  <Button size="sm" icon="plus" onClick={() => bulkExtend(ids, 7, clear)}>Extend 7 days</Button>
                  <Button size="sm" icon="plus" onClick={() => bulkExtend(ids, 30, clear)}>Extend 30 days</Button>
                  <Button size="sm" icon="download" onClick={() => { toast('ok', 'Export queued', `${ids.length} windows queued for CSV export.`); clear() }}>Export</Button>
                  <Button size="sm" variant="danger" icon="ban" onClick={() => bulkRevoke(ids, clear)}>Revoke</Button>
                </>
              )}
              emptyTitle="No time-bound access"
              emptyBody="Every membership on this group is permanent. Use the form above to grant a window instead."
              emptyIcon="calendar"
              footNote="Windows are evaluated by the scheduler every hour"
              pageSize={25}
            />
          </div>
        )}

        {tab === 'sod' && !settling && (
          <div className="stack">
            {conflicts.length === 0 ? (
              <Card>
                <EmptyState
                  icon="sod"
                  title="No segregation of duties conflict"
                  body={`${group.name} does not appear in any anti-affinity rule. Adding a right that conflicts with another group will raise a rule here automatically.`}
                  actions={<Button icon="sod" onClick={() => navigate('/iam/segregationofduties/rules')}>Open the rule set</Button>}
                />
              </Card>
            ) : (
              <>
                <Banner tone="bad">
                  {group.name} participates in {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}.
                  {' '}{conflicts.reduce((a, c) => a + c.breaching.length, 0)} current members hold both sides of a rule.
                </Banner>
                {conflicts.map((c) => (
                  <Card
                    key={c.id}
                    title={c.rule}
                    sub={c.description}
                    actions={
                      <>
                        <SeverityBadge level={c.severity} />
                        <Tag>{c.framework}</Tag>
                        <Button size="sm" icon="external" onClick={() => navigate('/iam/segregationofduties/rules')}>Open rule</Button>
                      </>
                    }
                  >
                    <KeyValue
                      cols={2}
                      rows={[
                        { k: 'Rule type', v: c.type, icon: 'sod' },
                        { k: 'Conflicting group', v: c.conflicting ? c.conflicting.name : 'External entitlement', icon: 'group' },
                        { k: 'Rule owner', v: c.owner, icon: 'user' },
                        { k: 'Detected on', v: c.detected, icon: 'history' },
                        { k: 'Status', v: c.status, icon: 'flag' },
                        { k: 'Members in breach', v: `${c.breaching.length} of ${shown} sampled`, icon: 'users' },
                      ]}
                    />
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="stack">
            <DataWorkbench
              id={`${wbId}-history`}
              rows={membershipHistory}
              loading={settling}
              columns={historyColumns}
              searchPlaceholder="Search membership history by identity, change or source…"
              actionsLabel={<span className="vis-hidden">Actions</span>}
              toolbar={
                <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${membershipHistory.length} membership entries queued for CSV export.`)}>Export</Button>
              }
              rowActions={(r) => [
                { id: 'open', label: 'Open identity', icon: 'user', onSelect: () => navigate(`/iam/users/${r.userId}`) },
                { id: 'log', label: 'Open in system log', icon: 'logs', onSelect: () => navigate('/iam/syslogs') },
              ]}
              onRowClick={(r) => navigate(`/iam/users/${r.userId}`)}
              emptyTitle="No membership history"
              emptyBody="Nothing has joined or left this group yet. Additions and removals are written here as they happen."
              emptyIcon="history"
              footNote={`Every identity added to or removed from ${group.name}, newest first · retained seven years, immutable`}
              pageSize={25}
            />
          </div>
        )}
      </div>

    </>
  )
}
