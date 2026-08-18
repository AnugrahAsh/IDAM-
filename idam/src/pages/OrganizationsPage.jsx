import './styles/OrganizationsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import EmptyState from '../components/primitives/EmptyState'
import StatChip from '../components/primitives/StatChip'
import OrgDetail from './organizations/OrgDetail'
import OrgForm from './organizations/OrgForm'
import { TODAY, autoCode, profileFor } from './organizations/orgModel'
import { useApp } from '../store/AppContext'
import { num, serialColumn, statusTone } from '../lib/format'
import { ORGANIZATIONS, nextId } from '../data/seed'

function NotFound({ id, onBack }) {
  return (
    <>
      <PageBar
        title="Organization not found"
        sub="The organization may have been deleted in this session, or the link may be stale."
        crumbs={[{ label: 'Organizations', to: '/iam/organizations' }, { label: String(id) }]}
      />
      <EmptyState
        icon="building"
        title={`No organization with id ${id}`}
        body="The record may have been deleted, or the link may be stale. Open the organization list to find it."
        actions={<Button variant="pri" icon="chevL" onClick={onBack}>Back to organizations</Button>}
      />
    </>
  )
}

function OrgList({ rows, stats, onPatch, onDelete, onBulkDelete }) {
  const { navigate, toast, confirm } = useApp()
  const [chip, setChip] = useState(null)

  const rowFilter = useMemo(() => {
    if (chip === 'root') return (o) => !o.parent
    if (chip === 'inherit') return (o) => !!o.inherit
    if (chip === 'disabled') return (o) => o.status === 'Disabled'
    return undefined
  }, [chip])

  const pickChip = (id) => setChip((c) => (c === id ? null : id))

  const columns = [
    serialColumn('Serial No'),
    {
      key: 'name', label: 'Organization', locked: true, cls: 'td-main',
      value: (r) => `${r.name} ${r.parent || ''} ${profileFor(r).code}`,
      render: (r) => (
        <span className="cell-id">
          <Icon name={r.parent ? 'layers' : 'building'} size={14} style={{ color: r.parent ? 'var(--mut)' : 'var(--accent)' }} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{r.parent ? `Child of ${r.parent}` : 'Root organization'}</span>
          </span>
        </span>
      ),
    },
    { key: 'parent', label: 'Parent' },
    {
      key: 'passwordPolicy', label: 'Password policy',
      render: (r) => (r.passwordPolicy === 'Inherited'
        ? <span className="t-mut">Inherited</span>
        : (
          <button type="button" className="link" onClick={(e) => { e.stopPropagation(); navigate('/iam/passwordPolicy') }}>
            {r.passwordPolicy}
          </button>
        )),
    },
    {
      key: 'inherit', label: 'Inherits',
      value: (r) => (r.inherit ? 'Yes' : 'No'),
      render: (r) => <Pill tone={r.inherit ? 'acc' : 'mut'} dot>{r.inherit ? 'Yes' : 'No'}</Pill>,
    },
    { key: 'users', label: 'Identities', align: 'right', render: (r) => num(r.users) },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill> },
    { key: 'createdOn', label: 'Created', cls: 'td-mono' },
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'View', icon: 'eye', onSelect: () => navigate(`/iam/organizations/${r.id}`) },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`/iam/organizations/${r.id}/edit`) },
    { id: 'ids', label: 'View identities', icon: 'users', onSelect: () => navigate(`/iam/organizations/${r.id}`) },
    { id: 'policy', label: 'Manage policy', icon: 'lock', onSelect: () => navigate('/iam/passwordPolicy') },
    { divider: true },
    {
      id: 'toggle',
      label: r.status === 'Active' ? 'Disable' : 'Enable',
      icon: r.status === 'Active' ? 'ban' : 'checkC',
      onSelect: () => (r.status === 'Active'
        ? confirm({
          title: `Disable ${r.name}?`,
          body: `Sign-in is blocked for every identity scoped to this organization until it is enabled again. ${num(r.users)} identities are affected.`,
          confirmLabel: 'Disable organization',
          onConfirm: () => onPatch(r.id, { status: 'Disabled' }, 'Organization disabled', r.name),
        })
        : onPatch(r.id, { status: 'Active' }, 'Organization enabled', r.name)),
    },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, disabled: !r.parent, onSelect: () => onDelete(r) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="checkC" onClick={() => { onPatch(ids, { status: 'Active' }, 'Organizations enabled'); clear() }}>Enable</Button>
      <Button size="sm" icon="ban" onClick={() => { onPatch(ids, { status: 'Disabled' }, 'Organizations disabled'); clear() }}>Disable</Button>
      <Button size="sm" icon="link" onClick={() => { onPatch(ids, { passwordPolicy: 'Inherited', inherit: true }, 'Policy inheritance restored'); clear() }}>Inherit policy</Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} organizations queued for CSV export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => onBulkDelete(ids, clear)}>Delete</Button>
    </>
  )

  return (
    <>
      <PageBar
        title="Organizations"
        crumbs={[{ label: 'Organizations' }]}
        sub="The tenant scoping boundary. Organizations determine password policy, delegated administration and which provisioning targets an identity reaches."
        actions={(
          <>
            <Button icon="hierarchy" onClick={() => navigate('/iam/organizationHierarchy')}>View hierarchy</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Organization structure export is being generated.')}>Export</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate('/iam/organizations/add')}>Add Organization</Button>
          </>
        )}
        rail={(
          <>
            <StatChip icon="building" active={!chip} onClick={() => setChip(null)}>{num(stats.total)} organizations</StatChip>
            <StatChip icon="hierarchy" active={chip === 'root'} onClick={() => pickChip('root')}>{num(stats.root)} root</StatChip>
            <StatChip icon="link" active={chip === 'inherit'} onClick={() => pickChip('inherit')}>{num(stats.inherited)} inherit policy</StatChip>
            <StatChip icon="ban" active={chip === 'disabled'} onClick={() => pickChip('disabled')}>{num(stats.disabled)} disabled</StatChip>
            <StatChip icon="users" title="Total identities scoped to these organizations">{num(stats.identities)} identities</StatChip>
          </>
        )}
      />

      <DataWorkbench
        id="organizations"
        rows={rows}
        filter={rowFilter}
        columns={columns}
        selectable
        searchPlaceholder="Search by organization, parent or code…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`/iam/organizations/${r.id}`)}
        emptyTitle="No organizations match"
        emptyBody="Adjust the search to widen the result set."
        emptyIcon="building"
        footNote="Structure synchronized from Workday HR 6 minutes ago"
      />
    </>
  )
}

