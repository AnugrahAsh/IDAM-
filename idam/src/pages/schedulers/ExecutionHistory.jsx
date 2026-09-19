import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useApp } from '../../store/AppContext'
import { duration, num, serialColumn, statusTone } from '../../lib/format'
import { serviceFor } from './serviceCatalog'
import { executionsFor, itemLogsFor, workerLines } from './schedulerApi'
import { BASE, fmtCell } from './schedulerModel'

/**
 * Execution history.
 *
 * Addressed by service code, which is how the module has always linked to it,
 * with a per-scheduler scope alongside. A service-wide view alone cannot answer
 * "did *this* reconciliation scheduler run last night" when four schedulers
 * share the service — so the scope is a tab rather than a second screen.
 */
export default function ExecutionHistory({ rows, serviceCode, schedulerId }) {
  const { navigate, setDrawer } = useApp()
  const service = serviceFor(serviceCode)
  const focused = schedulerId != null ? rows.find((r) => String(r.id) === String(schedulerId)) : null
  const code = focused ? focused.service_code : serviceCode

  const [scope, setScope] = useState(() => (focused ? 'scheduler' : 'service'))

  const bound = useMemo(() => rows.filter((r) => r.service_code === code), [rows, code])
  const scoped = scope === 'scheduler' && focused ? [focused] : bound
  const executions = useMemo(() => executionsFor(scoped), [scoped])

  const svc = service || serviceFor(code)

  const stats = useMemo(() => ({
    total: executions.length,
    failed: executions.filter((e) => e.status === 'Failed').length,
    partial: executions.filter((e) => e.status === 'Partial').length,
    records: executions.reduce((a, e) => a + e.records_processed, 0),
  }), [executions])

  const openExecution = (e) => {
    const items = itemLogsFor(e, svc)
    setDrawer({
      title: `Execution ${e.id}`,
      sub: `${e.scheduler_name} · ${e.service_display_name}`,
      children: (
        <div className="stack">
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-k"><Icon name="activity" size={12} />Status</span>
              <span className="stat-v"><Pill tone={statusTone(e.status)} dot>{e.status}</Pill></span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="clock" size={12} />Duration</span>
              <span className="stat-v">{duration(e.duration_ms)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="layers" size={12} />Records</span>
              <span className="stat-v">{num(e.records_processed)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="warn" size={12} />Failed</span>
              <span className="stat-v">{num(e.records_failed)}</span>
            </div>
          </div>

          <div className="t-sm t-mut">
            {e.trigger === 'Manual' ? 'Dispatched by an operator' : 'Dispatched on schedule'} · started {e.started_at} UTC
            {e.finished_at ? ` · finished ${e.finished_at} UTC` : ' · still running'}
            {e.attempt > 1 && ` · attempt ${e.attempt}`}
          </div>

          <div>
            <div className="cfg-group-h">Worker output</div>
            <div className="log-view">
              {workerLines(e, svc).map((l, i) => <div key={i} className={l.tone}>{l.text}</div>)}
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <div className="cfg-group-h">Per-item log</div>
              <table className="tbl">
                <thead>
                  <tr><th>Subject</th><th>Outcome</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="td-mono">{it.subject}</td>
                      <td><Pill tone={it.outcome === 'Applied' ? 'ok' : 'bad'} dot>{it.outcome}</Pill></td>
                      <td>{it.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!svc?.metadata?.producesItemLogs && (
            <div className="t-xs t-mut">
              {svc?.displayName || 'This service'} does not produce per-item logs — only the worker output above is retained.
            </div>
          )}
        </div>
      ),
      footer: <Button variant="pri" onClick={() => setDrawer(null)}>Close</Button>,
    })
  }

  const columns = [
    serialColumn('SR No'),
    { key: 'id', label: 'Execution', cls: 'td-mono td-main' },
    ...(scope === 'service' ? [{
      key: 'scheduler_name',
      label: 'Scheduler',
      width: 240,
      render: (e) => (
        <button type="button" className="link trunc" onClick={(ev) => { ev.stopPropagation(); navigate(`${BASE}/modify/${e.scheduler_id}`) }}>
          {e.scheduler_name}
        </button>
      ),
    }] : []),
    { key: 'trigger', label: 'Trigger', render: (e) => <Tag tone={e.trigger === 'Manual' ? 'info' : undefined}>{e.trigger}</Tag> },
    { key: 'started_at', label: 'Started', cls: 'td-mono' },
    { key: 'finished_at', label: 'Finished', cls: 'td-mono', render: (e) => fmtCell(e.finished_at) },
    { key: 'duration_ms', label: 'Duration', cls: 'td-num', render: (e) => duration(e.duration_ms) },
    { key: 'attempt', label: 'Attempt', cls: 'td-num', optional: true },
    { key: 'records_processed', label: 'Records', cls: 'td-num', render: (e) => num(e.records_processed) },
    {
      key: 'records_failed',
      label: 'Failed',
      cls: 'td-num',
      render: (e) => (e.records_failed ? <span className="num" style={{ color: 'var(--bad)' }}>{num(e.records_failed)}</span> : <span className="t-faint">0</span>),
    },
    { key: 'status', label: 'Status', render: (e) => <Pill tone={statusTone(e.status)} dot>{e.status}</Pill> },
  ]

  if (!svc) {
    return (
      <>
        <DetailHeader backTo={BASE} backLabel="Scheduler" title="Unknown service" sub={`No service in the catalogue answers to ${serviceCode}.`} />
        <EmptyState
          icon="warn"
          title={`${serviceCode} is not a registered service`}
          body="The scheduler that linked here may be bound to a service this deployment no longer offers."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to Scheduler</Button>}
        />
      </>
    )
  }

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Scheduler"
        eyebrow="Execution history"
        title={focused && scope === 'scheduler' ? focused.name : svc.displayName}
        sub={svc.description}
        badges={<Tag>{svc.serviceCode}</Tag>}
        meta={
          <>
            <Fact icon="history" label="Executions" value={num(stats.total)} />
            <Fact icon="warn" label="Failed" value={num(stats.failed)} />
            <Fact icon="layers" label="Records" value={num(stats.records)} />
            <Fact icon="clock" label="Schedulers on this service" value={num(bound.length)} />
          </>
        }
        actions={<Button icon="chevL" onClick={() => navigate(BASE)}>Back to register</Button>}
        tabs={
          focused ? (
            <Tabs
              tabs={[
                { id: 'scheduler', label: focused.name, icon: 'clock' },
                { id: 'service', label: `All ${svc.displayName}`, icon: 'layers', count: bound.length },
              ]}
              value={scope}
              onChange={setScope}
            />
          ) : undefined
        }
      />

      <div className="detail-body">
        <div className="stack">
          {scope === 'service' && bound.length > 1 && (
            <Card title="Schedulers on this service" sub="Open one to see only its own executions" flush>
              <div className="sch-bound">
                {bound.map((r) => (
                  <button type="button" className="sch-bound-it" key={r.id} onClick={() => navigate(`${BASE}/logs/scheduler/${r.id}`)}>
                    <span className="sch-bound-t">{r.name}</span>
                    <span className="sch-bound-s">{r.schedule_description}</span>
                    <Pill tone={r.active_status ? 'ok' : 'mut'} dot>{r.active_status ? 'Active' : 'Inactive'}</Pill>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <DataWorkbench
            id="scheduler-executions"
            rows={executions}
            columns={columns}
            getRowId={(e) => e.id}
            searchPlaceholder="Search by execution id, scheduler or status…"
            onRowClick={openExecution}
            emptyTitle="No executions recorded"
            emptyBody="This service has not run yet, or its history has been cleaned up."
            emptyIcon="history"
            footNote="Times shown in UTC"
          />
        </div>
      </div>
    </>
  )
}
