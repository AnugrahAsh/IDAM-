import './styles/JobsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import IconButton from '../components/primitives/IconButton'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tabs from '../components/primitives/Tabs'
import Meter from '../components/primitives/Meter'
import TextInput from '../components/primitives/TextInput'
import KeyValue from '../components/primitives/KeyValue'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { useDialogFocus } from '../lib/useDialogFocus'
import { duration, num, serialColumn, statusTone } from '../lib/format'
import { JOBS, USERS } from '../data/seed'

const DAYS = [...new Set(JOBS.map((j) => j.started.slice(0, 10)))].sort()
const TODAY = DAYS[DAYS.length - 1]

const SERIES = [
  { key: 'succeeded', label: 'Succeeded', color: 'var(--s2)' },
  { key: 'failed', label: 'Failed', color: 'var(--s6)' },
  { key: 'running', label: 'Running', color: 'var(--s1)' },
  { key: 'canceled', label: 'Canceled', color: 'var(--mut)' },
]

const FAIL_REASONS = [
  'Target rejected the attribute mapping',
  'Unique constraint violated on the target key',
  'Connector timed out after 30s',
  'Bind account lacks write privilege',
  'Account already exists and was not claimed',
]

const isDone = (j) => j.status !== 'Running'

const meterTone = (status) => (status === 'Failed' ? 'bad' : status === 'Succeeded' ? 'ok' : status === 'Canceled' ? 'warn' : undefined)

const appliedPct = (job) => (job.status === 'Running'
  ? job.progress
  : job.total > 0 ? Math.round((job.succeeded / job.total) * 100) : 0)

const recordsFor = (job) =>
  Array.from({ length: 8 }, (_, i) => {
    const u = USERS[(job.id * 5 + i * 7) % USERS.length]
    const isFailed = job.failed > 0 && i % 4 === 1
    const isPending = job.status === 'Running' && i > 4
    return {
      id: `${job.jobId}-${i}`,
      principal: u.username,
      email: u.email,
      outcome: isFailed ? 'Failed' : isPending ? 'Pending' : 'Succeeded',
      detail: isFailed ? FAIL_REASONS[(job.id + i) % FAIL_REASONS.length] : isPending ? 'Queued for dispatch' : 'Applied to target',
    }
  })

