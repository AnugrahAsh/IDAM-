import './NetworkPolicyPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import Menu from '../../components/primitives/Menu'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { num, statusTone } from '../../lib/format'
import { IP_POLICIES, SSO_APPS, USERS } from '../../data/seed'
import { IP_VALUES, LIST_PATH, dayStr } from './networkData'
import BindingDetail from './BindingDetail'
import BindingForm from './BindingForm'
import ImportForm from './ImportForm'
import BulkForm from './BulkForm'

const CREATORS = ['SHUBHAM_JAIN', 'PRIYA_NAIR', 'VANSH_MAKHIJA', 'system']

const HEX = '0123456789abcdef'

const hexRun = (seed, len) => {
  let v = (Math.abs(seed) % 2147483646) + 1
  let out = ''
  for (let k = 0; k < len; k += 1) {
    v = (v * 48271) % 2147483647
    out += HEX[v % 16]
  }
  return out
}

const uuidFor = (seed) =>
  `${hexRun(seed * 7 + 11, 8)}-${hexRun(seed * 13 + 29, 4)}-4${hexRun(seed * 17 + 47, 3)}-a${hexRun(seed * 23 + 83, 3)}-${hexRun(seed * 31 + 131, 12)}`

let uuidSeq = 4000

const newUuid = () => {
  uuidSeq += 1
  return uuidFor(uuidSeq)
}

const today = () => new Date().toISOString().slice(0, 10)

// Some identities hold more than one binding for the same application, which is
// what the overlap check on the form exists for.
const BINDINGS = USERS.filter((_, i) => i % 3 === 0).slice(0, 26).flatMap((u, i) => {
  const base = IP_POLICIES[i % IP_POLICIES.length]
  const identity = {
    username: u.username,
    userId: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    employeeType: u.employeeType,
    organization: u.organization,
    department: u.department,
    application: SSO_APPS[(i * 3) % SSO_APPS.length].displayName,
  }
  const first = {
    ...identity,
    id: uuidFor(i + 1),
    ipAddress: i % 3 === 0 ? base.cidr : IP_VALUES[i % IP_VALUES.length],
    action: base.action,
    status: base.status,
    hits7d: base.hits7d,
    lastHit: base.hits7d === 0 ? '' : dayStr(i % 6),
    createdOn: base.createdOn,
    createdBy: CREATORS[i % CREATORS.length],
    note: base.appliesTo,
  }
  // Some identities carve an exception out of their own binding.
  if (i % 4 !== 1) return [first]
  return [first, {
    ...identity,
    id: uuidFor(i + 200),
    ipAddress: IP_VALUES[(i * 5 + 3) % IP_VALUES.length],
    action: first.action === 'Deny' ? 'Allow' : 'Deny',
    status: 'Active',
    hits7d: Math.round(base.hits7d / 4),
    lastHit: dayStr((i + 2) % 6),
    createdOn: base.createdOn,
    createdBy: CREATORS[(i + 1) % CREATORS.length],
    note: base.appliesTo,
  }]
})

const hydrate = (draft) => {
  const user = USERS.find((u) => u.username.toLowerCase() === String(draft.username).toLowerCase())
  return {
    ...draft,
    id: newUuid(),
    username: user ? user.username : draft.username,
    userId: user ? user.id : null,
    email: user ? user.email : '',
    firstName: user ? user.firstName : '',
    lastName: user ? user.lastName : '',
    employeeType: user ? user.employeeType : 'Internal',
    organization: user ? user.organization : '',
    department: user ? user.department : '',
    hits7d: 0,
    lastHit: '',
    createdOn: today(),
    createdBy: 'SHUBHAM_JAIN',
  }
}

