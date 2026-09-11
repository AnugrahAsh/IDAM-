import '../styles/RolesPage.css'
import { useMemo, useState } from 'react'
import AppPicker from './AppPicker'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Avatar from '../../components/primitives/Avatar'
import AppLogo from '../../components/primitives/AppLogo'
import Tabs from '../../components/primitives/Tabs'
import KeyValue from '../../components/primitives/KeyValue'
import EmptyState from '../../components/primitives/EmptyState'
import Banner from '../../components/primitives/Banner'
import Select from '../../components/primitives/Select'
import SearchSelect from '../../components/primitives/SearchSelect'
import Check from '../../components/primitives/Check'
import { openResetPassword } from './ResetPasswordForm'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { APPLICATIONS, GROUPS, SSO_APPS } from '../../data/seed'
import { useSchema, visibleAttrs } from '../configurations/schemaStore'
import {
  auditFor, certItemsFor, devicesFor, entitlementsFor, eventsFor, factorsFor, healthFor,
  provisionedFor, reachableAppsFor, recertHistoryFor, requestsFor, sessionsFor, sodFor,
} from './identityData'

const STRENGTH_TONE = { strongest: 'ok', strong: 'ok', weak: 'warn', weakest: 'bad' }
const STRENGTH_LABEL = { strongest: 'Strongest', strong: 'Strong', weak: 'Weak', weakest: 'Weakest' }
const STRENGTH_RANK = { strongest: 4, strong: 3, weak: 2, weakest: 1 }
const SOURCE_ICON = { direct: 'user', role: 'roles', policy: 'policy' }
const SECTION_ICON = { general: 'user', professional: 'building', residential: 'mapPin', location: 'globe' }
// The seed is a fixed snapshot; anything created in-session is stamped with its
// last day so new rows sort alongside the seeded ones.
const TODAY_STAMP = '2026-08-05'
const ATTR_ICON = {
  employeeType: 'tag', username: 'at', firstName: 'user', lastName: 'user', email: 'mail',
  organization: 'layers', mobileNo: 'phone', manager: 'users', retirementDate: 'calendar',
  empCode: 'file', designation: 'roles', department: 'building', officeLevel: 'hierarchy',
  reportingEmpId: 'file', address: 'mapPin', country: 'globe', state: 'globe', city: 'mapPin',
  postalCode: 'mapPin',
}


function StatRow({ label, value, hint, tone }) {
  return (
    <div className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--hair)' }}>
      <span className="t-sm t-mut">{label}</span>
      <span className="row" style={{ gap: 7 }}>
        {hint && <span className="t-xs t-faint">{hint}</span>}
        {tone ? <Pill tone={tone} dot>{value}</Pill> : <span className="t-sm num" style={{ fontWeight: 600 }}>{value}</span>}
      </span>
    </div>
  )
}

function FilterBar({ label, query, onQuery, placeholder, selects = [], shown, total, inset }) {
  return (
    <div className="idu-toolbar" data-inset={inset ? 'true' : undefined}>
      <div className="idu-search">
        <Icon name="search" size={13} />
        <input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      {selects.map((s) => (
        <Select key={s.label} aria-label={s.label} value={s.value} options={s.options} onChange={(e) => s.onChange(e.target.value)} />
      ))}
      <span className="idu-count">{shown} of {total}</span>
    </div>
  )
}

// The drawer stores the element it is handed once, so the picker owns its
// selection and reports it upward through a ref-style callback.
function AssignPicker({ options, placeholder, emptyNote, onChange }) {
  const [picked, setPicked] = useState([])
  if (options.length === 0) return <div className="t-sm t-mut">{emptyNote}</div>
  return (
    <div className="stack">
      <SearchSelect
        multiple
        value={picked}
        options={options}
        placeholder={placeholder}
        searchPlaceholder="Search…"
        onChange={(e) => { setPicked(e.target.value); onChange(e.target.value) }}
      />
      <div className="t-xs t-mut">
        {picked.length === 0 ? 'Nothing selected yet.' : `${picked.length} selected.`} Assignments are written on the next
        provisioning run and recorded on the audit trail.
      </div>
    </div>
  )
}

