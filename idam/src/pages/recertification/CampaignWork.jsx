import { useMemo } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Meter from '../../components/primitives/Meter'
import Avatar from '../../components/primitives/Avatar'
import { num } from '../../lib/format'
import { reviewersFor } from './data'

export function ReviewersTab({ c, onResendReviewer, onEscalate }) {
  const rows = useMemo(() => reviewersFor(c), [c])
  const outstanding = rows.reduce((a, r) => a + r.remaining, 0)

  const columns = [
    {
      key: 'name', label: 'Reviewer', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Avatar name={r.name} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{r.remit}</span>
          </span>
        </span>
      ),
    },
    { key: 'role', label: 'Role', render: (r) => <Tag>{r.role}</Tag> },
    { key: 'level', label: 'Level', align: 'right', render: (r) => <span className="num">{r.level}</span> },
    { key: 'assigned', label: 'Assigned', align: 'right', render: (r) => <span className="num">{num(r.assigned)}</span> },
    { key: 'decided', label: 'Decided', align: 'right', render: (r) => <span className="num">{num(r.decided)}</span> },
    {
      key: 'remaining', label: 'Owed', align: 'right',
      render: (r) => (r.remaining === 0
        ? <Pill tone="ok" dot>Complete</Pill>
        : <span className="num" style={{ fontWeight: 600 }}>{num(r.remaining)}</span>),
    },
    {
      key: 'progress', label: 'Progress', width: 168, sortable: false,
      render: (r) => (
        <span className="cell-id" style={{ gap: 8 }}>
          <span style={{ flex: 1, minWidth: 64 }}>
            <Meter value={r.progress} tone={r.progress >= 100 ? 'ok' : r.escalated ? 'warn' : undefined} />
          </span>
          <span className="t-xs t-mut num" style={{ flex: 'none' }}>{r.progress}%</span>
        </span>
      ),
    },
    { key: 'lastActive', label: 'Last activity', cls: 'td-mono' },
    {
      key: 'escalated', label: 'State',
      render: (r) => (r.escalated
        ? <Pill tone="warn" icon="trendUp">Escalated</Pill>
        : r.remaining === 0 ? <Pill tone="ok" dot>Signed off</Pill> : <Pill tone="mut" dot>In progress</Pill>),
    },
    {
      key: 'mail', label: 'Reminder', sortable: false, width: 124,
      render: (r) => (
        <Button
          size="sm"
          icon="mail"
          disabled={c.status !== 'Active' || r.remaining === 0}
          onClick={(e) => { e.stopPropagation(); onResendReviewer(r) }}
        >
          Resend Mail
        </Button>
      ),
    },
  ]

  return (
    <div className="stack">
      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="users" size={12} />Reviewers</span>
          <span className="stat-v">{rows.length}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="checkC" size={12} />Signed off</span>
          <span className="stat-v">{rows.filter((r) => r.remaining === 0).length}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="inbox" size={12} />Items still owed</span>
          <span className="stat-v">{num(outstanding)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="trendUp" size={12} />Escalated</span>
          <span className="stat-v">{rows.filter((r) => r.escalated).length}</span>
        </div>
      </div>

      <DataWorkbench
        id="recert-reviewers"
        rows={rows}
        columns={columns}
        searchPlaceholder="Search reviewers by name, role or remit…"
        rowActions={(r) => [
          { id: 'mail', label: 'Resend Mail', icon: 'mail', disabled: c.status !== 'Active' || r.remaining === 0, onSelect: () => onResendReviewer(r) },
          { id: 'esc', label: 'Escalate to line manager', icon: 'trendUp', disabled: c.status !== 'Active' || r.remaining === 0, onSelect: () => onEscalate(r, 'escalate') },
          { divider: true },
          { id: 'delegate', label: 'Reassign this queue', icon: 'swap', disabled: c.status !== 'Active', onSelect: () => onEscalate(r, 'reassign') },
        ]}
        emptyTitle="No reviewers"
        emptyBody="This campaign has no reviewer assignments."
        emptyIcon="users"
        footNote="Reminder mail is delivered on the next digest run"
        pageSize={25}
      />
    </div>
  )
}
