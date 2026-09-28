import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import PageBar from '../../components/shell/PageBar'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useLoading } from '../../lib/useLoading'
import { useApp } from '../../store/AppContext'
import { serialColumn, statusTone } from '../../lib/format'
import { serviceFor } from './serviceCatalog'
import { checkServicePermission, getJobProgress } from './schedulerApi'
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

/* Six, because the projection below takes the first six. The placeholder holds
   the card at the depth the real list will fill. */
const SKEL_UPCOMING = [0, 1, 2, 3, 4, 5]

export default function SchedulerList({ rows, onRun, onToggleActive, onDelete }) {
  const { navigate, confirm, can } = useApp()
  const [facet, setFacet] = useState('all')
  /* One flag for the register. The facet is not keyed on: the tiles are the
     filter, and blanking the thing you just clicked is a worse answer than
     showing the narrowed list immediately. */
  const loading = useLoading()

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

  /**
   * The services on this register the signed-in role may not dispatch.
   *
   * The message is the server's own and is shown in full: a greyed control
   * carries its reason on a tooltip, and a tooltip is not somewhere an operator
   * finds out which permission they are missing. One line per service, not per
   * scheduler — the refusal is about the service, and four schedulers on one
   * service would otherwise repeat it four times.
   */
  const refused = useMemo(() => {
    const seen = new Set()
    const out = []
    rows.forEach((r) => {
      if (seen.has(r.service_code)) return
      const perm = checkServicePermission(r.service_code, can)
      if (!perm.required || perm.granted) return
      seen.add(r.service_code)
      out.push({ ...perm, service: r.service_display_name })
    })
    return out
  }, [rows, can])

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

  /**
   * The four add-on services carry a permission of their own, which the server
   * enforces before it will dispatch one. A role that lacks it keeps Run now on
   * screen and greyed, carrying the server's own message: hiding the control
   * says nothing, while a disabled one with a reason says the capability exists
   * and that somebody else holds it.
   */
  const rowActions = (r) => {
    const perm = checkServicePermission(r.service_code, can)
    return [
      {
        id: 'run',
        label: 'Run now',
        icon: 'play',
        disabled: !r.active_status || !perm.granted,
        title: !perm.granted ? perm.message
          : r.active_status ? 'Queue an execution now'
            : 'Activate the scheduler first',
        onSelect: () => onRun(r),
      },
      {
        id: 'history',
        label: 'Run history',
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
  }

  const body = (
    <div className="stack">
      {refused.length > 0 && (
        <Banner tone="warn">
          <strong>Some of these schedulers cannot be dispatched from this account.</strong>
          <ul className="issue-list">
            {refused.map((p) => <li key={p.permission}>{p.service} — {p.message}</li>)}
          </ul>
        </Banner>
      )}

      {loading ? (
        /* The card's title and blurb are fixed copy, so the real card draws
           them and only the projection inside waits. The bars sit on the
           timeline's own rule — `.tl-t`, `.tl-s` and `.tl-time` each carry
           their own line height — so a bar occupies exactly the row the real
           item will, and six of them hold the card at its real depth. */
        <Card
          title="Next executions"
          sub="Projected from the active schedules"
          actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('jobs')}>Job queue</Button>}
        >
          <div className="tl" aria-hidden="true">
            {SKEL_UPCOMING.map((i) => (
              <div className="tl-it" key={i}>
                <span className="tl-dot" />
                <div className="tl-t"><span className="skel sch-skel-b" style={{ width: '44%', height: 10 }} /></div>
                <div className="tl-s"><span className="skel sch-skel-b" style={{ width: '71%', height: 9 }} /></div>
                <div className="tl-time"><span className="skel sch-skel-b" style={{ width: '38%', height: 9 }} /></div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
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
      )}

      <DataWorkbench
        id="schedulers"
        loading={loading}
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
  )

  return (
    <>
      {loading ? (
        <SkeletonPageBar actions={2} crumbs={1} />
      ) : (
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
      )}

      {loading ? (
        <SkeletonStats count={4} />
      ) : (
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
      )}

      {/* One announcing region for the screen; the masthead and tile shapes
          above it are aria-hidden decoration and say nothing of their own. */}
      {loading ? <Skeleton label="Loading the scheduler register">{body}</Skeleton> : body}
    </>
  )
}
