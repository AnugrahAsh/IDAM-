import './OrganizationsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import EmptyState from '../../components/primitives/EmptyState'
import OrgDetail from './OrgDetail'
import OrgForm from './OrgForm'
import { TODAY, autoCode, profileFor } from './orgModel'
import { useApp } from '../../store/AppContext'
import { num, serialColumn, statusTone } from '../../lib/format'
import { ORGANIZATIONS, nextId } from '../../data/seed'
import StatCards from '../../components/workbench/StatCards'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import Tag from '../../components/primitives/Tag'
import { useLocalState } from '../../lib/useLocalState'
import { useLoading } from '../../lib/useLoading'
import { OrgFormSkeleton, OrgListSkeleton } from './OrganizationsSkeleton'

function NotFound({ id, onBack }) {
  return (
    <>
      <PageBar title="Organization not found" crumbs={[{ label: 'Organizations', to: '/iam/organizations' }, { label: String(id) }]} />
      <EmptyState
        icon="building"
        title={`No organization with id ${id}`}
        body="The record may have been deleted, or the link may be stale. Open the organization list to find it."
        actions={<Button variant="pri" icon="chevL" onClick={onBack}>Back to organizations</Button>}
      />
    </>
  )
}

// The structure answers: how deep it goes, who inherits policy, and what is
// switched off but still holding identities.
const FACETS = {
  all: () => true,
  root: (o) => !o.parent,
  inherited: (o) => o.inherit,
  own: (o) => !o.inherit,
  disabled: (o) => o.status === 'Disabled',
}

function OrgList({ rows, stats, onPatch, onDelete, onBulkDelete }) {
  const [facet, setFacet] = useState('all')
  /* One flag for the screen: the masthead, the five posture figures and the
     rows settle together. Changing the facet does not settle again — filtering
     a register you can already see is not a round trip. */
  const loading = useLoading()

  const visible = useMemo(() => rows.filter(FACETS[facet] || FACETS.all), [rows, facet])

  const cards = [
    { id: 'all', icon: 'building', label: 'Organizations', value: stats.total, chip: `${num(stats.identities)} identities`, sub: 'in the structure', hint: 'Every organization the platform governs' },
    { id: 'root', icon: 'hierarchy', label: 'Root', value: stats.root, chip: 'top of the tree', sub: 'no parent above them', hint: 'Organizations with no parent' },
    { id: 'inherited', icon: 'link', label: 'Inherit policy', value: stats.inherited, chip: `${stats.total - stats.inherited} own policy`, sub: 'from the parent', hint: 'Organizations inheriting their password policy' },
    { id: 'own', icon: 'lock', label: 'Own policy', value: stats.total - stats.inherited, chip: 'overridden', sub: 'set at this level', hint: 'Organizations that set their own password policy' },
    { id: 'disabled', icon: 'ban', label: 'Disabled', value: stats.disabled, chip: stats.disabled ? 'sign-in blocked' : 'none', chipTone: stats.disabled ? 'warn' : undefined, sub: 'retained in the tree', hint: 'Organizations switched off' },
  ]

  const groupSummary = (section) => `${num(section.reduce((a, o) => a + o.users, 0))} identities · ${section.filter((o) => o.inherit).length} inherit`

  const renderCard = (o, ctx) => (
    <RecordCard
      ctx={ctx}
      label={o.name}
      media={<CardIcon name="building" tone={o.status === 'Disabled' ? 'warn' : 'acc'} />}
      title={o.name}
      sub={o.parent ? `Below ${o.parent}` : 'Root organization'}
      tags={(
        <>
          <Pill tone={statusTone(o.status)} dot>{o.status}</Pill>
          <Tag>{o.inherit ? 'Inherits policy' : 'Own policy'}</Tag>
          <span className="spacer" />
          <span className="rcard-stat"><b className="num">{num(o.users)}</b> identities</span>
        </>
      )}
      meta={[
        { k: 'Parent', v: o.parent || 'None' },
        { k: 'Password policy', v: o.passwordPolicy },
        { k: 'Identities', v: num(o.users) },
        { k: 'Status', v: o.status },
      ]}
    />
  )
  const { navigate, toast, confirm } = useApp()

  const columns = [
    serialColumn('S.No'),
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
      {/* One announcing region for the screen. The register below draws its own
          rows from `loading`, and those shapes are decoration. */}
      {loading ? <OrgListSkeleton /> : (
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
          />

          <StatCards
            items={cards}
            value={facet}
            onChange={(id) => setFacet(id === facet && id !== 'all' ? 'all' : id)}
            label="Filter the organization structure"
          />
        </>
      )}

      <DataWorkbench
        id="organizations"
        rows={visible}
        loading={loading}
        columns={columns}
        selectable
        searchPlaceholder="Search by organization, parent or code…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`/iam/organizations/${r.id}`)}
        emptyTitle="No organizations match"
        emptyBody="Adjust the search to widen the result set."
        emptyIcon="building"
        footNote={'Structure synchronized from Workday HR 6 minutes ago'}
      />
    </>
  )
}

/**
 * The editor, waiting on the record it edits.
 *
 * Only the edit address settles. Creating an organization has nothing to
 * fetch, so a skeleton over an empty form would be a wait invented for its
 * own sake rather than one standing in for a round trip.
 */
function OrgEdit({ org, orgs, onSave, onCancel }) {
  const loading = useLoading(org.id)
  if (loading) return <OrgFormSkeleton />
  return <OrgForm key={org.id} org={org} orgs={orgs} onSave={onSave} onCancel={onCancel} />
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
        <OrgEdit
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
