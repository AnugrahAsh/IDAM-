import './ApplicationsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import EmptyState from '../../components/primitives/EmptyState'
import AppLogo from '../../components/primitives/AppLogo'
import AppCard from './AppCard'
import RegisterHeader from '../../components/workbench/RegisterHeader'
import AppDetail from './AppDetail'
import AppWizard from './AppWizard'
import { AppsListSkeleton, SkeletonRegisterHeader } from './ApplicationsSkeleton'
import { openImageEditor } from './ImageField'
import { BASE, brandOf, buildSeed, capabilitiesOf, healthOf } from './appModel'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { useLocalState } from '../../lib/useLocalState'
import { num, serialColumn } from '../../lib/format'
import { nextId } from '../../data/seed'

function NotFound({ id, onBack }) {
  return (
    <>
      <PageBar title="Application not found" crumbs={[{ label: 'Applications', to: BASE }, { label: String(id) }]} />
      <EmptyState
        icon="provision"
        title={`No application with id ${id}`}
        body="The record may have been deleted, or the link may be stale. Open the application list to find it."
        actions={<Button variant="pri" icon="chevL" onClick={onBack}>Back to applications</Button>}
      />
    </>
  )
}

// The register answers five operational questions, and each headline doubles as
// the filter for it: how large is the estate, what is provisioned, what
// federates, what is broken and what is switched off.
// Labels read as the unit of the count that precedes them: "10 applications".
const FACETS = [
  { id: 'all', label: 'applications', hint: 'Every connected record' },
  { id: 'provisioning', label: 'provisioning', hint: 'Records with an account lifecycle connector' },
  { id: 'sso', label: 'single sign-on', hint: 'Records that federate sign-in' },
  { id: 'inactive', label: 'inactive', hint: 'Disabled connectors and relying parties' },
]

const matchesFacet = (r, facet) => {
  if (facet === 'provisioning') return !!r.provisioning
  if (facet === 'sso') return !!r.sso
  if (facet === 'inactive') return healthOf(r).tone === 'mut'
  return true
}

const capabilityOf = (r) => (r.provisioning && r.sso
  ? 'Provisioning and SSO'
  : r.provisioning ? 'Provisioning only' : 'SSO only')