function JobPeek({ job, onClose, onRerun, onDownload, onOpenLog }) {
  const records = recordsFor(job)
  const throughput = job.durationMs > 0 ? Math.max(1, Math.round(job.total / (job.durationMs / 1000))) : 0
  const ref = useDialogFocus(onClose)

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        className="modal job-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${job.jobId}`}
      >
        <header className="job-modal-h">
          <span className="feed-ic" data-tone={job.status === 'Failed' ? 'bad' : job.status === 'Running' ? 'acc' : 'ok'}>
            <Icon name="jobs" size={13} />
          </span>
          <div className="card-h-meta">
            <div className="t-h3 trunc mono">{job.jobId}</div>
            <div className="card-h-sub trunc">{job.operation} · {job.target}</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <Pill tone={statusTone(job.status)} dot>{job.status}</Pill>
              <span className="tag">{job.module}</span>
              {job.failed > 0 && <Pill tone="bad" icon="warn">{num(job.failed)} failed</Pill>}
            </div>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </header>

        <div className="job-modal-b">
          <div style={{ marginBottom: 16 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="t-xs t-mut">{job.status === 'Running' ? 'Execution progress' : 'Records applied'}</span>
              <span className="t-sm num" style={{ fontWeight: 600 }}>
                {job.status === 'Running' ? `${job.progress}%` : `${num(job.succeeded)} / ${num(job.total)}`}
              </span>
            </div>
            <Meter value={appliedPct(job)} tone={meterTone(job.status)} />
            <div className="t-xs t-mut" style={{ marginTop: 6 }}>
              {job.status === 'Running'
                ? `${num(job.succeeded)} of ${num(job.total)} records dispatched to ${job.target}.`
                : job.failed > 0
                  ? `${num(job.failed)} records were rejected by the target and require replay.`
                  : 'Every record in the batch was accepted by the target.'}
            </div>
          </div>

          <KeyValue
            cols={1}
            rows={[
              { k: 'Job id', v: job.jobId, icon: 'jobs' },
              { k: 'Module', v: job.module, icon: 'layers' },
              { k: 'Operation', v: job.operation, icon: 'bolt' },
              { k: 'Target', v: job.target, icon: 'provision' },
              { k: 'Triggered by', v: job.triggeredBy, icon: job.triggeredBy === 'Scheduler' ? 'clock' : 'user' },
              { k: 'Started', v: `${job.started} UTC`, icon: 'history' },
              { k: 'Duration', v: duration(job.durationMs), icon: 'clock' },
              { k: 'Throughput', v: `${num(throughput)} records/s`, icon: 'activity' },
              { k: 'Records succeeded', v: num(job.succeeded), icon: 'checkC' },
              { k: 'Records failed', v: num(job.failed), icon: 'warn' },
            ]}
          />

          <div className="t-micro t-mut" style={{ margin: '18px 0 8px' }}>Record outcomes</div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Principal</th>
                  <th>Outcome</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td className="td-main">
                      <span className="trunc" style={{ display: 'block' }}>{rec.principal}</span>
                      <span className="cell-sub">{rec.email}</span>
                    </td>
                    <td>
                      <Pill tone={rec.outcome === 'Failed' ? 'bad' : rec.outcome === 'Pending' ? 'warn' : 'ok'} dot>{rec.outcome}</Pill>
                    </td>
                    <td className="t-xs t-mut">{rec.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="t-xs t-faint" style={{ marginTop: 8 }}>
            Showing 8 of {num(job.total)} records. Download the result file for the complete set.
          </div>
        </div>

        <footer className="job-modal-f">
          <Button size="sm" icon="refresh" onClick={onRerun}>Re-run</Button>
          <Button size="sm" icon="download" onClick={onDownload}>Result</Button>
          <div className="spacer" />
          <Button size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" variant="pri" iconRight="external" onClick={onOpenLog}>Execution log</Button>
        </footer>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const { toast, confirm } = useApp()
  const [tab, setTab] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState(JOBS)
  const [peek, setPeek] = useState(null)
  const [todayOk, setTodayOk] = useState(false)
  const [slow, setSlow] = useState(false)

  const avgMs = useMemo(
    () => (rows.length ? Math.round(rows.reduce((a, j) => a + j.durationMs, 0) / rows.length) : 0),
    [rows],
  )

  const jobFilter = useMemo(() => {
    if (todayOk) return (j) => j.status === 'Succeeded' && String(j.started).slice(0, 10) === TODAY
    if (slow) return (j) => j.durationMs > avgMs
    return undefined
  }, [todayOk, slow, avgMs])

  const completed = useMemo(() => rows.filter(isDone), [rows])
  const inProgress = useMemo(() => rows.filter((j) => j.status === 'Running'), [rows])
  const failed = useMemo(() => rows.filter((j) => j.status === 'Failed'), [rows])

  const dated = useMemo(() => {
    const pick = tab === 'progress' ? inProgress : tab === 'completed' ? completed : tab === 'failed' ? failed : rows
    return pick.filter((j) => {
      const day = String(j.started).slice(0, 10)
      if (startDate && day < startDate) return false
      if (endDate && day > endDate) return false
      return true
    })
  }, [tab, rows, inProgress, completed, failed, startDate, endDate])

  const stats = useMemo(() => {
    const today = rows.filter((j) => j.started.slice(0, 10) === TODAY)
    const finished = rows.filter((j) => j.status === 'Succeeded' || j.status === 'Failed')
    const totalMs = rows.reduce((a, j) => a + j.durationMs, 0)
    return {
      running: rows.filter((j) => j.status === 'Running').length,
      succeeded24: today.filter((j) => j.status === 'Succeeded').length,
      failed24: today.filter((j) => j.status === 'Failed').length,
      avgMs: rows.length ? Math.round(totalMs / rows.length) : 0,
      runs: rows.length,
      successRate: finished.length ? (finished.filter((j) => j.status === 'Succeeded').length / finished.length) * 100 : 0,
      records: rows.reduce((a, j) => a + j.succeeded, 0),
      recordsFailed: rows.reduce((a, j) => a + j.failed, 0),
      longRunning: rows.filter((j) => j.durationMs > 300000).length,
    }
  }, [rows])

  const doneStats = useMemo(() => {
    const totalMs = completed.reduce((a, j) => a + j.durationMs, 0)
    return {
      total: completed.length,
      succeeded: completed.filter((j) => j.status === 'Succeeded').length,
      failed: completed.filter((j) => j.status === 'Failed').length,
      canceled: completed.filter((j) => j.status === 'Canceled').length,
      records: completed.reduce((a, j) => a + j.succeeded, 0),
      rejected: completed.reduce((a, j) => a + j.failed, 0),
      avgMs: completed.length ? Math.round(totalMs / completed.length) : 0,
    }
  }, [completed])

  const outcomeSeries = useMemo(
    () => DAYS.map((d) => {
      const inDay = rows.filter((j) => j.started.slice(0, 10) === d)
      return {
        d,
        succeeded: inDay.filter((j) => j.status === 'Succeeded').length,
        failed: inDay.filter((j) => j.status === 'Failed').length,
        running: inDay.filter((j) => j.status === 'Running').length,
        canceled: inDay.filter((j) => j.status === 'Canceled').length,
      }
    }),
    [rows],
  )

  const mutate = (ids, patch, title, body) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...patch } : r)))
    setPeek((p) => (p && set.has(String(p.id)) ? { ...p, ...patch } : p))
    toast('ok', title, body)
  }

  const rerun = (list) => {
    mutate(
      list.map((r) => r.id),
      { status: 'Running', progress: 4, failed: 0, succeeded: 0 },
      'Execution queued',
      list.length === 1 ? `${list[0].jobId} was resubmitted to the ${list[0].module.toLowerCase()} worker.` : `${list.length} jobs resubmitted to their workers.`,
    )
  }

  const cancel = (list) => {
    const running = list.filter((r) => r.status === 'Running')
    if (running.length === 0) {
      toast('info', 'Nothing to cancel', 'Only running executions can be canceled.')
      return
    }
    confirm({
      title: running.length === 1 ? `Cancel ${running[0].jobId}?` : `Cancel ${running.length} executions?`,
      body: 'Records already written to the target are not rolled back. The remainder of the batch is discarded and must be replayed.',
      confirmLabel: 'Cancel execution',
      onConfirm: () => mutate(running.map((r) => r.id), { status: 'Canceled' }, 'Execution canceled', `${running.length} ${running.length === 1 ? 'job' : 'jobs'} stopped.`),
    })
  }

  const remove = (list, done) => {
    const removable = list.filter((r) => r.status !== 'Running')
    if (removable.length === 0) {
      toast('info', 'Nothing to remove', 'Cancel a running execution before removing it from history.')
      if (done) done()
      return
    }
    confirm({
      title: removable.length === 1 ? `Remove ${removable[0].jobId}?` : `Remove ${removable.length} executions?`,
      body: 'The execution record and its per-record outcomes are deleted from job history. Records already written to the target are unaffected. This cannot be undone.',
      confirmLabel: `Remove ${removable.length}`,
      onConfirm: () => {
        const set = new Set(removable.map((r) => String(r.id)))
        setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
        setPeek((p) => (p && set.has(String(p.id)) ? null : p))
        toast('ok', 'Execution removed', `${removable.length} ${removable.length === 1 ? 'record' : 'records'} deleted from job history.`)
        if (done) done()
      },
    })
  }

  const columns = [
    serialColumn('Serial No'),
    { key: 'module', label: 'Module', locked: true, cls: 'td-main', render: (r) => <span className="tag">{r.module}</span> },
    { key: 'operation', label: 'Operation' },
    {
      key: 'progress', label: 'Progress', width: 168, sortable: false,
      render: (r) => (
        <span className="cell-id" style={{ gap: 8 }}>
          <span style={{ flex: 1, minWidth: 64 }}>
            <Meter value={appliedPct(r)} tone={meterTone(r.status)} />
          </span>
          <span className="t-xs t-mut num" style={{ flex: 'none' }}>{r.status === 'Running' ? `${r.progress}%` : '100%'}</span>
        </span>
      ),
    },
    { key: 'total', label: 'Total', align: 'right', render: (r) => num(r.total) },
    { key: 'succeeded', label: 'Success', align: 'right', render: (r) => num(r.succeeded) },
    {
      key: 'failed', label: 'Failed', align: 'right',
      render: (r) => (r.failed > 0
        ? <span className="num" style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(r.failed)}</span>
        : <span className="t-faint num">0</span>),
    },
    { key: 'started', label: 'Create On', cls: 'td-mono' },
  ]

  const rowActions = (r) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => setPeek(r) },
    { id: 'close', label: 'Close', icon: 'ban', disabled: r.status !== 'Running', onSelect: () => cancel([r]) },
    { id: 'remove', label: 'Remove', icon: 'trash', danger: true, disabled: r.status === 'Running', onSelect: () => remove([r]) },
  ]

  const bulkActions = (ids, clear) => {
    const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
    return (
      <>
        <Button size="sm" icon="refresh" onClick={() => { rerun(list); clear() }}>Re-run</Button>
        <Button size="sm" icon="download" onClick={() => { toast('ok', 'Results queued', `${ids.length} result files will be bundled into one archive.`); clear() }}>Download results</Button>
        <Button size="sm" icon="ban" onClick={() => { cancel(list); clear() }}>Cancel running</Button>
        <Button size="sm" variant="danger" icon="trash" onClick={() => remove(list, clear)}>Remove</Button>
      </>
    )
  }

  return (
    <>
      <PageBar
        title="Jobs"
        sub="Every provisioning, reconciliation and policy execution the platform has dispatched, with per-record outcomes for replay."
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Execution history is being exported as CSV.')}>Export</Button>
            <Button variant="pri" icon="play" onClick={() => toast('info', 'Run a job', 'The ad-hoc execution wizard opens here.')}>Run job</Button>
          </>
        }
        rail={
          <>
            <StatChip icon="play" active={tab === 'progress'} onClick={() => { setTab('progress'); setTodayOk(false); setSlow(false) }}>
              {num(stats.running)} running
            </StatChip>
            <StatChip icon="checkC" active={todayOk} onClick={() => { setTab('all'); setSlow(false); setTodayOk((v) => !v) }}>
              {num(stats.succeeded24)} succeeded 24h
            </StatChip>
            <StatChip icon="warn" active={tab === 'failed'} onClick={() => { setTab('failed'); setTodayOk(false); setSlow(false) }}>
              {num(stats.failed24)} failed 24h
            </StatChip>
            <StatChip icon="jobs" active={tab === 'completed'} onClick={() => { setTab('completed'); setTodayOk(false); setSlow(false) }}>
              {num(doneStats.total)} completed
            </StatChip>
            <StatChip
              icon="clock"
              active={slow}
              onClick={() => { setTab('all'); setTodayOk(false); setSlow((v) => !v) }}
              title={`Show executions that ran longer than the ${duration(stats.avgMs)} mean`}
            >
              {duration(stats.avgMs)} average duration
            </StatChip>
          </>
        }
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All Jobs', icon: 'jobs', count: rows.length },
            { id: 'progress', label: 'In-Progress Jobs', icon: 'refresh', count: inProgress.length },
            { id: 'completed', label: 'Completed Jobs', icon: 'checkC', count: completed.length },
            { id: 'failed', label: 'Failed Jobs', icon: 'warn', count: failed.length },
          ]}
        />

        {tab === 'all' && (
          <Card
            title="Execution outcomes"
            sub={`Job runs by outcome across the last ${DAYS.length} days`}
          >
            <div className="stat-strip">
              <div className="stat-cell">
                <span className="stat-k"><Icon name="jobs" size={12} />Executions</span>
                <span className="stat-v">{num(stats.runs)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="checkC" size={12} />Success rate</span>
                <span className="stat-v">{stats.successRate.toFixed(1)}%</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="swap" size={12} />Records processed</span>
                <span className="stat-v">{num(stats.records)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="warn" size={12} />Records rejected</span>
                <span className="stat-v" style={{ color: stats.recordsFailed > 0 ? 'var(--bad)' : undefined }}>{num(stats.recordsFailed)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="history" size={12} />Over 5 minutes</span>
                <span className="stat-v">{num(stats.longRunning)}</span>
              </div>
            </div>
          </Card>
        )}

        {tab === 'completed' && (
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-k"><Icon name="jobs" size={11} />Completed</span>
              <span className="stat-v">{num(doneStats.total)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="checkC" size={11} />Succeeded</span>
              <span className="stat-v">{num(doneStats.succeeded)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="warn" size={11} />Failed</span>
              <span className="stat-v" style={{ color: doneStats.failed > 0 ? 'var(--bad)' : undefined }}>{num(doneStats.failed)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="ban" size={11} />Canceled</span>
              <span className="stat-v">{num(doneStats.canceled)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="swap" size={11} />Records applied</span>
              <span className="stat-v">{num(doneStats.records)}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="clock" size={11} />Average duration</span>
              <span className="stat-v">{duration(doneStats.avgMs)}</span>
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <DataWorkbench
            id={`jobs-${tab}`}
            rows={dated}
            filter={jobFilter}
            columns={columns}
            selectable
            searchPlaceholder="Search"
            bulkActions={bulkActions}
            rowActions={rowActions}
            onRowClick={setPeek}
            activeRowId={peek?.id}
            toolbar={(
              <>
                <span className="job-filter">
                  <label htmlFor="job-start">Start Date</label>
                  <TextInput id="job-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </span>
                <span className="job-filter">
                  <label htmlFor="job-end">End Date</label>
                  <TextInput id="job-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </span>
                {(startDate || endDate) && (
                  <Button size="sm" icon="x" onClick={() => { setStartDate(''); setEndDate('') }}>Clear</Button>
                )}
              </>
            )}
            emptyTitle="No executions match"
            emptyBody="Clear the search or widen the date range."
            emptyIcon="jobs"
            pageSize={25}
          />

          {peek && (
            <JobPeek
              job={peek}
              onClose={() => setPeek(null)}
              onRerun={() => rerun([peek])}
              onDownload={() => toast('ok', 'Result file queued', `${peek.jobId} · ${num(peek.total)} records will be exported as CSV.`)}
              onOpenLog={() => toast('info', 'Execution log', `Streaming the worker log for ${peek.jobId}.`)}
            />
          )}
        </div>
      </div>
    </>
  )
}
