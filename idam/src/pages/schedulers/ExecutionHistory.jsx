import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import { Skeleton, SkeletonDetailHeader } from '../../components/primitives/Skeleton'
import { SchedulerTabsSkeleton } from './SchedulersSkeleton'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useLoading } from '../../lib/useLoading'
import { useApp } from '../../store/AppContext'
import { duration, num, serialColumn, statusTone } from '../../lib/format'
import { serviceFor } from './serviceCatalog'
import { getSchedulerLogs } from './schedulerApi'
import { BASE, schedulerTime } from './schedulerModel'
import RunDetail from './RunDetail'

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

  /* One flag for the screen. The scope switch is a different question asked of
     the same service — "this scheduler" or "all of them" — so it re-settles
     the history under the masthead; `booted` keeps the masthead itself, and
     the scope tabs that live in it, on screen while that happens. */
  const loading = useLoading(`${code}|${scope}`)
  const [booted, setBooted] = useState(false)
  useEffect(() => { if (!loading) setBooted(true) }, [loading])

  const bound = useMemo(() => rows.filter((r) => r.service_code === code), [rows, code])

  /* Through the endpoint rather than around it. `display_timezone` comes back
     with the runs and is the zone every stamp on this screen and the one under
     it is converted into — once, with the scheduler's own helper. */
  const response = useMemo(
    () => getSchedulerLogs(rows, {
      service: code,
      schedulerId: scope === 'scheduler' && focused ? focused.id : null,
      limit: 500,
    }),
    [rows, code, scope, focused],
  )
  const executions = response.totalResults
  const tz = response.display_timezone

  const svc = service || serviceFor(code)

  const stats = useMemo(() => ({
    total: executions.length,
    failed: executions.filter((e) => e.status === 'Failed').length,
    partial: executions.filter((e) => e.status === 'Partial').length,
    records: executions.reduce((a, e) => a + e.records_processed, 0),
  }), [executions])

  const openExecution = (e) => {
    setDrawer({
      /* Wide, because the result screens carry up to nine columns and a drawer
         at its default width would hand every one of the four services a table
         that is scrolled before it is read. */
      size: 'xl',
      title: `Run ${e.id}`,
      sub: `${e.scheduler_name} · ${e.service_display_name}`,
      children: <RunDetail execution={e} scheduler={rows.find((r) => r.id === e.scheduler_id)} svc={svc} />,
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
    {
      key: 'mode',
      label: 'Mode',
      /* A run that changed nothing and a run that did are not the same row, and
         the column is the only place the difference shows before one is opened.
         `value` is what the search and the sort read: the row carries a boolean
         and neither of them can do anything with that. */
      value: (e) => (e.dry_run ? 'Dry run' : 'Live'),
      render: (e) => (e.dry_run
        ? <Pill tone="info" dot>Dry run</Pill>
        : <span className="t-faint">Live</span>),
    },
    /* Searched and sorted on the converted value, so a search for a time finds
       the row that shows it. The conversion is monotonic, so the order is the
       order of the underlying instants either way. */
    { key: 'started_at', label: 'Started', cls: 'td-mono', value: (e) => schedulerTime(e.started_at, tz), render: (e) => schedulerTime(e.started_at, tz) },
    { key: 'finished_at', label: 'Finished', cls: 'td-mono', value: (e) => schedulerTime(e.finished_at, tz), render: (e) => schedulerTime(e.finished_at, tz) },
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

  const body = (
    <div className="stack">
      {scope === 'service' && bound.length > 1 && (
        loading ? (
          /* The card's own title and blurb are fixed copy, so the real card
             draws them and only its rows wait. `.sch-bound-it` is the same
             10px-padded grid row whether it holds a name or a bar, so the list
             keeps its depth and the register below it does not move. */
          <Card title="Schedulers on this service" sub="Open one to see only its own executions" flush>
            <div className="sch-bound" aria-hidden="true">
              {bound.map((r) => (
                <div className="sch-bound-it" key={r.id} data-skel="true">
                  <span className="sch-bound-t"><span className="skel sch-skel-b" style={{ width: '62%', height: 9 }} /></span>
                  <span className="sch-bound-s"><span className="skel sch-skel-b" style={{ width: '74%', height: 8 }} /></span>
                  <span className="skel skel-chip" style={{ width: 62 }} />
                </div>
              ))}
            </div>
          </Card>
        ) : (
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
        )
      )}

      <DataWorkbench
        id="scheduler-executions"
        loading={loading}
        rows={executions}
        columns={columns}
        getRowId={(e) => e.id}
        searchPlaceholder="Search by execution id, scheduler or status…"
        onRowClick={openExecution}
        emptyTitle="No runs recorded"
        emptyBody="This service has not run yet, or its history has been cleaned up."
        emptyIcon="history"
        footNote={`Times shown in ${tz}, the timezone this deployment reports in`}
      />
    </div>
  )

  if (!booted) {
    return (
      <>
        {/* A scheduler reached by its own link opens with the scope strip in
            the masthead, so the skeleton carries it too — without it the real
            header lands 38px taller and takes the history down with it. */}
        <SkeletonDetailHeader media={false} facts={4} actions={1} className={focused ? 'sch-skel-head' : undefined} />
        {focused && <SchedulerTabsSkeleton tabs={2} />}
        <div className="detail-body">
          <Skeleton label={`Loading the execution history for ${svc.displayName}`}>{body}</Skeleton>
        </div>
      </>
    )
  }

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Scheduler"
        eyebrow="Run history"
        title={focused && scope === 'scheduler' ? focused.name : svc.displayName}
        sub={svc.description}
        badges={<Tag>{svc.serviceCode}</Tag>}
        meta={
          <>
            <Fact icon="history" label="Runs" value={num(stats.total)} />
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
        {/* The one announcing region: the masthead is up, and the history
            under it is what a scope change goes back to the server for. */}
        {loading ? (
          <Skeleton label={`Loading the execution history for ${svc.displayName}`}>{body}</Skeleton>
        ) : body}
      </div>
    </>
  )
}
