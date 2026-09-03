import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useApp } from '../../store/AppContext'
import { NEVER_USED_DAYS, ageDays, orphanTone } from './orphanedData'

export default function AccountsTable({ id, rows, onAssign, onDisable, onSuppress, onDelete, footNote }) {
  const { navigate, toast } = useApp()

  const columns = [
    {
      key: 'account', label: 'Account', locked: true, cls: 'td-main td-mono',
      value: (r) => `${r.account} ${r.owner || ''}`,
      render: (r) => (
        <span className="cell-id">
          <span className="trunc">{r.account}</span>
          {r.owner && <span className="tag" data-tone="acc">{r.owner}</span>}
        </span>
      ),
    },
    { key: 'application', label: 'Application' },
    { key: 'rule', label: 'Matched rule', render: (r) => <span className="tag">{r.rule}</span> },
    { key: 'risk', label: 'Risk', render: (r) => <SeverityBadge level={r.risk}>{r.risk}</SeverityBadge> },
    {
      key: 'discovered', label: 'Discovered', cls: 'td-mono', optional: true,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.discovered}</span>
          <span className="cell-sub">{ageDays(r.discovered)} days open</span>
        </span>
      ),
    },
    {
      key: 'lastUsed', label: 'Last used', cls: 'td-mono', optional: true,
      render: (r) => (ageDays(r.lastUsed) > NEVER_USED_DAYS ? <span style={{ color: 'var(--bad)' }}>{r.lastUsed}</span> : r.lastUsed),
    },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={orphanTone(r.status)} dot>{r.status}</Pill> },
  ]

  return (
    <DataWorkbench
      id={id}
      rows={rows}
      columns={columns}
      selectable
      searchPlaceholder="Search by account, application or rule…"
      bulkActions={(ids, clear) => {
        const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
        return (
          <>
            <Button size="sm" icon="ban" onClick={() => onDisable(list, clear)}>Disable accounts</Button>
            <Button size="sm" icon="link" onClick={() => onAssign(list, clear)}>Assign owner</Button>
            <Button size="sm" icon="eyeoff" onClick={() => onSuppress(list, clear)}>Suppress</Button>
          </>
        )
      }}
      rowActions={(r) => [
        { id: 'assign', label: 'Assign to identity', icon: 'link', onSelect: () => onAssign([r]) },
        { id: 'app', label: 'Open application', icon: 'provision', onSelect: () => navigate('provisionapplications') },
        { id: 'recon', label: 'Open reconciliation', icon: 'recon', onSelect: () => navigate('trustReconciliation') },
        { divider: true },
        { id: 'disable', label: 'Disable', icon: 'ban', disabled: r.status === 'Disabled', onSelect: () => onDisable([r]) },
        { id: 'suppress', label: 'Suppress', icon: 'eyeoff', disabled: r.status === 'Suppressed', onSelect: () => onSuppress([r]) },
        { divider: true },
        { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete(r) },
      ]}
      toolbar={<Button size="sm" icon="recon" onClick={() => toast('info', 'Rematch', 'Correlation rules re-evaluated against the directory.')}>Rematch</Button>}
      emptyTitle="No orphaned accounts match"
      emptyBody="Every account in this view has been claimed, disabled or suppressed. Widen the filters to review the full register."
      emptyIcon="orphan"
      footNote={footNote}
    />
  )
}

