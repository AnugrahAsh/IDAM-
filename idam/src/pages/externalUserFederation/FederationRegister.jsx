import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterHeader from '../../components/workbench/RegisterHeader'
import AppLogo from '../../components/primitives/AppLogo'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { brandForConnector } from '../shared/provisioning/shared'
import {
  BASE, canSync, categoryOf, hubConnector, isTracked, lastSyncOf, ldapAppById, needsAttention, operationList, statusOf,
} from './federationData'

// Each headline doubles as the filter for it: how many applications federate,
// how many are syncing, which ones need attention, and which are held.
const FACETS = [
  { id: 'all', label: 'federated applications', hint: 'Every application federating users into a directory' },
  { id: 'syncing', label: 'syncing', hint: 'Healthy, or waiting for a first sync' },
  { id: 'attention', label: 'need attention', hint: 'Failed or degraded federations' },
  { id: 'held', label: 'paused or tracked', hint: 'Paused federations, and applications tracked without provisioning' },
]

const matchesFacet = (r, facet) => {
  if (facet === 'syncing') return r.status === 'Healthy' || r.status === 'Pending'
  if (facet === 'attention') return needsAttention(r)
  if (facet === 'held') return r.status === 'Paused' || r.status === 'Manual'
  return true
}

export default function FederationRegister({ rows, onDelete, onBulkDelete, onSync, onTest, onTogglePause }) {
  const { navigate, toast } = useApp()
  const [facet, setFacet] = useState('all')
  // Dismissal is keyed to the finding, so the line returns when a different
  // federation breaks rather than staying hidden for good.
  const [mutedAlert, setMutedAlert] = useState(null)

  const shown = useMemo(() => rows.filter((r) => matchesFacet(r, facet)), [rows, facet])

  const counts = useMemo(() => Object.fromEntries(FACETS.map((f) => [f.id, rows.filter((r) => matchesFacet(r, f.id)).length])), [rows])

  const summary = useMemo(() => [
    { value: rows.reduce((a, r) => a + (r.users || 0), 0), label: 'users federated' },
    { value: new Set(rows.map((r) => r.ldapAppId)).size, label: 'LDAP applications' },
    { value: new Set(rows.map((r) => r.connector)).size, label: 'connectors in use' },
  ], [rows])

  const alert = useMemo(() => {
    const broken = rows.filter((r) => r.status === 'Failed')
    const shaky = rows.filter((r) => r.status === 'Degraded')
    if (!broken.length && !shaky.length) return null
    const n = broken.length + shaky.length
    const parts = []
    if (broken.length) parts.push(`${broken.map((r) => r.displayName).join(', ')} failed`)
    if (shaky.length) parts.push(`${shaky.map((r) => r.displayName).join(', ')} degraded`)
    return {
      tone: broken.length ? 'bad' : 'warn',
      title: `${n} ${n === 1 ? 'federated application needs' : 'federated applications need'} attention`,
      detail: parts.join(' · '),
      filterId: 'attention',
      actionLabel: 'Review',
    }
  }, [rows])

  const columns = [
    serialColumn('S.No'),
    {
      key: 'displayName', label: 'Application', locked: true, cls: 'td-main td-wide', width: 250,
      value: (r) => `${r.displayName} ${r.name}`,
      render: (r) => (
        <span className="cell-id">
          <AppLogo brand={brandForConnector(r.connector)} name={r.displayName} size={22} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.displayName}</span>
            <span className="cell-sub">{r.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'connector', label: 'Connector', cls: 'td-flex', width: 160,
      value: (r) => { const h = hubConnector(r.connector); return h ? `${h.name} ${categoryOf(h.category).label}` : r.connector },
      render: (r) => {
        const h = hubConnector(r.connector)
        const c = categoryOf(h ? h.category : 'other')
        return (
          <span className="cell-stack">
            <span className="trunc">{h ? h.name : r.connector}</span>
            <span className="cell-sub trunc">{h && h.dbType ? `${c.tag} · ${h.dbType}` : c.label}</span>
          </span>
        )
      },
    },
    {
      key: 'placement', label: 'Directory placement', cls: 'td-flex', width: 250,
      value: (r) => { const a = ldapAppById(r.ldapAppId); return `${a ? a.displayName : ''} ${r.ouDn}` },
      render: (r) => {
        const a = ldapAppById(r.ldapAppId)
        return (
          <span className="cell-stack">
            <span className="trunc">{a ? a.displayName : '—'}</span>
            <span className="cell-sub mono trunc" title={r.ouDn}>{r.ouDn}</span>
          </span>
        )
      },
    },
    {
      key: 'operations', label: 'Operations', width: 190, optional: true,
      value: (r) => (isTracked(r.connector) ? 'Tracked only' : operationList(r.operations).join(' ')),
      render: (r) => (isTracked(r.connector)
        ? <span className="t-faint">Tracked only</span>
        : <span className="trunc" title={operationList(r.operations).join(', ')}>{operationList(r.operations).join(' · ')}</span>),
    },
    {
      key: 'status', label: 'Status', width: 140,
      value: (r) => statusOf(r).label,
      render: (r) => { const s = statusOf(r); return <Pill tone={s.tone} dot>{s.label}</Pill> },
    },
    {
      key: 'users', label: 'Users', align: 'right', width: 84,
      value: (r) => r.users || 0,
      render: (r) => num(r.users || 0),
    },
    {
      key: 'lastSync', label: 'Last sync', width: 104,
      value: (r) => (r.lastSyncMins == null ? Number.MAX_SAFE_INTEGER : r.lastSyncMins),
      render: (r) => { const s = lastSyncOf(r); return <span className={r.lastSyncMins == null ? 't-faint' : undefined} title={s.at}>{s.rel}</span> },
    },
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${BASE}/${r.id}`) },
    ...(!isTracked(r.connector) ? [{ id: 'test', label: 'Test connection', icon: 'target', onSelect: () => onTest(r) }] : []),
    ...(canSync(r) ? [{ id: 'sync', label: 'Sync now', icon: 'refresh', onSelect: () => onSync(r) }] : []),
    ...(!isTracked(r.connector) ? [{
      id: 'pause',
      label: r.status === 'Paused' ? 'Resume' : 'Pause',
      icon: r.status === 'Paused' ? 'play' : 'power',
      onSelect: () => onTogglePause(r),
    }] : []),
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete(r) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} federated applications queued for CSV export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => onBulkDelete(ids, clear)}>Delete</Button>
    </>
  )

  return (
    <>
      <PageBar
        title="External User Federation"
        crumbs={[{ label: 'External User Federation' }]}
        sub="Directories, databases and identity services whose users are federated into your LDAP applications. Each one is set up from the Connector Hub."
        actions={(
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'The federated application inventory is being generated.')}>Export</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/new`)}>Add Application</Button>
          </>
        )}
      />

      <DataWorkbench
        id="external-user-federation"
        header={(
          <RegisterHeader
            items={FACETS.map((f) => ({ ...f, value: counts[f.id], tone: f.id === 'attention' && counts.attention ? 'bad' : undefined }))}
            value={facet}
            onChange={setFacet}
            resetId="all"
            label="Filter the federated applications"
            alert={alert && mutedAlert === alert.detail ? null : alert}
            onDismissAlert={() => setMutedAlert(alert ? alert.detail : null)}
            summary={summary}
          />
        )}
        rows={shown}
        columns={columns}
        selectable
        searchPlaceholder="Search by application, connector, directory or organizational unit…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
        emptyTitle="No federated applications match"
        emptyBody="Adjust the search or the headline filter above, or add an application from the Connector Hub."
        emptyIcon="plug"
        footNote="Users are written into LDAP applications · directories are managed under LDAP Applications"
      />
    </>
  )
}