export default function IdentityDetail({ user, onPatch, onDelete }) {
  const schema = useSchema()
  const { navigate, toast, confirm, setDrawer } = useApp()
  const [tab, setTab] = useState('overview')
  const [menu, setMenu] = useState(null)
  const [revoked, setRevoked] = useState(() => new Set())
  const [killed, setKilled] = useState(() => new Set())
  const [addedGrants, setAddedGrants] = useState([])
  const [addedAccounts, setAddedAccounts] = useState([])
  const [addedSso, setAddedSso] = useState([])
  /* Reachability that has been taken away in this session. A directly assigned
     application is removed outright; one reached through a group is not
     removable here at all, because the grant is what confers it. */
  const [removedApps, setRemovedApps] = useState(() => new Set())
  // Revoking one grant at a time does not survive contact with a leaver, so the
  // two access tables carry a selection and a bulk revoke.
  const [entSel, setEntSel] = useState(() => new Set())
  const [provSel, setProvSel] = useState(() => new Set())
  const [accessF, setAccessF] = useState({ q: '', src: 'All sources', app: 'All applications' })
  const [appF, setAppF] = useState({ q: '', type: 'All types' })
  const [actF, setActF] = useState({ q: '', outcome: 'All outcomes' })

  const entitlements = useMemo(() => [...entitlementsFor(user), ...addedGrants], [user, addedGrants])
  const provisioned = useMemo(
    () => [...provisionedFor(user), ...addedAccounts].filter((p) => !revoked.has(p.id)),
    [user, addedAccounts, revoked],
  )
  const reachable = useMemo(
    () => [...reachableAppsFor(user), ...addedSso].filter((a) => !removedApps.has(a.id)),
    [user, addedSso, removedApps],
  )
  const events = useMemo(() => eventsFor(user), [user])
  const factors = useMemo(() => factorsFor(user), [user])
  const devices = useMemo(() => devicesFor(user), [user])
  const sessions = useMemo(() => sessionsFor(user), [user])
  const health = useMemo(() => healthFor(user), [user])
  const conflicts = useMemo(() => sodFor(user), [user])
  const openRequests = useMemo(() => requestsFor(user), [user])
  const certItems = useMemo(() => certItemsFor(user), [user])
  const recerts = useMemo(() => recertHistoryFor(user), [user])
  const trail = useMemo(() => auditFor(user), [user])
  const [openChange, setOpenChange] = useState(null)

  const strongest = factors.slice().sort((a, b) => STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength])[0]
  const liveEntitlements = entitlements.filter((e) => !revoked.has(e.id))
  const liveSessions = sessions.filter((s) => !killed.has(s.id))
  const locked = user.status === 'Locked'
  const disabled = user.status === 'Disabled'

  const accessApps = useMemo(() => [...new Set(entitlements.map((e) => e.application))].sort(), [entitlements])
  const appTypes = useMemo(() => [...new Set(reachable.map((a) => a.type))].sort(), [reachable])
  const actOutcomes = useMemo(() => [...new Set(events.map((e) => e.outcome))].sort(), [events])

  const shownEntitlements = liveEntitlements.filter((e) => {
    const q = accessF.q.trim().toLowerCase()
    if (q && !`${e.group} ${e.application} ${e.owner} ${e.source} ${e.kind}`.toLowerCase().includes(q)) return false
    if (accessF.src !== 'All sources' && e.sourceKind !== accessF.src.toLowerCase()) return false
    if (accessF.app !== 'All applications' && e.application !== accessF.app) return false
    return true
  })

  const shownApps = reachable.filter((a) => {
    const q = appF.q.trim().toLowerCase()
    if (q && !`${a.name} ${a.via} ${a.type}`.toLowerCase().includes(q)) return false
    if (appF.type !== 'All types' && a.type !== appF.type) return false
    return true
  })

  const shownEvents = events.filter((e) => {
    const q = actF.q.trim().toLowerCase()
    if (q && !`${e.action} ${e.category} ${e.target} ${e.ip}`.toLowerCase().includes(q)) return false
    if (actF.outcome !== 'All outcomes' && e.outcome !== actF.outcome) return false
    return true
  })

  const rolesHeld = useMemo(
    () => [...new Set(entitlements.filter((e) => e.sourceKind === 'role').map((e) => e.source))],
    [entitlements],
  )

  const revoke = (row) => confirm({
    title: `Revoke ${row.group}?`,
    body: row.sourceKind === 'direct'
      ? 'The entitlement is removed on the next provisioning run and the change is written to the audit trail.'
      : `This grant is inherited from ${row.source}. Revoking creates an exception that the next policy evaluation may re-apply.`,
    confirmLabel: 'Revoke entitlement',
    onConfirm: () => {
      setRevoked((s) => new Set(s).add(row.id))
      toast('ok', 'Entitlement revoked', `${row.group} queued for removal on ${row.application}.`)
    },
  })

  const deprovision = (row) => confirm({
    title: `Deprovision ${row.name}?`,
    body: `The target account ${row.account} is disabled and then deleted according to the connector retention rule.`,
    confirmLabel: 'Deprovision account',
    onConfirm: () => {
      setRevoked((s) => new Set(s).add(row.id))
      toast('warn', 'Deprovision queued', `${row.name} scheduled for the next connector run.`)
    },
  })

  const revokeMany = (list, clear) => confirm({
    title: `Revoke ${list.length} entitlement${list.length === 1 ? '' : 's'}?`,
    body: 'Every selected grant is removed on the next provisioning run. Inherited grants record an exception that the next policy evaluation may re-apply.',
    confirmLabel: `Revoke ${list.length}`,
    onConfirm: () => {
      setRevoked((s) => { const n = new Set(s); list.forEach((r) => n.add(r.id)); return n })
      clear()
      toast('ok', 'Entitlements revoked', `${list.length} grants queued for removal.`)
    },
  })

  const deprovisionMany = (list, clear) => confirm({
    title: `Deprovision ${list.length} account${list.length === 1 ? '' : 's'}?`,
    body: 'Each target account is disabled and then deleted according to its connector retention rule.',
    confirmLabel: `Deprovision ${list.length}`,
    onConfirm: () => {
      setRevoked((s) => { const n = new Set(s); list.forEach((r) => n.add(r.id)); return n })
      clear()
      toast('warn', 'Deprovision queued', `${list.length} accounts scheduled for the next connector run.`)
    },
  })

  // New assignments are granted here rather than routed through a request, so an
  // administrator with the rights does not have to raise a ticket against
  // themselves. The request queue is still one click away for everyone else.
  const openGrantPicker = () => {
    const held = new Set(entitlements.map((e) => e.group))
    const choices = GROUPS.filter((g) => !held.has(g.name)).map((g) => ({ value: g.name, label: `${g.name} · ${g.application}` }))
    let picked = []
    setDrawer({
      title: 'New entitlement assignment',
      sub: `Grant group membership to ${user.username}.`,
      children: (
        <AssignPicker
          options={choices}
          placeholder="Select groups…"
          emptyNote="This identity already holds every group in the catalog."
          onChange={(v) => { picked = v }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="plus"
            onClick={() => {
              if (!picked.length) { toast('warn', 'Nothing selected', 'Choose at least one group to assign.'); return }
              const rows = picked.map((name) => {
                const g = GROUPS.find((x) => x.name === name)
                return {
                  id: `new-${user.id}-${name}`,
                  group: name,
                  application: g ? g.application : '—',
                  kind: g ? g.kind : 'Access',
                  owner: g ? g.owner : '—',
                  sodFlags: g ? g.sodFlags : 0,
                  source: 'Direct assignment',
                  sourceKind: 'direct',
                  grantedOn: TODAY_STAMP,
                  grantedBy: 'admin',
                  lastUsed: 'Never',
                  stale: false,
                }
              })
              setAddedGrants((a) => [...a, ...rows])
              setDrawer(null)
              toast('ok', 'Entitlements assigned', `${rows.length} ${rows.length === 1 ? 'group' : 'groups'} granted to ${user.username}.`)
            }}
          >
            Assign
          </Button>
        </>
      ),
    })
  }

  const openSsoPicker = () => {
    const held = new Set(reachable.map((a) => a.name))
    const choices = SSO_APPS
      .filter((a) => a.enabled && !held.has(a.displayName))
      .map((a) => ({
        id: String(a.id),
        name: a.displayName,
        brand: a.name,
        type: a.protocol,
        category: 'Single sign-on',
        owner: a.owner,
      }))
    setDrawer({
      size: 'xl',
      title: 'Assign application access',
      sub: `Give ${user.username} single sign-on access.`,
      children: (
        <AppPicker
          source={choices}
          subject={user.username}
          commitLabel="Assign"
          commitIcon="sso"
          emptyBody="This identity can already reach every enabled SSO application."
          onCommit={(ids) => {
            const set = new Set(ids)
            // Rows have to match the shape reachableAppsFor returns, since the
            // tiles below render both from the same list.
            const rows = choices.filter((a) => set.has(a.id)).map((a) => ({
              id: `newsso-${user.id}-${a.name}`,
              name: a.name,
              brand: a.brand,
              type: a.type,
              category: a.category,
              owner: a.owner,
              via: 'Direct assignment',
              lastUsed: 'Never',
              signIns30d: 0,
            }))
            setAddedSso((x) => [...x, ...rows])
            setDrawer(null)
            toast('ok', 'Applications assigned', `${rows.length} ${rows.length === 1 ? 'application' : 'applications'} assigned to ${user.username}.`)
          }}
        />
      ),
      footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
    })
  }

  /* Taking an application away. Only a direct assignment can be removed from
     here — an application reached through a group is conferred by the grant,
     and quietly dropping it from this tile would leave the grant intact and
     the tile lying about it. */
  const removeApp = (a) => {
    if (a.via !== 'Direct assignment') {
      toast('warn', 'Not a direct assignment', `${a.name} is reached through ${a.via}. Revoke that grant on the Access tab to take it away.`)
      return
    }
    confirm({
      title: `Remove ${a.name}?`,
      body: `${user.username} loses single sign-on access to ${a.name} on the next provisioning run. Any target account they hold on it is left in place.`,
      confirmLabel: 'Remove access',
      onConfirm: () => {
        setRemovedApps((prev) => new Set(prev).add(a.id))
        setAddedSso((x) => x.filter((r) => r.id !== a.id))
        toast('ok', 'Access removed', `${a.name} removed from ${user.username}.`)
      },
    })
  }

  const openAccountPicker = () => {
    const held = new Set(provisioned.map((p) => p.name))
    const choices = APPLICATIONS.filter((a) => !held.has(a.displayName)).map((a) => ({ value: a.displayName, label: a.displayName }))
    let picked = []
    setDrawer({
      title: 'Provision account',
      sub: `Create target accounts for ${user.username}.`,
      children: (
        <AssignPicker
          options={choices}
          placeholder="Select applications…"
          emptyNote="This identity already holds an account on every connected target."
          onChange={(v) => { picked = v }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="provision"
            onClick={() => {
              if (!picked.length) { toast('warn', 'Nothing selected', 'Choose at least one application.'); return }
              const rows = picked.map((name) => {
                const a = APPLICATIONS.find((x) => x.displayName === name)
                return {
                  id: `newacct-${user.id}-${name}`,
                  name,
                  code: a ? a.code || name.slice(0, 3).toUpperCase() : '—',
                  owner: a ? a.owner || 'IT Operations' : 'IT Operations',
                  account: user.username.toLowerCase(),
                  method: a ? a.connector || 'REST' : 'REST',
                  connectorStatus: 'Healthy',
                  state: 'Pending',
                  provisionedOn: TODAY_STAMP,
                  lastSync: 'Queued',
                }
              })
              setAddedAccounts((a) => [...a, ...rows])
              setDrawer(null)
              toast('ok', 'Provisioning queued', `${rows.length} ${rows.length === 1 ? 'account' : 'accounts'} queued for the next connector run.`)
            }}
          >
            Provision
          </Button>
        </>
      ),
    })
  }

  const moreItems = () => [
    { label: user.username, header: true },
    { id: 'device', label: 'Reset device', icon: 'device', onSelect: () => toast('ok', 'Device reset', `Registered devices cleared for ${user.username}.`) },
    { id: 'sessions', label: 'Revoke all sessions', icon: 'power', disabled: liveSessions.length === 0, onSelect: () => { setKilled(new Set(sessions.map((s) => s.id))); toast('ok', 'Sessions revoked', 'Every active session has been terminated.') } },
    { id: 'recert', label: 'Send to recertification', icon: 'certify', onSelect: () => navigate('/iam/recertification') },
    { divider: true },
    { label: 'Data', header: true },
    { id: 'copy', label: 'Copy identity link', icon: 'copy', onSelect: () => toast('ok', 'Link copied', `/iam/users/${user.id}`) },
    { id: 'export', label: 'Export record', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${user.username} written to CSV with entitlements.`) },
    { divider: true },
    { id: 'delete', label: 'Delete identity', icon: 'trash', danger: true, onSelect: () => onDelete(user) },
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'user' },
    { id: 'access', label: 'Access', icon: 'group', count: liveEntitlements.length },
    { id: 'apps', label: 'Applications', icon: 'apps', count: reachable.length },
    { id: 'activity', label: 'Activity', icon: 'activity', count: events.length },
    { id: 'credentials', label: 'Security', icon: 'shield', count: factors.length + devices.length + liveSessions.length },
    { id: 'audit', label: 'Audit', icon: 'history' },
  ]

  return (
    <>
      <DetailHeader
        backTo="/iam/users"
        backLabel="Users"
        eyebrow="Identity"
        title={user.username}
        sub={`${user.firstName} ${user.lastName} · ${user.designation} · ${user.email}`}
        media={<Avatar first={user.firstName} last={user.lastName} size="xl" />}
        badges={(
          <>
            <Pill tone={statusTone(user.status)} dot>{user.status}</Pill>
            {conflicts.length > 0 && <Pill tone="viol" icon="sod">{conflicts.length} SoD</Pill>}
          </>
        )}
        meta={(
          <>
            <Fact icon="layers" label="Organization" value={user.organization} />
            <Fact icon="building" label="Department" value={user.department} />
            <Fact icon="users" label="Manager" value={user.manager || 'Unassigned'} />
            <Fact icon="tag" label="Employee type" value={user.employeeType} />
            <Fact icon="clock" label="Last sign-in" value={user.lastLogin} />
          </>
        )}
        actions={(
          <>
            <Button icon="edit" onClick={() => navigate(`/iam/users/${user.id}/edit`)}>Edit</Button>
            <Button icon="key" onClick={() => openResetPassword({ user, setDrawer, toast })}>Reset password</Button>
            <Button
              icon="shield"
              onClick={() => confirm({
                title: 'Reset every MFA factor?',
                body: 'All registered factors are removed. The identity must re-enrol before the next sign-in completes.',
                confirmLabel: 'Reset MFA',
                onConfirm: () => toast('ok', 'MFA reset', `${user.username} must re-enrol at next sign-in.`),
              })}
            >
              Reset MFA
            </Button>
            <Button
              variant={locked ? 'pri' : 'sec'}
              icon={locked ? 'unlock' : 'lock'}
              onClick={() => onPatch({ status: locked ? 'Active' : 'Locked' }, locked ? 'Account unlocked' : 'Account locked')}
            >
              {locked ? 'Unlock' : 'Lock'}
            </Button>
            {/* Lock is a security hold; deactivation ends the identity's access
                altogether. They are separate decisions, so both sit here. */}
            <Button
              icon={disabled ? 'checkC' : 'ban'}
              onClick={() => (disabled
                ? onPatch({ status: 'Active' }, 'Account activated')
                : confirm({
                  title: `Deactivate ${user.username}?`,
                  body: 'The identity keeps its record and entitlements but cannot sign in, and every connected target deprovisions it at the next run.',
                  confirmLabel: 'Deactivate account',
                  onConfirm: () => onPatch({ status: 'Disabled' }, 'Account deactivated'),
                }))}
            >
              {disabled ? 'Activate' : 'Deactivate'}
            </Button>
            <IconButton icon="kebab" label="More actions" onClick={(e) => setMenu({ anchor: e.currentTarget, items: moreItems() })} />
          </>
        )}
        tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}
      />

      <div className="detail-body">
        <div className="idu-kpis" aria-label="Identity summary">
          <button type="button" className="idu-kpi" onClick={() => setTab('access')}>
            <span className="idu-kpi-k"><Icon name="group" size={12} />Groups</span>
            <span className="idu-kpi-v">{num(liveEntitlements.length)}</span>
            <span className="idu-kpi-s">
              {liveEntitlements.filter((e) => e.sourceKind === 'direct').length} direct · {liveEntitlements.filter((e) => e.sourceKind !== 'direct').length} inherited
            </span>
          </button>
          <button type="button" className="idu-kpi" onClick={() => setTab('access')}>
            <span className="idu-kpi-k"><Icon name="roles" size={12} />Roles</span>
            <span className="idu-kpi-v">{num(rolesHeld.length)}</span>
            <span className="idu-kpi-s">granting access via the role engine</span>
          </button>
          <button type="button" className="idu-kpi" onClick={() => setTab('apps')}>
            <span className="idu-kpi-k"><Icon name="apps" size={12} />Applications</span>
            <span className="idu-kpi-v">{num(reachable.length)}</span>
            <span className="idu-kpi-s">{reachable.filter((a) => a.signIns30d === 0).length} unused in 30d</span>
          </button>
          <button type="button" className="idu-kpi" onClick={() => setTab('credentials')}>
            <span className="idu-kpi-k"><Icon name="power" size={12} />Sessions</span>
            <span className="idu-kpi-v">{num(liveSessions.length)}</span>
            <span className="idu-kpi-s">last sign-in {user.lastLogin}</span>
          </button>
          <button type="button" className="idu-kpi" onClick={() => setTab('activity')}>
            <span className="idu-kpi-k"><Icon name="request" size={12} />Open requests</span>
            <span className="idu-kpi-v">{num(openRequests.length)}</span>
            <span className="idu-kpi-s">{certItems.length} attestation items pending</span>
          </button>
          <button type="button" className="idu-kpi" onClick={() => setTab('credentials')}>
            <span className="idu-kpi-k"><Icon name="shield" size={12} />MFA factors</span>
            <span className="idu-kpi-v">{num(factors.length)}</span>
            <span className="idu-kpi-s">{strongest ? `strongest ${STRENGTH_LABEL[strongest.strength].toLowerCase()}` : 'password only'}</span>
          </button>
        </div>

        {tab === 'overview' && (
          <div className="detail-cols">
            <div className="stack">
              {conflicts.length > 0 && (
                <Banner tone="warn">
                  This identity breaches {conflicts.length} segregation-of-duties {conflicts.length === 1 ? 'rule' : 'rules'} ({conflicts.map((c) => c.rule).join(', ')}).{' '}
                  <button className="link" onClick={() => navigate('/iam/segregationofduties/rules')}>Open the conflict register</button>
                </Banner>
              )}
              {schema.sections.slice().sort((a, b) => a.order - b.order).map((section) => {
                const attrs = visibleAttrs(schema.attrs).filter((a) => a.section === section.id).sort((a, b) => a.order - b.order)
                if (!attrs.length) return null
                return (
                  <Card
                    key={section.id}
                    title={section.name}
                    sub={`${attrs.length} attributes · ${section.internal}`}
                    actions={section.system
                      ? <span className="tag">System</span>
                      : <span className="tag" data-tone="acc">Custom</span>}
                  >
                    <KeyValue
                      rows={attrs.map((a) => ({
                        k: a.label,
                        v: user[a.id],
                        icon: ATTR_ICON[a.id] || SECTION_ICON[section.id] || 'info',
                      }))}
                    />
                  </Card>
                )
              })}
            </div>

            <div className="stack">
              <Card title="Account health" sub="Credential and usage posture">
                <StatRow
                  label="MFA factors"
                  value={factors.length ? `${factors.length} registered` : 'None'}
                  tone={factors.length ? 'ok' : 'bad'}
                />
                <StatRow
                  label="Strongest factor"
                  value={strongest ? STRENGTH_LABEL[strongest.strength] : 'Password only'}
                  hint={strongest ? strongest.name : undefined}
                  tone={strongest ? STRENGTH_TONE[strongest.strength] : 'bad'}
                />
                <StatRow
                  label="Password age"
                  value={`${health.passwordAge} days`}
                  hint={health.passwordExpiresIn > 0 ? `expires in ${health.passwordExpiresIn}d` : 'past its expiry'}
                />
                <StatRow label="Sign-ins (30d)" value={num(health.signIns30d)} />
                <StatRow label="Failed sign-ins (30d)" value={num(health.failed30d)} tone={health.failed30d > 3 ? 'warn' : undefined} />
                <StatRow label="Lockouts (90d)" value={num(health.lockouts90d)} tone={health.lockouts90d ? 'warn' : undefined} />
                <div className="row-between" style={{ padding: '7px 0' }}>
                  <span className="t-sm t-mut">Registered devices</span>
                  <span className="t-sm num" style={{ fontWeight: 600 }}>{devices.length}</span>
                </div>
              </Card>

              <Card title="Governance" sub="Open items linked to this identity">
                <div className="stat-strip" style={{ border: 'none' }}>
                  <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/requests')}>
                    <span className="stat-k"><Icon name="request" size={12} />Requests</span>
                    <span className="stat-v">{openRequests.length}</span>
                  </div>
                  <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/segregationofduties/rules')}>
                    <span className="stat-k"><Icon name="sod" size={12} />Conflicts</span>
                    <span className="stat-v">{conflicts.length}</span>
                  </div>
                  <div className="stat-cell" data-nav="true" onClick={() => navigate('/iam/recertification')}>
                    <span className="stat-k"><Icon name="certify" size={12} />Reviews</span>
                    <span className="stat-v">{certItems.length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <div className="stack">
            <Card
              title="Entitlements"
              sub={`${liveEntitlements.length} grants · ${liveEntitlements.filter((e) => e.sourceKind === 'direct').length} direct, ${liveEntitlements.filter((e) => e.sourceKind !== 'direct').length} inherited`}
              flush
              actions={<Button size="sm" icon="plus" onClick={openGrantPicker}>New assignment</Button>}
              footer={<span>Inherited grants are re-evaluated on every policy run. Revoking one records an exception.</span>}
            >
              {liveEntitlements.length > 0 && (
                <FilterBar
                  label="Filter entitlements"
                  placeholder="Filter by group, application, owner…"
                  query={accessF.q}
                  onQuery={(q) => setAccessF((s) => ({ ...s, q }))}
                  selects={[
                    { label: 'Source', value: accessF.src, options: ['All sources', 'Direct', 'Role', 'Policy'], onChange: (src) => setAccessF((s) => ({ ...s, src })) },
                    { label: 'Application', value: accessF.app, options: ['All applications', ...accessApps], onChange: (app) => setAccessF((s) => ({ ...s, app })) },
                  ]}
                  shown={shownEntitlements.length}
                  total={liveEntitlements.length}
                />
              )}
              {entSel.size > 0 && (
                <div className="wb-bulk">
                  <span><b>{entSel.size}</b> selected</span>
                  <button className="link" onClick={() => setEntSel(new Set())}>Clear</button>
                  <div className="wb-bulk-actions">
                    <Button
                      size="sm"
                      variant="danger"
                      icon="ban"
                      onClick={() => revokeMany(shownEntitlements.filter((e) => entSel.has(e.id)), () => setEntSel(new Set()))}
                    >
                      Revoke selected
                    </Button>
                  </div>
                </div>
              )}
              {liveEntitlements.length === 0 ? (
                <EmptyState icon="group" size="sm" title="No entitlements" body="This identity holds no group memberships." />
              ) : shownEntitlements.length === 0 ? (
                <EmptyState icon="filter" size="sm" title="No grants match" body="Loosen the filters above to widen the result set." />
              ) : (
                <div className="wb-scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th className="td-sel">
                          <Check
                            checked={shownEntitlements.length > 0 && shownEntitlements.every((e) => entSel.has(e.id))}
                            mixed={shownEntitlements.some((e) => entSel.has(e.id)) && !shownEntitlements.every((e) => entSel.has(e.id))}
                            label="Select every entitlement"
                            onChange={() => setEntSel((sel) => (shownEntitlements.every((e) => sel.has(e.id))
                              ? new Set()
                              : new Set(shownEntitlements.map((e) => e.id))))}
                          />
                        </th>
                        <th>Group</th>
                        <th>Application</th>
                        <th>Source</th>
                        <th>Granted on</th>
                        <th>Granted by</th>
                        <th>Last used</th>
                        <th className="td-act" />
                      </tr>
                    </thead>
                    <tbody>
                      {shownEntitlements.map((e) => (
                        <tr key={e.id} data-sel={entSel.has(e.id) || undefined}>
                          <td className="td-sel">
                            <Check
                              checked={entSel.has(e.id)}
                              label={`Select ${e.group}`}
                              onChange={() => setEntSel((sel) => {
                                const next = new Set(sel)
                                if (next.has(e.id)) next.delete(e.id); else next.add(e.id)
                                return next
                              })}
                            />
                          </td>
                          <td className="td-main">
                            <span className="cell-id">
                              <span className="trunc">
                                <span style={{ display: 'block' }}>{e.group}</span>
                                <span className="cell-sub">{e.kind} group · owner {e.owner}</span>
                              </span>
                              {e.sodFlags > 0 && <Pill tone="viol">{e.sodFlags} SoD</Pill>}
                            </span>
                          </td>
                          <td>{e.application}</td>
                          <td>
                            <span className="row" style={{ gap: 6 }}>
                              <Icon name={SOURCE_ICON[e.sourceKind]} size={12} style={{ color: 'var(--faint)' }} />
                              <span className="trunc" style={{ maxWidth: 220 }}>{e.source}</span>
                            </span>
                          </td>
                          <td className="td-mono">{e.grantedOn}</td>
                          <td>{e.grantedBy}</td>
                          <td className={e.stale ? undefined : 'td-mono'}>
                            {e.stale ? <Pill tone="warn" dot>{e.lastUsed}</Pill> : e.lastUsed}
                          </td>
                          <td className="td-act">
                            <Button size="sm" variant="danger" icon="ban" onClick={() => revoke(e)}>Revoke</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="Provisioned accounts"
              sub={`${provisioned.length} target accounts held on connected systems`}
              flush
              actions={(
                <>
                  <Button size="sm" icon="plus" onClick={openAccountPicker}>Provision account</Button>
                  <Button size="sm" icon="refresh" onClick={() => toast('ok', 'Sync queued', `Account reconciliation queued for ${user.username}.`)}>Resync</Button>
                </>
              )}
            >
              {provSel.size > 0 && (
                <div className="wb-bulk">
                  <span><b>{provSel.size}</b> selected</span>
                  <button className="link" onClick={() => setProvSel(new Set())}>Clear</button>
                  <div className="wb-bulk-actions">
                    <Button
                      size="sm"
                      variant="danger"
                      icon="ban"
                      onClick={() => deprovisionMany(provisioned.filter((p) => provSel.has(p.id)), () => setProvSel(new Set()))}
                    >
                      Revoke selected
                    </Button>
                  </div>
                </div>
              )}
              <div className="wb-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="td-sel">
                        <Check
                          checked={provisioned.length > 0 && provisioned.every((p) => provSel.has(p.id))}
                          mixed={provisioned.some((p) => provSel.has(p.id)) && !provisioned.every((p) => provSel.has(p.id))}
                          label="Select every account"
                          onChange={() => setProvSel((sel) => (provisioned.every((p) => sel.has(p.id))
                            ? new Set()
                            : new Set(provisioned.map((p) => p.id))))}
                        />
                      </th>
                      <th>Application</th>
                      <th>Account</th>
                      <th>Connector</th>
                      <th>Connector status</th>
                      <th>Account state</th>
                      <th>Provisioned</th>
                      <th>Last sync</th>
                      <th className="td-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {provisioned.map((p) => (
                      <tr key={p.id} data-sel={provSel.has(p.id) || undefined}>
                        <td className="td-sel">
                          <Check
                            checked={provSel.has(p.id)}
                            label={`Select ${p.name}`}
                            onChange={() => setProvSel((sel) => {
                              const next = new Set(sel)
                              if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
                              return next
                            })}
                          />
                        </td>
                        <td className="td-main">
                          <span className="cell-id">
                            <span className="trunc">
                              <span style={{ display: 'block' }}>{p.name}</span>
                              <span className="cell-sub">{p.code} · {p.owner}</span>
                            </span>
                          </span>
                        </td>
                        <td className="td-mono">{p.account}</td>
                        <td>{p.method}</td>
                        <td><Pill tone={statusTone(p.connectorStatus)} dot>{p.connectorStatus}</Pill></td>
                        <td><Pill tone={p.state === 'Provisioned' ? 'ok' : p.state === 'Pending' ? 'warn' : 'bad'} dot>{p.state}</Pill></td>
                        <td className="td-mono">{p.provisionedOn}</td>
                        <td className="td-mono">{p.lastSync}</td>
                        <td className="td-act">
                          <Button size="sm" variant="danger" icon="ban" onClick={() => deprovision(p)}>Revoke</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {conflicts.length > 0 && (
              <Card title="Segregation-of-duties conflicts" sub="Toxic combinations detected across the grants above" flush>
                <div className="wb-scroll">
                  <table className="tbl">
                    <thead>
                      <tr><th>Rule</th><th>Conflicting groups</th><th>Framework</th><th>Severity</th><th>Detected</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {conflicts.map((c) => (
                        <tr key={c.id}>
                          <td className="td-main">{c.rule}</td>
                          <td className="td-mono">{c.groups}</td>
                          <td>{c.framework}</td>
                          <td><SeverityBadge level={c.severity} /></td>
                          <td className="td-mono">{c.detected}</td>
                          <td><Pill tone={statusTone(c.status)} dot>{c.status}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'apps' && (
          <Card
            title="Reachable applications"
            sub={`${reachable.length} applications this identity can sign in to`}
            flush
            actions={(
              <>
                <Button size="sm" icon="plus" onClick={openSsoPicker}>New assignment</Button>
                <Button size="sm" icon="external" onClick={() => navigate('/iam/myapps')}>Application catalog</Button>
              </>
            )}
            footer={<span>Reachability combines single sign-on assignments, group grants and organization baselines.</span>}
          >
            <FilterBar
              label="Filter applications"
              placeholder="Filter by application or assignment…"
              query={appF.q}
              onQuery={(q) => setAppF((s) => ({ ...s, q }))}
              selects={[
                { label: 'Type', value: appF.type, options: ['All types', ...appTypes], onChange: (type) => setAppF((s) => ({ ...s, type })) },
              ]}
              shown={shownApps.length}
              total={reachable.length}
            />
            {shownApps.length === 0 ? (
              <EmptyState icon="filter" size="sm" title="No applications match" body="Loosen the filters above to widen the result set." />
            ) : (
            <div className="appgrid">
              {shownApps.map((a) => (
                <div className="apptile" key={a.id}>
                  <div className="apptile-main">
                    <AppLogo brand={a.brand} name={a.name} size={34} />
                    <div style={{ minWidth: 0, width: '100%' }}>
                      <div className="apptile-name">{a.name}</div>
                      <div className="apptile-sub trunc">{a.via}</div>
                    </div>
                    {/* Removing access was only possible by revoking the grant
                        behind it, which is the wrong door for an application
                        assigned directly — and no door at all if you did not
                        already know the grant existed. */}
                    <IconButton
                      icon="trash"
                      size="sm"
                      className="apptile-del"
                      label={`Remove ${a.name}`}
                      title={a.via === 'Direct assignment'
                        ? `Remove ${a.name}`
                        : `Reached through ${a.via} — revoke that grant to remove it`}
                      onClick={() => removeApp(a)}
                    />
                  </div>
                  <div className="apptile-foot">
                    <span className="tag">{a.type}</span>
                    <span className="t-xs t-mut">{a.signIns30d === 0 ? 'Unused 30d' : `${num(a.signIns30d)} sign-ins`}</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </Card>
        )}

        {tab === 'activity' && (
          <div className="detail-cols">
            <Card title="Activity timeline" sub={`${events.length} events recorded against this actor`}>
              {events.length > 0 && (
                <div style={{ margin: '0 0 12px' }}>
                  <FilterBar
                    inset
                    label="Filter activity"
                    placeholder="Filter by action, category, target…"
                    query={actF.q}
                    onQuery={(q) => setActF((s) => ({ ...s, q }))}
                    selects={[
                      { label: 'Outcome', value: actF.outcome, options: ['All outcomes', ...actOutcomes], onChange: (outcome) => setActF((s) => ({ ...s, outcome })) },
                    ]}
                    shown={shownEvents.length}
                    total={events.length}
                  />
                </div>
              )}
              {events.length === 0 ? (
                <EmptyState icon="activity" size="sm" title="No recorded activity" body="Nothing has been logged for this identity in the retention window." />
              ) : shownEvents.length === 0 ? (
                <EmptyState icon="filter" size="sm" title="No events match" body="Loosen the filters above to widen the result set." />
              ) : (
                <div className="tl">
                  {shownEvents.map((e) => (
                    <div className="tl-it" key={e.id} data-tone={e.outcome === 'Denied' ? 'bad' : e.level === 'ERROR' ? 'bad' : e.level === 'WARN' ? 'warn' : 'acc'}>
                      <span className="tl-dot"><Icon name={e.outcome === 'Denied' ? 'ban' : 'check'} size={8} stroke={3} /></span>
                      <div className="tl-t">{e.action}</div>
                      <div className="tl-s">{e.category} · {e.target}</div>
                      <div className="tl-time">{e.ts} · {e.ip} · {e.outcome}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <div className="stack">
              <Card title="Access requests" sub="Raised by or on behalf of this identity" flush>
                {openRequests.length === 0 ? (
                  <EmptyState icon="request" size="sm" title="No requests" body="No access request references this identity." />
                ) : (
                  <div style={{ padding: 'var(--sp-4)' }}>
                    {openRequests.map((r) => (
                      <div className="feed-it" key={r.id}>
                        <span className="feed-ic" data-tone={r.status === 'Approved' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'warn'}>
                          <Icon name="request" size={13} />
                        </span>
                        <div className="feed-m">
                          <div className="feed-t">{r.type} · <b>{r.target}</b></div>
                          <div className="feed-s">
                            <span>{r.id}</span>
                            <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>
                            <span>level {r.level} of {r.levels}</span>
                          </div>
                        </div>
                        <span className="feed-time">{r.raised}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Sign-in summary" sub="Last 30 days">
                <StatRow label="Successful" value={num(health.signIns30d)} />
                <StatRow label="Failed" value={num(health.failed30d)} tone={health.failed30d > 3 ? 'warn' : undefined} />
                <StatRow label="Lockouts (90d)" value={num(health.lockouts90d)} tone={health.lockouts90d ? 'warn' : undefined} />
                <div className="row-between" style={{ padding: '7px 0' }}>
                  <span className="t-sm t-mut">Last sign-in</span>
                  <span className="t-sm mono">{user.lastLogin}</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'credentials' && (
          <div className="stack">
            <Card
              title="Authentication factors"
              sub={`${factors.length} registered · password last changed ${health.passwordChanged}`}
              flush
              actions={<Button size="sm" icon="shield" onClick={() => toast('ok', 'MFA reset', `${user.username} must re-enrol at next sign-in.`)}>Reset all factors</Button>}
            >
              {factors.length === 0 ? (
                <EmptyState
                  icon="shield"
                  size="sm"
                  title="No factors registered"
                  body="Enrollment is enforced at the next sign-in if the organization policy requires MFA."
                />
              ) : (
                <div className="wb-scroll">
                  <table className="tbl">
                    <thead>
                      <tr><th>Factor</th><th>Strength</th><th>Registered</th><th>Last used</th><th>Role</th><th className="td-act" /></tr>
                    </thead>
                    <tbody>
                      {factors.map((f) => (
                        <tr key={f.id}>
                          <td className="td-main">
                            <span className="cell-id">
                              <Icon name={f.icon} size={14} style={{ color: 'var(--mut)' }} />
                              <span className="trunc">
                                <span style={{ display: 'block' }}>{f.name}</span>
                                <span className="cell-sub">{f.sub}</span>
                              </span>
                            </span>
                          </td>
                          <td><Pill tone={STRENGTH_TONE[f.strength]} dot>{STRENGTH_LABEL[f.strength]}</Pill></td>
                          <td className="td-mono">{f.registered}</td>
                          <td>{f.lastUsed}</td>
                          <td>{f.primary ? <span className="tag" data-tone="acc">Primary</span> : <span className="tag">Backup</span>}</td>
                          <td className="td-act">
                            <Button size="sm" variant="danger" icon="trash" onClick={() => toast('warn', 'Factor removed', `${f.name} removed for ${user.username}.`)}>Remove</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid grid-2">
              <Card title="Registered devices" sub={`${devices.length} bound to this identity`} flush>
                <div className="wb-scroll">
                  <table className="tbl">
                    <thead><tr><th>Device</th><th>Trust</th><th>Enrolled</th><th>Last seen</th></tr></thead>
                    <tbody>
                      {devices.map((d) => (
                        <tr key={d.id}>
                          <td className="td-main">
                            <span className="cell-id">
                              <Icon name={d.icon} size={14} style={{ color: 'var(--mut)' }} />
                              <span className="trunc">
                                <span style={{ display: 'block' }}>{d.model}</span>
                                <span className="cell-sub">{d.os} · {d.ip}</span>
                              </span>
                            </span>
                          </td>
                          <td><Pill tone={d.trusted ? 'ok' : 'warn'} dot>{d.trusted ? 'Managed' : 'Unmanaged'}</Pill></td>
                          <td className="td-mono">{d.enrolled}</td>
                          <td>{d.lastSeen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card
                title="Active sessions"
                sub={liveSessions.length ? `${liveSessions.length} live` : 'No live sessions'}
                flush
                actions={liveSessions.length > 0 && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="power"
                    onClick={() => { setKilled(new Set(sessions.map((s) => s.id))); toast('ok', 'Sessions revoked', 'Every active session has been terminated.') }}
                  >
                    Revoke all
                  </Button>
                )}
              >
                {liveSessions.length === 0 ? (
                  <EmptyState icon="power" size="sm" title="No active sessions" body="The identity is not signed in to any client." />
                ) : (
                  <div className="wb-scroll">
                    <table className="tbl">
                      <thead><tr><th>Client</th><th>Location</th><th>Started</th><th className="td-act" /></tr></thead>
                      <tbody>
                        {liveSessions.map((s) => (
                          <tr key={s.id}>
                            <td className="td-main">
                              <span className="cell-id">
                                <span className="trunc">
                                  <span style={{ display: 'block' }}>{s.client}</span>
                                  <span className="cell-sub">{s.ip}{s.current ? ' · current' : ''}</span>
                                </span>
                              </span>
                            </td>
                            <td>{s.location}</td>
                            <td className="td-mono">{s.started}</td>
                            <td className="td-act">
                              <IconButton
                                icon="power"
                                size="sm"
                                label="Revoke session"
                                onClick={() => { setKilled((k) => new Set(k).add(s.id)); toast('ok', 'Session revoked', `${s.client} signed out.`) }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="detail-cols">
            <div className="stack">
              <Card
                title="Change history"
                sub="Every write against this record, newest first. Expand a write to see the values it replaced."
              >
                <div className="tl">
                  {trail.map((t) => {
                    const changes = t.changes || []
                    const open = openChange === t.id
                    return (
                      <div className="tl-it" key={t.id} data-tone={t.tone}>
                        <span className="tl-dot"><Icon name="check" size={8} stroke={3} /></span>
                        <div className="tl-t">
                          {t.action}
                          {changes.length > 0 && (
                            <button
                              type="button"
                              className="link aud-toggle"
                              aria-expanded={open}
                              onClick={() => setOpenChange(open ? null : t.id)}
                            >
                              {open ? 'Hide changes' : `${changes.length} ${changes.length === 1 ? 'change' : 'changes'}`}
                              <Icon name={open ? 'chevU' : 'chevD'} size={10} />
                            </button>
                          )}
                        </div>
                        <div className="tl-s">{t.detail}</div>
                        {open && changes.length > 0 && (
                          <div className="aud-diff">
                            <table className="tbl">
                              <thead>
                                <tr><th>Attribute</th><th>Old value</th><th>New value</th></tr>
                              </thead>
                              <tbody>
                                {changes.map((c) => (
                                  <tr key={c.attribute}>
                                    <td className="td-main">{c.attribute}</td>
                                    <td><span className="diff-old">{c.from || '—'}</span></td>
                                    <td><span className="diff-new">{c.to || '—'}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="tl-time">{t.ts} · {t.actor}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card title="Recertification history" sub="Attestation decisions recorded against this identity" flush>
                {recerts.length === 0 ? (
                  <EmptyState icon="certify" size="sm" title="Never certified" body="This identity has not appeared in a closed attestation campaign." />
                ) : (
                  <div className="wb-scroll">
                    <table className="tbl">
                      <thead><tr><th>Campaign</th><th>Scope</th><th>Reviewer</th><th className="td-num">Items</th><th>Decision</th><th>Decided</th></tr></thead>
                      <tbody>
                        {recerts.map((r) => (
                          <tr key={r.id}>
                            <td className="td-main">{r.campaign}</td>
                            <td>{r.scope}</td>
                            <td>{r.reviewer}</td>
                            <td className="td-num">{r.items}</td>
                            <td><Pill tone={statusTone(r.decision)} dot>{r.decision}</Pill></td>
                            <td className="td-mono">{r.decidedOn || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <div className="stack">
              <Card title="Provenance" sub="Where this record came from">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Record id', v: `USR-${String(user.id).padStart(5, '0')}`, icon: 'file' },
                    { k: 'Source of record', v: health.sourceOfRecord, icon: 'directory' },
                    { k: 'Created on', v: user.createdOn, icon: 'history' },
                    { k: 'Created by', v: user.createdBy, icon: 'user' },
                    { k: 'Last modified', v: health.lastModified, icon: 'edit' },
                    { k: 'Modified by', v: health.lastModifiedBy, icon: 'user' },
                    { k: 'Employee code', v: user.empCode, icon: 'tag' },
                    { k: 'Reporting employee id', v: user.reportingEmpId, icon: 'hierarchy' },
                    { k: 'Retirement date', v: user.retirementDate, icon: 'calendar' },
                  ]}
                />
              </Card>

              <Card title="Pending review items" sub="Entitlements awaiting a decision" flush>
                {certItems.length === 0 ? (
                  <EmptyState icon="certify" size="sm" title="Nothing outstanding" body="No open attestation item references this identity." />
                ) : (
                  <div style={{ padding: 'var(--sp-4)' }}>
                    {certItems.map((c) => (
                      <div className="feed-it" key={c.id}>
                        <span className="feed-ic" data-tone={c.decision === 'Revoked' ? 'bad' : c.decision === 'Certified' ? 'ok' : 'warn'}>
                          <Icon name="certify" size={13} />
                        </span>
                        <div className="feed-m">
                          <div className="feed-t"><b>{c.entitlement}</b> on {c.application}</div>
                          <div className="feed-s">
                            <Pill tone={statusTone(c.decision)} dot>{c.decision}</Pill>
                            <span>recommend {c.recommendation.toLowerCase()}</span>
                            <span>last used {c.lastUsed}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
