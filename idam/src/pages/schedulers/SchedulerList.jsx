import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { serialColumn, statusTone } from '../../lib/format'
import { serviceFor } from './serviceCatalog'
import { getJobProgress } from './schedulerApi'
import {
  BASE, applicationLabel, fmtCell, lastResultLabel, nextRunAt, parseStamp, relFuture,
} from './schedulerModel'

/* A scheduler register is read for three things: what is due, what is switched
   off, and what failed on its last run. */
const FACETS = {
  all: () => true,
  active: (r) => r.active_status,
  inactive: (r) => !r.active_status,
  failing: (r) => r.last_status === 'Failed',
}

export default function SchedulerList({ rows, onRun, onToggleActive, onDelete }) {
  const { navigate, confirm } = useApp()
  const [facet, setFacet] = useState('all')

  const progress = useMemo(() => getJobProgress(rows), [rows])

  const upcoming = useMemo(() => {
    const out = []
    rows.forEach((r) => {
      const first = nextRunAt(r)
      if (first == null) return
      out.push({ id: r.id, at: first, name: r.name, service: r.service_display_name, description: r.schedule_description })
    })
    return out.sort((a, b) => a.at - b.at).slice(0, 6)
  }, [rows])

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(FACETS.active).length,
    inactive: rows.filter(FACETS.inactive).length,
    failing: rows.filter(FACETS.failing).length,
    next: upcoming[0] ? relFuture(upcoming[0].at) : '—',
  }), [rows, upcoming])

  const confirmActive = (r) => confirm({
    tone: r.active_status ? 'bad' : 'acc',
    icon: r.active_status ? 'ban' : 'checkC',
    title: r.active_status ? `Deactivate ${r.name}?` : `Activate ${r.name}?`,
    body: r.active_status
      ? 'The schedule is retained but nothing is dispatched from it, and Run now is unavailable until it is activated again.'
      : 'The scheduler returns to its configured schedule and its next run is calculated from now.',
    confirmLabel: r.active_status ? 'Deactivate' : 'Activate',
    onConfirm: () => onToggleActive(r, !r.active_status),
  })

  const confirmDelete = (r) => confirm({
    title: `Delete ${r.name}?`,
    body: 'The scheduler is removed and nothing further is dispatched from it. Completed execution history is retained.',
    confirmLabel: 'Delete scheduler',
    onConfirm: () => onDelete(r),
  })

  const columns = [
    serialColumn('SR No'),
    {
      key: 'name',
      label: 'Scheduler name',
      locked: true,
      cls: 'td-main td-flex',
      width: 260,
      value: (r) => `${r.name} ${r.service_display_name} ${r.description || ''}`,
      render: (r) => <span className="trunc" title={r.description ? `${r.name} — ${r.description}` : r.name}>{r.name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      cls: 'td-flex',
      width: 260,
      optional: true,
      render: (r) => (r.description
        ? <span className="trunc" title={r.description}>{r.description}</span>
        : <span className="t-faint">No description</span>),
    },
    {
      key: 'service_display_name',
      label: 'Service',
      cls: 'td-flex',
      width: 190,
      render: (r) => (
        <span className="sch-svc">
          <button type="button" className="link" onClick={(e) => { e.stopPropagation(); navigate(`${BASE}/logs/${r.service_code}`) }}>
            {r.service_display_name}
          </button>
          {!r.service_available && <Pill tone="bad" dot>Unavailable</Pill>}
          {applicationLabel(r.service_code, r.application_id) && (
            <span className="cell-sub trunc">{applicationLabel(r.service_code, r.application_id)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'schedule_description',
      label: 'Schedule',
      cls: 'td-flex',
      width: 260,
      render: (r) => (
        <span className="trunc" style={{ display: 'block' }} title={r.schedule_description}>
          {r.schedule_description}
        </span>
      ),
    },
    { key: 'last_run_at', label: 'Last run', cls: 'td-mono', render: (r) => fmtCell(r.last_run_at) },
    {
      key: 'next_run_at',
      label: 'Next run',
      cls: 'td-mono',
      value: (r) => parseStamp(r.next_run_at) ?? Infinity,
      render: (r) => {
        if (r.schedule_type === 'manual') return <span className="t-faint">Manual only</span>
        if (!r.next_run_at) return <span className="t-faint">—</span>
        return <span title={`in ${relFuture(parseStamp(r.next_run_at))}`}>{fmtCell(r.next_run_at)}</span>
      },
    },
    {
      key: 'last_status',
      label: 'Last result',
      width: 150,
      value: (r) => lastResultLabel(r),
      render: (r) => {
        const label = lastResultLabel(r)
        return (
          <span className="sch-result">
            <Pill tone={statusTone(label)} dot>{label}</Pill>
            {progress[r.id] && (
              <span className="sch-prog" title={progress[r.id].phase}>
                <Meter value={progress[r.id].percent} tone="info" height={4} />
                <span className="t-xs t-mut">{progress[r.id].percent}%</span>
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'active_status',
      label: 'Status',
      value: (r) => (r.active_status ? 'Active' : 'Inactive'),
      render: (r) => <Pill tone={r.active_status ? 'ok' : 'mut'} dot>{r.active_status ? 'Active' : 'Inactive'}</Pill>,
    },
    { key: 'timezone', label: 'Timezone', cls: 'td-mono', optional: true },
    {
      key: 'timeout_ms',
      label: 'Timeout',
      optional: true,
      render: (r) => <span className="num">{Math.round((r.timeout_ms || 0) / 60000)} min</span>,
    },
    {
      key: 'retry_enabled',
      label: 'Retry',
      optional: true,
      value: (r) => (r.retry_enabled ? r.max_attempts : 0),
      render: (r) => (r.retry_enabled
        ? <span className="t-sm">{r.max_attempts} attempts · {String(r.backoff_strategy).toLowerCase()}</span>
        : <span className="t-faint">No retry</span>),
    },
    { key: 'last_modified_on', label: 'Last modified', cls: 'td-mono', optional: true, render: (r) => fmtCell(r.last_modified_on) },
  ]

  const rowActions = (r) => [
    {
      id: 'run',
      label: 'Run now',
      icon: 'play',
      disabled: !r.active_status,
      title: r.active_status ? 'Queue an execution now' : 'Activate the scheduler first',
      onSelect: () => onRun(r),
    },
    {
      id: 'history',
      label: 'Execution history',
      icon: 'history',
      onSelect: () => navigate(`${BASE}/logs/${r.service_code}`),
    },
    {
      id: 'active',
      label: r.active_status ? 'Deactivate' : 'Activate',
      icon: r.active_status ? 'ban' : 'checkC',
      onSelect: () => confirmActive(r),
    },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${BASE}/modify/${r.id}`) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => confirmDelete(r) },
  ]

  return (
    <>
      <PageBar
        title="Schedulers"
        sub="Scheduled background work: reconciliation, lifecycle date processing, exports, reports, backups and cleanup."
        crumbs={[{ label: 'Scheduler' }]}
        actions={
          <>
            <Button icon="jobs" onClick={() => navigate('jobs')}>Job queue</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Create Scheduler</Button>
          </>
        }
      />

      <StatCards
        items={[
          { id: 'all', icon: 'clock', label: 'Schedulers', value: stats.total, chip: `next in ${stats.next}`, sub: 'registered', hint: 'Every registered scheduler' },
          { id: 'active', icon: 'play', label: 'Active', value: stats.active, chip: 'dispatching', chipTone: 'ok', sub: 'running to schedule', hint: 'Schedulers that will dispatch' },
          { id: 'inactive', icon: 'ban', label: 'Inactive', value: stats.inactive, chip: stats.inactive ? 'not dispatching' : 'none', chipTone: stats.inactive ? 'warn' : undefined, sub: 'switched off', hint: 'Schedulers that will not fire' },
          { id: 'failing', icon: 'warn', label: 'Failing', value: stats.failing, chip: stats.failing ? 'last run failed' : 'all clean', chipTone: stats.failing ? 'bad' : undefined, sub: 'need attention', hint: 'Schedulers whose last run failed' },
        ]}
        value={facet}
        onChange={(id) => setFacet(id === facet && id !== 'all' ? 'all' : id)}
        label="Filter the scheduler register"
      />

      <div className="stack">
        <Card
          title="Next executions"
          sub="Projected from the active schedules"
          actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('jobs')}>Job queue</Button>}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              size="sm"
              icon="clock"
              title="Nothing scheduled"
              body="Every scheduler is inactive or manual. Activate one to restore its schedule."
            />
          ) : (
            <div className="tl">
              {upcoming.map((u, i) => (
                <div className="tl-it" key={u.id} data-tone={i === 0 ? 'acc' : 'ok'}>
                  <span className="tl-dot"><Icon name="clock" size={8} stroke={3} /></span>
                  <div className="tl-t">{u.name}</div>
                  <div className="tl-s">{u.service} · {u.description}</div>
                  <div className="tl-time">{new Date(u.at).toISOString().slice(0, 16).replace('T', ' ')} UTC · in {relFuture(u.at)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <DataWorkbench
          id="schedulers"
          rows={rows.filter(FACETS[facet] || FACETS.all)}
          columns={columns}
          searchPlaceholder="Search by scheduler name, service or description…"
          rowActions={rowActions}
          actionsLabel="Action"
          onRowClick={(r) => navigate(`${BASE}/modify/${r.id}`)}
          emptyTitle="No schedulers match"
          emptyBody="Adjust the view or clear the search to see every registered scheduler."
          emptyIcon="clock"
          footNote="Next runs shown in UTC · each scheduler is evaluated in its own timezone"
        />
      </div>
    </>
  )
}