export default function NetworkPolicyPage({ segments = [] }) {
  const { toast, confirm, setDrawer, navigate } = useApp()
  const [rows, setRows] = useState(BINDINGS)
  const [menu, setMenu] = useState(null)

  const stats = useMemo(() => ({
    total: rows.length,
    identities: new Set(rows.map((r) => r.username)).size,
    allow: rows.filter((r) => r.action === 'Allow').length,
    deny: rows.filter((r) => r.action === 'Deny').length,
    disabled: rows.filter((r) => r.status === 'Disabled').length,
  }), [rows])

  /* One settle for the screen, keyed on the address: the page bar, the tiles
     and the register are the same arrival, and opening a binding is the round
     trip a real deployment would make. Searching and faceting are not — the
     rows being narrowed are already on screen. */
  const loading = useLoading(segments.join('/'))

  const open = (target) => navigate(target.startsWith('/') ? target : `${LIST_PATH}/${target}`)

  const mutate = (ids, patch, message) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...patch } : r)))
    toast('ok', message, `${ids.length} ${ids.length === 1 ? 'binding' : 'bindings'} updated.`)
  }

  const removeIds = (ids, title, body, done) => confirm({
    title,
    body,
    confirmLabel: ids.length === 1 ? 'Delete binding' : `Delete ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (done) done()
      toast('ok', 'Bindings deleted', `${ids.length} ${ids.length === 1 ? 'binding' : 'bindings'} removed from the policy set.`)
    },
  })

  const openImport = () => setDrawer({
    title: 'Import policy',
    sub: 'Load per-identity IP bindings from an exported policy set',
    children: (
      <ImportForm
        onCancel={() => setDrawer(null)}
        onImport={(parsed, rejected) => {
          const created = parsed.map(hydrate)
          setRows((rs) => [...created, ...rs])
          setDrawer(null)
          toast(
            rejected.length > 0 ? 'warn' : 'ok',
            'Policy imported',
            rejected.length > 0
              ? `${parsed.length} bindings created, ${rejected.length} lines could not be read.`
              : `${parsed.length} bindings created.`,
          )
        }}
      />
    ),
  })

  const openBulk = (mode) => setDrawer({
    title: mode === 'delete' ? 'Delete bulk' : 'Modify bulk',
    sub: mode === 'delete' ? 'Remove bindings by identifier' : 'Change status or action for a list of bindings',
    children: (
      <BulkForm
        mode={mode}
        rows={rows}
        onCancel={() => setDrawer(null)}
        onApply={(ids, opts) => {
          setDrawer(null)
          if (mode === 'delete') {
            removeIds(
              ids,
              `Delete ${ids.length} bindings?`,
              'Identities left without a binding for the application inherit the tenant default of allow.',
            )
            return
          }
          const patch = opts.action === 'Keep' ? { status: opts.status } : { status: opts.status, action: opts.action }
          mutate(ids, patch, 'Bindings modified')
        }}
      />
    ),
  })

  const confirmDelete = (r) => removeIds(
    [r.id],
    `Delete the binding for ${r.username}?`,
    r.action === 'Deny'
      ? 'This is a deny binding. Removing it immediately permits the range it currently blocks for this identity.'
      : 'The identity loses its address restriction on this application and falls back to the tenant default of allow.',
    () => navigate(LIST_PATH),
  )

  const mode = segments[0]

  if (mode === 'add') {
    return (
      <BindingForm
        rows={rows}
        onCancel={() => navigate(LIST_PATH)}
        onSave={(drafts) => {
          // The form yields one draft per address, so a ticket listing six
          // office ranges produces six bindings from a single pass.
          const created = drafts.map(hydrate)
          setRows((rs) => [...created, ...rs])
          const first = drafts[0]
          toast(
            'ok',
            created.length === 1 ? 'Binding created' : `${created.length} bindings created`,
            created.length === 1
              ? `${first.username} is restricted to ${first.ipAddress} on ${first.application}.`
              : `${first.username} is restricted to ${created.length} ranges on ${first.application}.`,
          )
          navigate(created.length === 1 ? `${LIST_PATH}/${created[0].id}` : LIST_PATH)
        }}
      />
    )
  }

  if (mode) {
    const binding = rows.find((r) => String(r.id) === String(mode))
    if (!binding) {
      return (
        <>
          <PageBar
            title="Binding not found"
            sub="This UUID does not match a binding in the current policy set."
            crumbs={[{ label: 'Network Access Policies', to: LIST_PATH }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="noentry"
            title="No binding with that identifier"
            body="It may have been deleted, or the link may have been copied from another tenant."
            actions={<Button variant="pri" iconRight="chevR" onClick={() => navigate(LIST_PATH)}>Back to the policy set</Button>}
          />
        </>
      )
    }
    if (segments[1] === 'edit') {
      return (
        <BindingForm
          binding={binding}
          rows={rows}
          onCancel={() => navigate(`${LIST_PATH}/${binding.id}`)}
          onSave={(drafts) => {
            // The first address is this binding; any further address the
            // operator added alongside it becomes a sibling binding.
            const [head, ...rest] = drafts
            const created = rest.map(hydrate)
            setRows((rs) => [
              ...created,
              ...rs.map((r) => (r.id === binding.id ? { ...r, ...head } : r)),
            ])
            toast(
              'ok',
              created.length === 0 ? 'Binding saved' : `Binding saved, ${created.length} added`,
              created.length === 0
                ? `${head.username} is restricted to ${head.ipAddress} on ${head.application}.`
                : `${head.username} is now restricted to ${drafts.length} ranges on ${head.application}.`,
            )
            navigate(`${LIST_PATH}/${binding.id}`)
          }}
        />
      )
    }
    return (
      <BindingDetail
        binding={binding}
        loading={loading}
        onOpen={open}
        onEdit={(r) => navigate(`${LIST_PATH}/${r.id}/edit`)}
        onToggle={(r) => mutate([r.id], { status: r.status === 'Active' ? 'Disabled' : 'Active' }, r.status === 'Active' ? 'Binding deactivated' : 'Binding activated')}
        onDelete={confirmDelete}
      />
    )
  }

  const columns = [
    {
      key: 'id', label: 'UUID', cls: 'td-mono', width: 300, optional: true,
      render: (r) => (
        <span className="trunc t-xs" style={{ display: 'block', maxWidth: 290 }} title={r.id}>{r.id}</span>
      ),
    },
    {
      key: 'username', label: 'Username', cls: 'td-main', locked: true,
      value: (r) => `${r.username} ${r.email}`,
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
    {
      key: 'application', label: 'Application',
      render: (r) => (
        <span className="cell-id">
          <Icon name="sso" size={12} style={{ color: 'var(--mut)' }} />
          <span className="trunc">{r.application}</span>
        </span>
      ),
    },
    {
      key: 'ipAddress', label: 'IP address', cls: 'td-mono', width: 160,
      render: (r) => (
        <span className="cell-id">
          <Icon
            name={r.action === 'Deny' ? 'noentry' : 'shield'}
            size={12}
            style={{ color: r.action === 'Deny' ? 'var(--bad)' : 'var(--ok)' }}
          />
          <span className="mono">{r.ipAddress}</span>
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>,
    },
    {
      key: 'action', label: 'Action',
      render: (r) => <Pill tone={r.action === 'Deny' ? 'bad' : 'ok'} dot>{r.action}</Pill>,
    },
    { key: 'employeeType', label: 'Type', render: (r) => <Tag>{r.employeeType}</Tag> },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono' },
  ]

  const rowActions = (r) => [
    { id: 'view', label: 'Open binding', icon: 'eye', onSelect: () => open(String(r.id)) },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${LIST_PATH}/${r.id}/edit`) },
    {
      id: 'status',
      label: r.status === 'Active' ? 'Deactivate' : 'Activate',
      icon: r.status === 'Active' ? 'ban' : 'checkC',
      onSelect: () => mutate([r.id], { status: r.status === 'Active' ? 'Disabled' : 'Active' }, r.status === 'Active' ? 'Binding deactivated' : 'Binding activated'),
    },
    { id: 'test', label: 'Test against an IP', icon: 'target', onSelect: () => open(String(r.id)) },
    { divider: true },
    {
      id: 'del', label: 'Delete', icon: 'trash', danger: true,
      onSelect: () => removeIds(
        [r.id],
        `Delete the binding for ${r.username}?`,
        r.action === 'Deny'
          ? 'This is a deny binding. Removing it immediately permits the range it currently blocks for this identity.'
          : 'The identity loses its address restriction on this application and falls back to the tenant default of allow.',
      ),
    },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="checkC" onClick={() => { mutate(ids, { status: 'Active' }, 'Bindings activated'); clear() }}>Activate</Button>
      <Button size="sm" icon="ban" onClick={() => { mutate(ids, { status: 'Disabled' }, 'Bindings deactivated'); clear() }}>Deactivate</Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} bindings queued for export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => removeIds(
        ids,
        `Delete ${ids.length} bindings?`,
        'Any deny binding in the selection stops blocking its range as soon as the policy is recompiled.',
        clear,
      )}>Delete</Button>
    </>
  )

  const openMoreActions = (e) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: 'More actions', header: true },
      { id: 'bulk-modify', label: 'Modify bulk', icon: 'edit', onSelect: () => openBulk('modify') },
      { id: 'bulk-export', label: 'Export all', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${rows.length} bindings queued for CSV export.`) },
      { divider: true },
      { id: 'bulk-delete', label: 'Delete bulk', icon: 'trash', danger: true, onSelect: () => openBulk('delete') },
    ],
  })

  return (
    <>
      {/* One announcing region for the page. The register below keeps its own
          panel and toolbar while the rows settle inside it. */}
      {loading ? (
        <Skeleton label="Loading the network access policy set">
          <SkeletonPageBar actions={2} crumbs={2} />
        </Skeleton>
      ) : (
      <PageBar
        title="Network Access Policies"
        sub="Per-identity address bindings evaluated at every authentication attempt, before any application assignment is considered."
        crumbs={[{ label: 'Applications' }, { label: 'Network Access Policies' }]}
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'The full policy set is being exported.')}>Export</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${LIST_PATH}/add`)}>Add</Button>
          </>
        }
      />
      )}

      <div className="stack">

        {loading ? <SkeletonStats count={4} /> : (
        <StatCards
          items={[
            { key: 'total', icon: 'noentry', label: 'Bindings', value: stats.total, chip: `${num(stats.identities)} identities`, sub: 'network restrictions in force' },
            { key: 'allow', icon: 'shield', label: 'Allow rules', value: stats.allow, chip: 'permitted ranges', chipTone: 'ok', sub: 'traffic accepted from here' },
            { key: 'deny', icon: 'ban', label: 'Deny rules', value: stats.deny, chip: stats.deny ? 'blocked ranges' : 'none', chipTone: stats.deny ? 'warn' : undefined, sub: 'traffic refused from here' },
            { key: 'disabled', icon: 'power', label: 'Deactivated', value: stats.disabled, chip: stats.disabled ? 'not evaluated' : 'none', chipTone: stats.disabled ? 'warn' : undefined, sub: 'held but out of force' },
          ]}
          label="Network restriction summary"
        />
        )}

        <DataWorkbench
          id="ip-restriction-policy"
          rows={rows}
          columns={columns}
          loading={loading}
          selectable
          searchPlaceholder="Search by uuid, username, application or address…"
          bulkActions={bulkActions}
          rowActions={rowActions}
          onRowClick={(r) => open(String(r.id))}
          toolbar={
            <>
              <Button size="sm" icon="upload" onClick={openImport}>Import policy</Button>
              <Button size="sm" icon="kebab" iconRight="chevD" onClick={openMoreActions}>More actions</Button>
            </>
          }
          emptyTitle="No IP bindings match"
          emptyBody="Adjust the search, or add a binding. With no active binding an identity may authenticate from any address."
          emptyIcon="noentry"
          footNote="Policy compiled and distributed 4 minutes ago"
        />
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