export default function OrganizationsPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [rows, setRows] = useState(ORGANIZATIONS)

  const stats = useMemo(() => ({
    total: rows.length,
    root: rows.filter((o) => !o.parent).length,
    disabled: rows.filter((o) => o.status === 'Disabled').length,
    inherited: rows.filter((o) => o.inherit).length,
    identities: rows.reduce((a, o) => a + o.users, 0),
  }), [rows])

  const patch = (ids, changes, message, body) => {
    const list = Array.isArray(ids) ? ids : [ids]
    const set = new Set(list.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...changes } : r)))
    if (message) toast('ok', message, body || `${list.length} ${list.length === 1 ? 'organization' : 'organizations'} updated.`)
  }

  const removeOrg = (org) => confirm({
    title: `Delete ${org.name}?`,
    body: 'Identities scoped to this organization are reassigned to the parent and lose any entitlement granted by organization scope. This cannot be undone.',
    confirmLabel: 'Delete organization',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== org.id))
      toast('ok', 'Organization deleted', org.name)
      navigate('/iam/organizations')
    },
  })

  const removeMany = (ids, clear) => confirm({
    title: `Delete ${ids.length} organizations?`,
    body: 'Identities scoped to the selected organizations are reassigned to their parent. Root organizations are skipped.',
    confirmLabel: `Delete ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id)) || !r.parent))
      if (clear) clear()
      toast('ok', 'Organizations deleted', `${ids.length} removed from the tenant.`)
    },
  })

  const saveOrg = (id, draft) => {
    patch(id, {
      name: draft.name,
      code: draft.code,
      description: draft.description,
      parent: draft.parent || null,
      region: draft.region,
      timezone: draft.timezone,
      contact: draft.contact,
      status: draft.status,
      passwordPolicy: draft.inherit ? 'Inherited' : draft.passwordPolicy,
      inherit: draft.inherit,
      mfaRequired: draft.mfaRequired,
      ipPolicy: draft.ipPolicy,
    }, 'Organization saved', draft.name)
    navigate(`/iam/organizations/${id}`)
  }

  const createOrg = (draft) => {
    const id = nextId(rows)
    setRows((rs) => [...rs, {
      id,
      name: draft.name,
      code: draft.code || autoCode(draft.name),
      description: draft.description,
      parent: draft.parent || null,
      region: draft.region,
      timezone: draft.timezone,
      contact: draft.contact,
      status: draft.status,
      passwordPolicy: draft.inherit ? 'Inherited' : draft.passwordPolicy,
      inherit: draft.inherit,
      mfaRequired: draft.mfaRequired,
      ipPolicy: draft.ipPolicy,
      users: 0,
      createdOn: TODAY,
    }])
    toast('ok', 'Organization created', draft.name)
    navigate(`/iam/organizations/${id}`)
  }

  const mode = segments[0]

  if (mode === 'add') {
    return <OrgForm orgs={rows} onSave={createOrg} onCancel={() => navigate('/iam/organizations')} />
  }

  if (mode) {
    const org = rows.find((o) => String(o.id) === String(mode))
    if (!org) return <NotFound id={mode} onBack={() => navigate('/iam/organizations')} />
    if (segments[1] === 'edit') {
      return (
        <OrgForm
          key={org.id}
          org={org}
          orgs={rows}
          onSave={(draft) => saveOrg(org.id, draft)}
          onCancel={() => navigate(`/iam/organizations/${org.id}`)}
        />
      )
    }
    return <OrgDetail key={org.id} org={org} orgs={rows} onPatch={patch} onDelete={removeOrg} />
  }

  return <OrgList rows={rows} stats={stats} onPatch={patch} onDelete={removeOrg} onBulkDelete={removeMany} />
}