function AppsList({ rows, onDelete, onBulkDelete, onPatch }) {
  const { navigate, toast, setDrawer } = useApp()
  const [facet, setFacet] = useState('all')
  // Dismissal is keyed to the finding itself, so the line comes back when a
  // different connector breaks rather than staying hidden for good.
  const [mutedAlert, setMutedAlert] = useState(null)
  /* One flag for the register: the masthead, the headline figures and the rows
     resolve together. Faceting does not settle again — the estate is already in
     hand, and filtering rows the operator can see is not a round trip. */
  const loading = useLoading()

  const shown = useMemo(() => rows.filter((r) => matchesFacet(r, facet)), [rows, facet])

  const stats = useMemo(() => {
    const orgs = new Set()
    let prov = 0; let sso = 0; let failed = 0; let degraded = 0; let inactive = 0
    let accounts = 0; let assigned = 0
    rows.forEach((r) => {
      orgs.add(r.org)
      if (r.provisioning) { prov += 1; accounts += r.provisioning.accounts || 0 }
      if (r.sso) { sso += 1; assigned += r.sso.users || 0 }
      const h = healthOf(r)
      if (h.label === 'Failed') failed += 1
      else if (h.label === 'Degraded') degraded += 1
      else if (h.tone === 'mut') inactive += 1
    })
    return { orgs: orgs.size, prov, sso, failed, degraded, inactive, accounts, assigned }
  }, [rows])

  const kpis = [
    { id: 'all', value: rows.length },
    { id: 'provisioning', value: stats.prov },
    { id: 'sso', value: stats.sso },
    { id: 'inactive', value: stats.inactive },
  ]

  // The header leads with what needs doing, and names the records so the line
  // is worth reading rather than being a second copy of the count.
  const alert = useMemo(() => {
    const broken = rows.filter((r) => healthOf(r).tone === 'bad')
    const shaky = rows.filter((r) => healthOf(r).tone === 'warn')
    if (!broken.length && !shaky.length) return null
    const name = (list) => list.slice(0, 2).map((r) => r.displayName).join(', ')
      + (list.length > 2 ? ` and ${list.length - 2} more` : '')
    const parts = []
    if (broken.length) parts.push(`${name(broken)} failed`)
    if (shaky.length) parts.push(`${name(shaky)} degraded`)
    return {
      tone: broken.length ? 'bad' : 'warn',
      title: `${broken.length + shaky.length} ${broken.length + shaky.length === 1 ? 'application needs' : 'applications need'} attention`,
      detail: parts.join(' · '),
    }
  }, [rows])

  const columns = [
    serialColumn('S.No'),
    {
      key: 'displayName', label: 'Application', locked: true, cls: 'td-main td-wide', width: 250,
      value: (r) => `${r.displayName} ${r.name} ${r.org}`,
      render: (r) => (
        <span className="cell-id">
          <AppLogo src={r.logoSrc} brand={brandOf(r)} name={r.displayName} size={22} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.displayName}</span>
            <span className="cell-sub">{r.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'capabilities', label: 'Capabilities', width: 124,
      value: (r) => capabilitiesOf(r).join(' '),
      render: (r) => (
        <span className="app-caps">
          {r.provisioning && <Tag tone="acc">Provisioning</Tag>}
          {r.sso && <Tag tone="acc">SSO</Tag>}
        </span>
      ),
    },
    {
      // Connector and protocol stack rather than sitting side by side: the pair
      // is one fact about the record, and one column of it leaves room for the
      // application name to stay readable.
      key: 'method', label: 'Connector / Protocol', cls: 'td-flex', width: 150,
      value: (r) => [r.provisioning?.method, r.sso?.protocol].filter(Boolean).join(' '),
      render: (r) => (
        <span className="cell-stack">
          <span className="trunc">{r.provisioning?.method || <span className="t-faint">No connector</span>}</span>
          <span className="cell-sub trunc">{r.sso ? r.sso.protocol : 'No federation'}</span>
        </span>
      ),
    },
    {
      key: 'org', label: 'Organization / Owner', cls: 'td-flex', width: 168,
      value: (r) => `${r.org} ${r.owner}`,
      render: (r) => (
        <span className="cell-stack">
          <span className="trunc">{r.org}</span>
          <span className="cell-sub trunc">{r.owner}</span>
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', width: 100,
      value: (r) => healthOf(r).label,
      render: (r) => { const h = healthOf(r); return <Pill tone={h.tone} dot>{h.label}</Pill> },
    },
    {
      key: 'accounts', label: 'Accounts', align: 'right', width: 88,
      value: (r) => r.provisioning?.accounts ?? 0,
      render: (r) => (r.provisioning ? num(r.provisioning.accounts) : <span className="t-mut">—</span>),
    },
    {
      key: 'users', label: 'Assigned', align: 'right', optional: true, width: 88,
      value: (r) => r.sso?.users ?? 0,
      render: (r) => (r.sso ? num(r.sso.users) : <span className="t-mut">—</span>),
    },
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'View', icon: 'eye', onSelect: () => navigate(`${BASE}/${r.id}`) },
    ...(r.provisioning ? [{ id: 'prov', label: 'Provisioning settings', icon: 'provision', onSelect: () => navigate(`${BASE}/${r.id}/provisioning`) }] : []),
    ...(r.sso ? [{ id: 'sso', label: 'SSO configuration', icon: 'sso', onSelect: () => navigate(`${BASE}/${r.id}/sso`) }] : []),
    { id: 'link', label: 'Linkage', icon: 'link', onSelect: () => navigate(`${BASE}/${r.id}/linkage`) },
    { id: 'image', label: 'Change image', icon: 'edit', onSelect: () => openImageEditor({ app: r, onPatch, setDrawer, toast }) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete(r) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} applications queued for CSV export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => onBulkDelete(ids, clear)}>Delete</Button>
    </>
  )

  const groupSummary = (section) => {
    const accounts = section.reduce((a, r) => a + (r.provisioning?.accounts || 0), 0)
    const assigned = section.reduce((a, r) => a + (r.sso?.users || 0), 0)
    return `${num(accounts)} accounts · ${num(assigned)} assigned`
  }

  return (
    <>
      {/* One announcing region for the screen. The register header and the row
          skeleton inside the workbench are both decoration and stay silent, so
          the wait is described once. */}
      {loading ? <AppsListSkeleton /> : (
        <PageBar
          title="Applications"
          crumbs={[{ label: 'Applications' }]}
          sub="Every connected application in one register — provisioning connectors, federated sign-in, or both on a single record."
          actions={(
            <>
              {/* Attribute definitions are shared by every relying party, so they
                  are reached from the register they serve rather than from a
                  section of their own. Reconciliation has its own screen and a
                  tab on each connector record; a third entry point here only
                  made the toolbar longer. */}
              <Button icon="swap" onClick={() => navigate('attributeConfigurations')}>Attribute Configurations</Button>
              <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Application inventory export is being generated.')}>Export</Button>
              <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/new`)}>Add Application</Button>
            </>
          )}
        />
      )}

      <DataWorkbench
        id="applications"
        header={loading ? <SkeletonRegisterHeader tabs={kpis.length} /> : (
          <RegisterHeader
            items={kpis.map((k) => ({ ...k, ...FACETS.find((f) => f.id === k.id) }))}
            value={facet}
            onChange={setFacet}
            resetId="all"
            label="Filter the application register"
            alert={alert && mutedAlert === alert.detail ? null : alert}
            onDismissAlert={() => setMutedAlert(alert ? alert.detail : null)}
            summary={[
              { value: stats.accounts, label: 'accounts' },
              { value: stats.assigned, label: 'sign-in assignments' },
              { value: stats.orgs, label: 'organizations' },
            ]}
          />
        )}
        rows={shown}
        columns={columns}
        loading={loading}
        selectable
        searchPlaceholder="Search by application, system name or organization…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
        emptyTitle="No applications match"
        emptyBody="Adjust the search, the headline filter above, or add a new application."
        emptyIcon="provision"
        footNote={'Provisioning and SSO facets are managed on a single application record'}
      />
    </>
  )
}

export default function ApplicationsPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [rows, setRows] = useState(buildSeed)


  const patch = (id, changes) => {
    setRows((rs) => rs.map((r) => (String(r.id) === String(id)
      ? { ...r, ...(typeof changes === 'function' ? changes(r) : changes) }
      : r)))
  }

  const removeApp = (app) => confirm({
    title: `Delete ${app.displayName}?`,
    body: 'The application record and both of its facets are removed. Accounts already provisioned on the target are left in place. This cannot be undone.',
    confirmLabel: 'Delete application',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== app.id))
      toast('ok', 'Application deleted', app.displayName)
      navigate(BASE)
    },
  })

  const removeMany = (ids, clear) => confirm({
    title: `Delete ${ids.length} applications?`,
    body: 'The selected application records and their facets are removed. Accounts already provisioned on the targets are left in place.',
    confirmLabel: `Delete ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (clear) clear()
      toast('ok', 'Applications deleted', `${ids.length} removed from the register.`)
    },
  })

  const createApp = (draft) => {
    const id = nextId(rows)
    setRows((rs) => [...rs, { id, ...draft }])
    toast('ok', 'Application created', draft.displayName)
    navigate(`${BASE}/${id}`)
  }

  const linkApps = (targetId, otherId) => {
    setRows((rs) => {
      const target = rs.find((r) => String(r.id) === String(targetId))
      const other = rs.find((r) => String(r.id) === String(otherId))
      if (!target || !other) return rs
      const facet = target.provisioning ? { sso: other.sso } : { provisioning: other.provisioning }
      return rs
        .filter((r) => String(r.id) !== String(otherId))
        .map((r) => (String(r.id) === String(targetId) ? { ...r, ...facet } : r))
    })
    toast('ok', 'Facets linked', 'The application record now carries both provisioning and SSO.')
  }

  const unlinkApp = (targetId) => {
    setRows((rs) => {
      const target = rs.find((r) => String(r.id) === String(targetId))
      if (!target || !target.sso) return rs
      const split = {
        id: nextId(rs),
        name: target.sso.sourceName,
        displayName: target.sso.sourceDisplayName || target.displayName,
        description: '',
        org: target.org,
        owner: target.owner,
        createdOn: target.sso.createdOn,
        provisioning: null,
        sso: target.sso,
      }
      return [...rs.map((r) => (String(r.id) === String(targetId) ? { ...r, sso: null } : r)), split]
    })
    toast('ok', 'Facets unlinked', 'The SSO federation moved back onto its own application record.')
  }

  const mode = segments[0]

  if (mode === 'new') {
    return <AppWizard onCancel={() => navigate(BASE)} onCreate={createApp} />
  }

  if (mode) {
    const app = rows.find((r) => String(r.id) === String(mode))
    if (!app) return <NotFound id={mode} onBack={() => navigate(BASE)} />
    return (
      <AppDetail
        key={app.id}
        app={app}
        rows={rows}
        tab={segments[1] || 'overview'}
        sub={segments[2]}
        onTab={(t) => navigate(`${BASE}/${app.id}/${t}`)}
        onPatch={patch}
        onDelete={removeApp}
        onLink={linkApps}
        onUnlink={unlinkApp}
      />
    )
  }

  return <AppsList rows={rows} onDelete={removeApp} onBulkDelete={removeMany} onPatch={patch} />
}
